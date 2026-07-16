# Admin Stats Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the four admin analytics pages into a high-impact “影院运营战情室” demo experience.

**Architecture:** Reuse the existing client-side stats pages and `recharts`. Add shared bento/showcase CSS utilities, then derive extra chart datasets on the client from existing API responses without changing backend contracts.

**Tech Stack:** Next.js App Router, React client components, Recharts, CSS Modules, Vitest.

## Global Constraints

- Do not add ECharts, D3, or new UI dependencies.
- Do not create a separate fullscreen showcase route.
- Do not redesign the entire admin shell or sidebar.
- Do not change analytics ingestion or Kafka behavior.
- All stats pages must collapse to one column on narrower screens and avoid horizontal overflow.
- Verify with focused contract tests, full Vitest suite, `npx next build --webpack`, and 3070 preview smoke tests.

---

### Task 1: Shared Showcase Contract And CSS

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`
- Modify: `src/app/admin/admin.module.css`

**Interfaces:**
- Produces CSS classes consumed by all stats pages: `showcaseGrid`, `heroChart`, `insightGrid`, `insightCard`, `miniChartGrid`, `chartNarrative`, `heatmapGrid`, `heatmapCell`, `opportunityMatrix`, `funnelList`, `rankList`.

- [ ] **Step 1: Write the failing test**

Add to `src/app/admin/admin-style.test.ts`:

```ts
it('provides shared showcase dashboard layout utilities', () => {
  const css = readFileSync(join(root, 'src/app/admin/admin.module.css'), 'utf8');
  for (const className of ['showcaseGrid', 'heroChart', 'insightGrid', 'insightCard', 'miniChartGrid', 'chartNarrative', 'heatmapGrid', 'heatmapCell', 'opportunityMatrix', 'funnelList', 'rankList']) {
    expect(css).toContain(`.${className}`);
  }
  expect(css).toContain('@media (max-width: 900px)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: FAIL because showcase utility classes are missing.

- [ ] **Step 3: Add shared CSS utilities**

Append compact utilities to `src/app/admin/admin.module.css`:

```css
.showcaseGrid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, .75fr); gap: 18px; align-items: stretch; }
.heroChart { min-height: 100%; }
.insightGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.insightCard { position: relative; overflow: hidden; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(239,246,255,.88)); box-shadow: 0 12px 28px rgba(43,74,132,.07); }
.insightCard span { display: block; color: var(--muted); font-size: .76rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.insightCard strong { display: block; margin-top: 8px; color: var(--ink); font-size: 1.18rem; }
.insightCard p { margin: 8px 0 0; color: var(--muted); font-size: .82rem; line-height: 1.45; }
.miniChartGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.chartNarrative { margin: -4px 0 16px; color: var(--muted); font-size: .88rem; line-height: 1.55; }
.heatmapGrid { display: grid; grid-template-columns: repeat(10, minmax(18px, 1fr)); gap: 7px; }
.heatmapCell { min-height: 34px; border-radius: 9px; border: 1px solid rgba(79,125,243,.16); background: rgba(79,125,243,.08); }
.opportunityMatrix { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.funnelList, .rankList { display: grid; gap: 10px; }
@media (max-width: 900px) { .showcaseGrid, .miniChartGrid { grid-template-columns: 1fr; } .insightGrid, .opportunityMatrix { grid-template-columns: 1fr; } .heatmapGrid { grid-template-columns: repeat(5, minmax(22px, 1fr)); } }
```

- [ ] **Step 4: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: PASS.

### Task 2: Movies Heat Showcase

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`
- Modify: `src/app/admin/stats/movies/page.tsx`

**Interfaces:**
- Consumes `MovieStat` fields: `title`, `viewCount`, `favoriteCount`, `avgProgress`, `typeName`.
- Produces visible sections: `观看收藏气泡图`, `综合热度雷达`, `爆款洞察`.

- [ ] **Step 1: Write failing contract assertions**

Add to the stats showcase test:

```ts
const moviesPage = readFileSync(join(root, 'src/app/admin/stats/movies/page.tsx'), 'utf8');
expect(moviesPage).toContain('ScatterChart');
expect(moviesPage).toContain('RadarChart');
expect(moviesPage).toContain('观看收藏气泡图');
expect(moviesPage).toContain('综合热度雷达');
expect(moviesPage).toContain('爆款洞察');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: FAIL because Movies page lacks scatter/radar sections.

- [ ] **Step 3: Implement derived datasets and layout**

Update `movies/page.tsx` imports to include `ScatterChart`, `Scatter`, `ZAxis`, `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`. Add `conversion`, `heatScore`, `scatterData`, `radarData`, and insight card calculations. Replace the single chart section with a `showcaseGrid` hero horizontal bar plus side insight/radar, then a `miniChartGrid` scatter chart.

- [ ] **Step 4: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: PASS.

### Task 3: Category Distribution Showcase

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`
- Modify: `src/app/admin/stats/categories/page.tsx`

**Interfaces:**
- Consumes `CategoryStat` fields: `name`, `movieCount`, `totalViews`, `totalFavorites`.
- Produces visible sections: `供需对比`, `收藏转化排行`, `分类机会矩阵`.

- [ ] **Step 1: Write failing contract assertions**

Add assertions:

```ts
const categoriesPage = readFileSync(join(root, 'src/app/admin/stats/categories/page.tsx'), 'utf8');
expect(categoriesPage).toContain('供需对比');
expect(categoriesPage).toContain('收藏转化排行');
expect(categoriesPage).toContain('分类机会矩阵');
expect(categoriesPage).toContain('opportunityMatrix');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: FAIL because opportunity matrix is missing.

- [ ] **Step 3: Implement category showcase**

Add conversion ranking and opportunity quadrant calculations. Keep the donut chart, add insight cards for主力分类 and高潜分类, add supply-demand bar chart, conversion ranking list, and CSS matrix cards.

- [ ] **Step 4: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: PASS.

### Task 4: User Behavior Showcase

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`
- Modify: `src/app/admin/stats/users/page.tsx`

**Interfaces:**
- Consumes `UserStat` fields: `username`, `watchCount`, `uniqueMovies`, `favoriteCount`, `avgProgress`, `activityLevel`.
- Produces visible sections: `活跃漏斗`, `观看深度分布`, `用户价值排行`, `行为散点图`.

- [ ] **Step 1: Write failing contract assertions**

Add assertions:

```ts
const usersPage = readFileSync(join(root, 'src/app/admin/stats/users/page.tsx'), 'utf8');
expect(usersPage).toContain('ScatterChart');
expect(usersPage).toContain('活跃漏斗');
expect(usersPage).toContain('观看深度分布');
expect(usersPage).toContain('用户价值排行');
expect(usersPage).toContain('行为散点图');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: FAIL because funnel/depth/scatter sections are missing.

- [ ] **Step 3: Implement user showcase**

Add funnel data, depth buckets, user value score ranking, and scatter chart. Use CSS `funnelList` and `rankList` for fast visual polish.

- [ ] **Step 4: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: PASS.

### Task 5: Trends Showcase

**Files:**
- Modify: `src/app/admin/admin-style.test.ts`
- Modify: `src/app/admin/stats/trends/page.tsx`

**Interfaces:**
- Consumes `TrendData` fields: `date`, `totalViews`, `userViews`, `guestViews`, `totalFavorites`, `uniqueUsers`.
- Produces visible sections: `用户/游客观看趋势`, `收藏转化率趋势`, `活跃日历热力图`, `趋势洞察`.

- [ ] **Step 1: Write failing contract assertions**

Add assertions:

```ts
const trendsPage = readFileSync(join(root, 'src/app/admin/stats/trends/page.tsx'), 'utf8');
expect(trendsPage).toContain('用户/游客观看趋势');
expect(trendsPage).toContain('收藏转化率趋势');
expect(trendsPage).toContain('活跃日历热力图');
expect(trendsPage).toContain('趋势洞察');
expect(trendsPage).toContain('heatmapGrid');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: FAIL because heatmap and conversion trend are missing.

- [ ] **Step 3: Implement trend showcase**

Add conversion percent, peak day, best conversion day, normalized heatmap intensity, and chart sections. Use stacked `Area` for user/guest views and a line chart for conversion rate.

- [ ] **Step 4: Run focused test**

Run: `npm test -- --run src/app/admin/admin-style.test.ts`

Expected: PASS.

### Task 6: Full Verification And Preview

**Files:**
- No source changes unless verification reveals a defect.

**Interfaces:**
- Consumes all previous tasks.
- Produces verified preview on port `3070`.

- [ ] **Step 1: Run full tests**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npx next build --webpack`

Expected: build exits 0.

- [ ] **Step 3: Restart preview and smoke test stats pages**

Run: `pm2 restart movieflex-home-preview --update-env`, then smoke test `/admin/stats/movies`, `/admin/stats/categories`, `/admin/stats/users`, `/admin/stats/trends`.

Expected: each route returns either `200 OK` for authenticated session-independent rendering or an expected auth redirect; no server crash.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add src/app/admin/admin-style.test.ts src/app/admin/admin.module.css src/app/admin/stats/movies/page.tsx src/app/admin/stats/categories/page.tsx src/app/admin/stats/users/page.tsx src/app/admin/stats/trends/page.tsx docs/superpowers/plans/2026-07-16-admin-stats-showcase.md
git commit -m "feat: upgrade admin stats showcase dashboards"
```

Expected: one implementation commit.

## Self-Review

- Spec coverage: all four pages, shared layout, no new dependencies, responsive layout, and verification are covered.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: all derived metrics use fields already declared in each page’s local interface.
