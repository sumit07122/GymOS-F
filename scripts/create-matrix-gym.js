require("./dns-preload.cjs");
require("dotenv").config();
const { Client } = require("pg");
const { hash } = require("@node-rs/argon2");

const DIRECT_URL = process.env.DIRECT_URL;

async function main() {
  if (!DIRECT_URL) {
    console.error("DIRECT_URL environment variable is required.");
    process.exit(1);
  }

  const client = new Client({ connectionString: DIRECT_URL });
  await client.connect();

  console.log("Connected to Neon DB. Setting up Matrix Gym...");

  const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
  const ownerPassword = "MatrixGym2026!#";
  const passwordHash = await hash(ownerPassword, OPTS);

  const gymId = require("crypto").randomUUID();
  const ownerUserId = require("crypto").randomUUID();
  const memberUserId = require("crypto").randomUUID();
  const planAnnualId = require("crypto").randomUUID();
  const planMonthlyId = require("crypto").randomUUID();
  const subPlanId = require("crypto").randomUUID();
  const subId = require("crypto").randomUUID();
  const membershipId = require("crypto").randomUUID();
  const paymentId = require("crypto").randomUUID();

  // 1. Upsert Matrix Gym
  const { rows: existingGym } = await client.query('SELECT id FROM "Gym" WHERE slug = $1', ["matrix-gym"]);
  let actualGymId = gymId;

  if (existingGym.length > 0) {
    actualGymId = existingGym[0].id;
    await client.query(
      'UPDATE "Gym" SET name = $1, status = \'ACTIVE\', "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      ["Matrix Gym", actualGymId]
    );
    console.log("Matrix Gym updated with ACTIVE status, ID:", actualGymId);
  } else {
    await client.query(
      `INSERT INTO "Gym" (id, name, slug, phone, city, address, status, timezone, "createdAt", "updatedAt")
       VALUES ($1, 'Matrix Gym', 'matrix-gym', '+919876500001', 'Mumbai', 'Level 2, Matrix Tower, Bandra West', 'ACTIVE', 'Asia/Kolkata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [actualGymId]
    );
    console.log("Matrix Gym created, ID:", actualGymId);
  }

  // 2. Upsert Subscription Plan & Platform Subscription
  await client.query(
    `INSERT INTO "SubscriptionPlan" (id, name, "priceInr", "durationDays", active, "createdAt")
     VALUES ($1, 'Enterprise Pro', 4999.00, 365, true, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [subPlanId]
  );

  const oneYearFromNow = new Date(Date.now() + 365 * 86400000);
  await client.query(
    `INSERT INTO "Subscription" (id, "gymId", "planId", "priceInr", status, "startsAt", "endsAt", "createdAt")
     VALUES ($1, $2, (SELECT id FROM "SubscriptionPlan" LIMIT 1), 4999.00, 'ACTIVE', CURRENT_TIMESTAMP, $3, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [subId, actualGymId, oneYearFromNow]
  );

  // 3. Create or Update Owner User
  const ownerEmail = "owner@matrixgym.in";
  const { rows: existingUser } = await client.query('SELECT id FROM "User" WHERE email = $1', [ownerEmail]);
  let actualOwnerId = ownerUserId;

  if (existingUser.length > 0) {
    actualOwnerId = existingUser[0].id;
    await client.query(
      'UPDATE "User" SET "passwordHash" = $1, status = \'ACTIVE\', "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, actualOwnerId]
    );
    console.log("Owner user password updated, ID:", actualOwnerId);
  } else {
    await client.query(
      `INSERT INTO "User" (id, name, email, phone, "passwordHash", status, "createdAt", "updatedAt")
       VALUES ($1, 'Matrix Owner', $2, '+919876500001', $3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [actualOwnerId, ownerEmail, passwordHash]
    );
    console.log("Owner user created, ID:", actualOwnerId);
  }

  // 4. Link Owner to Matrix Gym
  await client.query(
    `INSERT INTO "GymUser" ("gymId", "userId", role, status, "displayName", "createdAt")
     VALUES ($1, $2, 'OWNER', 'ACTIVE', 'Matrix Gym Owner', CURRENT_TIMESTAMP)
     ON CONFLICT ("gymId", "userId") DO UPDATE SET role = 'OWNER', status = 'ACTIVE'`,
    [actualGymId, actualOwnerId]
  );

  // 5. Create Sample Membership Plans for Matrix Gym
  await client.query(
    `INSERT INTO "MembershipPlan" (id, "gymId", name, "durationDays", "priceInr", active, "createdAt")
     VALUES ($1, $2, 'Annual Pro Access', 365, 15000.00, true, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [planAnnualId, actualGymId]
  );

  await client.query(
    `INSERT INTO "MembershipPlan" (id, "gymId", name, "durationDays", "priceInr", active, "createdAt")
     VALUES ($1, $2, 'Monthly Standard', 30, 2000.00, true, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [planMonthlyId, actualGymId]
  );

  // 6. Create Sample Member in Matrix Gym
  const memberPhone = "+919876543210";
  const { rows: existingMember } = await client.query('SELECT id FROM "User" WHERE phone = $1', [memberPhone]);
  let actualMemberId = memberUserId;

  if (existingMember.length > 0) {
    actualMemberId = existingMember[0].id;
  } else {
    await client.query(
      `INSERT INTO "User" (id, name, phone, status, "createdAt", "updatedAt")
       VALUES ($1, 'John Wick', $2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [actualMemberId, memberPhone]
    );
  }

  await client.query(
    `INSERT INTO "GymUser" ("gymId", "userId", role, status, "displayName", "createdAt")
     VALUES ($1, $2, 'MEMBER', 'ACTIVE', 'John Wick', CURRENT_TIMESTAMP)
     ON CONFLICT ("gymId", "userId") DO NOTHING`,
    [actualGymId, actualMemberId]
  );

  // 7. Assign Annual Membership & Record Payment for John Wick
  await client.query(
    `INSERT INTO "Membership" (id, "gymId", "userId", "planId", "startsAt", "endsAt", "priceInr", status, "createdAt")
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, 15000.00, 'ACTIVE', CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [membershipId, actualGymId, actualMemberId, planAnnualId, oneYearFromNow]
  );

  await client.query(
    `INSERT INTO "Payment" (id, "gymId", "userId", "membershipId", "amountInr", method, reference, "recordedByUserId", "createdAt")
     VALUES ($1, $2, $3, $4, 15000.00, 'UPI', 'UPI/MATRIX/2026111301', $5, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`,
    [paymentId, actualGymId, actualMemberId, membershipId, actualOwnerId]
  );

  await client.end();

  console.log("\n==============================================================");
  console.log("  MATRIX GYM CREATION SUCCESSFUL!");
  console.log("==============================================================");
  console.log("Gym Name:          Matrix Gym");
  console.log("Gym Slug:          matrix-gym");
  console.log("Gym Status:        ACTIVE (Full Operational Access)");
  console.log("Subscription:      Enterprise Pro (Active through 2027)");
  console.log("--------------------------------------------------------------");
  console.log("OWNER CREDENTIALS:");
  console.log("Login Email:       owner@matrixgym.in");
  console.log("Login Password:    MatrixGym2026!#");
  console.log("Dashboard URL:     https://gymos-umber-nine.vercel.app/login");
  console.log("Local Preview URL: http://localhost:3000/login");
  console.log("--------------------------------------------------------------");
  console.log("SAMPLE MEMBER:");
  console.log("Member Name:       John Wick");
  console.log("Member Phone:      98765 43210 (+919876543210)");
  console.log("Membership:        Annual Pro Access (Paid in full via UPI)");
  console.log("==============================================================\n");
}

main().catch((err) => {
  console.error("Failed to create Matrix Gym:", err);
  process.exit(1);
});
