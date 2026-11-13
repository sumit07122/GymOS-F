import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "@/server/security/password";

/** Owner-level connection (bypasses RLS). Used ONLY to arrange and inspect test data. */
const url = new URL(process.env.TEST_ADMIN_URL!);
url.pathname = "/gymos_test";
export const admin = new Pool({ connectionString: url.toString(), max: 4 });

export async function resetDb() {
  await admin.query(
    `TRUNCATE "Attendance","PaymentCorrection","Payment","Membership","MembershipPlan","GymRegistrationRequest","AuditLog","Subscription","SubscriptionPlan","GymUser","Gym","OtpVerification","Session","RateLimit","User" CASCADE`,
  );
}

const day = 86400_000;

export async function makeGym(opts: { name?: string; status?: "PENDING" | "ACTIVE" | "SUSPENDED"; subscribed?: boolean | "expired" } = {}) {
  const id = randomUUID();
  const status = opts.status ?? "ACTIVE";
  await admin.query(`INSERT INTO "Gym"("id","name","slug","status","updatedAt") VALUES ($1,$2,$3,$4,now())`, [
    id,
    opts.name ?? "Iron Works",
    `gym-${id.slice(0, 8)}`,
    status,
  ]);
  const sub = opts.subscribed ?? status === "ACTIVE";
  if (sub) {
    const planId = randomUUID();
    await admin.query(`INSERT INTO "SubscriptionPlan"("id","name","priceInr","durationDays") VALUES ($1,'Test',1000,30)`, [planId]);
    const now = Date.now();
    const [from, to] = sub === "expired" ? [now - 60 * day, now - 30 * day] : [now - day, now + 29 * day];
    await admin.query(
      `INSERT INTO "Subscription"("gymId","planId","startsAt","endsAt","priceInr") VALUES ($1,$2,$3,$4,1000)`,
      [id, planId, new Date(from), new Date(to)],
    );
  }
  return id;
}

export async function makeUser(o: {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  globalRole?: "PLATFORM_ADMIN";
  status?: "ACTIVE" | "DISABLED";
}) {
  const id = randomUUID();
  await admin.query(
    `INSERT INTO "User"("id","email","phone","name","passwordHash","globalRole","status","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,now())`,
    [id, o.email ?? null, o.phone ?? null, o.name ?? "Test User", o.password ? await hashPassword(o.password) : null, o.globalRole ?? null, o.status ?? "ACTIVE"],
  );
  return id;
}

export async function join(gymId: string, userId: string, role: "OWNER" | "MEMBER", status: "ACTIVE" | "INACTIVE" = "ACTIVE") {
  await admin.query(`INSERT INTO "GymUser"("gymId","userId","role","status") VALUES ($1,$2,$3,$4)`, [gymId, userId, role, status]);
}

export async function rows<T = Record<string, unknown>>(q: string, args: unknown[] = []) {
  return (await admin.query(q, args)).rows as T[];
}
