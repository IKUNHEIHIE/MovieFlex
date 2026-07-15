# Deployment

This document describes the production setup used by MovieFlex.

## Runtime Requirements

- Node.js 20.9 or newer
- MySQL-compatible database
- Kafka broker for behavior analytics and stats consumer
- PM2 for application processes
- systemd for Kafka broker management when Kafka runs on the same host

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MySQL connection string, for example `mysql://USER:PASSWORD@HOST:3306/movieflex`. |
| `AUTH_SECRET` | Yes | Auth.js session encryption secret. Use a long random value. |
| `AUTH_URL` | Recommended | Public application URL, for example `https://example.com` or `http://HOST:3060`. |
| `KAFKA_BROKER` | Optional | Kafka broker address. Defaults to `localhost:9092`. |
| `MOVIEFLEX_OUTBOX_TOKEN` | Recommended | Token for the internal outbox retry endpoint. |
| `SENSENOVA_API_KEY` | Optional | API key for the assistant endpoint. |
| `SENSENOVA_MODEL` | Optional | Assistant model name. Defaults to `sensenova-6.7-flash-lite`. |

Never commit real values. Use `.env.example` as the template.

## Install and Database Setup

```bash
npm ci
npx prisma generate
npm run db:migrate:deploy
```

If a migration baseline has not been established for a new environment, use Prisma carefully according to the current release procedure. Avoid changing production schema manually.

## Production Build

Use webpack mode for production builds:

```bash
npx next build --webpack
```

Do not replace this with default `next build` unless the build artifact behavior has been revalidated.

## PM2 Processes

`ecosystem.config.cjs` defines two processes:

| Process | Purpose |
| --- | --- |
| `movieflex` | Next.js production web server on port `3060`. |
| `movieflex-stats-consumer` | Kafka stats consumer running `scripts/run-stats-consumer.ts`. |

Start or restart production:

```bash
pm2 start ecosystem.config.cjs
pm2 restart movieflex
pm2 restart movieflex-stats-consumer
pm2 save
pm2 status
```

## Kafka systemd Service

The repository includes `deploy/movieflex-kafka.service` for a local Kafka broker installed under `/opt/kafka`.

Install example:

```bash
sudo cp deploy/movieflex-kafka.service /etc/systemd/system/movieflex-kafka.service
sudo systemctl daemon-reload
sudo systemctl enable --now movieflex-kafka.service
sudo systemctl status movieflex-kafka.service
```

Logs are appended to `/var/log/movieflex-kafka.log`.

## Health and Smoke Checks

After deployment:

```bash
npm test -- --run
npx next build --webpack
curl -I http://HOST:3060/
curl -I http://HOST:3060/admin
pm2 status
```

Expected behavior:

- `/` returns `200`.
- `/admin` redirects unauthenticated users to login with `307`.
- Authenticated administrators can access `/admin` and admin child pages.
- `movieflex` and `movieflex-stats-consumer` are online in PM2.
- Kafka is active if analytics ingestion is required.

## Administrator Bootstrap

Use the bootstrap script when an admin account is needed:

```bash
npm run bootstrap:admin
```

Do not document or commit real administrator credentials.

## Release Checklist

1. Pull latest `main`.
2. Install dependencies if `package-lock.json` changed.
3. Run `npm test -- --run`.
4. Run `npx next build --webpack`.
5. Apply migrations with `npm run db:migrate:deploy` when needed.
6. Restart PM2 processes.
7. Verify public and admin routes.
8. Verify Kafka and stats consumer if analytics changed.
