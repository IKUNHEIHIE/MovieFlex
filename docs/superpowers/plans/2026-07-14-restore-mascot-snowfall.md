# Restore Mascot and Snowfall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the public Furina mascot images and ice-blue snowfall effect, then run the production MovieFlex application on port 3000.

**Architecture:** Keep the existing `FurinaMascot` and `Snowfall` components unchanged. Restore the six static mascot images at the component's expected public URLs and merge only the missing snowfall styles into the active theme stylesheet.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, CSS modules and static assets.

## Global Constraints

- Restore the six existing PNG candidates in their current `img/` order as `pose-01.png` through `pose-06.png`.
- Preserve mascot interaction and its existing route suppression rules.
- Preserve Snowfall's existing route suppression rules.
- Use port `3000` with host `0.0.0.0` for the production server.

---

### Task 1: Restore mascot static assets

**Files:**
- Create: `public/mascot/furina/pose-01.png`
- Create: `public/mascot/furina/pose-02.png`
- Create: `public/mascot/furina/pose-03.png`
- Create: `public/mascot/furina/pose-04.png`
- Create: `public/mascot/furina/pose-05.png`
- Create: `public/mascot/furina/pose-06.png`

**Interfaces:**
- Consumes: `src/components/mascot/FurinaMascot.tsx` `POSES` array.
- Produces: six public URLs at `/mascot/furina/pose-01.png` through `/mascot/furina/pose-06.png`.

- [ ] **Step 1: Copy the candidate PNGs in existing image-directory order**

```bash
mkdir -p public/mascot/furina
cp ../img/84214c73e824ee7d43876ec7faf704f3_2061077006729533119.png public/mascot/furina/pose-01.png
cp ../img/a19dced01017ecfcb6ab0fb284ecb215_4214183318313920408.png public/mascot/furina/pose-02.png
cp ../img/9b81fefb1ce055a9f6ca1807e1ada9eb_7255300237646179892.png public/mascot/furina/pose-03.png
cp ../img/a944a7669932d112f7c6c890fbdd3ca0_5327162787525989588.png public/mascot/furina/pose-04.png
cp ../img/dfe68fe72b88b6c039cc31bc7b7f7806_3808148191037317028.png public/mascot/furina/pose-05.png
cp ../img/d56ae40c98961714ee6b85bf9e154f71_4680670591509800956.png public/mascot/furina/pose-06.png
```

- [ ] **Step 2: Verify all six restored paths exist**

Run: `test -f public/mascot/furina/pose-01.png && test -f public/mascot/furina/pose-06.png`

Expected: exit code `0`.

### Task 2: Restore ice-blue snowfall rules

**Files:**
- Modify: `public/themes/ice-blue/style.css`
- Test: `src/components/layout/snowfall-routes.test.ts`

**Interfaces:**
- Consumes: `.snowfall` and `.snowflake` markup from `src/components/layout/Snowfall.tsx`.
- Produces: visible animated snow on public routes and no animation under reduced motion.

- [ ] **Step 1: Add the snowfall CSS selectors and keyframes to the active theme**

```css
.snowfall { position: fixed; inset: var(--nav-height) 0 0; z-index: 20; overflow: hidden; pointer-events: none; }
.snowflake { position: absolute; top: -14px; width: 7px; height: 7px; border-radius: 50%; background: rgba(167, 204, 255, 0.55); box-shadow: 0 0 12px rgba(255, 255, 255, 0.82); animation: snow-drift 13s linear infinite; }
@keyframes snow-drift { from { transform: translate3d(0, 0, 0) scale(0.7); } 50% { transform: translate3d(22px, 52vh, 0) scale(1); } to { transform: translate3d(-12px, 110vh, 0) scale(0.78); } }
```

Add one `nth-child` position rule for every flake index 1 through 12 and add `.snowfall { display: none; }` to the existing reduced-motion media query.

- [ ] **Step 2: Run the Snowfall route contract test**

Run: `set -a && source .env && set +a && npx vitest run src/components/layout/snowfall-routes.test.ts`

Expected: all tests pass.

### Task 3: Verify and run production service

**Files:**
- Verify: `src/components/mascot/furina-mascot.test.ts`
- Verify: `src/components/layout/snowfall-routes.test.ts`
- Verify: `src/app/home-anime-contract.test.ts`

**Interfaces:**
- Consumes: restored static assets, active ice-blue theme, Next.js production build.
- Produces: MovieFlex served on `http://0.0.0.0:3000`.

- [ ] **Step 1: Run focused visual behavior tests**

Run: `set -a && source .env && set +a && npx vitest run src/components/mascot/furina-mascot.test.ts src/components/layout/snowfall-routes.test.ts src/app/home-anime-contract.test.ts`

Expected: all selected test files pass.

- [ ] **Step 2: Build the Next.js application**

Run: `npm run build`

Expected: `Compiled successfully` and route output.

- [ ] **Step 3: Replace the running service and verify HTTP status**

```bash
pkill -f 'next-server.*3000' || true
nohup npm run start -- --hostname 0.0.0.0 --port 3000 > /tmp/movieflex-next.log 2>&1 &
curl --fail --silent --show-error -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
```

Expected: HTTP status `200`.
