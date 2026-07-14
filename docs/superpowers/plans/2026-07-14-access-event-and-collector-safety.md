# Access, Event, and Collector Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish tested server-side authorization, tenant isolation, validated event ingestion, and SSRF-resistant collection requests.

**Architecture:** Centralize session and current-database-role checks in an authorization module. Every user and admin API consumes those guards before data access. The collector validates URLs at configuration time and immediately before each outbound request, verifies DNS results, manually follows only safe redirects, and reads bounded responses.

**Tech Stack:** Next.js App Router route handlers, Auth.js, TypeScript, Prisma/MySQL, Node DNS, native fetch, Vitest.

## Global Constraints

- Registration always creates `USER` accounts.
- Missing credentials return 401; authenticated callers without sufficient permission return 403.
- Admin authorization checks the current database role, not only the role embedded in a JWT.
- User-owned queries and mutations always scope by the authenticated session user ID and never accept a client-supplied owner ID.
- Collection requests only use HTTPS and must reject credentials, loopback, private, link-local, unspecified, multicast, and DNS-resolved non-public addresses.
- Redirects are disabled by default; if followed, every Location is validated again and redirect count is bounded.
- External input is bounded and validated before Prisma, DNS, fetch, or Kafka/outbox calls.
- Tests mock Auth.js, Prisma, DNS, fetch, and Kafka; no test requires real infrastructure.

---

## File Structure

- `src/lib/authorization.ts`: Typed user/admin authorization guards and standardized 401/403 responses.
- `src/lib/authorization.test.ts`: Guard behavior including stale JWT role rejection.
- `src/app/api/user/history/[id]/route.ts`: User-scoped history deletion using the shared guard.
- `src/app/api/user/favorites/[movieId]/route.ts`: User-scoped favorite operations using the shared guard.
- `src/app/api/admin/**/route.ts` and `src/app/api/collect/**/route.ts`: Existing privileged APIs converted to the shared admin guard.
- `src/app/api/events/route.ts`: Bounded raw-body parsing and strictly typed playback-event validation.
- `src/lib/collection-url.ts`: Static URL, resolved-host, redirect, and public-address validation.
- `src/lib/collector.ts`: Bounded, manually redirected collection fetch and task time limits.
- Focused `*.test.ts` files beside the code they verify.

### Task 1: Introduce database-backed authorization guards

**Files:**
- Create: `src/lib/authorization.ts`
- Create: `src/lib/authorization.test.ts`
- Modify: `src/lib/auth.ts` only to export types or add Auth.js module augmentation if required by the guards.

**Interfaces:**
- Produces:

```ts
export type AuthorizedUser = { userId: number; role: 'USER' | 'ADMIN' }
export async function requireUser(): Promise<AuthorizedUser | NextResponse>
export async function requireAdmin(): Promise<AuthorizedUser | NextResponse>
export function isAuthorizationFailure(value: AuthorizedUser | NextResponse): value is NextResponse
```

- Later route handlers must return the `NextResponse` immediately when `isAuthorizationFailure(result)` is true.

- [ ] **Step 1: Write failing guard tests**

Create tests that mock `auth()` and `prisma.user.findUnique()` and assert:

```ts
it('returns 401 without a valid positive session user id', async () => {
  mockedAuth.mockResolvedValue(null)
  const result = await requireUser()
  expect(result).toBeInstanceOf(NextResponse)
  expect(result.status).toBe(401)
})

it('returns 403 when the database role is USER', async () => {
  mockedAuth.mockResolvedValue({ user: { id: '7', role: 'ADMIN' } })
  mockedFindUnique.mockResolvedValue({ role: 'USER' })
  const result = await requireAdmin()
  expect(result).toBeInstanceOf(NextResponse)
  expect(result.status).toBe(403)
})
```

- [ ] **Step 2: Run the focused tests to prove the guard is absent**

Run: `npx vitest run src/lib/authorization.test.ts`

Expected: FAIL because `src/lib/authorization.ts` does not yet export the functions.

- [ ] **Step 3: Implement the shared guard module**

