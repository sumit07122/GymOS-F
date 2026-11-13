# FIXIA GymOS — Project Context

Single source of truth for architecture, decisions and progress. Update it with every milestone.

## Status

| # | Milestone | State |
|---|-----------|-------|
| 1 | Foundation, database, authentication, security | **Complete** (see "Verification") |
| 2 | Public site, registration, FIXIA Admin, subscriptions | Implemented; database verification pending |
| 3 | Owner dashboard, members, memberships | Implemented; database verification pending |
| 4 | Payments, dues, receipts, QR attendance | Implemented; database verification pending |
| 5 | Member portal | Implemented; database verification pending |
| 6 | Testing, deployment, pilot readiness | In progress; blocked on PostgreSQL and provider setup |

## Architecture

Modular monolith in one Next.js app. Server code lives in `src/server/*`; `src/app/*` is UI and server actions only
(a test forbids importing the raw DB client from `src/app`).

**Tenancy** — shared database, `gymId` on every tenant table. The tenant id comes only from the authenticated
session, never from request input. Enforcement is layered:
1. `withTenant(gymId, fn)` opens a transaction and sets `app.gym_id` (transaction-local).
3. PostgreSQL row-level security (`FORCE`d) on `Gym`, `GymUser`, `Subscription`, `MembershipPlan`, `Membership`,
   `Payment`, `PaymentCorrection`, `Attendance`, and `AuditLog` filters every query to that gym. Registration requests
   are separately restricted to platform transactions. Without the matching context these tables fail closed.
4. `withPlatform(fn)` sets `app.bypass` for cross-tenant work (login lookups, FIXIA admin, audit appends). A test
   restricts which modules may call it (`tests/integration/platform-usage.test.ts`); adding one is a security review.

**Every new tenant table** must: carry `gymId`, enable+force RLS with the same policy shape, and get a cross-tenant
test in `tests/integration/tenancy.test.ts`.

**Database roles** — migrations run as the schema owner (`DIRECT_URL`). The app runs as `gymos_app`
(`prisma/roles.sql`: no superuser, no BYPASSRLS, no UPDATE/DELETE on `AuditLog`). On Neon, the default owner role can
bypass RLS, so the separate role is mandatory. Use Neon's pooled host for `DATABASE_URL`, the direct host for `DIRECT_URL`.

**Authentication**
- Platform admin and gym owner: email + password (argon2id, OWASP-minimum parameters, timing-equalised lookups).
- Member: phone + OTP. 6 digits, HMAC-stored, 5-minute expiry, 5 attempts, single use (atomic), newest code wins.
  Resend cooldown 60 s; 5 codes/phone/hour; 20 requests/IP/hour; 10 verifications/phone and 30/IP per 15 min.
  The response never reveals whether a number is registered. Members of non-active gyms get no code and cannot log in.
- Sessions: opaque 256-bit token in an httpOnly, SameSite=Lax cookie (`__Host-` prefixed in production); only its
  SHA-256 is stored. Absolute / idle limits: admin 12 h / 2 h, owner 14 d / 3 d, member 30 d / 14 d.
- Authorization is recomputed from the database on every request (`resolveContext`): role from `GymUser`, gym state from
  `Gym` + `Subscription`. Nothing about authority is trusted from the cookie or client. Pages **and** server actions call
  `requirePlatformAdmin()` / `requireGym()`; layouts are never the only check.
- Gym access states (`src/server/subscriptions/access.ts`): `ACTIVE`, `PENDING`, `EXPIRED`, `SUSPENDED`.

**Money** — `Decimal(12,2)` in PostgreSQL and Prisma `Decimal` for calculations. `formatInr` formats display values
without converting through binary floating point.

**Audit** — append-only `AuditLog` (DB-level: app role cannot update/delete). `auditTx(tx, …)` inside business
transactions; `audit(…)` for standalone events. Phone numbers are masked; secrets are never logged.

## Decisions I made (technical authority)
- Tokens/sessions hand-rolled (small, fully tested) instead of an auth framework: the OTP + multi-tenant rules do not fit one cleanly.
- Fonts via `@fontsource-variable/*` (self-hosted) instead of Google Fonts.
- `#1BC95A` is an accent only; white text on it fails contrast. Buttons use deep green `#167A45` (AA).
- UI primitives are hand-written (`src/components/ui.tsx`); the shadcn CLI could not run in the build sandbox. Radix/shadcn
  components can be added when a screen needs them (dialogs, popovers, tables).
- `SMS_PROVIDER=console` is refused when `NODE_ENV=production`. Real delivery is not implemented yet (see Open items).

## Business assumptions to confirm (yours to decide)
1. **Expired subscription** is treated like pending: owner keeps limited access (login + profile), members are blocked.
   There is no grace period.
2. **Suspended** gyms: owners and members see only the account-status screen.
3. A user can own/belong to several gyms; they choose one after login. A gym may have several owners (not restricted).
4. Session lifetimes above.

## Verification
- `npm run typecheck` passes after the full implementation.
- `npm run lint` passes after the initial feature implementation; rerun after final edits before release.
- `npm run build` succeeds and enumerates all public, admin, owner, member, and receipt routes.
- `prisma generate` validates the current Prisma schema.
- Browser review confirmed the public landing and registration form render at localhost.
- The integration suite is expanded to replay every migration and cover the new workflows, but it has not run in this
  environment: no PostgreSQL service, `psql`, or Docker runtime is available. `npm test` fails during global setup with
  `ECONNREFUSED localhost:5432` before test execution.
- Earlier Milestone 1 verification in the authoring sandbox reported 73 automated tests and 17 smoke checks passing:
  RLS isolation (read/write/move across tenants, fail-closed, pooled-connection leakage), append-only audit, DB
  constraints, session lifecycle, password login + throttling, OTP (single-use under 8 parallel submissions, attempt
  lock, expiry, replacement, ineligible gyms, gym selection), authorization matrix, tenant-bypass allow-list.
- Those earlier checks predate the new operations migrations and do not verify the current expanded MVP.

**Release gates still required:**
- Apply all migrations to PostgreSQL 16, run `npm test`, `npm run db:drift`, and rerun CI build/lint/typecheck.
- Exercise admin, owner, and member flows against that database, including RLS cross-tenant attempts and printed QR
  check-in on a camera-enabled HTTPS device.
- Configure production database roles, admin bootstrap, HTTPS, backup/restore, and monitoring.

## Open items / risks
- **OTP delivery**: real SMS transport and the approved MSG91/DLT template are not configured. Production member login
  remains disabled until provider credentials and the approved template are supplied.
- **Registration contact**: requests are stored for FIXIA review; automated email verification and email notifications
  are not implemented. FIXIA must contact applicants out of band.
- **Platform admin hardening**: admin sessions can reach every tenant. Add TOTP 2FA before pilot (M6).
- Rate limits are per phone/email/IP; an attacker can temporarily lock a specific owner's login by hammering their email.
- Request timing can still hint whether a phone is registered (DB write + SMS call). Acceptable for MVP; revisit if needed.
- Owners can be added and have passwords reset by FIXIA Admin; self-service password recovery is not built.
- Existing subscription access assumptions remain unchanged: pending/expired owners retain limited access; members are
  blocked; suspended gyms are blocked; there is no grace period.
