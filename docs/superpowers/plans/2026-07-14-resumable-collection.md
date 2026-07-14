# Resumable Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide source-aware player detection, durable background collection with pause/resume and restart recovery, and operational category binding.

**Architecture:** MySQL-backed `CollectTask` records are the durable job queue and page-level checkpoint store. A single Next.js process hosts a dispatcher that acquires one source lease at a time, processes pages outside the request response lifecycle, and cooperatively observes task mutations between pages. Admin APIs expose source configuration, task lifecycle, default category repair, and source-scoped category mappings; React admin components poll and mutate only those APIs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, MySQL, Vitest 4, Auth.js v5.

## Global Constraints

- Keep `sourceKey` derived from the API URL but editable before source creation; player-line codes are independent source-specific configuration.
- All collection, source, catalog, and mapping route handlers call `requireAdmin()` independently.
- A full collection must continue after the initiating browser closes and must persist a checkpoint after every completed source page.
- The implementation targets one Next.js server process; no Redis, Kafka, or separate worker process is introduced.
- `initial-100` stops once at least 100 valid source records have been processed; `full` has no arbitrary page cap.
- Use `apply_patch` for source edits and `npx prisma db push && npx prisma generate` for this repository's schema synchronization workflow.
- Do not overwrite unrelated dirty-worktree changes; stage only files belonging to each task's commit.

---

## File Structure

- `prisma/schema.prisma`: durable task fields and status enum.
- `src/lib/collector/source-key.ts`: deterministic source-key candidate generation.
- `src/lib/collector/player-config.ts`: validated imported-player normalization and mode detection.
- `src/lib/playback/playback.ts`: convert persisted source player JSON to `RegistryPlayer` entries.
- `src/lib/collector/collector.ts`: collect exactly one page and return its persisted counts/warnings.
- `src/lib/collector/task-runner.ts`: dispatcher, source lease, per-page checkpoint, pause/resume/recovery behavior.
- `src/app/api/collect/tasks/route.ts`: authenticated task list and task creation.
- `src/app/api/collect/tasks/[id]/route.ts`: authenticated pause, resume, and cancellation mutations.
- `src/app/api/collect/sources/route.ts`: server-generated unique source key and normalized player configuration.
- `src/app/api/collect/sources/[sourceKey]/route.ts`: validated source edits and safe deletion restrictions.
- `src/components/admin/CollectSourceManager.tsx`: accessible save feedback and task dashboard controls/polling.
- `src/app/movie/[id]/page.tsx`: source-specific player registry lookup before fallback defaults.
- `scripts/init-categories.ts`: repeatable default category upsert/repair.
- `src/app/api/admin/catalog/categories/route.ts`: authorized category retrieval/create plus repair endpoint.
- `src/app/api/admin/catalog/categories/[id]/route.ts`: authorized category edit/delete with mapping protection.
- `src/app/api/admin/mappings/route.ts`: mapping list filtered by `sourceKey` and source list support.
- `src/app/api/admin/mappings/[id]/route.ts`: category existence validation and explicit `IGNORED` support.
- `src/app/api/admin/mappings/[id]/reclassify/route.ts`: source-scoped remapping of existing movies.
- `src/components/admin/catalog/CategoryManagement.tsx`: visible error/empty states, selected-source mapping controls, and reclassification action.

### Task 1: Persist Collection Task State

**Files:**
- Modify: `prisma/schema.prisma:142-158`
- Create: `src/lib/collector/task-types.ts`
- Create: `src/lib/collector/task-types.test.ts`

**Interfaces:**
- Produces `CollectTaskStatus`, `CollectTaskMode`, `ACTIVE_TASK_STATUSES`, and `isTerminalTaskStatus(status)`.
- Produces Prisma `CollectTask` fields: `targetRecords`, `nextPage`, `currentPage`, `startedAt`, `updatedAt`, `heartbeatAt`, `pausedAt`, `leaseToken`, and `leaseExpiresAt`.

- [ ] **Step 1: Write the failing task-status test**