Create `src/lib/authorization.ts` with this behavior:

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type AuthorizedUser = { userId: number; role: 'USER' | 'ADMIN' }

function unauthorized() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

function forbidden() {
  return NextResponse.json({ error: 'Admin permission required' }, { status: 403 })
}

export function isAuthorizationFailure(value: AuthorizedUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export async function requireUser(): Promise<AuthorizedUser | NextResponse> {
  const session = await auth()
  const userId = Number(session?.user?.id)
  if (!Number.isSafeInteger(userId) || userId <= 0) return unauthorized()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return unauthorized()
  return { userId, role: user.role === 'ADMIN' ? 'ADMIN' : 'USER' }
}

export async function requireAdmin(): Promise<AuthorizedUser | NextResponse> {
  const result = await requireUser()
  if (isAuthorizationFailure(result)) return result
  return result.role === 'ADMIN' ? result : forbidden()
}
```

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run src/lib/authorization.test.ts`

Expected: PASS for missing/invalid session IDs, missing database users, ordinary users, current administrators, and stale JWT administrator roles that have been downgraded in the database.

- [ ] **Step 5: Commit the authorization foundation**

```bash
git add src/lib/authorization.ts src/lib/authorization.test.ts src/lib/auth.ts
git commit -m "feat: centralize server authorization"
```

### Task 2: Apply guards to tenant and privileged routes

**Files:**
- Modify: `src/app/api/user/history/[id]/route.ts`
- Modify: `src/app/api/user/favorites/[movieId]/route.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/api/admin/themes/active/route.ts`
- Modify: `src/app/api/admin/outbox/retry/route.ts`
- Modify: `src/app/api/admin/mappings/[id]/route.ts`
- Modify: `src/app/api/collect/sources/route.ts`
- Modify: `src/app/api/collect/sources/[sourceKey]/route.ts`
- Modify: `src/app/api/collect/tasks/route.ts`
- Modify: `src/app/api/collect/run/route.ts`
- Create: `src/app/api/user/user-routes.test.ts`
- Create: `src/app/api/admin/admin-authorization.test.ts`

**Interfaces:**
- Consumes `requireUser`, `requireAdmin`, and `isAuthorizationFailure` from Task 1.
- Produces uniform 401/403 semantics and user-ID-scoped Prisma conditions.

- [ ] **Step 1: Write failing isolation and authorization tests**

Cover these route-level assertions with mocked guards and Prisma calls:

```ts
it('cannot delete another users watch history', async () => {
  mockedRequireUser.mockResolvedValue({ userId: 1, role: 'USER' })
  await DELETE(new NextRequest('http://test/api/user/history/9'), { params: Promise.resolve({ id: '9' }) })
  expect(mockedDeleteMany).toHaveBeenCalledWith({ where: { id: 9, userId: 1 } })
})

it('returns 401 for an unauthenticated admin route', async () => {
  mockedRequireAdmin.mockResolvedValue(new NextResponse(null, { status: 401 }))
  const response = await POST()
  expect(response.status).toBe(401)
})
```

- [ ] **Step 2: Run focused tests to confirm existing routes do not use the common guard**

Run: `npx vitest run src/app/api/user/user-routes.test.ts src/app/api/admin/admin-authorization.test.ts`

Expected: FAIL until each target route calls the shared authorization module.

- [ ] **Step 3: Replace local session extraction in each user route**

Use this exact route pattern before parsing route-specific IDs:

```ts
const actor = await requireUser()
if (isAuthorizationFailure(actor)) return actor
const userId = actor.userId
```

Keep ownership in every Prisma condition, for example:

```ts
const result = await prisma.watchHistory.deleteMany({ where: { id, userId } })
if (result.count === 0) {
  return NextResponse.json({ error: 'History entry not found' }, { status: 404 })
}
```

For favorites, retain `{ userId, movieId }` in `upsert`, `deleteMany`, and every read condition.

- [ ] **Step 4: Replace local role checks in every listed privileged route**

Use this exact pattern at the top of each handler:

```ts
const actor = await requireAdmin()
if (isAuthorizationFailure(actor)) return actor
```

Do not read `session.user.role` directly in these routes after this change. Use `actor.userId` where the route needs the operator identity.

- [ ] **Step 5: Preserve at least one administrator during role changes**

In `src/app/api/admin/users/[id]/route.ts`, perform the target read, admin count check, and update in one Prisma transaction. Reject a `ADMIN -> USER` change when the current count of administrators is one. Keep the existing self-demotion rejection. Return:

```ts
NextResponse.json({ error: 'At least one administrator is required' }, { status: 409 })
```

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/app/api/user/user-routes.test.ts src/app/api/admin/admin-authorization.test.ts`

Expected: PASS for 401, 403, current-role downgrade rejection, cross-user history/favorite isolation, self-demotion rejection, and last-admin rejection.

- [ ] **Step 7: Commit the route hardening**

```bash
git add src/app/api/user src/app/api/admin src/app/api/collect src/app/api/user/user-routes.test.ts src/app/api/admin/admin-authorization.test.ts
git commit -m "fix: enforce server authorization boundaries"
```

### Task 3: Bound and validate playback event input

**Files:**
- Modify: `src/app/api/events/route.ts`
- Modify: `src/types/event.ts`
- Create: `src/app/api/events/route.test.ts`

**Interfaces:**
- Produces a POST contract accepting only `play_start`, `play_progress`, and `play_end` with a positive integer `movieId` and object `data` within byte limits.
- Event writing must consume the transaction-safe outbox insert interface defined by the outbox plan; implement this task after that interface is available, or temporarily define the exact transaction callback there before coding.

- [ ] **Step 1: Write failing parsing and boundary tests**

Include these cases:

```ts
it('returns 400 for data null instead of throwing', async () => {
  const response = await POST(jsonRequest({ eventType: 'play_start', movieId: 1, data: null }))
  expect(response.status).toBe(400)
})

it('returns 413 when raw body exceeds 16 KiB without content-length', async () => {
  const response = await POST(textRequest('x'.repeat(16_385)))
  expect(response.status).toBe(413)
})
```

Also test invalid JSON, arrays, unknown event types, non-positive/non-integer movie IDs, invalid duration/progress ranges, and successful input with no client-supplied user ID accepted.

- [ ] **Step 2: Run the event tests to establish failures**

Run: `npx vitest run src/app/api/events/route.test.ts`

Expected: FAIL for `data: null` and raw-body-without-content-length cases against the current handler.

- [ ] **Step 3: Replace `request.json()` parsing with bounded raw parsing**

Implement this parsing sequence before any database work:

```ts
const MAX_BODY_BYTES = 16_384
const raw = await request.text()
if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
  return NextResponse.json({ error: 'Request body is too large' }, { status: 413 })
}

