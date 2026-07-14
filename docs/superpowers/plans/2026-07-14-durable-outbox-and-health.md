# Durable Outbox and Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make behavior events transactionally durable, asynchronously delivered by one continuous worker, and observable through a secret-free health endpoint.

**Architecture:** HTTP requests persist business changes and an `EventOutbox` row in one Prisma transaction, then return without waiting for Kafka. A separately started worker atomically leases due rows, sends their stable IDs to Kafka, transitions them with bounded exponential retry, and writes a heartbeat. Health reports database reachability, queue backlog, recent delivery failures, and heartbeat freshness while treating Kafka loss as degraded rather than a user-request failure.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Prisma/MySQL, KafkaJS, Node.js worker process, Vitest.

## Global Constraints

- Kafka unavailability must not make a valid behavior event request fail after its database transaction commits.
- Business state and its outbox row are written in the same Prisma transaction.
- The worker is the only continuous automatic retry mechanism; admin and internal retry endpoints are manual recovery triggers only.
- Delivery is at-least-once: payloads have a stable `event_id`, and consumers must deduplicate by that ID.
- Every claimed event has an expiring lease so a crashed worker cannot permanently strand it.
- Retry delay uses bounded exponential backoff with jitter; terminal failures remain observable and manually recoverable.
- Health responses contain no secrets, broker URLs, database URLs, tokens, raw Kafka errors, or stack traces.
- Tests mock Prisma, Kafka, time, process signals, and Auth.js; no test needs live MySQL or Kafka.

---

## File Structure

- `prisma/schema.prisma`: Typed outbox status, lease, and worker heartbeat persistence models.
- `prisma/migrations/<timestamp>_durable_outbox/migration.sql`: Schema evolution from the initial migration.
- `src/lib/outbox.ts`: Transaction-safe insert, atomic claim, transition, retry, and metrics functions.
- `src/lib/outbox.test.ts`: Delivery state-machine and transaction behavior tests.
- `src/lib/kafka.ts`: Producer lifecycle, send result, reconnection, and explicit disconnect.
- `src/lib/kafka.test.ts`: Kafka success/failure/reset tests.
- `src/lib/outbox-worker.ts`: Single polling cycle, heartbeat, and signal-safe worker loop.
- `src/worker/outbox.ts`: CLI worker entry point.
- `src/lib/outbox-worker.test.ts`: Leasing, backoff, duplicate avoidance, and shutdown tests.
- `src/app/api/internal/health/route.ts`: Liveness/readiness status payload.
- `src/app/api/internal/health/route.test.ts`: Health status and secrecy tests.
- `src/app/api/events/route.ts`: Transactionally creates the behavior outbox row.
- `src/app/api/admin/outbox/retry/route.ts` and `src/app/api/internal/outbox/retry/route.ts`: Manual recovery only.
- `src/app/admin/dashboard/page.tsx`: Backlog and delivery state visibility.
- `package.json`, `.env.example`, `README.md`, `docs/runbooks/production-release.md`: Worker command, configuration, deployment, and recovery instructions.

### Task 1: Add a leaseable, observable outbox schema migration

**Files:**
- Modify: `prisma/schema.prisma:236-249`
- Create: `prisma/migrations/<timestamp>_durable_outbox/migration.sql`
- Modify: `prisma/migrations/migration_lock.toml` only if Prisma generates a provider update.

**Interfaces:**
- Produces these Prisma models and types for all later tasks:

```prisma
enum EventOutboxStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
}

model EventOutbox {
  id           String            @id @db.VarChar(36)
  topic        String            @db.VarChar(100)
  payload      Json
  status       EventOutboxStatus @default(PENDING)
  attempts     Int               @default(0)
  lastError    String?           @db.VarChar(500)
  availableAt  DateTime          @default(now())
  lockedBy     String?           @db.VarChar(100)
  leaseUntil   DateTime?
  deliveredAt  DateTime?
  failedAt     DateTime?
  createdAt    DateTime          @default(now())

  @@index([status, availableAt], name: "idx_outbox_status_available")
  @@index([status, leaseUntil], name: "idx_outbox_status_lease")
}

model WorkerHeartbeat {
  workerName String   @id @db.VarChar(100)
  lastSeenAt DateTime
  updatedAt  DateTime @updatedAt
}
```