```ts
import { expect, it } from 'vitest';
import { ACTIVE_TASK_STATUSES, isTerminalTaskStatus } from './task-types';

it('treats queued and running work as active but completed work as terminal', () => {
  expect(ACTIVE_TASK_STATUSES).toEqual(['QUEUED', 'RUNNING', 'PAUSED']);
  expect(isTerminalTaskStatus('SUCCEEDED')).toBe(true);
  expect(isTerminalTaskStatus('FAILED')).toBe(true);
  expect(isTerminalTaskStatus('RUNNING')).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/collector/task-types.test.ts`

Expected: FAIL because `task-types` does not exist.

- [ ] **Step 3: Add the typed task vocabulary and schema fields**

```ts
export const ACTIVE_TASK_STATUSES = ['QUEUED', 'RUNNING', 'PAUSED'] as const;
export type CollectTaskStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type CollectTaskMode = 'initial-100' | 'full';
export function isTerminalTaskStatus(status: CollectTaskStatus) {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED';
}
```

Add matching Prisma enum values and persisted checkpoint/lease fields. Keep existing count fields and add a compound index for `status, createdAt`.

- [ ] **Step 4: Synchronize and generate Prisma client**

Run: `npx prisma db push && npx prisma generate`

Expected: schema synchronized and Prisma Client generated successfully.

- [ ] **Step 5: Run the focused test**

Run: `npm test -- src/lib/collector/task-types.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/collector/task-types.ts src/lib/collector/task-types.test.ts
git commit -m "feat: persist collection task checkpoints"
```

### Task 2: Normalize Source Identity And Imported Players

**Files:**
- Create: `src/lib/collector/source-key.ts`
- Create: `src/lib/collector/source-key.test.ts`
- Modify: `src/lib/collector/player-config.ts:1-81`
- Modify: `src/lib/collector/player-config.test.ts:1-56`
- Modify: `src/app/api/collect/sources/route.ts:20-65`
- Modify: `src/app/api/collect/sources/[sourceKey]/route.ts:6-35`

**Interfaces:**
- Produces `suggestSourceKey(apiUrl: string): string`.
- Produces `normalizePlayerConfigs(input: unknown): NormalizedPlayerConfig[]` where each config has `{ code, name, isEnabled, mode, resolverUrl }`.
- `POST /api/collect/sources` accepts optional `sourceKey`; when omitted, it atomically chooses an unused suffix of `suggestSourceKey(apiUrl)`.

- [ ] **Step 1: Add failing identity and configuration tests**

```ts
it('derives a stable ASCII key from host and endpoint path', () => {
  expect(suggestSourceKey('https://api.qzzy.example/provide/vod/')).toBe('api-qzzy-example-provide-vod');
});

it('normalizes an HLS line without requiring an iframe template', () => {
  expect(normalizePlayerConfigs([{ from: 'm3u8', show: 'M3U8', code: '' }])[0])
    .toMatchObject({ code: 'm3u8', name: 'M3U8', mode: 'HLS', isEnabled: true, resolverUrl: null });
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- src/lib/collector/source-key.test.ts src/lib/collector/player-config.test.ts`

Expected: FAIL because `suggestSourceKey` and `normalizePlayerConfigs` are absent.

- [ ] **Step 3: Implement normalization and server-side validation**

```ts
export function suggestSourceKey(apiUrl: string): string {
  const url = new URL(apiUrl);
  return [url.hostname, ...url.pathname.split('/')]
    .join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'source';
}
```

