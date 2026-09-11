## Why

The hub de ensaios currently only works on the machine running it: the SQLite file and the `tracks/` audio folder live on local disk, and the API binds to `127.0.0.1` only. The user now wants the app publicly reachable on Vercel so other people (the rest of the band/team) can open it and listen to imported tracks, without depending on a local machine being on. Vercel's serverless functions have no persistent local filesystem, so the SQLite-file-on-disk and audio-files-on-disk approach cannot survive there as-is — both need to move to managed cloud services reachable over the network.

## What Changes

- **BREAKING**: Track/channel metadata moves from SQLite (file on disk) to Vercel Postgres (managed, network-reachable). All existing migrations are rewritten with Postgres-compatible column types, keeping the object-based TypeORM API (`Table`/`TableColumn`/`TableForeignKey`/`TableIndex`, no inline SQL) and the one-migration-per-table convention.
- **BREAKING**: Imported audio files move from the local `tracks/` folder to Vercel Blob (managed object storage), accessed over HTTPS instead of the local filesystem.
- **BREAKING**: The import staging flow (parse zip → editable review → confirm/cancel) is redesigned: today it holds a manifest + uploaded files in an OS temp directory between the `POST /tracks/import` and `POST /tracks/import/:id/confirm` requests, which only works because both requests hit the same long-lived local process. On Vercel, separate requests can land on different function instances, so staging state must move to shared storage — a `staging_imports` table in Postgres for the manifest, and a `staging/` prefix in Blob for the uploaded files, both cleaned up on confirm/cancel/expiry exactly like today's orphan sweep.
- **BREAKING**: The API stops binding to loopback-only and becomes a publicly reachable Vercel deployment (Vercel Functions), since the explicit goal is for other people to access it.
- New: the app is deployed as two Vercel projects — `apps/web` as a static Vite build, `apps/api` as Vercel Functions behind a serverless-compatible NestJS entry point — wired together with rewrites (`/api/*` → API project, SPA fallback for React Router) and environment variables for the Postgres connection string and the Blob read/write token, replacing today's `DB_PATH`/`TRACKS_DIR`.
- New: local development gets a Docker Compose Postgres service so `yarn dev:api` runs against the same database engine as production instead of SQLite, keeping dev/prod parity.

## Capabilities

### New Capabilities
- `cloud-deploy`: deployment topology and configuration — two Vercel projects, request routing between them, environment variables, and the Docker Compose Postgres service used for local development parity.

### Modified Capabilities
- `local-backend`: the "loopback only" requirement is replaced with public reachability; the "audio files stored on disk" requirement is replaced with storage in managed object storage; adds a requirement for local development to run against Postgres via Docker instead of SQLite.
- `track-library`: the requirement that imported data is "persisted locally... with all data staying on the user's own machine" is replaced with persistence in managed cloud services, reachable by anyone with access to the deployed app, not confined to one machine.

## Impact

- `apps/api`: TypeORM datasource config (`better-sqlite3` → `pg`), all migrations (column types), `StagingService` (filesystem → Blob + Postgres-backed manifest), `TracksService`/`TracksController` (file streaming from disk → from Blob), `main.ts` (serverless entry point instead of `app.listen`), new `staging_imports` migration + entity.
- `apps/web`: `vite.config.ts` proxy replaced by an env-driven API base URL for production builds.
- Root: new `vercel.json` (or per-app configs), `docker-compose.yml` for local Postgres, updated `.env.example` files, removal of `TRACKS_DIR`/`DB_PATH` in favor of `DATABASE_URL`/`BLOB_READ_WRITE_TOKEN`.
- Dependencies: add `pg`, `@vercel/blob`, a serverless adapter for NestJS (e.g. `@vendia/serverless-express` or Vercel's Node runtime handler pattern); drop `better-sqlite3`.