- [ ] **Step 1: Write a migration-shape assertion**

Create a schema test or migration inspection test that verifies the generated SQL includes `PROCESSING`, `FAILED`, `lockedBy`, `leaseUntil`, `failedAt`, the lease index, and `WorkerHeartbeat`. The test must read the migration file, not a live database.

- [ ] **Step 2: Run the test to confirm the migration does not yet exist**

Run: `npx vitest run prisma/migrations/durable-outbox-migration.test.ts`

Expected: FAIL because there is no durable-outbox migration file or required SQL tokens.

- [ ] **Step 3: Update the Prisma schema exactly to the stated contract**

Replace `EventOutbox.status String` with `EventOutboxStatus`, replace `lastError @db.Text` with the bounded `@db.VarChar(500)`, add lease/failure fields and indexes, and add `WorkerHeartbeat` exactly as shown in the interface block. Keep `id` as the externally stable event ID.

- [ ] **Step 4: Generate a migration against a disposable database**

Run: `npx prisma migrate dev --name durable_outbox`

Expected: Prisma creates one new migration after the initial schema migration. Inspect it to confirm it safely transforms the existing `status` column and adds the new table/indexes without dropping `EventOutbox` data.

- [ ] **Step 5: Run schema and migration tests**

Run: `npm run db:validate && npx vitest run prisma/migrations/durable-outbox-migration.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the schema evolution**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "db: add durable outbox state"
```

### Task 2: Implement the outbox state machine and transactional insert

**Files:**
- Modify: `src/lib/outbox.ts`
- Create: `src/lib/outbox.test.ts`

**Interfaces:**
- Produces:

```ts
export const OUTBOX_MAX_ATTEMPTS = 10
export type OutboxTransaction = Pick<Prisma.TransactionClient, 'eventOutbox'>
export async function createOutboxEvent(tx: OutboxTransaction, topic: string, payload: Prisma.InputJsonValue): Promise<string>
export async function claimDueOutboxEvents(workerId: string, limit: number, now: Date): Promise<EventOutbox[]>
export async function markOutboxDelivered(id: string, workerId: string, now: Date): Promise<void>
export async function rescheduleOutboxEvent(id: string, workerId: string, error: unknown, now: Date): Promise<void>
export async function retryFailedOutboxEvents(limit: number): Promise<number>
export async function getOutboxMetrics(now: Date): Promise<{ pending: number; oldestPendingAt: Date | null; recentFailureAt: Date | null }>
```

- `createOutboxEvent` must not send Kafka.
- `claimDueOutboxEvents` returns only rows successfully moved to `PROCESSING` with `lockedBy = workerId` and an unexpired `leaseUntil`.

- [ ] **Step 1: Write failing state-machine tests**

Add tests for these exact assertions:

```ts
it('creates an event through the supplied transaction client', async () => {
  await createOutboxEvent(tx, 'user-behaviors', { event_id: 'event-1' })
  expect(tx.eventOutbox.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ id: expect.any(String), status: 'PENDING' }),
  }))
})

it('moves a failed event to FAILED after the tenth attempt', async () => {
  await rescheduleOutboxEvent('event-1', 'worker-1', new Error('offline'), now)
  expect(mockedUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: 'FAILED', failedAt: now }),
  }))
})
```

Also cover claim conditional updates, expired lease reclamation, delivered rows not being claimed, capped `lastError`, and deterministic fake-timer backoff range.

- [ ] **Step 2: Run tests to prove the old synchronous sender contract is insufficient**

Run: `npx vitest run src/lib/outbox.test.ts`

Expected: FAIL because `createOutboxEvent`, leasing, terminal failure, and metrics exports do not exist.

- [ ] **Step 3: Implement transaction-only creation and safe claiming**

Implement `createOutboxEvent` using the supplied `tx.eventOutbox.create`; generate an ID with `crypto.randomUUID()` and return it. Do not call Kafka here.

For each candidate selected by `findMany`, claim with a conditional update:

