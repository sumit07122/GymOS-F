CREATE TYPE "RegistrationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "GymRegistrationRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gymName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" "RegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedByUserId" UUID,
    CONSTRAINT "GymRegistrationRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GymRegistrationRequest_text_lengths_check" CHECK (
      length(trim("gymName")) BETWEEN 2 AND 100 AND
      length(trim("ownerName")) BETWEEN 2 AND 80 AND
      "ownerEmail" = lower("ownerEmail") AND
      "ownerPhone" ~ '^\+[1-9][0-9]{7,14}$'
    ),
    CONSTRAINT "GymRegistrationRequest_review_check" CHECK (
      ("status" = 'PENDING' AND "reviewedAt" IS NULL AND "reviewedByUserId" IS NULL) OR
      ("status" <> 'PENDING' AND "reviewedAt" IS NOT NULL AND "reviewedByUserId" IS NOT NULL)
    )
);
CREATE INDEX "GymRegistrationRequest_status_createdAt_idx" ON "GymRegistrationRequest"("status", "createdAt");

ALTER TABLE "GymRegistrationRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GymRegistrationRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY registration_platform_only ON "GymRegistrationRequest"
  USING (app_bypass())
  WITH CHECK (app_bypass());