Normalize `from` or `id` into `code`, derive HLS for standard `m3u8`/`hls` line codes or direct `.m3u8` templates, reject entries without a usable code, and preserve the current safe iframe resolver detection. Parse and normalize on the server for both create and update; do not trust client-normalized JSON. For an omitted key, create candidates `base`, `base-2`, `base-3` until a unique create succeeds; retain a client-supplied valid key unchanged.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/collector/source-key.test.ts src/lib/collector/player-config.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collector/source-key.ts src/lib/collector/source-key.test.ts src/lib/collector/player-config.ts src/lib/collector/player-config.test.ts src/app/api/collect/sources/route.ts "src/app/api/collect/sources/[sourceKey]/route.ts"
git commit -m "feat: derive source keys and normalize players"
```

### Task 3: Apply Source-Specific Player Configuration At Playback

**Files:**
- Modify: `src/lib/playback/playback.ts:1-154`
- Modify: `src/lib/playback/playback.test.ts`
- Modify: `src/app/movie/[id]/page.tsx:31-43`

**Interfaces:**
- Produces `playersFromSourceConfig(config: unknown): RegistryPlayer[]`.
- `MovieDetailPage` loads `CollectSource` by `movie.sourceKey` and passes `playersFromSourceConfig(source?.playerConfigs)` before `DEFAULT_PLAYERS` to `selectPlayback`.

- [ ] **Step 1: Add the failing playback-selection test**

```ts
it('prefers a configured source resolver over the built-in player definition', () => {
  const players = playersFromSourceConfig([{ code: 'qz', name: '量子', isEnabled: true, mode: 'IFRAME_RESOLVER', resolverUrl: 'https://parse.example/?url=' }]);
  expect(selectPlayback(parsePlayGroups('qz', '第一集$https://cdn.example/a.m3u8'), players).selection?.player.resolverUrl)
    .toBe('https://parse.example/?url=');
});
```

- [ ] **Step 2: Run the playback test to verify failure**

Run: `npm test -- src/lib/playback/playback.test.ts`

Expected: FAIL because `playersFromSourceConfig` does not exist.

- [ ] **Step 3: Implement source config conversion and lookup**

Convert only normalized entries with known `PlayerMode`, nonempty `code`, boolean enabled status, and a safe resolver when resolver mode is selected. In the movie detail query, fetch the associated `CollectSource` using `movie.sourceKey`; merge source entries before any default players without duplicating codes.

- [ ] **Step 4: Run focused test and type-check via production build**

Run: `npm test -- src/lib/playback/playback.test.ts && npm run build`

Expected: tests pass and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/playback/playback.ts src/lib/playback/playback.test.ts "src/app/movie/[id]/page.tsx"
git commit -m "feat: use source player configuration for playback"
```

### Task 4: Make One-Page Collection Explicit And Testable

**Files:**
- Modify: `src/lib/collector/collector.ts:74-186`
- Modify: `src/lib/collector/types.ts`
- Create: `src/lib/collector/collector.test.ts`

**Interfaces:**
- Produces `collectPage({ sourceKey, apiUrl, format, page, recentHours? }): Promise<CollectResult>`.
- `CollectResult` remains `{ fetched, saved, pageCount, warnings }`; it represents exactly one remote page.
- Consumes `collectPage` in Task 5; it must not mutate `CollectTask` itself.

- [ ] **Step 1: Write a failing collector test around page parameters**

```ts
it('requests exactly the requested AppleCMS detail page', async () => {
  await collectPage({ sourceKey: 'qz', apiUrl: 'https://api.example/provide/vod', format: 'JSON', page: 3 });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ac=detail'), expect.any(Object));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pg=3'), expect.any(Object));
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- src/lib/collector/collector.test.ts`

Expected: FAIL because `collectPage` is absent.

- [ ] **Step 3: Extract the page collector**

Build `{ ac: 'detail', pg: page }`, add `h: recentHours` only when supplied, fetch and normalize one response, map categories, persist valid movies, and return the existing result shape. Keep `runCollect` only as a compatibility wrapper that delegates to page 1 or remove it after Task 5 updates all callers.

- [ ] **Step 4: Run focused test**

Run: `npm test -- src/lib/collector/collector.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collector/collector.ts src/lib/collector/types.ts src/lib/collector/collector.test.ts
git commit -m "refactor: collect one source page at a time"
```

### Task 5: Implement Durable Dispatch, Checkpoints, And Recovery

**Files:**
- Create: `src/lib/collector/task-runner.ts`
- Create: `src/lib/collector/task-runner.test.ts`
- Modify: `src/app/api/collect/run/route.ts:1-104`
- Modify: `src/app/api/collect/tasks/route.ts:1-10`
- Create: `src/app/api/collect/tasks/[id]/route.ts`

**Interfaces:**
- Produces `createCollectionTask(sourceKey: string, mode: CollectTaskMode): Promise<CollectTask>`.
- Produces `dispatchQueuedTasks(): void`, `recoverCollectionTasks(): Promise<void>`, and `mutateCollectionTask(id, action: 'pause' | 'resume' | 'cancel')`.
- `POST /api/collect/tasks` returns `202 { success: true, data: task }`; `PATCH /api/collect/tasks/[id]` accepts `{ action }`.

