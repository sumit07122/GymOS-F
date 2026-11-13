-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('PLATFORM_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "GymRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "GymStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "GymUserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "SessionKind" AS ENUM ('PLATFORM_ADMIN', 'OWNER', 'MEMBER');
CREATE TYPE "OtpPurpose" AS ENUM ('MEMBER_LOGIN');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "globalRole" "GlobalRole",
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "gymId" UUID,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "ip" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestIp" TEXT,
    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

CREATE TABLE "Gym" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "GymStatus" NOT NULL DEFAULT 'PENDING',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GymUser" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "GymRole" NOT NULL,
    "status" "GymUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GymUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "priceInr" DECIMAL(12,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "priceInr" DECIMAL(12,2) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "OtpVerification_phone_createdAt_idx" ON "OtpVerification"("phone", "createdAt");
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");
CREATE INDEX "GymUser_userId_idx" ON "GymUser"("userId");
CREATE UNIQUE INDEX "GymUser_gymId_userId_key" ON "GymUser"("gymId", "userId");
CREATE INDEX "Subscription_gymId_endsAt_idx" ON "Subscription"("gymId", "endsAt");
CREATE INDEX "AuditLog_gymId_createdAt_idx" ON "AuditLog"("gymId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymUser" ADD CONSTRAINT "GymUser_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymUser" ADD CONSTRAINT "GymUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Integrity checks Prisma cannot express ─────────────────────────────
ALTER TABLE "User" ADD CONSTRAINT "User_identifier_check" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase_check" CHECK ("email" IS NULL OR "email" = lower("email"));
ALTER TABLE "User" ADD CONSTRAINT "User_phone_e164_check" CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_period_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_price_check" CHECK ("priceInr" >= 0);
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_price_check" CHECK ("priceInr" >= 0);
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_duration_check" CHECK ("durationDays" > 0);
ALTER TABLE "Gym" ADD CONSTRAINT "Gym_slug_format_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- ── Row-Level Security: tenant isolation enforced by the database ──────
-- The app sets `app.gym_id` (tenant work) or `app.bypass = 'on'` (platform work) per transaction.
-- With neither set, these tables return no rows and reject writes: the default is closed.
CREATE FUNCTION app_gym_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.gym_id', true), '')::uuid $$;

CREATE FUNCTION app_bypass() RETURNS boolean LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('app.bypass', true), '') = 'on' $$;

ALTER TABLE "Gym" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Gym" FORCE ROW LEVEL SECURITY;
CREATE POLICY gym_isolation ON "Gym"
  USING (app_bypass() OR "id" = app_gym_id())
  WITH CHECK (app_bypass() OR "id" = app_gym_id());

ALTER TABLE "GymUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymUser" FORCE ROW LEVEL SECURITY;
CREATE POLICY gymuser_isolation ON "GymUser"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY subscription_isolation ON "Subscription"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY auditlog_select ON "AuditLog" FOR SELECT
  USING (app_bypass() OR "gymId" = app_gym_id());
-- Anyone may append an audit row (login attempts happen before a tenant exists),
-- but only for their own tenant or as platform-level (gymId NULL) events.
CREATE POLICY auditlog_insert ON "AuditLog" FOR INSERT
  WITH CHECK (app_bypass() OR "gymId" IS NULL OR "gymId" = app_gym_id());