```ts
const claimed = await prisma.eventOutbox.updateMany({
  where: {
    id: candidate.id,
    OR: [
      { status: 'PENDING', availableAt: { lte: now } },
      { status: 'PROCESSING', leaseUntil: { lte: now } },
    ],
  },
  data: {
    status: 'PROCESSING',
    lockedBy: workerId,
    leaseUntil: new Date(now.getTime() + 60_000),
  },
})
```

Only re-read and return a candidate when `claimed.count === 1`. This prevents workers from treating an unclaimed row as theirs.

- [ ] **Step 4: Implement delivery and bounded retry transitions**

`markOutboxDelivered` must use `updateMany` conditioned on `{ id, status: 'PROCESSING', lockedBy: workerId }`, clear lease fields, set `DELIVERED`, set `deliveredAt`, and increment `attempts` once.

`rescheduleOutboxEvent` must use the same ownership condition, increment attempts once, truncate `String(error)` to 500 characters, and:

```ts
const delayMs = Math.min(60_000 * 2 ** attempts, 3_600_000) + Math.floor(Math.random() * 30_000)
```

Set `PENDING` and `availableAt = now + delayMs` below attempt 10; otherwise set `FAILED`, `failedAt = now`, and clear the lease.

- [ ] **Step 5: Implement manual failed-event recovery and metrics**

`retryFailedOutboxEvents(limit)` changes up to `limit` `FAILED` rows back to `PENDING` with `attempts: 0`, `availableAt: now`, and cleared error/failure/lease fields. `getOutboxMetrics` counts `PENDING` and `PROCESSING` rows, selects the oldest such row, and selects the newest `failedAt` without returning payloads or errors.

- [ ] **Step 6: Run focused state-machine tests**

Run: `npx vitest run src/lib/outbox.test.ts`

Expected: PASS for transactional creation, atomic claims, owner-only transitions, exponential retry, terminal failure, recovery, and metrics.

- [ ] **Step 7: Commit the outbox state machine**

```bash
git add src/lib/outbox.ts src/lib/outbox.test.ts
git commit -m "feat: add leaseable outbox delivery state"
```

### Task 3: Make Kafka producer failure recoverable

**Files:**
- Modify: `src/lib/kafka.ts`
- Create: `src/lib/kafka.test.ts`

**Interfaces:**
- Produces:

```ts
export async function sendKafkaMessage(topic: string, message: Record<string, unknown>): Promise<boolean>
export async function disconnectKafkaProducer(): Promise<void>
```

- `sendKafkaMessage` preserves the stable `event_id` already in `message` and never adds a replacement ID.

- [ ] **Step 1: Write failing producer lifecycle tests**

Test a successful send, a send error clearing the cached producer, the next send reconnecting, and `disconnectKafkaProducer()` disconnecting once and clearing both cached producer and pending connection state.

- [ ] **Step 2: Run focused tests**

Run: `npx vitest run src/lib/kafka.test.ts`

Expected: FAIL until the disconnect export and failure reset behavior are implemented.

- [ ] **Step 3: Reset failed producers and add explicit teardown**

In the `sendKafkaMessage` catch path, save and clear the cached producer before best-effort `disconnect()`, then return `false`. Implement:

```ts
export async function disconnectKafkaProducer(): Promise<void> {
  const current = producer
  producer = null
  connecting = null
  if (current) await current.disconnect()
}
```

Do not log raw broker URLs, payloads, or credentials.

- [ ] **Step 4: Run Kafka tests**

Run: `npx vitest run src/lib/kafka.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Kafka lifecycle support**

```bash
git add src/lib/kafka.ts src/lib/kafka.test.ts
git commit -m "fix: recover kafka producer after failures"
```

### Task 4: Add a signal-safe continuous outbox worker

**Files:**
- Create: `src/lib/outbox-worker.ts`
- Create: `src/lib/outbox-worker.test.ts`
- Create: `src/worker/outbox.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes Task 2 outbox functions and Task 3 Kafka functions.
- Produces:

```ts
export const OUTBOX_WORKER_NAME = 'outbox-worker'
export async function runOutboxCycle(workerId: string, now: Date): Promise<{ claimed: number; delivered: number; failed: number }>
export async function writeWorkerHeartbeat(workerId: string, now: Date): Promise<void>
export function startOutboxWorker(workerId: string): () => Promise<void>
```

