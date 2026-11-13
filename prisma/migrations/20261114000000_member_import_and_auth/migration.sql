-- Alter User
ALTER TABLE "User"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailVerifiedAt" TIMESTAMPTZ(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMPTZ(3),
  ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3);

-- Alter Gym
ALTER TABLE "Gym"
  ADD COLUMN "logo" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pinCode" TEXT,
  ADD COLUMN "gstNumber" TEXT,
  ADD COLUMN "operatingHours" JSONB;

-- Alter GymUser
ALTER TABLE "GymUser"
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "dateOfBirth" DATE,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "emergencyContact" TEXT,
  ADD COLUMN "notes" TEXT;

-- MemberImportJob
CREATE TABLE "MemberImportJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "gymId" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "totalRecords" INTEGER NOT NULL DEFAULT 0,
  "validRecords" INTEGER NOT NULL DEFAULT 0,
  "invalidRecords" INTEGER NOT NULL DEFAULT 0,
  "duplicateRecords" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "errors" JSONB,
  "summary" JSONB,
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberImportJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberImportJob_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MemberImportJob_gymId_createdAt_idx" ON "MemberImportJob"("gymId", "createdAt");

-- MemberCredentialBatch
CREATE TABLE "MemberCredentialBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "gymId" UUID NOT NULL,
  "generatedByUserId" UUID NOT NULL,
  "credentialsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MemberCredentialBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberCredentialBatch_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "MemberCredentialBatch_gymId_createdAt_idx" ON "MemberCredentialBatch"("gymId", "createdAt");

-- EmailVerificationToken
CREATE TABLE "EmailVerificationToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailVerificationToken_userId_createdAt_idx" ON "EmailVerificationToken"("userId", "createdAt");
CREATE INDEX "EmailVerificationToken_email_createdAt_idx" ON "EmailVerificationToken"("email", "createdAt");

-- PasswordResetToken
CREATE TABLE "PasswordResetToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "usedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- RLS Enforcement
ALTER TABLE "MemberImportJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MemberImportJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY member_import_job_isolation ON "MemberImportJob"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

ALTER TABLE "MemberCredentialBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MemberCredentialBatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY member_credential_batch_isolation ON "MemberCredentialBatch"
  USING (app_bypass() OR "gymId" = app_gym_id())
  WITH CHECK (app_bypass() OR "gymId" = app_gym_id());

