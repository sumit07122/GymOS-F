require("./dns-preload.cjs");
require("dotenv").config();
const { hash } = require("@node-rs/argon2");
const { Client } = require("pg");

const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function run() {
  const password = "FixiaAdmin2026!#";
  const pHash = await hash(password, OPTS);
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  await client.query('UPDATE "User" SET "passwordHash" = $1, status = \'ACTIVE\' WHERE email = $2', [
    pHash,
    "admin@fixia.in",
  ]);

  console.log(`[SUCCESS] admin@fixia.in password updated to: ${password}`);
  await client.end();
}

run().catch(console.error);

