# Modules

## Frontend Viewing

Files:

- `src/app/page.tsx`
- `src/app/movies/page.tsx`
- `src/app/movie/[id]/page.tsx`
- `src/app/search/page.tsx`
- `src/components/player/*`

Responsibilities:

- Present movie lists, detail pages, search results, and playback UI.
- Send behavior events to `/api/events`.
- Use metadata filters for type, area, language, and year.

## Authentication and User Center

Files:

- `src/lib/auth/auth.ts`
- `src/lib/auth/authorization.ts`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/user/profile/page.tsx`
- `src/app/user/account/page.tsx`

Responsibilities:

- Credentials login through Auth.js.
- User registration and profile management.
- Favorites, watch history, and account updates.
- Admin role checks for protected admin routes and APIs.

## Admin Shell and Operations Overview

Files:

- `src/app/admin/layout.tsx`
- `src/app/admin/admin.module.css`
- `src/app/admin/page.tsx`
- `src/app/admin/overview-data.ts`
- `src/components/admin/OperationsSidebar.tsx`

Responsibilities:

- Provide a unified admin layout and sidebar.
- Render the operations cockpit: core metrics, pending issues, collection status, content health, popular movies, and quick actions.
- Keep admin styling centralized in `admin.module.css`.

## Movie Management

Files:

- `src/app/admin/movies/page.tsx`
- `src/app/admin/movies/new/page.tsx`
- `src/app/admin/movies/[id]/page.tsx`
- `src/components/admin/MovieEditForm.tsx`
- `src/app/api/admin/movies/*`

Responsibilities:

- Search and paginate movies.
- Create, edit, and delete manual movie records.
- Normalize area/language metadata and maintain relation tables.

## Collection and Catalog Management

Files:

- `src/components/admin/CollectSourceManager.tsx`
- `src/components/admin/catalog/CategoryManagement.tsx`
- `src/components/admin/catalog/CategoryTree.tsx`
- `src/app/api/collect/*`
- `src/app/api/admin/catalog/*`
- `src/app/api/admin/mappings/*`
- `src/lib/collector/*`

Responsibilities:

- Manage AppleCMS collection sources.
- Create and control resumable collection tasks.
- Manage local category tree.
- Map source categories to local categories.
- Reclassify movies when mappings change.

## Analytics and Statistics

Files:

- `src/app/admin/stats/movies/page.tsx`
- `src/app/admin/stats/categories/page.tsx`
- `src/app/admin/stats/users/page.tsx`
- `src/app/admin/stats/trends/page.tsx`
- `src/app/api/admin/stats/*`
- `src/lib/stats/*`
- `scripts/run-stats-consumer.ts`
- `scripts/backfill-demo-analytics.ts`

Responsibilities:

- Consume Kafka user behavior events.
- Normalize event field names from camelCase and snake_case producers.
- Update `DailyStats` and other analytics tables.
- Display movie, category, user, and time-trend statistics.

## Event Outbox and Kafka

Files:

- `src/lib/kafka.ts`
- `src/lib/outbox.ts`
- `src/app/api/events/route.ts`
- `src/app/api/admin/outbox/retry/route.ts`
- `src/app/api/internal/outbox/retry/route.ts`

Responsibilities:

- Queue behavior events in `EventOutbox`.
- Attempt Kafka delivery immediately.
- Keep failed events as `PENDING` for retry.
- Support admin and internal retry endpoints.

## Health Dashboard

Files:

- `src/app/admin/dashboard/page.tsx`
- `src/components/admin/HealthMonitor.tsx`
- `src/lib/health.ts`
- `src/app/api/internal/health/route.ts`
- `src/app/api/admin/health/history/route.ts`

Responsibilities:

- Show database latency, Kafka status, pending events, latest collection task, and latest recommendation batch.
- Maintain short in-memory health history for dashboard charts.

## Theme Management

Files:

- `src/app/admin/themes/page.tsx`
- `src/components/admin/ThemeButton.tsx`
- `src/app/api/admin/themes/active/route.ts`
- `themes/`

Responsibilities:

- Select active frontend theme.
- Load theme CSS from public theme assets.

## Recommendations

Files:

- `src/lib/recommendations.ts`
- `src/lib/demo-analytics.ts`
- `prisma/schema.prisma` model `Recommendation`

Responsibilities:

- Store recommendation batches.
- Provide user-profile recommendations and overview health information.

## Testing

Files:

- `src/**/*.test.ts`
- `src/**/*.test.tsx`

Responsibilities:

- Unit test validation, auth routes, collector logic, metadata normalization, playback helpers, analytics normalization, admin boundaries, and admin overview data.
- Static regression checks prevent admin Server Component boundary mistakes and stale design-system imports.
