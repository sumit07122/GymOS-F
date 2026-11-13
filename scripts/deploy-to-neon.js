require("./dns-preload.cjs");
const { readdirSync, readFileSync } = require("fs");
const { join } = require("path");
const { Client } = require("pg");

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) {
  console.error("DIRECT_URL environment variable is required to run migrations.");
  process.exit(1);
}

async function main() {
  console.log("Connecting to Neon database via DIRECT_URL...");
  const client = new Client({ connectionString: DIRECT_URL });
  await client.connect();
  console.log("Connected successfully!");

  // 1. Check existing tables
  const { rows: initialTables } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Current tables in public schema:", initialTables.map((r) => r.table_name));

  // 2. Discover migrations
  const migrationsDir = join(__dirname, "..", "prisma", "migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((f) => !f.startsWith("."))
    .sort();
  console.log("Found migrations to apply:", migrations);

  // 3. Ensure _prisma_migrations table exists for bookkeeping
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  const { rows: appliedRows } = await client.query(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL'
  );
  const appliedSet = new Set(appliedRows.map((r) => r.migration_name));

  // 4. Apply each migration
  for (const migration of migrations) {
    if (appliedSet.has(migration)) {
      console.log(`[skip] Already applied: ${migration}`);
      continue;
    }

    console.log(`[applying] Running migration: ${migration}...`);
    const sqlPath = join(migrationsDir, migration, "migration.sql");
    const sql = readFileSync(sqlPath, "utf8");

    const migrationId = require("crypto").randomUUID();
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "applied_steps_count", "finished_at")
         VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP)`,
        [migrationId, require("crypto").createHash("sha256").update(sql).digest("hex"), migration]
      );
      await client.query("COMMIT");
      console.log(`[success] Migration ${migration} applied successfully!`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[error] Migration ${migration} failed:`, err);
      throw err;
    }
  }

  // 5. Apply roles.sql
  console.log("Applying prisma/roles.sql...");
  let rolesSql = readFileSync(join(__dirname, "..", "prisma", "roles.sql"), "utf8");
  const appPassword = process.env.GYMOS_APP_PASSWORD;
  if (appPassword) {
    rolesSql = rolesSql.replace("'change-me'", `'${appPassword}'`);
  }
  await client.query(rolesSql);
  console.log("[success] Roles and table permissions configured!");

  // 6. Verify tables
  const { rows: finalTables } = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("All tables in Neon database:", finalTables.map((r) => r.table_name));

  await client.end();
  console.log("Migration deployment complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