- `src/worker/outbox.ts` calls `startOutboxWorker(process.env.HOSTNAME || OUTBOX_WORKER_NAME)` and exits non-zero when required environment variables are absent.

- [ ] **Step 1: Write failing worker-cycle tests**

Test that the worker sends only leased events, calls `markOutboxDelivered` for a `true` Kafka result, calls `rescheduleOutboxEvent` for `false` or thrown send results, writes a heartbeat every cycle, does not overlap intervals, and on shutdown stops new cycles before calling `disconnectKafkaProducer`.

- [ ] **Step 2: Run worker tests**

Run: `npx vitest run src/lib/outbox-worker.test.ts`

Expected: FAIL because worker exports do not exist.

- [ ] **Step 3: Implement one deterministic cycle**

Implement the core loop:

```ts
export async function runOutboxCycle(workerId: string, now: Date) {
  const events = await claimDueOutboxEvents(workerId, 50, now)
  let delivered = 0
  let failed = 0
  for (const event of events) {
    try {
      const sent = await sendKafkaMessage(event.topic, event.payload as Record<string, unknown>)
      if (sent) {
        await markOutboxDelivered(event.id, workerId, now)
        delivered += 1
      } else {
        await rescheduleOutboxEvent(event.id, workerId, new Error('Kafka delivery failed'), now)
        failed += 1
      }
    } catch (error) {
      await rescheduleOutboxEvent(event.id, workerId, error, now)
      failed += 1
    }
  }
  await writeWorkerHeartbeat(workerId, now)
  return { claimed: events.length, delivered, failed }
}
```

- [ ] **Step 4: Implement heartbeat and non-overlapping poll loop**

Use `prisma.workerHeartbeat.upsert({ where: { workerName: OUTBOX_WORKER_NAME }, create: ..., update: ... })`. Poll every 5 seconds. Guard the interval with an `inFlight` boolean so a slow Kafka call cannot start a concurrent cycle. Register `SIGTERM` and `SIGINT` to clear the interval, await an active cycle, disconnect Kafka, then exit 0.

- [ ] **Step 5: Add the worker start script**

Add this script to `package.json` only after ensuring the existing TypeScript runtime dependency supports it:

```json
"outbox:worker": "tsx src/worker/outbox.ts"
```

If `tsx` is not already installed, add its exact locked dependency and verify `npm ci` remains reproducible.

- [ ] **Step 6: Run focused worker tests and CLI type/build checks**

Run: `npx vitest run src/lib/outbox-worker.test.ts && npm run build`

Expected: PASS and a successful production build.

- [ ] **Step 7: Commit the worker**

```bash
git add src/lib/outbox-worker.ts src/lib/outbox-worker.test.ts src/worker/outbox.ts package.json package-lock.json
git commit -m "feat: add continuous outbox worker"
```

### Task 5: Persist behavior events before responding

**Files:**
- Modify: `src/app/api/events/route.ts`
- Modify: `src/app/api/events/route.test.ts`

**Interfaces:**
- Consumes `createOutboxEvent(tx, 'user-behaviors', payload)` from Task 2.
- Produces a successful behavior event response only after the single Prisma transaction commits; it does not call `sendKafkaMessage` or old synchronous `queueEvent`.

- [ ] **Step 1: Write failing transactional event tests**

Add tests that assert:

```ts
it('writes history, view increment, and outbox event through one transaction', async () => {
  const response = await POST(validPlaybackRequest())
  expect(mockedTransaction).toHaveBeenCalledTimes(1)
  expect(mockedCreateOutboxEvent).toHaveBeenCalledWith(tx, 'user-behaviors', expect.objectContaining({
    event_id: expect.any(String),
  }))
  expect(mockedSendKafkaMessage).not.toHaveBeenCalled()
  expect(response.status).toBe(200)
})
```

Also assert an outbox creation failure rolls back user history/view count and returns a 500 without claiming Kafka delivery status.

- [ ] **Step 2: Run focused event tests**

Run: `npx vitest run src/app/api/events/route.test.ts`

Expected: FAIL because current handler writes business state and queue record separately and synchronously attempts Kafka.

- [ ] **Step 3: Move all event persistence into one transaction**

Build the stable payload, including a single generated `event_id`, before opening the transaction. For authenticated behavior events:

