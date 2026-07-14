# Resumable Collection, Player Detection, and Category Binding Design

## Goals

- Generate an editable collection-source key from its API URL while keeping player-line identifiers independent.
- Detect normalized player-line codes and playback modes from uploaded AppleCMS player configuration, and use that source-specific configuration during playback.
- Make source saving visibly pending, successful, or failed without requiring a page refresh.
- Run initial 100-record and full collection requests as durable background tasks that continue after the browser closes.
- Persist page checkpoints, support pause and resume, and recover unfinished work after a Next.js service restart.
- Display and repair the default category tree, then provide source-scoped category binding and reclassification.

## Source Identity And Player Configuration

`sourceKey` is generated from the configured API URL: normalize the hostname and meaningful path segments to lowercase ASCII words separated by hyphens. If that candidate is already used, append a numeric suffix. The generated value is populated in the form and remains editable before saving.

Player configuration remains source-specific. Import accepts JSON and Base64 JSON. Each player entry is normalized to its line code, name, enabled state, detected playback mode, and resolver prefix where applicable. Detection supports direct HLS URLs, direct iframe templates, and resolver iframe templates. Collection playback resolves the movie's `sourceKey` to its `CollectSource.playerConfigs`, then matches its `playFrom` line code. Built-in player definitions are only fallback definitions for recognized common lines.

## Durable Task Lifecycle

The database is the source of truth. `CollectTask` gains persisted request parameters and execution state: target record count, current/next page, current page total, status, timestamps for start/update/heartbeat/pause, and an execution lease token. Task statuses are `QUEUED`, `RUNNING`, `PAUSED`, `SUCCEEDED`, `FAILED`, and `CANCELLED`.

Creating a task is fast and returns task metadata. A process-local dispatcher starts queued tasks after the HTTP response. On application startup and before dispatching a new task, the dispatcher finds queued tasks and stale running tasks. A stale running task is returned to the queue and resumed from `nextPage`. A task holds an atomic source-level lease so two tasks for one source cannot run at once.

The collector persists counts and `nextPage` after every completed page. Page-level failures are retained in a task error summary and retry within a bounded retry policy; an unrecoverable failure marks the task `FAILED`. Pause is cooperative: the runner checks the database status between pages, writes the checkpoint, releases its lease, and marks the task `PAUSED`. Resume changes a paused task back to queued and dispatches it. Cancellation stops it at the next page boundary and retains the final progress for audit only; it cannot be resumed.

The initial-import task targets 100 successfully persisted source records, stopping after the page that reaches that threshold. Full collection has no target limit. Existing `(sourceKey, vodId)` uniqueness keeps resumed/retried imports idempotent.

## APIs And Admin Experience

`POST /api/collect/tasks` creates a task with `initial-100` or `full` mode. Task mutation endpoints pause, resume, or cancel a task. `GET /api/collect/tasks` returns task history and current live task state. The source manager polls active tasks every few seconds while they exist; it shows current page, page total, fetched/saved counts, status, latest error, and contextual controls. The legacy inline collection route is removed or redirected to task creation so all runs use the durable lifecycle.

Saving a source disables its submit control, provides an aria-live status message, retains entered data on failure, resets only after success, and immediately merges the returned source into the list. Editing keeps its modal open after errors. Source list failures are visible rather than console-only.

## Category Tree And Source Binding

Default category initialization becomes idempotent: each root and child is upserted by slug and parent relationship, sort order, and display name are repaired on every run. It is exposed as an explicit package script. The category screen shows loading, error, and empty states; an empty state offers an admin bootstrap action or documented repair instruction.

`GET /api/admin/mappings` returns mappings with source information, mapped local category, and deterministic ordering. The UI first selects a collection source, then shows its advertised categories and mapped/pending/ignored state. Mapping accepts a valid existing local category; ignore sends `IGNORED` without a local category. Category deletion is blocked when mappings reference it, preventing stale IDs.

After a mapping is changed, a source-scoped reclassification action updates already collected movies from their original `typeName` / source category mapping. Pending mappings continue to use `其他`; ignored source types are excluded from future collection and reclassification.

## Authorization, Observability, And Verification

All admin catalog, mapping, source, and collection-task APIs independently require an administrator session. Tasks include timestamps, count fields, and the latest failure details for troubleshooting.

Tests cover URL key generation, player normalization/detection and source-aware playback, source save success/failure state, task creation and status transitions, checkpoint/retry/pause/resume/recovery behavior, initial-100 stopping behavior, mapping listing/filtering/ignore validation, category initialization repair, category deletion mapping protection, and reclassification.

## Operational Limits

This is a single-process Next.js dispatcher backed by MySQL. It survives browser closure and resumes after a service restart. It is intentionally not a distributed queue: horizontally scaled web instances require a dedicated worker/queue in a future change. The source-level lease and checkpointing ensure safe execution for the current single-instance deployment.