let body: unknown
try {
  body = JSON.parse(raw)
} catch {
  return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
}
if (!body || typeof body !== 'object' || Array.isArray(body)) {
  return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
}
```

Validate `data` with `!data || typeof data !== 'object' || Array.isArray(data)`, then treat it as `Record<string, unknown>`. Reject non-string `episode` rather than silently converting it, and cap a valid episode string at the documented length.

- [ ] **Step 4: Align the event type definition with the route contract**

Replace any broader event union used exclusively by this endpoint with:

```ts
export type PlaybackEventType = 'play_start' | 'play_progress' | 'play_end'
```

Do not claim that click, rate, favorite, or search are accepted by this route unless a typed schema and route behavior are added for them.

- [ ] **Step 5: Run focused event tests**

Run: `npx vitest run src/app/api/events/route.test.ts`

Expected: PASS for every malformed payload returning 400/413 without calling Prisma or outbox code, and valid authenticated requests using only the server-derived user ID.

- [ ] **Step 6: Commit event validation**

```bash
git add src/app/api/events/route.ts src/app/api/events/route.test.ts src/types/event.ts
git commit -m "fix: validate bounded playback events"
```

### Task 4: Create testable two-stage URL and IP validation

**Files:**
- Modify: `src/lib/collection-url.ts`
- Create: `src/lib/collection-url.test.ts`

**Interfaces:**
- Produces:

```ts
export function validateCollectionUrl(value: unknown): string | null
export async function validateResolvedCollectionUrl(value: string): Promise<string | null>
export function isPublicCollectionAddress(address: string): boolean
```

- `validateResolvedCollectionUrl` must call `dns.promises.lookup(hostname, { all: true, verbatim: true })` and reject if DNS is empty or any returned address is non-public.

- [ ] **Step 1: Write failing URL and DNS tests**

Mock `node:dns/promises` and cover:

```ts
expect(validateCollectionUrl('https://catalog.example/api')).toBe('https://catalog.example/api')
expect(validateCollectionUrl('http://catalog.example/api')).toBeNull()
expect(validateCollectionUrl('https://user:pass@catalog.example/api')).toBeNull()
expect(validateCollectionUrl('https://127.0.0.1/api')).toBeNull()
await expect(validateResolvedCollectionUrl('https://catalog.example/api')).resolves.toBeNull()
```

Add cases for `localhost`, `.local`, IPv4 private/link-local/unspecified/multicast, `::`, `::1`, IPv4-mapped IPv6 loopback, `fc00::/7`, `fe80::/10`, and a mixed DNS answer containing both public and private addresses.

- [ ] **Step 2: Run tests to establish missing resolved-host behavior**

Run: `npx vitest run src/lib/collection-url.test.ts`

Expected: FAIL because the existing module does not validate DNS resolution or all special address ranges.

- [ ] **Step 3: Implement static and resolved validation**

Keep `validateCollectionUrl` synchronous for length, `https:`, credentials, hostname normalization, and literal-IP checks. Implement `isPublicCollectionAddress` with an IP parsing library already present in the dependency tree or a deliberately unit-tested parser that rejects every non-globally-routable range above. Implement resolved validation as:

```ts
const url = validateCollectionUrl(value)
if (!url) return null
const parsed = new URL(url)
const results = await lookup(parsed.hostname, { all: true, verbatim: true })
if (results.length === 0 || results.some(({ address }) => !isPublicCollectionAddress(address))) {
  return null
}
return url
```

DNS errors return `null`; they must not escape as an unhandled fetch path failure.

- [ ] **Step 4: Run focused URL tests**

Run: `npx vitest run src/lib/collection-url.test.ts`

Expected: PASS, including rejection before `fetch` can be invoked for any static or DNS-resolved unsafe target.

- [ ] **Step 5: Commit URL validation**

```bash
git add src/lib/collection-url.ts src/lib/collection-url.test.ts package.json package-lock.json
git commit -m "fix: validate collector targets before requests"
```

Only include package files if Task 4 intentionally adds a pinned IP-address parsing dependency; do not add one when a correct existing dependency is used.

### Task 5: Enforce safe bounded collection fetches and task limits

**Files:**
- Modify: `src/lib/collector.ts`
- Modify: `src/app/api/collect/sources/route.ts`
- Modify: `src/app/api/collect/sources/[sourceKey]/route.ts`
- Modify: `src/app/api/collect/run/route.ts`
- Create: `src/lib/collector.test.ts`

**Interfaces:**
- Consumes the Task 4 validators.
- Produces `MovieCollector.fetchRawText(apiUrl, params): Promise<string>` that performs resolved validation before every request, rejects unsafe redirects, enforces response and timeout limits, and returns no raw secret-bearing error text.

- [ ] **Step 1: Write failing fetch safety tests**

Mock validation and `fetch` to assert:

```ts
it('never fetches a URL whose resolved host is unsafe', async () => {
  mockedValidateResolvedCollectionUrl.mockResolvedValue(null)
  await expect(collector.fetchRawText('https://catalog.example/api', {})).rejects.toThrow('unsafe collection URL')
  expect(global.fetch).not.toHaveBeenCalled()
})

