## 1. Dependencies and configuration

- [x] 1.1 In `apps/api`, add `pg` and `@vercel/blob`, remove `better-sqlite3`, and add `@vercel/node` types for the function handler; verify `yarn workspace api build` still succeeds with the new deps present (even before they're used).
- [x] 1.2 Rewrite `apps/api/src/config/database-options.ts` to read `DATABASE_URL`/`DATABASE_URL_NON_POOLING` and use `type: 'postgres'`, dropping the SQLite-specific `defaultDbPath` logic; verify `database/data-source.ts` (the CLI datasource) still imports the same pure function with no `@nestjs/*` dependency, per the existing convention that keeps the CLI path free of Nest module resolution.
- [x] 1.3 Replace `apps/api/src/config/tracks-storage.config.ts`'s `TRACKS_DIR` with a `blobStorage` config reading `BLOB_READ_WRITE_TOKEN`; verify `apps/api/.env.example` and `apps/api/.env` (local, Docker Postgres + dev Blob store) are updated to match, with `DB_PATH`/`TRACKS_DIR` removed.

## 2. Database migrations (Postgres)

- [x] 2.1 Rewrite `1789052040576-CreateTracks.ts` for Postgres: `id`/`created_at`/`updated_at` use `uuid`/`timestamptz` types and `default: 'now()'` instead of SQLite's `datetime`/`(datetime('now'))`, keeping the object-based `Table`/`TableColumn` API; verify `yarn migration:run` against a fresh local Postgres (from task 7.1) creates the table with the expected column types (`\d tracks` in `psql`). — verified against local Docker Postgres, `\d tracks` matches.
- [x] 2.2 Rewrite `1789052040577-CreateChannels.ts` the same way, keeping the FK/index defined inline in the `Table` constructor (not a separate `createForeignKey` call) so no INSERT-driven table rebuild happens on Postgres either; verify the migration runs cleanly and `\d channels` shows the FK and index. — verified, FK/index present, no INSERT in the query log.
- [x] 2.3 Rewrite `1789067515469-AddPitchEditableToChannels.ts`'s `addColumn` for Postgres (`boolean` type is native, only the surrounding driver changes); verify the migration applies after 2.2. — verified.
- [x] 2.4 Rewrite `1789067564727-UpdateTracksTonalityClearInvalid.ts`'s raw query to Postgres parameter syntax (`$1`, `$2`, ... instead of SQLite's `?`); verify the migration applies with no syntax error against Postgres. — verified.
- [x] 2.5 Add a new `CreateStagingImports` migration (its own file, object-based `Table`) for the `staging_imports` table (`id uuid`, `suggested_name varchar`, `manifest jsonb`, `created_at timestamptz default now()`); verify `yarn migration:run` applies it and `\d staging_imports` matches the design's column list. — verified.
- [x] 2.6 Run `yarn format` (Prettier, template config) across `apps/api/database`; verify no formatting diff remains and `yarn workspace api lint` still passes. — verified, lint clean.

## 3. Backend: staging moves to Postgres + Blob

- [x] 3.1 Add a `StagingImport` entity/repository backing the new table; rewrite `StagingService.createStagingImport`/`readManifest`/`discardStagingImport` to read/write that repository instead of `os.tmpdir()`/`manifest.json`; verify a unit test (or a manual `curl` sequence) creates a staging row, reads it back, and deletes it. — code in place; full curl verification pending a real Blob token (group 8).
- [x] 3.2 Rewrite `StagingService`'s audio handling: staged channel bytes go to `@vercel/blob`'s `put()` under `staging/<importId>/<tempChannelId>.<ext>` instead of `fs.writeFile`; verify a staged import's files are visible via `@vercel/blob`'s `list({ prefix: 'staging/<importId>/' })`. — code in place; live verification pending a Blob token.
- [x] 3.3 Rewrite `moveChannelsToTracksDir` to use Blob's `copy()` (staging path → `tracks/<trackId>/<...>`) followed by `del()` on the staging path, replacing the old rename/EXDEV-copy fallback; verify a confirmed import's channel files exist at their final Blob path and are gone from `staging/`. — code in place; live verification pending a Blob token.
- [x] 3.4 Rewrite `sweepOrphans` to query `staging_imports` rows older than 24h, delete their Blob objects (by prefix) and their row, instead of scanning `os.tmpdir()`; verify a manually inserted stale staging row (backdated `created_at`) is removed by calling the method directly. — code in place; live verification pending a Blob token.
- [x] 3.5 Remove `StagingService`'s `OnModuleInit` sweep trigger; add an internal `POST /internal/sweep-staging` endpoint (checked against a shared-secret header env var) that calls `sweepOrphans`; verify calling it without the header is rejected and with the correct header runs the sweep.

## 4. Backend: import flow, playback, cleanup

- [x] 4.1 Add `POST /tracks/import/authorize` implementing `@vercel/blob/client`'s server-side handshake, so the frontend can upload a `.zip` directly to Blob; verify a client-side `upload()` call against it succeeds and produces a Blob URL. — code in place; live verification pending a Blob token (group 8/9).
- [x] 4.2 Change `TracksController.startImport`/`TracksService.startImport` to accept `{ blobUrl }` (JSON body) instead of a multipart file, fetching the zip server-side before parsing with the existing `extractAudioChannelsFromZip`; delete the temporary zip blob once parsed; verify importing a zip end-to-end (via `curl` hitting `authorize` then `import`) still produces the same `ImportPreview` shape as today. — code in place; live verification pending a Blob token.
- [x] 4.3 Add a `fileUrl` column to the `Channel` entity (via a migration, object-based) holding the Blob public URL; remove the `filePath`/disk-relative concept; verify `GET /tracks/:id` returns each channel's `fileUrl`. — verified via schema + type check.
- [x] 4.4 Remove `TracksController.getChannelAudio` and `TracksService.getChannelFile` (no longer needed — playback fetches `fileUrl` directly); verify no remaining code references the removed disk-streaming path (`grep` for `getChannelFile`/`getChannelAudio`). — verified, grep clean.
- [x] 4.5 Update `TracksService.remove` to delete a track's Blob objects (by `tracks/<trackId>/` prefix) instead of `fs.rm`; verify deleting a track via the API leaves no objects under that prefix (`list({ prefix })` returns empty). — code in place; live verification pending a Blob token.

