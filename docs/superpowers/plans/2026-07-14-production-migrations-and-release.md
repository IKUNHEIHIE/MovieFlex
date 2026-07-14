# Production Migrations and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace schema push deployment with an auditable Prisma migration baseline and a reproducible release verification procedure.

**Architecture:** Keep `prisma/schema.prisma` as the single schema source. Generate a checked-in initial MySQL migration from that schema, use `prisma migrate deploy` before application startup, and document a separate baseline procedure for databases previously created with `db push`. Add package scripts so CI and operators invoke the same validation commands.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, MySQL/MariaDB, npm, Vitest.

## Global Constraints

- Production database deployment uses `prisma migrate deploy`; `prisma db push` is not a production release step.
- A pre-existing database must be backed up, schema-compared, and marked as already applied only after it matches the generated initial migration.
- Test, lint, production build, migration status, and protected-route checks must be executable commands.
- Never include `DATABASE_URL`, `AUTH_SECRET`, Kafka broker credentials, or `MOVIEFLEX_OUTBOX_TOKEN` values in source, logs, tests, or documentation examples.

---

## File Structure

- `prisma/migrations/<timestamp>_initial_schema/migration.sql`: Immutable SQL representation of the current Prisma schema.
- `prisma/migrations/migration_lock.toml`: Prisma migration provider lock generated with the migration.
- `package.json`: Canonical test, Prisma validation, and deployment scripts.
- `.env.example`: Complete list of required production configuration variable names without real values.
- `README.md`: Development, first deployment, existing-database baseline, release, worker, and rollback-safe operational commands.
- `docs/runbooks/production-release.md`: Repeatable pre-deploy, deploy, smoke-test, and incident response checklist.

### Task 1: Add canonical test and Prisma scripts

**Files:**
- Modify: `package.json:5-10`

**Interfaces:**
- Produces `npm test`, `npm run db:generate`, `npm run db:migrate:deploy`, and `npm run db:migrate:status` for all later tasks and release automation.

- [ ] **Step 1: Confirm the existing scripts and Prisma CLI version**

Run: `node -p "require('./package.json').scripts" && npx prisma --version`

Expected: Existing scripts include `dev`, `build`, `start`, and `lint`; Prisma CLI reports the version locked in `package-lock.json`.

- [ ] **Step 2: Add the failing command contract to the release checklist**

Record these commands as required commands in the task notes before changing `package.json`:

```text
npm test
npm run db:generate
npm run db:migrate:status
npm run lint
npm run build
```

- [ ] **Step 3: Add the minimal scripts**

Update the `scripts` object to contain the following entries while preserving existing scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "prisma generate",
  "db:validate": "prisma validate",
  "db:migrate:deploy": "prisma migrate deploy",
  "db:migrate:status": "prisma migrate status"
}
```

- [ ] **Step 4: Verify the non-mutating commands**

Run: `npm test && npm run db:validate`

Expected: Vitest completes using the default test discovery rules and Prisma reports that `prisma/schema.prisma` is valid. Do not run `db:migrate:deploy` against a shared database in this step.

- [ ] **Step 5: Commit the scripts**

```bash
git add package.json package-lock.json
git commit -m "build: add test and prisma scripts"
```

### Task 2: Generate and validate the immutable initial migration

**Files:**
- Create: `prisma/migrations/<timestamp>_initial_schema/migration.sql`
- Create: `prisma/migrations/migration_lock.toml`
- Modify: `prisma/schema.prisma` only if Prisma validation identifies a schema issue required for migration generation.

**Interfaces:**
- Consumes the current complete `prisma/schema.prisma` MySQL schema.
- Produces a migration history that `npm run db:migrate:deploy` can apply to an empty MySQL/MariaDB database.

- [ ] **Step 1: Validate the schema before emitting migration SQL**

Run: `npm run db:validate && npm run db:generate`

Expected: Both commands exit 0. Stop and correct only schema errors that prevent Prisma from describing the current schema; do not opportunistically redesign models in this migration task.

- [ ] **Step 2: Create the migration from the current schema**

Run the following against a disposable empty development database set in `DATABASE_URL`:

```bash
npx prisma migrate dev --name initial_schema
```

Expected: Prisma creates `prisma/migrations/<timestamp>_initial_schema/migration.sql` and `prisma/migrations/migration_lock.toml`, applies the migration to the disposable database, and regenerates Prisma Client.

- [ ] **Step 3: Inspect the generated migration for complete current-schema coverage**

Run: `git diff -- prisma/migrations prisma/schema.prisma`

Expected: The SQL creates all current schema tables, foreign keys, named indexes, unique constraints, defaults, JSON columns, and `EventOutbox`. There must be no hand-written destructive `DROP TABLE`, `DROP COLUMN`, or secret values.

- [ ] **Step 4: Prove a clean database can deploy the migration**

Create a second empty disposable database, set `DATABASE_URL` to it, then run:

```bash
npm run db:migrate:deploy
npm run db:migrate:status
```

Expected: `migrate deploy` applies exactly the initial migration; `migrate status` reports the database schema is up to date.

- [ ] **Step 5: Commit only the generated migration artifacts and required schema correction**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "db: add initial prisma migration"
```

