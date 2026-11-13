import { readdirSync, readFileSync } from "node:fs";
import { Client } from "pg";

const ADMIN_URL = process.env.TEST_ADMIN_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";
const sql = (p: string) => readFileSync(new URL(`../../prisma/${p}`, import.meta.url), "utf8");

/** Builds a fresh gymos_test database from the real migration files: what CI and production run. */
export default async function setup() {
  if (process.env.SKIP_GLOBAL_SETUP === "1" || process.env.SKIP_GLOBAL_SETUP === "true") {
    return;
  }
  const root = new Client({ connectionString: ADMIN_URL });
  await root.connect();
  await root.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'gymos_test' AND pid <> pg_backend_pid()",
  );
  await root.query("DROP DATABASE IF EXISTS gymos_test");
  await root.query("CREATE DATABASE gymos_test");
  await root.end();

  const url = new URL(ADMIN_URL);
  url.pathname = "/gymos_test";
  const owner = new Client({ connectionString: url.toString() });
  await owner.connect();
  const migrations = readdirSync(new URL("../../prisma/migrations/", import.meta.url)).sort();
  for (const migration of migrations) await owner.query(sql(`migrations/${migration}/migration.sql`));
  await owner.query(sql("roles.sql"));
  await owner.query("ALTER ROLE gymos_app PASSWORD 'test-app-password'");
  await owner.end();
}