- [ ] **Step 1: Write task-runner lifecycle tests with mocked Prisma and `collectPage`**

```ts
it('checkpoints nextPage and totals after every successful page', async () => {
  await runTask('task-1');
  expect(prisma.collectTask.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ pagesProcessed: 1, nextPage: 2, fetched: 20, saved: 20 }),
  }));
});

it('pauses at a page boundary and resumes from the persisted next page', async () => {
  await runTask('task-paused');
  expect(prisma.collectTask.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PAUSED' }) }));
});

it('marks a stale running task queued during recovery', async () => {
  await recoverCollectionTasks();
  expect(prisma.collectTask.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'QUEUED' }) }));
});
```

- [ ] **Step 2: Run the lifecycle tests to verify failure**

Run: `npm test -- src/lib/collector/task-runner.test.ts`

Expected: FAIL because `task-runner` is absent.

- [ ] **Step 3: Implement the single-process dispatcher**

Use a module-local `Set<string>` only to avoid duplicate work inside one process; use database conditional `updateMany` to claim a queued task and lease its source before processing. For each page: reload task status, stop on `PAUSED` or `CANCELLED`, call `collectPage`, increment totals, save `currentPage`, `nextPage`, `totalPages`, and heartbeat. Retry a failed page three times with 1, 2, and 4 second delays; then save its error and mark failed. Set succeeded when `nextPage > totalPages` or `saved >= targetRecords` for `initial-100`. Update source `lastSync` only on success. Recover `RUNNING` rows whose heartbeat is more than five minutes old by clearing the lease and marking queued.

- [ ] **Step 4: Replace the synchronous collection API**

Make `POST /api/collect/tasks` validate the source and mode, create `QUEUED` tasks with `targetRecords: 100` only for `initial-100`, call `dispatchQueuedTasks()` after creation, and return immediately. Preserve `/api/collect/run` as a 410 response explaining to use the task endpoint; no request may synchronously import pages. Require an administrator for every route and call `recoverCollectionTasks()` before listing/creating tasks.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/lib/collector/task-runner.test.ts src/lib/collector/collector.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/collector/task-runner.ts src/lib/collector/task-runner.test.ts src/app/api/collect/run/route.ts src/app/api/collect/tasks/route.ts "src/app/api/collect/tasks/[id]/route.ts"
git commit -m "feat: run resumable collection tasks in background"
```

### Task 6: Surface Source Save State And Task Controls

**Files:**
- Modify: `src/components/admin/CollectSourceManager.tsx:1-371`
- Modify: `src/app/admin/admin.module.css`
- Create: `src/components/admin/CollectSourceManager.test.tsx`

**Interfaces:**
- Creates tasks with `POST /api/collect/tasks` payload `{ sourceKey, mode: 'initial-100' | 'full' }`.
- Mutates tasks using `PATCH /api/collect/tasks/${id}` payload `{ action: 'pause' | 'resume' | 'cancel' }`.
- Polls `GET /api/collect/tasks` every 3 seconds while any returned task has `QUEUED`, `RUNNING`, or `PAUSED` status.

- [ ] **Step 1: Add failing source-manager behavior tests**

```tsx
it('disables save and announces the returned source immediately', async () => {
  render(<CollectSourceManager />);
  await userEvent.click(screen.getByRole('button', { name: '保存采集源' }));
  expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled();
  expect(await screen.findByRole('status')).toHaveTextContent('已新增采集源：量子');
});

it('creates a full task without waiting for collection completion', async () => {
  render(<CollectSourceManager />);
  await userEvent.click(screen.getByRole('button', { name: '全量采集' }));
  expect(fetch).toHaveBeenCalledWith('/api/collect/tasks', expect.objectContaining({ method: 'POST' }));
});
```

- [ ] **Step 2: Run the component test to verify failure**

Run: `npm test -- src/components/admin/CollectSourceManager.test.tsx`

Expected: FAIL because the component lacks these states and task endpoint calls.

- [ ] **Step 3: Implement responsive feedback and task dashboard**

Use controlled `apiUrl` and `sourceKey` form fields; on API URL blur, prefill `sourceKey` only if the user has not edited it. Add `isSaving`, `loadError`, and `message` state; render messages as `<p role="status" aria-live="polite">`. On successful create, append or replace the returned source in state before resetting fields; retain form values and modal state on errors. Replace “最近 24 小时” with “首批 100 条”, add full-task creation, show task page/count/error fields, and expose pause/resume/cancel buttons according to task status. Remove the synchronous result panel. Use a 3-second active-task polling effect with cleanup.

- [ ] **Step 4: Run the component test and full test suite**

Run: `npm test -- src/components/admin/CollectSourceManager.test.tsx && npm test`

Expected: focused and complete test suite PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/CollectSourceManager.tsx src/components/admin/CollectSourceManager.test.tsx src/app/admin/admin.module.css
git commit -m "feat: show collection task progress and controls"
```

