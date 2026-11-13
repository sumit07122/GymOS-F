# FIXIA GymOS

Multi-tenant gym-management SaaS for India. Next.js (App Router) · TypeScript · Prisma/PostgreSQL · Tailwind.
Status and decisions: [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md).

## Local setup

```bash
npm install
cp .env.example .env            # fill DATABASE_URL, DIRECT_URL, OTP_SECRET
createdb gymos
npx prisma migrate deploy       # runs as the schema owner (DIRECT_URL)
psql "$DIRECT_URL" -f prisma/roles.sql   # creates the restricted runtime role; edit its password first
ADMIN_EMAIL=you@fixia.in ADMIN_NAME="Your Name" ADMIN_PASSWORD='at-least-10-chars' npm run admin:create
npm run dev
```

The app connects as `gymos_app` (a role that cannot bypass row-level security); migrations run as the owner.
Re-run `prisma/roles.sql` after any migration that adds tables.

## Quality gates

```bash
npm run typecheck && npm run lint
npm test            # needs a local Postgres superuser: TEST_ADMIN_URL (default postgres:postgres@localhost)
npm run build
```

Tests build a throwaway `gymos_test` database from the real migration files.
`scripts/smoke.mjs` drives a running app over HTTP (see its header for the environment it needs).