```ts
await prisma.$transaction(async (tx) => {
  await tx.watchHistory.upsert(/* existing userId-scoped behavior */)
  if (shouldIncrementViewCount) await tx.movie.update({ where: { id: movieId }, data: { viewCount: { increment: 1 } } })
  await createOutboxEvent(tx, 'user-behaviors', behaviorEvent)
})
```

For permitted anonymous events, call `createOutboxEvent(tx, ...)` inside their own `$transaction`. Return `{ success: true }`; remove `kafkaDelivered` because delivery happens asynchronously.

- [ ] **Step 4: Run focused event tests**

Run: `npx vitest run src/app/api/events/route.test.ts`

Expected: PASS for transaction rollback, Kafka-independent success, stable event ID, and no direct Kafka call.

- [ ] **Step 5: Commit transactional event persistence**

```bash
git add src/app/api/events/route.ts src/app/api/events/route.test.ts
git commit -m "fix: persist behavior events transactionally"
```

### Task 6: Provide secret-free liveness and readiness health

**Files:**
- Create: `src/app/api/internal/health/route.ts`
- Create: `src/app/api/internal/health/route.test.ts`
- Modify: `src/app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes `getOutboxMetrics(now)` and `prisma.workerHeartbeat.findUnique`.
- Produces this JSON shape:

```ts
{
  status: 'ok' | 'degraded' | 'failed',
  database: { status: 'ok' | 'failed' },
  outbox: { pending: number; oldestPendingAt: string | null; oldestPendingAgeSeconds: number | null; recentFailureAt: string | null },
  worker: { status: 'ok' | 'stale' | 'unknown'; lastHeartbeatAt: string | null },
  kafka: { status: 'degraded' | 'unknown' }
}
```

- [ ] **Step 1: Write failing health tests**

Test database success plus fresh heartbeat returns 200 with `status: 'ok'` or `degraded` based on delivery context; a database exception returns 503 and `status: 'failed'`; heartbeat older than 30 seconds yields `worker.status: 'stale'` and overall `degraded`; serialized JSON never includes `DATABASE_URL`, `KAFKA_BROKER`, `MOVIEFLEX_OUTBOX_TOKEN`, or error message strings.

- [ ] **Step 2: Run health tests**

Run: `npx vitest run src/app/api/internal/health/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement database-focused readiness semantics**

Implement one route handler that calls a lightweight Prisma query, metrics, and heartbeat lookup. Treat database exceptions as `503`; classify absent heartbeat as `unknown`, heartbeat older than 30 seconds as `stale`, and Kafka as `degraded`/`unknown` based on no direct connection attempt. Serialize only counts, ISO timestamps, and status labels.

- [ ] **Step 4: Add dashboard backlog visibility**

Extend the existing admin dashboard query to display pending/processing count, oldest pending timestamp, recent failure timestamp, and worker heartbeat. It must display empty/unavailable states without rendering raw errors or secrets.

- [ ] **Step 5: Run focused health tests**

Run: `npx vitest run src/app/api/internal/health/route.test.ts`

Expected: PASS for success, degraded worker, failed database, and secrecy cases.

- [ ] **Step 6: Commit health observability**

```bash
git add src/app/api/internal/health/route.ts src/app/api/internal/health/route.test.ts src/app/admin/dashboard/page.tsx
git commit -m "feat: expose outbox health metrics"
```

### Task 7: Restrict retries to recovery and document the worker deployment

**Files:**
- Modify: `src/app/api/admin/outbox/retry/route.ts`
- Modify: `src/app/api/internal/outbox/retry/route.ts`
- Modify: `src/app/api/admin/outbox/retry/route.test.ts`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `docs/runbooks/production-release.md`

**Interfaces:**
- Consumes `retryFailedOutboxEvents(limit)` from Task 2 and `requireAdmin()` from the authorization plan.
- Produces manual recovery routes that requeue terminal failures once per request and do not run periodic scheduling.

- [ ] **Step 1: Write failing manual recovery tests**

Test unauthenticated admin callers receive 401, ordinary users receive 403, admins can requeue at most 50 `FAILED` events, missing/wrong internal tokens receive 401, correct token succeeds, and neither endpoint calls a polling loop.

- [ ] **Step 2: Run focused route tests**