### Task 3: Document configuration and existing-database baselining

**Files:**
- Modify: `.env.example`
- Modify: `README.md:47-67`
- Create: `docs/runbooks/production-release.md`

**Interfaces:**
- Consumes `npm run db:migrate:deploy`, `npm run db:migrate:status`, and the generated initial migration.
- Produces an operator-safe path for both empty and `db push`-created databases.

- [ ] **Step 1: Add all required variable names to the sample environment file**

Ensure `.env.example` has placeholders only:

```dotenv
DATABASE_URL="mysql://movieflex:change-me@127.0.0.1:3306/movieflex"
AUTH_SECRET="replace-with-a-long-random-secret"
KAFKA_BROKER="localhost:9092"
MOVIEFLEX_OUTBOX_TOKEN="replace-with-a-long-random-token"
```

- [ ] **Step 2: Replace production `db push` documentation with migration deployment**

Replace the production database section in `README.md` with this command sequence:

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:migrate:status
npm test
npm run lint
npm run build
npm run start
```

State explicitly that `npx prisma db push` is permitted only for throwaway local development databases and is never part of the production release procedure.

- [ ] **Step 3: Add the existing-database baseline procedure**

Write the following exact guarded procedure in `README.md` and `docs/runbooks/production-release.md`:

```bash
# 1. Back up the target database using the platform-approved backup command.
# 2. Run against a staging clone first, never the only production copy.
npm run db:generate
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema prisma/schema.prisma --script
# Continue only when the diff is empty or has been reviewed and corrected.
npx prisma migrate resolve --applied <timestamp>_initial_schema
npm run db:migrate:status
```

Document that `<timestamp>_initial_schema` must exactly match the generated migration directory name, and that `migrate resolve --applied` must not be used when the diff shows drift.

- [ ] **Step 4: Add release smoke checks with explicit expected results**

Add this section to `docs/runbooks/production-release.md`:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/api/internal/health
curl --include http://127.0.0.1:3000/api/admin/outbox/retry
```

Document expected outcomes: health returns JSON without secrets and a 200 or documented degraded status; an unauthenticated protected admin route returns 401 after the authorization plan is implemented, never a successful privileged response.

- [ ] **Step 5: Commit the release documentation**

```bash
git add .env.example README.md docs/runbooks/production-release.md
git commit -m "docs: document migration-first releases"
```

### Task 4: Run the release gate in a clean install

**Files:**
- Modify: `README.md` only if command results reveal an inaccurate documented command.

**Interfaces:**
- Consumes all scripts, migration artifacts, and runbook steps from Tasks 1-3.
- Produces verified release instructions.

- [ ] **Step 1: Install locked dependencies in a clean checkout or clean dependency directory**

Run: `npm ci`

Expected: Dependencies install strictly from `package-lock.json` without adding untracked dependency changes.

- [ ] **Step 2: Verify generated client and migration status against the disposable verification database**

Run: `npm run db:generate && npm run db:migrate:deploy && npm run db:migrate:status`

Expected: Generation succeeds, no unapplied migrations remain, and no migration files are modified by these commands.

- [ ] **Step 3: Run the release quality gate**

Run: `npm test && npm run lint && npm run build`

Expected: Every command exits 0. Any failure blocks release and must be fixed in the relevant task, not ignored in the runbook.

- [ ] **Step 4: Commit only an accuracy correction, if required**

```bash
git add README.md docs/runbooks/production-release.md
git commit -m "docs: correct release verification"
```

Only create this commit when Task 4 changed documentation.

## Plan Review

- Spec coverage: migration baseline and `migrate deploy` are Tasks 2-3; unified test entry and release gates are Tasks 1 and 4; configuration and protected-route HTTP checks are Task 3.
- Intentional boundary: authentication, SSRF, outbox implementation, and health route code are implemented in the companion plans, while this plan documents their final operational commands.
- Placeholder scan: all commands requiring a generated migration name use the literal directory placeholder only where Prisma creates the timestamp; operators are instructed to substitute the actual generated directory name.
- Type consistency: this plan introduces no application runtime interfaces.
