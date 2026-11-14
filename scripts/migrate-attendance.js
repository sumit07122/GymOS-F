require("./dns-preload.cjs");
require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  console.log("Connected to Neon DB. Adding session columns to Attendance...");

  await client.query(`
    ALTER TABLE "Attendance" 
      ADD COLUMN IF NOT EXISTS "checkedOutAt" TIMESTAMPTZ(3),
      ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER,
      ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'RECEPTION_QR',
      ADD COLUMN IF NOT EXISTS "notes" TEXT,
      ADD COLUMN IF NOT EXISTS "checkedInByUserId" UUID;
  `);

  console.log("Attendance table schema updated successfully.");
  await client.end();
}

main().catch(console.error);
