CREATE TYPE "MemberMembershipStatus" AS ENUM ('ACTIVE', 'CANCELLED');
CREATE TYPE "MemberPaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER');

ALTER TABLE "GymUser" ADD COLUMN "displayName" TEXT;
ALTER TABLE "Gym" ADD COLUMN "attendanceToken" TEXT NOT NULL DEFAULT (gen_random_uuid()::text);
CREATE UNIQUE INDEX "Gym_attendanceToken_key" ON "Gym"("attendanceToken");

CREATE TABLE "MembershipPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceInr" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipPlan_gymId_id_key" UNIQUE ("gymId", "id"),
    CONSTRAINT "MembershipPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MembershipPlan_price_check" CHECK ("priceInr" >= 0),
    CONSTRAINT "MembershipPlan_duration_check" CHECK ("durationDays" > 0)
);
CREATE INDEX "MembershipPlan_gymId_active_idx" ON "MembershipPlan"("gymId", "active");

CREATE TABLE "Membership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "priceInr" DECIMAL(12,2) NOT NULL,
    "status" "MemberMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Membership_gymId_id_key" UNIQUE ("gymId", "id"),
    CONSTRAINT "Membership_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_gymId_userId_fkey" FOREIGN KEY ("gymId", "userId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_gymId_planId_fkey" FOREIGN KEY ("gymId", "planId") REFERENCES "MembershipPlan"("gymId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_period_check" CHECK ("endsAt" > "startsAt"),
    CONSTRAINT "Membership_price_check" CHECK ("priceInr" >= 0)
);
CREATE INDEX "Membership_gymId_userId_endsAt_idx" ON "Membership"("gymId", "userId", "endsAt");
CREATE INDEX "Membership_gymId_planId_idx" ON "Membership"("gymId", "planId");

CREATE TABLE "Payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "amountInr" DECIMAL(12,2) NOT NULL,
    "method" "MemberPaymentMethod" NOT NULL,
    "reference" TEXT,
    "recordedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "voidedByUserId" UUID,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Payment_gymId_id_key" UNIQUE ("gymId", "id"),
    CONSTRAINT "Payment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_gymId_userId_fkey" FOREIGN KEY ("gymId", "userId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_gymId_membershipId_fkey" FOREIGN KEY ("gymId", "membershipId") REFERENCES "Membership"("gymId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_amount_check" CHECK ("amountInr" > 0),
    CONSTRAINT "Payment_void_check" CHECK (("voidedAt" IS NULL AND "voidReason" IS NULL AND "voidedByUserId" IS NULL) OR ("voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND "voidedByUserId" IS NOT NULL))
);
CREATE INDEX "Payment_gymId_userId_createdAt_idx" ON "Payment"("gymId", "userId", "createdAt");
CREATE INDEX "Payment_gymId_membershipId_idx" ON "Payment"("gymId", "membershipId");

CREATE TABLE "PaymentCorrection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "amountBefore" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentCorrection_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentCorrection_paymentId_key" UNIQUE ("paymentId"),
    CONSTRAINT "PaymentCorrection_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentCorrection_gymId_paymentId_fkey" FOREIGN KEY ("gymId", "paymentId") REFERENCES "Payment"("gymId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentCorrection_reason_check" CHECK (length(trim("reason")) > 0)
);
CREATE INDEX "PaymentCorrection_gymId_createdAt_idx" ON "PaymentCorrection"("gymId", "createdAt");

CREATE TABLE "Attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "localDate" DATE NOT NULL,
    "checkedInAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attendance_gymId_userId_localDate_key" UNIQUE ("gymId", "userId", "localDate"),
    CONSTRAINT "Attendance_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_gymId_userId_fkey" FOREIGN KEY ("gymId", "userId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Attendance_gymId_localDate_checkedInAt_idx" ON "Attendance"("gymId", "localDate", "checkedInAt");
CREATE INDEX "Attendance_gymId_userId_checkedInAt_idx" ON "Attendance"("gymId", "userId", "checkedInAt");

ALTER TABLE "MembershipPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_plan_isolation ON "MembershipPlan"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_isolation ON "Membership"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_isolation ON "Payment"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "PaymentCorrection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentCorrection" FORCE ROW LEVEL SECURITY;
CREATE POLICY payment_correction_isolation ON "PaymentCorrection"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_isolation ON "Attendance"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());