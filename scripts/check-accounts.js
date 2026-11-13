require("./dns-preload.cjs");
require("dotenv").config();
const { Client } = require("pg");
const { hash, verify } = require("@node-rs/argon2");

async function check() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  const user = await client.query('SELECT id, email, "passwordHash" FROM "User" WHERE email = $1', ['admin@fixia.in']);
  if (user.rows.length > 0) {
    const pHash = user.rows[0].passwordHash;
    console.log("admin@fixia.in has password hash:", Boolean(pHash));
    if (pHash) {
      console.log("Testing FixiaAdmin2026!#:", await verify(pHash, "FixiaAdmin2026!#").catch(() => false));
      console.log("Testing MatrixGym2026!#:", await verify(pHash, "MatrixGym2026!#").catch(() => false));
      console.log("Testing admin123456:", await verify(pHash, "admin123456").catch(() => false));
    } else {
      console.log("admin@fixia.in DOES NOT have a password hash!");
    }
  }

  // Also check owner@matrixgym.in
  const owner = await client.query('SELECT id, email, "passwordHash" FROM "User" WHERE email = $1', ['owner@matrixgym.in']);
  if (owner.rows.length > 0) {
    const pHash = owner.rows[0].passwordHash;
    console.log("owner@matrixgym.in has password hash:", Boolean(pHash));
    if (pHash) {
      console.log("Testing MatrixGym2026!# on owner:", await verify(pHash, "MatrixGym2026!#").catch(() => false));
    }
  }

  await client.end();
}

check().catch(console.error);
