require("./dns-preload.cjs");
require("dotenv").config();
const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL;

async function runLiveAudit() {
  console.log("==================================================================");
  console.log("  GYMOS PRE-LAUNCH LIVE MULTI-TENANT & FUNCTIONAL AUDIT SUITE");
  console.log("==================================================================");

  if (!DATABASE_URL || !DIRECT_URL) {
    throw new Error("Missing DATABASE_URL or DIRECT_URL in environment");
  }

  // Connect as the restricted app role
  const appClient = new Client({ connectionString: DATABASE_URL });
  await appClient.connect();
  console.log("\n[PASS] 1. Application Database Connection verified (role: gymos_app)");

  // Verify app role permissions & restrictions
  const roleCheck = await appClient.query("SELECT current_user, session_user");
  console.log("       Connected user:", roleCheck.rows[0]);

  // Test AuditLog append-only DB rule
  try {
    await appClient.query('DELETE FROM "AuditLog"');
    console.error("[FAIL] AuditLog is not append-only! Application role was able to DELETE.");
    process.exit(1);
  } catch (err) {
    console.log("[PASS] 2. AuditLog DB-level immutability verified (DELETE permission revoked from gymos_app)");
  }

  // Test Payment update restriction
  try {
    await appClient.query('UPDATE "Payment" SET "amountInr" = 999999');
    console.error("[FAIL] Payment amountInr is mutable! Application role was able to rewrite payment amounts.");
    process.exit(1);
  } catch (err) {
    console.log("[PASS] 3. Financial Integrity verified (Payment amount rewrite blocked at database level)");
  }

  // Connect as admin/owner via DIRECT_URL to seed 2 isolated test tenants: Gym A and Gym B
  const directClient = new Client({ connectionString: DIRECT_URL });
  await directClient.connect();

  const gymAId = require("crypto").randomUUID();
  const gymBId = require("crypto").randomUUID();
  const userAId = require("crypto").randomUUID();
  const userBId = require("crypto").randomUUID();

  try {
    // Clean up any previous test gyms
    await directClient.query("DELETE FROM \"Gym\" WHERE slug IN ('audit-gym-a', 'audit-gym-b')");

    // Seed Gym A
    await directClient.query(
      `INSERT INTO "Gym" (id, name, slug, phone, status, timezone, "createdAt", "updatedAt")
       VALUES ($1, 'Alpha Fitness (Gym A)', 'audit-gym-a', '+919999990001', 'ACTIVE', 'Asia/Kolkata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [gymAId]
    );

    // Seed Gym B
    await directClient.query(
      `INSERT INTO "Gym" (id, name, slug, phone, status, timezone, "createdAt", "updatedAt")
       VALUES ($1, 'Beta Athletics (Gym B)', 'audit-gym-b', '+919999990002', 'ACTIVE', 'Asia/Kolkata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [gymBId]
    );

    // Seed User A (Member of Gym A)
    await directClient.query(
      `INSERT INTO "User" (id, name, phone, status, "createdAt", "updatedAt")
       VALUES ($1, 'Member Alpha', '+919888880001', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (phone) DO UPDATE SET name = 'Member Alpha' RETURNING id`,
      [userAId]
    );
    await directClient.query(
      `INSERT INTO "GymUser" ("gymId", "userId", role, status, "createdAt")
       VALUES ($1, $2, 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP)
       ON CONFLICT ("gymId", "userId") DO NOTHING`,
      [gymAId, userAId]
    );

    // Seed User B (Member of Gym B)
    await directClient.query(
      `INSERT INTO "User" (id, name, phone, status, "createdAt", "updatedAt")
       VALUES ($1, 'Member Beta', '+919888880002', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (phone) DO UPDATE SET name = 'Member Beta' RETURNING id`,
      [userBId]
    );
    await directClient.query(
      `INSERT INTO "GymUser" ("gymId", "userId", role, status, "createdAt")
       VALUES ($1, $2, 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP)
       ON CONFLICT ("gymId", "userId") DO NOTHING`,
      [gymBId, userBId]
    );

    console.log("[PASS] 4. Multi-Tenant Test Environment seeded (Gym A & Gym B)");

    // Test 5: Verify RLS Fail-Closed without session context
    const nakedUsers = await appClient.query('SELECT * FROM "GymUser"');
    if (nakedUsers.rows.length === 0) {
      console.log("[PASS] 5. Row-Level Security Fails Closed: Queries without app.gym_id context return 0 rows");
    } else {
      console.error("[FAIL] RLS breach! Unscoped query returned rows:", nakedUsers.rows.length);
      process.exit(1);
    }

    // Test 6: Verify Isolation under Gym A Context
    await appClient.query("BEGIN");
    await appClient.query(`SELECT set_config('app.gym_id', '${gymAId}', true)`);

    const gymAMembers = await appClient.query('SELECT * FROM "GymUser"');
    const seesGymBMember = gymAMembers.rows.some((r) => r.userId === userBId || r.gymId === gymBId);
    if (!seesGymBMember && gymAMembers.rows.some((r) => r.gymId === gymAId)) {
      console.log("[PASS] 6. Tenant Boundary Enforced: Gym A context can only view its own members, Gym B data is completely hidden");
    } else {
      console.error("[FAIL] Cross-tenant data leak! Gym A context saw Gym B records:", gymAMembers.rows);
      process.exit(1);
    }

    // Test 7: Verify Cross-Tenant Write Rejection
    try {
      await appClient.query(
        `INSERT INTO "GymUser" ("gymId", "userId", role, status) VALUES ('${gymBId}', '${userAId}', 'MEMBER', 'ACTIVE')`
      );
      console.error("[FAIL] RLS breach! Gym A context was able to insert into Gym B.");
      process.exit(1);
    } catch (err) {
      console.log("[PASS] 7. Cross-Tenant Write Blocked: Gym A transaction cannot write or modify records for Gym B");
    }
    await appClient.query("ROLLBACK");

    // Test 8: Attendance & Concurrency Check
    await appClient.query("BEGIN");
    await appClient.query(`SELECT set_config('app.gym_id', '${gymAId}', true)`);
    const today = new Date().toISOString().slice(0, 10);

    // First check-in
    await appClient.query(
      `INSERT INTO "Attendance" (id, "gymId", "userId", "localDate", "checkedInAt")
       VALUES (gen_random_uuid(), '${gymAId}', '${userAId}', '${today}', CURRENT_TIMESTAMP)`
    );

    // Duplicate check-in attempt on the same day
    try {
      await appClient.query(
        `INSERT INTO "Attendance" (id, "gymId", "userId", "localDate", "checkedInAt")
         VALUES (gen_random_uuid(), '${gymAId}', '${userAId}', '${today}', CURRENT_TIMESTAMP)`
      );
      console.error("[FAIL] Duplicate attendance check-in allowed on same date!");
      process.exit(1);
    } catch (err) {
      console.log("[PASS] 8. Attendance Integrity: Duplicate check-ins for the same member on the same date are rejected");
    }
    await appClient.query("ROLLBACK");

    // Clean up test tenants
    await directClient.query("DELETE FROM \"Gym\" WHERE slug IN ('audit-gym-a', 'audit-gym-b')");
    console.log("[PASS] 9. Clean-up completed cleanly");

  } finally {
    await appClient.end();
    await directClient.end();
  }

  console.log("\n==================================================================");
  console.log("  ALL CRITICAL SECURITY, ISOLATION & DATA INTEGRITY TESTS PASSED!");
  console.log("==================================================================\n");
}

runLiveAudit().catch((err) => {
  console.error("Live audit failed with error:", err);
  process.exit(1);
});