## 5. Backend: serverless entry point

- [x] 5.1 Add `apps/api/api/index.ts` exporting the cached-bootstrap Express handler described in design.md; guard `main.ts`'s `app.listen(...)` to skip when `process.env.VERCEL` is set, so `yarn dev:api`/`yarn start:prod` are unaffected locally; verify `yarn workspace api build` still succeeds and `yarn dev:api` still serves locally on `API_PORT`. — verified live: booted, all routes mapped, `GET /tracks` responded `[]`.
- [x] 5.2 Add `apps/api/vercel.json` rewriting every path to the function, plus a `crons` entry hitting `/internal/sweep-staging` daily with the shared-secret header; verify the JSON is valid and matches Vercel's cron schema. — caught and fixed a path mismatch (route is actually `/tracks/internal/sweep-staging` under the `tracks` controller prefix); verified auth (401/401/204) against the running server.

## 6. Frontend: upload flow, playback, deploy config

- [x] 6.1 Add `@vercel/blob` (client) to `apps/web`; rewrite the import flow (wherever the zip is currently posted) to call `authorize` then upload directly to Blob, then `POST /tracks/import` with `{ blobUrl }`; verify importing a zip through the real UI still reaches the review screen with the same fields populated. — code in place, build/lint clean; live browser verification pending a Blob token (group 8/9).
- [x] 6.2 Update `apps/web/src/lib/api.ts`'s track/channel types to carry `fileUrl` instead of a derived audio-endpoint path; update `usePlayerEngine.ts` to fetch each channel directly from `fileUrl`; verify playback still works end-to-end in the browser (play/pause/mute/solo on a real imported track). — code in place, build/lint clean; live verification pending group 9.
- [x] 6.3 Add `apps/web/vercel.json` with the `/api/:path*` rewrite to the API project's URL and the SPA-fallback rewrite; verify (after task 9's deploy) that refreshing a track's player URL in production loads correctly instead of 404ing. — placeholder destination added; real API project URL filled in during task 8.4.

## 7. Local development parity

- [x] 7.1 Add root `docker-compose.yml` running `postgres:16` with a named volume; verify `docker compose up -d` starts Postgres and `psql` can connect on `localhost:5432`. — verified via `docker exec ... pg_isready` (no local `psql` client installed) and a full `yarn migration:run` against it.
- [x] 7.2 Update root `package.json`/README (if one documents dev setup) so `yarn dev:api` docs mention starting Docker Postgres first; verify a clean `docker compose up -d && yarn migration:run && yarn dev:api` boots the API against local Postgres with no SQLite file involved. — README overhauled (architecture, install steps, deploy section); verified live in task 5.1's smoke test.
- [ ] 7.3 Confirm local Blob access works against the dev-scoped store (task 8.2) by running a full import through `yarn dev:web`/`yarn dev:api` locally; verify the imported track's audio plays back and its objects appear in the dev Blob store, not the production one.

## 8. Vercel provisioning

- [ ] 8.1 Create the Vercel Postgres store and attach it to the API project; verify `POSTGRES_URL`/`POSTGRES_URL_NON_POOLING` (or equivalent) appear in the project's environment variables.
- [ ] 8.2 Create two Blob stores (production, development/preview) and record their tokens; verify each store is empty and reachable with its own token before first use.
- [ ] 8.3 Create the `apps/web` and `apps/api` Vercel projects linked to `montanari2019/hub-ensaios`, with `rootDirectory` set to each app respectively; verify both projects appear in `list_projects` with the correct root directories.
- [ ] 8.4 Set environment variables on the API project (`DATABASE_URL`, `DATABASE_URL_NON_POOLING`, `BLOB_READ_WRITE_TOKEN` for production; the dev store's token for Preview) and update the web project's `vercel.json` rewrite destination with the API project's actual deployment URL; verify a preview deployment of the API project boots without missing-env errors.

## 9. Deploy and end-to-end verification

- [ ] 9.1 Run the rewritten migrations against the production Vercel Postgres database; verify all 5 migrations (4 rewritten + `CreateStagingImports`) are recorded in the `migrations` table.
- [ ] 9.2 Deploy both Vercel projects to production; verify both builds succeed and the web project's URL loads the library screen.
- [ ] 9.3 From the deployed URL, import a real multi-channel `.zip`, edit names/BPM/tonality in review, confirm, and play the track back with mute/solo — verify each step matches the existing local behavior, end-to-end, on the public URL.
- [ ] 9.4 Open the deployed URL from a second device/network (or ask another person) to confirm the app is reachable and usable by someone other than the deployer, per the `cloud-deploy` spec's core requirement.
- [ ] 9.5 Delete the test track created in 9.3 via the deployed UI; verify its Blob objects and Postgres rows are both gone (`list({ prefix })` empty, no row in `tracks`).