### Task 7: Repair And Protect The Default Category Tree

**Files:**
- Modify: `scripts/init-categories.ts:1-112`
- Modify: `package.json:5-17`
- Modify: `src/app/api/admin/catalog/categories/route.ts:1-92`
- Modify: `src/app/api/admin/catalog/categories/[id]/route.ts:1-109`
- Create: `scripts/init-categories.test.ts`

**Interfaces:**
- Produces `seedDefaultCategories(prismaClient): Promise<void>` exported from the seed script.
- Exposes `npm run categories:init`.
- Category APIs require `requireAdmin()` and a category cannot be deleted while a `CategoryMapping.localCategoryId` references it.

- [ ] **Step 1: Write failing idempotency and deletion-protection tests**

```ts
it('repairs missing children even when their parent already exists', async () => {
  await seedDefaultCategories(prisma);
  expect(prisma.category.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'action' } }));
});
```

Add a route test mocking `prisma.categoryMapping.count` to return `1` and asserting DELETE returns HTTP 400 with `该分类已被资源站分类绑定`.

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- scripts/init-categories.test.ts src/app/api/admin/catalog/categories`

Expected: FAIL because parent existence currently skips its children and deletion ignores mappings.

- [ ] **Step 3: Implement repeatable initialization and authorization**

Upsert every parent by slug with its canonical fields, then upsert each child by slug with that parent ID and canonical ordering. Wrap each parent and children in a transaction. Export the seed function and only call `main()` when run as the script entry point. Add `categories:init` to package scripts. Require admin in GET/POST/PATCH/DELETE category handlers, validate a supplied `parentId` exists, and block deletion if direct children, movies, or mappings reference the category.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- scripts/init-categories.test.ts src/app/api/admin/catalog/categories`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/init-categories.ts scripts/init-categories.test.ts package.json src/app/api/admin/catalog/categories/route.ts "src/app/api/admin/catalog/categories/[id]/route.ts"
git commit -m "feat: repair and protect catalog categories"
```

### Task 8: Implement Source-Scoped Mapping And Reclassification

**Files:**
- Create: `src/app/api/admin/mappings/route.ts`
- Modify: `src/app/api/admin/mappings/[id]/route.ts:1-13`
- Create: `src/app/api/admin/mappings/[id]/reclassify/route.ts`
- Modify: `src/lib/collector/category.ts:29-75`
- Create: `src/lib/collector/category.test.ts`

**Interfaces:**
- `GET /api/admin/mappings?sourceKey=<key>` returns `{ mappings, sources }` with each mapping's current local category.
- `PATCH /api/admin/mappings/[id]` accepts `{ status: 'MAPPED', localCategoryId: number }` or `{ status: 'IGNORED' }`.
- `POST /api/admin/mappings/[id]/reclassify` updates movies from that mapping's `sourceKey` and `sourceTypeName`, returning `{ updated: number }`.

- [ ] **Step 1: Write failing mapping API and category-helper tests**

```ts
it('returns ignored mappings as not collectable', async () => {
  expect(await getOrAutoMapCategory('qz', 8, '测试', [])).toBe(0);
});

