# FIXIA GymOS production-readiness checklist

This checklist separates what the application already supports from external services and operational controls still
needed before real gyms and members rely on it. Do not put credentials in source code or commit a populated `.env`.

## Required before a real-gym pilot

### 1. Production PostgreSQL

- Provision PostgreSQL 16 (managed hosting is recommended).
- Set `DATABASE_URL` to the pooled runtime connection and `DIRECT_URL` to the direct migration connection.
- Apply all Prisma migrations with the schema-owner role: `npm run db:migrate`.
- Create and verify the restricted `gymos_app` runtime role from `prisma/roles.sql`. The application role must not own
  tenant tables, be a superuser, or have `BYPASSRLS`.
- Run `npm test` with `TEST_ADMIN_URL`, then `npm run db:drift`.
- Configure automated backups and test a restore before onboarding customers.

### 2. SMS delivery for member OTP

Member authentication requires real SMS in production. The current console provider is development-only; production
does not deliver OTPs.

- Select an Indian SMS provider (for example MSG91 or another DLT-compliant provider).
- Register the sender ID, DLT entity, and approved OTP message template. Complete any required operator approvals.
- Implement the provider adapter in `src/server/sms.ts`; verify provider signatures/responses and handle timeouts,
  throttling, and delivery failures without logging OTPs.
- Store provider API keys in the deployment platform's secret manager, not in code or a committed `.env`.
- Add delivery monitoring and alerting. Test expired, invalid, throttled, failed-delivery, and successful OTP flows.

**Resend is an email service, not an SMS provider.** It cannot deliver member OTPs by itself. Use a compliant SMS
provider for OTP. Resend may be integrated separately for email notifications described below.

### 3. Admin bootstrap and account security

- Generate the first FIXIA Admin using `npm run admin:create` with `ADMIN_EMAIL`, `ADMIN_NAME`, and
  `ADMIN_PASSWORD` supplied only in the local process/deployment secret store.
- Use a unique strong password and rotate it after bootstrap. There are intentionally no shared/default credentials.
- Add TOTP-based MFA for platform admins before a customer pilot. The current project documentation identifies this as
  an open hardening item.
- Document secure owner provisioning, temporary-password delivery, password reset, and account-recovery procedures.

### 4. HTTPS and deployment secrets

- Deploy behind HTTPS and configure the production host, secure cookie behavior, and trusted proxy/IP settings.
- Set a unique random `OTP_SECRET` of at least 32 characters and the production `DATABASE_URL`; configure SMS-provider
  secrets after the adapter is implemented.
- Keep secrets in the host's secret manager. Restrict access, rotate them, and ensure logs/build output do not expose
  them.
- Confirm production build, typecheck, lint, migration deployment, and a smoke test in the actual deployment environment.

### 5. End-to-end acceptance and isolation

- Run the expanded test suite against a clean PostgreSQL database with all migrations applied.
- Verify FIXIA registration review, gym creation, plan setup, activation, renewal, suspension, and reactivation.
- Verify owner workflows: member creation/edit/deactivation, plan assignment/renewal, partial/full payment, correction,
  receipts, reports, and QR attendance.
- Verify member OTP sign-in, gym selection, membership/dues/history, receipts, profile, and QR scan on a camera-enabled
  HTTPS device.
- Attempt cross-gym reads and writes with two separate gyms and confirm they fail closed under the restricted runtime
  role. Test duplicate attendance and concurrent payment attempts.

## Needed for a dependable commercial launch

### Email and customer communications

- Integrate an email provider such as Resend for registration-request acknowledgments, owner onboarding, password-reset
  instructions, subscription-expiry notices, and operational notifications.
- Verify a sending domain and SPF, DKIM, and DMARC records. Use verified templates and avoid sending temporary
  passwords or OTPs in plain email; prefer short-lived setup links.
- Add bounce/complaint handling, delivery logs, and retry policy. Keep email optional until product and legal copy are
  approved.

### Monitoring and incident response

- Add structured error reporting and uptime monitoring with alerts for database, SMS, and application failures.
- Define retention and redaction rules for personal information in logs; never log OTPs, passwords, session tokens, or
  payment credentials.
- Write an incident-response and customer-support runbook, including account suspension and data-access procedures.

### Privacy, legal, and operations

- Review applicable Indian privacy requirements and publish approved Terms of Service, Privacy Policy, data-retention
  rules, and support/contact details.
- Document data export/deletion and gym offboarding. Verify retention rules for audit and payment records with counsel.
- Confirm subscription billing and renewal operations outside GymOS; the initial product records FIXIA-managed
  subscriptions but does not itself collect subscription payments.

## Not currently integrated

- Production SMS provider and approved DLT OTP template.
- Transactional email provider (Resend or equivalent).
- Admin MFA/TOTP.
- Automated backup-restore validation, monitoring/alerting, and production incident procedures.
- A production deployment configuration and real-customer end-to-end sign-off.

