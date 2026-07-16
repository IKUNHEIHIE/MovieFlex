# Admin Stats Showcase Design

## Goal

Upgrade the four admin analytics pages into a high-impact “影院运营战情室” experience for short evaluation demos. The pages should make MovieFlex feel like a complete platform with collection, recommendation, user behavior, and operational analytics.

## Scope

Enhance these existing pages:

- `src/app/admin/stats/movies/page.tsx` for 影片热度
- `src/app/admin/stats/categories/page.tsx` for 分类分布
- `src/app/admin/stats/users/page.tsx` for 用户行为
- `src/app/admin/stats/trends/page.tsx` for 时间趋势
- `src/app/admin/admin.module.css` for shared layout and visual treatment

Do not add a new chart library. Reuse `recharts`, `ChartContainer`, `AnimatedCard`, `AnimatedNumber`, and `AdminChartTooltip`.

## Visual Direction

Use a “影院运营战情室” style: polished light dashboard, blue-gold highlights, glass-like cards, strong hierarchy, and bento layouts. Each page should have a hero chart, one or two supporting charts, and concise insight cards. The design should feel premium and demo-ready without becoming noisy.

## Shared Layout

Add shared admin CSS utilities:

- `showcaseGrid`: responsive bento grid with a large hero area and side insights.
- `heroChart`: larger chart card for the page’s main story.
- `insightGrid` / `insightCard`: compact cards for auto-generated highlights.
- `miniChartGrid`: two-column supporting chart layout.
- `chartNarrative`: short explanatory line under section headings.
- `heatmapGrid` / `heatmapCell`: pure CSS calendar-style heatmap for trends.

All layouts must collapse to one column on narrower screens and avoid horizontal overflow.

## Page Requirements

### 影片热度

Keep existing metric cards and filtering. Upgrade the main chart area to show:

- Horizontal Top 10 heat ranking by views.
- Scatter bubble chart: views vs favorites, bubble size or visual emphasis based on average progress.
- Radar chart for Top 5综合热度 dimensions:观看、收藏、进度.
- Insight cards for highest views, highest favorites, best completion, and strongest conversion.

Derived metrics:

- Completion percent: `Math.round(avgProgress * 100)`.
- Favorite conversion: `favoriteCount / viewCount`, guarded for zero views.
- Composite heat: `viewCount * 0.6 + favoriteCount * 3 + avgProgress * 100`.

### 分类分布

Keep existing metrics. Upgrade chart area to show:

- Large donut chart for views share, with a center-style narrative in adjacent insight card.
- Supply-demand comparison: movie count vs views.
- Conversion ranking: favorites divided by views.
- Category opportunity matrix: high/low supply and high/low demand buckets.

Derived metrics:

- Favorite conversion: `totalFavorites / totalViews`, guarded for zero views.
- Supply average: average `movieCount`.
- Demand average: average `totalViews`.
- Opportunity quadrant labels: `明星品类`, `潜力缺口`, `库存承压`, `长尾补充`.

### 用户行为

Keep existing activity metrics. Upgrade chart area to show:

- Activity funnel: total users, users with watch count, repeated watchers, users with favorites, high-active users.
- User value ranking using watches, favorites, and unique movies.
- Watch depth distribution buckets: `0-25%`, `25-50%`, `50-75%`, `75-100%`.
- Behavior scatter chart: watch count vs favorite count, colored by activity level.

Derived metrics:

- Repeated watchers: `watchCount >= 2`.
- Has favorites: `favoriteCount > 0`.
- User value: `watchCount + favoriteCount * 3 + uniqueMovies * 2`.
- Depth percent: `Math.round(avgProgress * 100)`.

### 时间趋势

Keep period selector and summary cards. Upgrade chart area to show:

- Hero stacked area trend for user views and guest views.
- Total views line or area overlay.
- Favorite conversion line: favorites divided by total views.
- Calendar-style activity heatmap using CSS grid.
- Insight cards for peak day, average daily views, average DAU, and best conversion day.

Derived metrics:

- Conversion percent: `totalFavorites / totalViews * 100`, guarded for zero views.
- Peak day: trend with max `totalViews`.
- Best conversion day: trend with max guarded conversion percent.
- Heatmap intensity: normalize total views against max total views in the selected range.

## Data Handling

Prefer derived client-side metrics from existing API responses. Do not change API contracts unless implementation proves an essential data point is unavailable. Empty data should render stable empty charts or muted insight copy, not crash.

## Testing

Add or extend static contract tests for:

- Shared showcase layout class names exist in `admin.module.css`.
- Each stats page includes its required chart types or visible section titles.
- No new dependency is introduced for charting.

Run focused tests, full Vitest suite, `npx next build --webpack`, restart preview, and smoke test admin stats pages.

## Non-Goals

- Do not create a separate fullscreen showcase route.
- Do not add ECharts, D3, or new UI dependencies.
- Do not redesign the entire admin shell or sidebar.
- Do not change analytics ingestion or Kafka behavior.

## Self-Review

- No placeholders or unresolved decisions remain.
- Scope is limited to four stats pages and shared admin styling.
- All chart requirements can be derived from current page data models.
- Mobile requirement is explicit: one-column collapse and no horizontal overflow.
