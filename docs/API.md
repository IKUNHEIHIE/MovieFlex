# API Documentation

All APIs are implemented as Next.js route handlers under `src/app/api`.

## Response Shape

Most JSON endpoints return:

```json
{ "success": true, "data": {} }
```

Failures generally return:

```json
{ "success": false, "error": "message" }
```

## Authentication

- Public APIs are available without login unless noted.
- User APIs require a logged-in user.
- Admin APIs require `ADMIN` role via `requireAdmin()`.
- Internal retry endpoints require a server-side token when configured.

## Auth APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a user. The first registered user becomes admin by project logic. |
| `GET/POST` | `/api/auth/[...nextauth]` | Public | Auth.js handlers for credentials login, session, CSRF, and signout. |

## User APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET/PATCH` | `/api/user/profile` | User | Read or update user profile. |
| `POST/DELETE` | `/api/user/favorites/[movieId]` | User | Add or remove a favorite movie. |
| `DELETE` | `/api/user/history/[id]` | User | Delete a watch-history entry. |

## Behavior Event API

### `POST /api/events`

Auth: optional user session.

Purpose: record playback behavior and enqueue Kafka analytics events through EventOutbox.

Body:

```json
{
  "eventType": "play_start",
  "movieId": 1,
  "data": {
    "episode": "正片",
    "progress": 10,
    "currentTime": 120,
    "duration": 1200
  }
}
```

Supported `eventType` values: `play_start`, `play_progress`, `play_end`, `view`.

Response:

```json
{ "success": true, "kafkaDelivered": true }
```

## Collection APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/collect/sources` | Admin | List collection sources. |
| `POST` | `/api/collect/sources` | Admin | Create a collection source. |
| `PATCH/DELETE` | `/api/collect/sources/[sourceKey]` | Admin | Update or delete a collection source. |
| `GET/POST` | `/api/collect/tasks` | Admin | List or create collection tasks. |
| `PATCH` | `/api/collect/tasks/[id]` | Admin | Pause, resume, or cancel collection tasks. |
| `POST` | `/api/collect/run` | Admin | Deprecated. Returns `410`; use `/api/collect/tasks`. |

Collection source body example:

```json
{
  "name": "Example CMS",
  "apiUrl": "https://example.com/api.php/provide/vod/",
  "sourceKey": "example",
  "format": "JSON",
  "playerConfigs": []
}
```

## Admin Movie APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/admin/movies` | Admin | Create a manual movie record. |
| `PATCH/PUT/DELETE` | `/api/admin/movies/[id]` | Admin | Update or delete a movie. |

Movie create body summary:

```json
{
  "title": "Movie title",
  "typeId": 1,
  "director": "Director",
  "actors": "Actor A, Actor B",
  "description": "Summary",
  "year": 2026,
  "area": "中国大陆",
  "language": "国语",
  "picUrl": "https://example.com/poster.jpg",
  "score": 8.5
}
```

## Admin User APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users?search=&page=1&pageSize=20` | Admin | Paginated user search. |
| `POST` | `/api/admin/users` | Admin | Create a user. |
| `PATCH/DELETE` | `/api/admin/users/[id]` | Admin | Update role/profile/password or delete a user. |

## Admin Catalog and Mapping APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET/POST` | `/api/admin/catalog/categories` | Admin | List or create categories. |
| `PATCH/DELETE` | `/api/admin/catalog/categories/[id]` | Admin | Update or delete a category. |
| `GET` | `/api/admin/mappings` | Admin | List source-category mappings. |
| `PATCH/DELETE` | `/api/admin/mappings/[id]` | Admin | Update or delete a mapping. |
| `POST` | `/api/admin/mappings/reclassify` | Admin | Reclassify mapped movies. |
| `POST` | `/api/admin/mappings/smart-classify` | Admin | Run smart classification. |

## Admin Stats APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats/movies?sort=viewCount&category=1` | Admin | Movie popularity and engagement stats. |
| `GET` | `/api/admin/stats/categories` | Admin | Category distribution stats. |
| `GET` | `/api/admin/stats/users` | Admin | User behavior stats. |
| `GET` | `/api/admin/stats/trends?days=30` | Admin | Daily global view/favorite/user trends. |
| `GET` | `/api/admin/health/history` | Admin | In-memory health history for the dashboard. |

## Admin Operations APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `PATCH` | `/api/admin/themes/active` | Admin | Set active frontend theme. |
| `POST` | `/api/admin/outbox/retry` | Admin | Retry pending Kafka events. |

## Internal APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/internal/health` | Internal/Admin UI | Database, Kafka, movie count, outbox, task, and recommendation health. |
| `POST` | `/api/internal/outbox/retry` | Token | Retry pending outbox events using `MOVIEFLEX_OUTBOX_TOKEN`. |

## Assistant API

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/assistant` | Public/Frontend | Optional assistant endpoint backed by SenseNova configuration. |
