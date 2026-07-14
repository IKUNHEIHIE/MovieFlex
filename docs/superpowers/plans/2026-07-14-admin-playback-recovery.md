# Admin Playback Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the administrator source-management interface and route provider URLs through the correct player mode.

**Architecture:** The server-rendered admin layout supplies authorization and shell navigation; a client source manager calls the existing collection APIs. The movie page resolves AppleCMS groups through `playback.ts`, while the player renders iframe or HLS by selected provider mode.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma, HLS.js, Vitest.

## Global Constraints

- Only `/admin` and `/admin/sources` are exposed in the restored admin navigation.
- `liangzi` maps to `IFRAME_DIRECT`.
- Direct HLS remains HLS.js playback.
- The production service listens on `0.0.0.0:3000`.

---

### Task 1: Resolve provider playback modes

**Files:**
- Modify: `src/lib/playback.ts`
- Modify: `src/lib/playback.test.ts`
- Modify: `src/app/movie/[id]/page.tsx`
- Modify: `src/components/video/VideoPlayer.tsx`

- [ ] Add a failing test proving a `liangzi` group selects `IFRAME_DIRECT` and an HLS group selects `HLS`.
- [ ] Run `npx vitest run src/lib/playback.test.ts` and verify the new assertion fails before production integration.
- [ ] Add the production registry and make the movie page call `parsePlayGroups` and `selectPlayback`.
- [ ] Render iframe for direct/resolver modes and HLS only for HLS mode; cap HLS network recovery at two retries.
- [ ] Re-run `npx vitest run src/lib/playback.test.ts`.

### Task 2: Restore administrator source management

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/sources/page.tsx`
- Create: `src/components/admin/OperationsSidebar.tsx`
- Create: `src/components/admin/CollectSourceManager.tsx`
- Create: `src/app/admin/admin.module.css`

- [ ] Add a route contract that expects the admin overview and source manager pages.
- [ ] Run the focused test and verify it fails before pages exist.
- [ ] Restore server-side administrator protection and the blue operations shell.
- [ ] Add overview metrics from Prisma and client-side source create/run actions using existing APIs.
- [ ] Re-run the focused route test.

### Task 3: Full verification and launch

**Files:**
- Verify: `src/lib/playback.test.ts`
- Verify: `src/app/admin/admin-routes.test.ts`
- Verify: `src/app/home-anime-contract.test.ts`

- [ ] Run `set -a && source .env && set +a && npx vitest run`.
- [ ] Run `npm run build`.
- [ ] Restart the running Next server with `setsid npm run start -- --hostname 0.0.0.0 --port 3000`.
- [ ] Check `GET /admin`, `/movie/1`, `/mascot/furina/pose-01.png`, and `/themes/ice-blue/style.css` return expected HTTP status codes.
