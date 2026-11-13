-- Run ONCE per database as the schema owner, AFTER `prisma migrate deploy`, and again after any
-- migration that adds tables. Replace the password. See docs/PROJECT_CONTEXT.md.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gymos_app') THEN
    CREATE ROLE gymos_app LOGIN PASSWORD 'change-me' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO gymos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gymos_app;
-- The audit trail is append-only for the application.
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM gymos_app;
-- Payment amounts and methods cannot be rewritten; corrections are append-only.
REVOKE UPDATE ON "Payment" FROM gymos_app;
GRANT UPDATE ("voidedAt", "voidReason", "voidedByUserId") ON "Payment" TO gymos_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "PaymentCorrection" FROM gymos_app;
-- Prisma bookkeeping stays owner-only.
DO $$ BEGIN
  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM gymos_app;
  END IF;
END $$;
