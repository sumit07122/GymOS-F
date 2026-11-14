require("./dns-preload.cjs");
require("dotenv").config();
const { Client } = require("pg");
const { hash } = require("@node-rs/argon2");

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
  const pHash = await hash("MatrixGym2026!#", OPTS);

  // Update all members without a passwordHash to have the standard test password
  const res = await client.query(
    'UPDATE "User" SET "passwordHash" = $1, "mustChangePassword" = false, status = \'ACTIVE\' WHERE phone IS NOT NULL RETURNING id, name, phone',
    [pHash]
  );

  console.log("Updated members:", res.rows);
  await client.end();
}

main().catch(console.error);
