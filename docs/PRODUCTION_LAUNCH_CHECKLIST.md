# FIXIA GymOS — Pre-Launch Checklist

Use this checklist before opening the platform to public gym signups and live member attendance.

---

### Phase 1: Environment & Secrets Configuration (Vercel)

- [x] **DATABASE_URL**: Set to Neon pooled connection string with `gymos_app` user.
- [x] **DIRECT_URL**: Set to Neon direct connection string with `gym_owner` user.
- [x] **OTP_SECRET**: 64-character cryptographic random hex key configured.
- [x] **RESEND_API_KEY**: Active Resend API key configured.
- [x] **EMAIL_FROM**: Sender configured (e.g. `FIXIA GymOS <onboarding@resend.dev>` or verified domain).
- [ ] **Custom Domain**: Connect your brand domain (e.g., `gymos.fixia.in`) in Vercel Project Settings.
- [ ] **DNS Records**: Configure SPF, DKIM, and DMARC records in your DNS provider for the verified sending domain in Resend.

---

### Phase 2: Database Operations & Backups

- [x] **Prisma Migrations Applied**: All 16 database tables active in Neon PostgreSQL.
- [x] **Restricted Application Role**: `gymos_app` created with `NOBYPASSRLS` and table grants.
- [x] **Audit Trail Immutability**: App role permissions verified (no UPDATE/DELETE on `AuditLog`).
- [x] **Financial Ledger Immutability**: Direct payment amount modification revoked; corrections append-only.
- [ ] **Automated Backups**: Verify daily automated snapshots are active in the Neon Console.

---

### Phase 3: Identity & Multi-Tenant Access

- [x] **Platform Super Admin Bootstrapped**: `admin@fixia.in` ready for initial gym approvals.
- [x] **Sample / Pilot Gym Created**: Matrix Gym (`owner@matrixgym.in`) active with sample plans.
- [x] **Tenant Boundary Verification**: Multi-tenant isolation verified; RLS fails closed when unscoped.
- [ ] **Admin MFA**: Add TOTP 2FA for Platform Admins prior to broad onboarding.

---

### Phase 4: Member Authentication & SMS Gateway

- [x] **Staging OTP Delivery**: `SMS_PROVIDER="console"` logs OTP codes to Vercel Runtime Logs for testing.
- [ ] **DLT Registration (India)**: Register Entity ID and Sender Header on DLT portal (Jio / Airtel / Vi).
- [ ] **Approved OTP Template**: Submit the standard 6-digit OTP template for operator approval.
- [ ] **SMS Gateway Adapter**: Plug in production MSG91 / Fast2SMS credentials in `src/server/sms.ts`.

---

### Phase 5: Storage & Media

- [x] **S3 Storage Client**: Tenant-isolated presigned URL generator implemented (`src/server/storage.ts`).
- [ ] **Neon Storage Credentials**: Copy `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY` from the Neon Storage `.env` tab to Vercel Environment Variables.
- [ ] **Bucket Policy**: Ensure `"uploads"` bucket permits presigned PUT/GET access.

---

### Phase 6: Operational & Health Monitoring

- [x] **Health Check Route**: `/api/health` live and responding with database latency.
- [ ] **Uptime Monitor**: Set up an external ping monitor (e.g. BetterStack, UptimeRobot) pointing to `https://gymos-umber-nine.vercel.app/api/health`.
- [ ] **Error Tracking**: Configure Sentry or Vercel Monitoring for unhandled server-side exceptions.

