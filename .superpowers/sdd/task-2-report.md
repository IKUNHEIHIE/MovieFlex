# Task 2 Report: Normalize Source Identity And Imported Players

## Status

Implemented and committed Task 2. The change is limited to source identity derivation, imported player normalization, and server-side handling in collection source create/update APIs. No schema, background-task, worker, Redis, Kafka, or source-aware playback changes were introduced.

## Commit

- `573fe50 feat: derive source keys and normalize players`

## Files

- Added `src/lib/collector/source-key.ts`
  - Exports `suggestSourceKey(apiUrl: string): string`.
  - Derives a lower-case ASCII key from hostname and endpoint path, truncates to 50 characters, and falls back to `source`.
- Added `src/lib/collector/source-key.test.ts`
  - Covers stable host/path identity derivation.
- Updated `src/lib/collector/player-config.ts`
  - Adds `NormalizedPlayerConfig` and `normalizePlayerConfigs(input: unknown)`.
  - Accepts imported arrays only.
  - Uses `from` or `id` as the independent source-specific line code.
  - Drops entries without a usable line code rather than treating iframe template text as a code.
  - Detects HLS for `m3u8` / `hls` line codes and direct `.m3u8` templates.
  - Retains existing safe iframe resolver extraction for resolver configurations.
- Updated `src/lib/collector/player-config.test.ts`
  - Adds normalization coverage for HLS, `id` fallback, invalid entries, iframe resolvers, and direct `.m3u8` templates.
- Updated `src/app/api/collect/sources/route.ts`
  - Keeps `requireAdmin()` on GET and POST.
  - Allows `sourceKey` to be omitted, derives it from the validated API URL, and retries atomic creates using `base`, `base-2`, `base-3`, etc. after uniqueness collisions.
  - Preserves an explicitly supplied valid source key without rewriting it.
  - Parses and normalizes player configuration server-side before persisting it.
- Updated `src/app/api/collect/sources/[sourceKey]/route.ts`
  - Keeps `requireAdmin()` on PATCH and DELETE.
  - Parses and normalizes player configuration server-side on update.

## TDD Evidence

### RED

Command:

```bash
npm test -- src/lib/collector/source-key.test.ts src/lib/collector/player-config.test.ts
```

Result before implementation: failed as expected.

- `source-key.test.ts` could not import `./source-key` because the module did not exist.
- `player-config.test.ts` failed with `TypeError: normalizePlayerConfigs is not a function`.

An additional RED test verified that a raw iframe template must not be used as a player line code. It initially failed by returning the template string as `code`, then passed after code selection was restricted to imported `from` and `id` fields.

### GREEN

Focused command:

```bash
npm test -- src/lib/collector/source-key.test.ts src/lib/collector/player-config.test.ts
```

Result: `2` files passed, `12` tests passed.

Full suite command:

```bash
npm test
```

Result: `17` files passed, `107` tests passed.

## Verification

Commands run successfully before commit:

```bash
npm test -- src/lib/collector/source-key.test.ts src/lib/collector/player-config.test.ts
npm test
npx tsc --noEmit
npx eslint src/lib/collector/source-key.ts src/lib/collector/source-key.test.ts src/lib/collector/player-config.ts src/lib/collector/player-config.test.ts src/app/api/collect/sources/route.ts "src/app/api/collect/sources/[sourceKey]/route.ts"
git -c safe.directory=/home/1dce94_69b1/bigdata/movie-app diff --check -- src/lib/collector/source-key.ts src/lib/collector/source-key.test.ts src/lib/collector/player-config.ts src/lib/collector/player-config.test.ts src/app/api/collect/sources/route.ts "src/app/api/collect/sources/[sourceKey]/route.ts"
```

- Focused tests: passed, 12 tests.
- Full test suite: passed, 107 tests.
- TypeScript check: passed.
- Targeted ESLint: passed with no output.
- Task-owned whitespace check: passed.

## Self-Review

- `sourceKey` is only derived when omitted. Explicit keys are validated but retained unchanged.
- Automatic key selection handles concurrent conflicting creates by retrying on Prisma `P2002`; it does not rely on a race-prone pre-read.
- Player normalization is performed in both server routes, independently of the existing client-side preprocessing.
- HLS entries do not require iframe templates.
- Resolver URLs continue to originate only from the existing `detectPlayerMode` parser, rather than trusting a client-provided resolver URL.
- Every collection source handler continues to independently call `requireAdmin()`.
- No Prisma schema changes were needed.
- The commit stages exactly the six files named by the task brief; unrelated dirty worktree changes were preserved.

## Concerns

- Repository-wide `npm run lint` is not clean because it scans pre-existing generated `.worktrees/recovery-operations/.next` output and unrelated dirty files. The task-owned file list was linted directly and passed.
- Route-level integration tests would require auth and Prisma mocking/harness setup that is not present in the specified task; the pure normalization behavior is covered directly and all existing tests remain green.

## Review Remediation

Addressed both Important findings from review package `827b319..573fe50`.

### RED

```bash
npm test -- src/lib/collector/player-config.test.ts
```

Result: failed as expected. An imported `javascript:` iframe resolver was normalized and persisted as `IFRAME_RESOLVER` with `resolverUrl: 'javascript:alert(1)'`.

```bash
npm test -- src/app/api/collect/sources/route.test.ts
```

Result: failed as expected after correcting the Vitest mock fixture. A generated-key create whose Prisma `P2002` target was `apiUrl` retried once; the test expected the existing duplicate-key `409` response after exactly one create call but received `500` only when its second mocked call stopped the retry.

### GREEN

```bash
npm test -- src/lib/collector/player-config.test.ts src/app/api/collect/sources/route.test.ts
npx tsc --noEmit
npx eslint src/lib/collector/player-config.ts src/lib/collector/player-config.test.ts src/app/api/collect/sources/route.ts src/app/api/collect/sources/route.test.ts
git -c safe.directory=/home/1dce94_69b1/bigdata/movie-app diff --check -- src/lib/collector/player-config.ts src/lib/collector/player-config.test.ts src/app/api/collect/sources/route.ts src/app/api/collect/sources/route.test.ts
```

Results:

- Focused tests: `2` files passed, `13` tests passed.
- TypeScript check: passed with no output.
- Targeted ESLint: passed with no output.
- Task remediation whitespace check: passed with no output.

### Changes

- `normalizePlayerConfigs` now drops `IFRAME_RESOLVER` entries unless their detected resolver prefix parses as an absolute `http:` or `https:` URL. Existing valid HTTPS resolver behavior remains covered.
- Automatic source-key suffix retries now occur only for `P2002` errors whose `meta.target` identifies `sourceKey` or `source_key`; other duplicate constraints propagate to the existing `409` error response without retrying.
