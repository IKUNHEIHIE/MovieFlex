# Light Command Center Live Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the dashboard command center to the shared pale-blue admin theme and replay the database latency chart animation once per second without changing server polling.

**Architecture:** Keep `HealthMonitor` as the data owner. Its existing one-second tick becomes a presentation-only `latencyScanKey`; scoped CSS makes the dashboard light and provides a reduced-motion-safe scan overlay.

**Tech Stack:** Next.js client component, React, Recharts, CSS Modules, Vitest.

## Global Constraints

- Reuse the `admin.module.css` shared admin tokens exactly.
- Preserve five-second API polling and do not generate synthetic metric values.
- Do not add dependencies.
- Do not change the `/admin/dashboard` route or authentication behavior.

---

### Task 1: Contract Test

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`

- [ ] Add assertions requiring `latencyScanKey` and `commandChartScan` in `HealthMonitor.tsx`, and `commandCenterLight`, `commandChartScan`, and `@media (prefers-reduced-motion: reduce)` in `admin.module.css`.
- [ ] Run `npm test -- --run src/app/admin/admin-style.test.ts` and verify the new assertion fails because these elements do not yet exist.

### Task 2: Light Dashboard and Live Scan

**Files:**
- Modify: `src/components/admin/HealthMonitor.tsx`
- Modify: `src/app/admin/admin.module.css`

- [ ] Derive `latencyScanKey` from the existing `tick` state and apply it to the latency chart `Area` so the chart replays native Recharts animation each second.
- [ ] Add a presentational `commandChartScan` overlay in the latency panel.
- [ ] Add `commandCenterLight` and use shared pale-blue token values for the command center, panels, topology, status, radar, heatmap, and chart tooltips.
- [ ] Add a reduced-motion rule that turns off the overlay animation.
- [ ] Run `npm test -- --run src/app/admin/admin-style.test.ts` and verify it passes.

### Task 3: Verification and Preview

**Files:**
- No additional files unless verification exposes a defect.

- [ ] Run `npm test -- --run`.
- [ ] Run `npx next build --webpack`.
- [ ] Restart `movieflex-dashboard-preview` on port 3070 and request `/` and `/admin/dashboard`.
