# Light Command Center Live Scan Design

## Goal

Make `/admin/dashboard` visually consistent with MovieFlex's existing pale-blue admin system while making the database-latency trend visibly live at a one-second cadence.

## Visual Direction

- Preserve the command-center information architecture: hero, key metrics, topology, alerts, health indicators, heatmap, analytics, and trends.
- Replace the dark navy treatment with the shared admin tokens: `--canvas`, `--surface`, `--line`, `--ink`, `--muted`, `--blue`, and `--blue-soft`.
- Use white translucent panels, subtle blue border/shadow treatment, dark blue-gray typography, and the existing semantic green, amber, and red status colors.
- Keep the circular health instrument, but make its ring and labels compatible with the light panels.

## Live Trend Behavior

- Keep real health and history requests on the existing five-second intervals.
- Increment an existing local one-second tick to visually refresh the latency chart.
- Remount only the latency `Area` through a `key` derived from the one-second tick so Recharts replays its native draw animation; it does not fabricate or append data.
- Render a lightweight scan overlay across the latency panel once per second as a visual cue that sampling is active.
- Disable nonessential scan motion under `prefers-reduced-motion`.

## Scope and Constraints

- Modify only `HealthMonitor.tsx`, `admin.module.css`, and the focused admin style contract test.
- Add no dependencies, API routes, database writes, or high-frequency requests.
- Maintain responsive single-column behavior below the existing breakpoints.
- Validate with focused test, full test suite, `npx next build --webpack`, and a restarted 3070 preview smoke test.
