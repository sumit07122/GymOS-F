/**
 * Creates (or resets the password of) a FIXIA platform admin.
 *   ADMIN_EMAIL=you@fixia.in ADMIN_NAME="Your Name" ADMIN_PASSWORD='…' npm run admin:create
 * The password is read from the environment, never from argv, so it stays out of shell history/process lists.
 */
import { z } from "zod";
import { audit } from "../src/server/audit";
import { db, disconnectDb } from "../src/server/db";
import { hashPassword, passwordSchema } from "../src/server/security/password";

const input = z
  .object({
    ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    ADMIN_NAME: z.string().trim().min(2).max(80),
    ADMIN_PASSWORD: passwordSchema,
  })
  .parse(process.env);

async function main() {
  const passwordHash = await hashPassword(input.ADMIN_PASSWORD);
  const user = await db().user.upsert({
    where: { email: input.ADMIN_EMAIL },
    create: { email: input.ADMIN_EMAIL, name: input.ADMIN_NAME, passwordHash, globalRole: "PLATFORM_ADMIN" },
    update: { name: input.ADMIN_NAME, passwordHash, globalRole: "PLATFORM_ADMIN", status: "ACTIVE" },
  });
  await db().session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit({ action: "admin.bootstrap", actorUserId: user.id, entityType: "User", entityId: user.id });
  console.log(`Platform admin ready: ${user.email}`);
  await disconnectDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