it('rejects a redirect to an unsafe location', async () => {
  mockFetchResponse(302, { location: 'https://127.0.0.1/private' })
  await expect(collector.fetchRawText('https://catalog.example/api', {})).rejects.toThrow('unsafe collection URL')
})
```

Add tests for `redirect: 'manual'`, a permitted one-hop public HTTPS redirect, more than three redirects, 20-second timeout, non-2xx, a body larger than the selected maximum, and task total-duration/page/continuous-failure stopping.

- [ ] **Step 2: Run collector tests to prove current defaults are unsafe**

Run: `npx vitest run src/lib/collector.test.ts`

Expected: FAIL because existing fetch follows redirects automatically and reads unbounded `response.text()`.

- [ ] **Step 3: Implement a bounded manual redirect loop**

Use explicit constants and this control flow in `fetchRawText`:

```ts
const MAX_REDIRECTS = 3
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024
let currentUrl = apiUrl
for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
  const safeUrl = await validateResolvedCollectionUrl(currentUrl)
  if (!safeUrl) throw new Error('unsafe collection URL')
  const response = await fetch(safeUrl, {
    headers: { 'User-Agent': 'MovieFlex-Collector/1.0' },
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
  })
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (!location || redirectCount === MAX_REDIRECTS) throw new Error('collection redirect rejected')
    currentUrl = new URL(location, safeUrl).toString()
    continue
  }
  if (!response.ok) throw new Error(`collection request failed with ${response.status}`)
  return await readResponseTextWithinLimit(response, MAX_RESPONSE_BYTES)
}
throw new Error('collection redirect rejected')
```

Implement `readResponseTextWithinLimit` with `response.body.getReader()`, count bytes before decoding, cancel the reader on overflow, and throw `Error('collection response exceeds size limit')`.

- [ ] **Step 4: Enforce limits in route and task orchestration**

Keep source create/update using `validateCollectionUrl`; fetching provides the DNS-time second check. In `run/route.ts`, define constants for the existing 20-page recent and 50-page full caps, add a total run deadline and a consecutive-page-failure threshold of 3, and mark any capped/partial task as failed with a sanitized error summary rather than `SUCCEEDED`.

- [ ] **Step 5: Run collector and collection-route tests**

Run: `npx vitest run src/lib/collection-url.test.ts src/lib/collector.test.ts src/app/api/admin/admin-authorization.test.ts`

Expected: PASS for outbound safety, bounded resource use, privileged collection route authorization, and correct task failure status.

- [ ] **Step 6: Commit collector safety**

```bash
git add src/lib/collector.ts src/lib/collector.test.ts src/app/api/collect src/lib/collection-url.ts src/lib/collection-url.test.ts
git commit -m "fix: bound and secure collection requests"
```

### Task 6: Run the security regression gate

**Files:**
- Modify: files from Tasks 1-5 only if verification exposes a defect.

**Interfaces:**
- Consumes all access, event, and collector changes.
- Produces verified security boundaries.

- [ ] **Step 1: Run focused security tests**

Run: `npx vitest run src/lib/authorization.test.ts src/app/api/user/user-routes.test.ts src/app/api/admin/admin-authorization.test.ts src/app/api/events/route.test.ts src/lib/collection-url.test.ts src/lib/collector.test.ts`

Expected: PASS with no real network, DNS, Kafka, or database dependency.

- [ ] **Step 2: Run full quality checks**

Run: `npm test && npm run lint && npm run build`

Expected: all commands exit 0.

- [ ] **Step 3: Commit any verification-only correction**

```bash
git add src
git commit -m "test: complete security regression coverage"
```

Create this commit only if Task 6 required a correction.

## Plan Review

- Spec coverage: public registration constraint is preserved; 401/403, database-current admin roles, resource isolation, event validation, static/DNS SSRF checks, manual redirects, response limits, page/total-duration/continuous-failure caps, and mock-isolated tests are all assigned to Tasks 1-6.
- Intentional boundary: durable event transaction and worker delivery are delegated to the outbox plan; Task 3 consumes its explicit transaction interface rather than creating a competing delivery mechanism.
- Placeholder scan: every code-bearing task includes exact guard, parsing, validation, redirect, and expected command details. Constants selected here are deliberate acceptance limits, not TODOs.
- Type consistency: all routes use `AuthorizedUser`, `requireUser`, `requireAdmin`, and `isAuthorizationFailure` exactly as defined in Task 1; URL calls use the Task 4 exported signatures.