Run: `npx vitest run src/app/api/admin/outbox/retry/route.test.ts src/app/api/internal/outbox/retry/route.test.ts`

Expected: FAIL until routes call the new recovery function and shared authorization guard.

- [ ] **Step 3: Replace old pending-delivery calls with bounded failed-event recovery**

Each route calls:

```ts
const requeued = await retryFailedOutboxEvents(50)
return NextResponse.json({ requeued })
```

The admin route must call `requireAdmin()` first. The internal route uses timing-safe token comparison when `MOVIEFLEX_OUTBOX_TOKEN` exists; if the environment variable is missing, it returns 503 rather than accepting an empty token.

- [ ] **Step 4: Document one authoritative automatic scheduler**

Add these deployment commands to `README.md` and the runbook:

```bash
# Web process
npm run start

# Exactly one continuous outbox worker process per environment
npm run outbox:worker
```

State explicitly: do not configure the internal retry endpoint as a cron while this worker runs. The retry endpoints are emergency recovery controls for failed rows only.

- [ ] **Step 5: Run route, full test, lint, and build gates**

Run: `npx vitest run src/app/api/admin/outbox/retry/route.test.ts src/app/api/internal/outbox/retry/route.test.ts && npm test && npm run lint && npm run build`

Expected: all commands exit 0.

- [ ] **Step 6: Commit recovery controls and operations documentation**

```bash
git add src/app/api/admin/outbox/retry src/app/api/internal/outbox/retry .env.example README.md docs/runbooks/production-release.md
git commit -m "docs: operate durable outbox worker"
```

### Task 8: Execute outage and recovery acceptance

**Files:**
- Modify: `docs/runbooks/production-release.md` only if a verified command needs correction.

**Interfaces:**
- Consumes the completed migration, event route, worker, health, and retry behavior.
- Produces documented evidence that Kafka loss preserves events and worker recovery drains them.

- [ ] **Step 1: Apply migrations and start web and worker processes in a non-production verification environment**

Run:

```bash
npm run db:migrate:deploy
npm run start
npm run outbox:worker
```

Expected: web and worker start with required environment variables; worker writes a heartbeat.

- [ ] **Step 2: Simulate Kafka unavailability and submit one valid playback event**

Stop or isolate Kafka, then use the existing authenticated test harness to POST a valid payload to `/api/events`.

Expected: HTTP 200 `{ "success": true }`; the matching stable `event_id` is present in `EventOutbox` with `PENDING` or a lease/retry transition, and no user-facing Kafka error is returned.

- [ ] **Step 3: Restore Kafka and verify exactly the outbox transition**

Restore Kafka and wait for one worker poll interval. Query the event by its stored outbox ID.

Expected: `status = DELIVERED`, `deliveredAt` is non-null, and `attempts` increased. Run another worker cycle and verify the delivered row is not claimed again.

- [ ] **Step 4: Verify health response behavior**

Run: `curl --fail --silent --show-error http://127.0.0.1:3000/api/internal/health`

Expected: JSON contains database, outbox, worker, and Kafka status labels only, plus safe aggregate metrics; it contains no secret strings.

- [ ] **Step 5: Commit an accuracy fix only if the validated runbook changed**

```bash
git add docs/runbooks/production-release.md
git commit -m "docs: verify outbox recovery runbook"
```

Only create this commit when acceptance revealed and corrected a documentation error.

## Plan Review

- Spec coverage: transactional outbox persistence is Tasks 2 and 5; continuous worker, atomic leasing, stable IDs, retry, and manual recovery are Tasks 2, 4, and 7; Kafka-degraded but request-success behavior is Tasks 3, 5, and 8; health backlog/oldest/failure/heartbeat and secret safety are Task 6; migration and deployment are Tasks 1 and 7.
- Intentional boundary: common authentication and event raw-input validation are prerequisites from the access safety plan. This plan only uses `requireAdmin()` and the already validated event payload.
- Placeholder scan: migration directory timestamp is generated by Prisma, and every other runtime name, state, command, limit, response, and function signature is concrete.
- Type consistency: `EventOutboxStatus`, `createOutboxEvent`, claim/deliver/reschedule functions, worker cycle functions, and health payload fields are defined once and referenced consistently in subsequent tasks.
