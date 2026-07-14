# Platform Recovery and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore user workflows and build a secure, observable operations backend without leaving broken routes or unsafe ingestion paths.

**Architecture:** Deliver independent vertical slices in dependency order: authentication/user routes, safe collection operations, content workflows, then analytics delivery. Server routes validate input before Prisma or external calls; admin pages remain server-authorized and client components only operate through protected APIs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/MySQL, Auth.js, KafkaJS, Vitest.

## Global Constraints

- All production services remain bound to `0.0.0.0:3000`.
- Public registration creates only `USER` accounts.
- Admin routes and APIs require server-side `ADMIN` authorization.
- Collection sources must not reach private, loopback, link-local or unvalidated redirect targets.
- User-owned data queries must be scoped by the session user ID.
- No secret values may be written to source, client responses or logs.

---

### Task 1: Restore authentication and user route closure

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`
- Create: `src/app/user/layout.tsx`
- Create: `src/app/user/profile/page.tsx`
- Create: `src/app/user/favorites/page.tsx`
- Create: `src/app/user/history/page.tsx`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/auth.ts`
- Test: `src/lib/auth-routes.test.ts`

- [ ] Write failing route and callback URL tests.
- [ ] Make registration always create `USER`; provide a documented deployment-only admin bootstrap command.
- [ ] Implement Auth.js login/register pages and guarded user pages.
- [ ] Verify focused tests and route HTTP responses.

### Task 2: Validate public queries and event input

**Files:**
- Create: `src/lib/validation.ts`
- Modify: `src/app/movies/page.tsx`
- Modify: `src/app/api/events/route.ts`
- Modify: `src/lib/kafka.ts`
- Test: `src/lib/validation.test.ts`

- [ ] Write failing tests for invalid movie list parameters and invalid event payloads.
- [ ] Parse list query values to finite bounded integers and whitelist sorting.
- [ ] Validate event type, movie ID, progress ranges and bounded payload values before history writes or Kafka publishing.
- [ ] Cache a Kafka connection Promise and return an explicit delivery status.
- [ ] Verify focused tests.

### Task 3: Implement safe collection source operations

**Files:**
- Create: `src/lib/collection-url.ts`
- Modify: `src/app/api/collect/sources/route.ts`
- Modify: `src/app/api/collect/run/route.ts`
- Modify: `src/lib/collector.ts`
- Modify: `prisma/schema.prisma`
- Test: `src/lib/collection-url.test.ts`

- [ ] Write failing URL validation tests for HTTPS public targets and rejected private targets.
- [ ] Add validated source create/update/enable/delete APIs.
- [ ] Reject unsafe URL hosts and redirects; bound page count, response size and run duration.
- [ ] Persist collection task state and reject same-source concurrent runs.
- [ ] Verify focused tests and Prisma generation.

### Task 4: Complete collection administration

**Files:**
- Create: `src/app/admin/collections/page.tsx`
- Create: `src/app/admin/mappings/page.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin/OperationsSidebar.tsx`
- Modify: `src/components/admin/CollectSourceManager.tsx`
- Create: `src/components/admin/CollectionTaskList.tsx`
- Create: `src/components/admin/MappingManager.tsx`
- Test: `src/app/admin/admin-routes.test.ts`

- [ ] Write failing admin navigation and operation state tests.
- [ ] Add source CRUD, task history, task failure details and mapping review UI.
- [ ] Verify route authorization and API response handling.

### Task 5: Restore search and content/user administration

**Files:**
- Create: `src/app/search/page.tsx`
- Create: `src/app/admin/movies/page.tsx`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/themes/page.tsx`
- Create: protected corresponding APIs under `src/app/api/admin/`
- Test: focused route and data-access tests

- [ ] Write failing tests for search query normalization and admin-only data access.
- [ ] Implement search, movie edit/publish status, user role management and theme selection.
- [ ] Verify user-owned favorites/history and all new admin routes.

### Task 6: Stabilize playback, recommendations and view counting

**Files:**
- Modify: `src/app/movie/[id]/page.tsx`
- Modify: `src/components/video/VideoPlayer.tsx`
- Modify: `src/lib/playback.ts`
- Modify: `src/lib/recommendations.ts`
- Test: `src/lib/playback.test.ts`

- [ ] Write failing resolver URL and HLS-to-iframe error reset tests.
- [ ] Construct resolver iframe URLs server-side and reset player errors on source changes.
- [ ] Select only the newest recommendation batch and preserve rank order.
- [ ] Move view increment to a validated, deduplicated playback event instead of SSR detail rendering.
- [ ] Verify focused playback and recommendation tests.

### Task 7: Add analytics operations and reliable event delivery

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/api/admin/health/route.ts`
- Create: `src/app/api/admin/analytics/route.ts`
- Create: outbox worker/module under `src/lib/`
- Modify: `prisma/schema.prisma`
- Test: focused health and outbox tests

- [ ] Write failing health response and outbox state tests.
- [ ] Persist event outbox records before delivery; retry idempotently through Kafka.
- [ ] Add dashboard health cards for MySQL, Kafka, Spark, analytics results and recommendation batches.
- [ ] Render real empty states when data is unavailable.
- [ ] Verify build, full suite and HTTP routes on port 3000.
