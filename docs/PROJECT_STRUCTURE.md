# Project Structure

MovieFlex uses the Next.js App Router. Most application code lives under `src/`, operational scripts live under `scripts/`, and deployment assets live under `deploy/`.

## Top-Level Files

| Path | Purpose |
| --- | --- |
| `package.json` | Scripts, dependencies, and project metadata. |
| `prisma/schema.prisma` | Database schema for users, movies, collection, analytics, outbox, and recommendations. |
| `ecosystem.config.cjs` | PM2 process definitions for the web app and stats consumer. |
| `deploy/movieflex-kafka.service` | systemd unit for running the Kafka broker. |
| `.env.example` | Safe environment variable template. |
| `docs/` | Project, deployment, API, and module documentation. |

## Source Layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Next.js routes, layouts, pages, and route handlers. |
| `src/app/api/` | HTTP API route handlers. |
| `src/app/admin/` | Admin pages, admin layout, admin CSS module, and admin overview data. |
| `src/components/` | Shared UI components, admin components, layout components, player components, and animated UI helpers. |
| `src/lib/` | Business logic, Prisma client, authentication, validation, collector, Kafka, outbox, stats, recommendations, and formatting helpers. |
| `scripts/` | One-off or long-running operational scripts. |
| `themes/` | Public theme assets loaded by the app shell. |
| `public/` | Static assets served by Next.js. |

## App Routes

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Home page and featured content. |
| `/movies` | `src/app/movies/page.tsx` | Movie listing with filters. |
| `/movie/[id]` | `src/app/movie/[id]/page.tsx` | Movie detail and playback page. |
| `/search` | `src/app/search/page.tsx` | Search results. |
| `/login` | `src/app/login/page.tsx` | Credentials login. |
| `/register` | `src/app/register/page.tsx` | User registration. |
| `/user/profile` | `src/app/user/profile/page.tsx` | User center. |
| `/user/account` | `src/app/user/account/page.tsx` | Account management. |
| `/admin` | `src/app/admin/page.tsx` | Operations overview cockpit. |
| `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | Health and analytics dashboard. |
| `/admin/movies` | `src/app/admin/movies/page.tsx` | Movie library management. |
| `/admin/users` | `src/app/admin/users/page.tsx` | User management. |
| `/admin/themes` | `src/app/admin/themes/page.tsx` | Theme management. |
| `/admin/catalog/sources` | `src/app/admin/catalog/sources/page.tsx` | Collection source management. |
| `/admin/catalog/categories` | `src/app/admin/catalog/categories/page.tsx` | Category and mapping management. |
| `/admin/stats/*` | `src/app/admin/stats/*/page.tsx` | Movie, category, user, and trend statistics. |

## Admin Frontend Rules

- The admin shell is `src/app/admin/layout.tsx`.
- Admin styling is centralized in `src/app/admin/admin.module.css`.
- Do not reintroduce the deleted dark admin theme files or the deleted `AdminButton`, `AdminCard`, and `AdminTable` components.
- Server Components must not pass browser event handlers or render functions into Client Components.

## Operational Scripts

| Script | Purpose |
| --- | --- |
| `scripts/bootstrap-admin.ts` | Create or bootstrap an administrator account. |
| `scripts/run-stats-consumer.ts` | Long-running Kafka stats consumer entrypoint for PM2. |
| `scripts/backfill-demo-analytics.ts` | Generate demo analytics data. |
| `scripts/seed-demo-users.ts` | Seed demo users and interactions. |
| `scripts/backfill-clean-metadata.ts` | Normalize movie metadata. |
| `scripts/backfill-movie-metadata-relations.ts` | Backfill movie area/language relation tables. |
| `scripts/init-categories.ts` | Initialize category data. |
| `scripts/fix-pending-mappings.ts` | Repair pending category mappings. |