it('rejects a mapped category id that does not exist', async () => {
  const response = await PATCH(requestWith({ status: 'MAPPED', localCategoryId: 999 }), routeContext('1'));
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- src/lib/collector/category.test.ts src/app/api/admin/mappings`

Expected: FAIL because mapping list/reclassification routes and category existence validation are absent.

- [ ] **Step 3: Implement mapping query, validation, and reclassification**

Require admin in all three routes. Return source rows ordered by source name and mappings ordered by source type ID; filter mappings server-side when `sourceKey` is supplied. Before setting `MAPPED`, read the category by ID and return 400 when absent. For ignored mappings clear the local ID. Reclassification reads the mapping, refuses `PENDING_REVIEW`, updates matching movies where both `sourceKey` and original `typeName` match; set `typeId` to the mapped category for `MAPPED`, and do not rewrite ignored films. Keep auto-map behavior unchanged except it must use only a real `其他` category from the repaired seed tree.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- src/lib/collector/category.test.ts src/app/api/admin/mappings`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/mappings/route.ts "src/app/api/admin/mappings/[id]/route.ts" "src/app/api/admin/mappings/[id]/reclassify/route.ts" src/lib/collector/category.ts src/lib/collector/category.test.ts
git commit -m "feat: manage source category mappings"
```

### Task 9: Complete The Category Binding Interface And Verify End-To-End

**Files:**
- Modify: `src/components/admin/catalog/CategoryManagement.tsx:1-358`
- Create: `src/components/admin/catalog/CategoryManagement.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Uses `GET /api/admin/mappings?sourceKey=<key>` to show selected-source mappings.
- Uses mapping PATCH actions and `POST /api/admin/mappings/${id}/reclassify`.
- Documents `npm run categories:init`, task behavior, and the single-instance dispatcher limit.

- [ ] **Step 1: Add failing selected-source and ignore-action tests**

```tsx
it('loads only the selected source mappings and sends IGNORED on ignore', async () => {
  render(<CategoryManagement />);
  await userEvent.selectOptions(screen.getByLabelText('采集源'), 'qz');
  expect(fetch).toHaveBeenCalledWith('/api/admin/mappings?sourceKey=qz');
  await userEvent.click(screen.getByRole('button', { name: '忽略' }));
  expect(fetch).toHaveBeenCalledWith('/api/admin/mappings/1', expect.objectContaining({ body: JSON.stringify({ status: 'IGNORED' }) }));
});
```

- [ ] **Step 2: Run the component test to verify failure**

Run: `npm test -- src/components/admin/catalog/CategoryManagement.test.tsx`

Expected: FAIL because no source selector, mapping filter, or correct ignore mutation exists.

- [ ] **Step 3: Implement the operational mapping UI**

Load categories independently from mappings so a mapping request failure cannot erase the tree. Render visible loading/error states and a default-tree empty state that tells admins to run `npm run categories:init`. Render a source selector, request its mappings, show mapped/pending/ignored status, correctly send ignored mutations, and add a confirmation-backed “重新归类已采集影片” action per mapping. Keep category creation/editing behavior and surface API failures in a visible status region instead of console-only errors.

- [ ] **Step 4: Run all verification commands**

Run: `npm test && npm run build && npm run categories:init`

Expected: all tests pass, production build succeeds, and the script reports the repaired default category tree without duplicate-key errors.

- [ ] **Step 5: Start the fresh production server and manually validate task creation**

Run: `setsid npm run start -- --hostname 0.0.0.0 --port 3060 </dev/null >/tmp/next-3060.log 2>&1 &`

Expected: `http://35.213.128.99:3060/admin/catalog/sources` shows source save feedback and task controls; the first real quantum-source run should be created as `initial-100`, monitored to its terminal state, then its saved count and error summary reported before starting any full task.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/catalog/CategoryManagement.tsx src/components/admin/catalog/CategoryManagement.test.tsx README.md
git commit -m "feat: complete source category binding workflow"
```

## Self-Review

- Spec coverage: Tasks 1 and 5 implement durable state, checkpoints, pause/resume/cancel, recovery, and full/100-record modes. Tasks 2 and 3 implement source identity, player detection, and playback application. Task 6 implements save/task feedback. Tasks 7 through 9 implement initialization, mapping, reclassification, integrity, UI, and documentation.
- Placeholder scan: no incomplete implementation items are deferred; all APIs, statuses, test commands, and critical state transitions are named.
- Type consistency: `CollectTaskMode` is `initial-100 | full` across task creation, runner, API, and UI. Player normalization yields `NormalizedPlayerConfig`, playback consumes it as `RegistryPlayer`, and category mapping operations use `MAPPED | IGNORED` consistently.
