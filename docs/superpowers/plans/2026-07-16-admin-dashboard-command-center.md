# Admin Dashboard Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/admin/dashboard` into a dark “MovieFlex 实时运营指挥中心” data screen that feels like a platform-level operations command center.

**Architecture:** Reuse the existing `HealthMonitor` client component and `/api/admin/health/history` data. Add derived UI sections inside the component and scoped CSS module classes in `admin.module.css`; do not change backend APIs or ingestion behavior.

**Tech Stack:** Next.js App Router, React client components, Recharts, CSS Modules, Vitest.

## Global Constraints

- Do not add new dependencies.
- Do not change Kafka, health API, stats ingestion, or auth behavior.
- Keep the route `/admin/dashboard` and existing `HealthMonitor` component.
- The command-center design must be responsive and must not horizontally overflow.
- Use TDD with `src/app/admin/admin-style.test.ts` before production code.

---

### Task 1: Command Center Contract

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`

**Interfaces:**
- Produces failing assertions for `HealthMonitor.tsx` and shared admin CSS classes.

- [ ] **Step 1: Add failing test**

Add a contract that expects these strings/classes:

```ts
const healthMonitor = readFileSync(join(process.cwd(), 'src/components/admin/HealthMonitor.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'src/app/admin/admin.module.css'), 'utf8');

expect(healthMonitor).toContain('MovieFlex 实时运营指挥中心');
expect(healthMonitor).toContain('全链路数据监控');
expect(healthMonitor).toContain('链路拓扑');
expect(healthMonitor).toContain('告警中心');
expect(healthMonitor).toContain('系统健康雷达');
expect(healthMonitor).toContain('活跃日历热力图');
for (const className of ['commandCenter', 'commandHero', 'commandMetricGrid', 'signalNode', 'alertTower', 'opsTimeline', 'screenGlow']) {
  expect(css).toContain(`.${className}`);
}
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: FAIL because the command-center copy/classes are missing.

### Task 2: HealthMonitor Command Center UI

**Files:**
- Modify: `src/components/admin/HealthMonitor.tsx`

**Interfaces:**
- Consumes existing `health` and `history` state.
- Produces command-center sections: hero header, core metrics, link topology, alert tower, radar, trends, heatmap.

- [ ] **Step 1: Implement minimal UI**

Replace the normal dashboard outer layout with:

- `MovieFlex 实时运营指挥中心` title.
- `全链路数据监控` subtitle.
- `ONLINE` status.
- Four large metrics: DB latency, Kafka pending, movie count, recent added movies.
- Link topology: 采集源 → 影片库 → 播放事件 → Kafka 队列 → 统计推荐.
- Alert tower derived from unhealthy checks, Kafka pending, DB status, stale stats.
- Existing trend charts restyled under command-center panels.

- [ ] **Step 2: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: still FAIL until CSS classes are added.

### Task 3: Dark Command Center CSS

**Files:**
- Modify: `src/app/admin/admin.module.css`

**Interfaces:**
- Produces dark command-center styles used by `HealthMonitor`.

- [ ] **Step 1: Add scoped CSS classes**

Add classes for:

- `commandCenter`
- `commandHero`
- `commandMetricGrid`
- `signalNode`
- `alertTower`
- `opsTimeline`
- `screenGlow`

- [ ] **Step 2: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: PASS.

### Task 4: Verification

**Files:**
- No source changes unless verification reveals a defect.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run build**

Run: `npx next build --webpack`

Expected: build exits 0.

- [ ] **Step 3: Preview smoke**

Restart or start preview on `3070`, smoke test `/admin/dashboard` for expected auth redirect when logged out.

Expected: `307 Temporary Redirect` to login or `200 OK` if an admin session exists; no server crash.

## Self-Review

- Scope is limited to `/admin/dashboard`, `HealthMonitor`, shared CSS, and tests.
- No new APIs, dependencies, or auth changes.
- The route remains compatible with the existing admin shell.
