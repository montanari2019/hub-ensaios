## Context

See [proposal.md](./proposal.md) for motivation. Current state relevant to this design:

- `apps/api` is a NestJS app that boots with `app.listen(port, '127.0.0.1')` in `main.ts` — a single long-lived process.
- TypeORM uses `better-sqlite3` against a single file (`hub-de-ensaios.sqlite`, currently holding 2 tracks / 14 channels of real local test data — not production data worth a scripted migration).
- Audio files live at `<tracksDir>/<trackId>/<stagedFileName>` on local disk; channel rows store a `filePath` relative to `tracksDir`.
- Import staging (`StagingService`) writes a `manifest.json` and the raw uploaded audio files to `os.tmpdir()/hub-import-<uuid>/`, read back by later requests (`getImportPreview`, `confirmImport`, `cancelImport`) and swept on `OnModuleInit` (app boot) for anything older than 24h.
- `TracksController.startImport` accepts the whole `.zip` as a single multipart upload (`FileInterceptor`, up to 500MB) buffered in memory.
- `apps/web`'s `vite.config.ts` proxies `/api/*` to `127.0.0.1:3001` in dev only; there is no production API base configured anywhere.
- Both apps are Yarn workspaces in one repo (`apps/web`, `apps/api`), already on GitHub at `montanari2019/hub-ensaios`.

## Goals / Non-Goals

**Goals:**
- Both apps deployed and publicly reachable under one domain, no CORS needed.
- Zero behavior regression in the import → review → confirm/cancel flow from the user's point of view, even though its internal mechanics change completely.
- Local development mirrors production's database engine (Postgres via Docker), per the user's explicit request.
- Large `.zip` uploads (existing 500MB ceiling) keep working despite Vercel serverless functions' request body limits.

**Non-Goals:**
- No authentication/authorization layer. The app remains open to anyone with the deployed URL, same as it's open to anyone with the app running locally today — this change makes that URL public, it doesn't add access control. Vercel's deployment-protection features are a future option, not part of this change.
- No data migration from the local SQLite file. It holds only local test data (2 tracks / 14 channels); production starts from an empty Postgres database.
- No CI/CD pipeline changes beyond what Vercel's git integration provides automatically (deploy on push to the production branch).

## Decisions

### One public domain via cross-project rewrites, not two separate URLs
Two Vercel projects are created (`apps/web` and `apps/api` as separate `rootDirectory`s of the same repo), but the **web** project's `vercel.json` rewrites `/api/:path*` to the deployed API project's URL, plus a SPA-fallback rewrite (`/(.*)` → `/index.html`) for client-side routes:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<api-project>.vercel.app/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `/api` rewrite must be declared before the catch-all — same ordering concern as `TracksController`'s existing `import/:importId` route already documents. This means `apps/web/src/lib/api.ts` keeps using relative `/api/...` paths unchanged in both dev (Vite proxy) and production (Vercel rewrite) — no `VITE_API_BASE_URL` env var, no CORS configuration on the API project, one URL to share with the band. Alternative considered: two separate domains with CORS enabled on the API — rejected, adds a moving part (CORS config, preflight requests) for no benefit over a same-origin rewrite.

### NestJS on Vercel Functions via a cached Express handoff, no extra adapter package
`apps/api` gets `api/index.ts`, the Vercel Node Function entry point:

```ts
const server = express();
let bootstrapped: Promise<express.Express> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.useGlobalPipes(/* same as today */);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  bootstrapped ??= bootstrap();
  const srv = await bootstrapped;
  srv(req, res);
}
```

`apps/api/vercel.json` rewrites every path to that function so Nest's own router (not Vercel's file-based routing) resolves `/tracks`, `/tracks/import`, etc. `main.ts`'s `app.listen(...)` path is kept, guarded so it only runs when NOT on Vercel (`process.env.VERCEL` is unset) — this preserves `yarn dev:api` and `yarn start:prod` for local/non-Vercel use unchanged. The `bootstrapped` promise is a module-level singleton so a warm function instance (container reuse between invocations) skips re-running Nest's bootstrap; a cold start pays it once. Alternative considered: `@vendia/serverless-express` — rejected, it's an extra dependency for something a plain Express handoff already does, since `ExpressAdapter` gives us a real `express()` instance and Vercel's Node runtime accepts an `(req, res) => void` handler directly.

### Large `.zip` uploads bypass the function body-size limit via Vercel Blob client uploads
Vercel Functions cap request body size (4.5MB on Hobby); the app's existing 500MB zip ceiling can't survive going through the function as a multipart body. Instead, the frontend uploads the raw `.zip` directly to Vercel Blob from the browser (`@vercel/blob/client`'s `upload()`, which calls a small `POST /tracks/import/authorize` endpoint on the API for a short-lived upload token, then PUTs the bytes straight to Blob — the function never sees the zip's bytes). The frontend then calls `POST /tracks/import` with `{ blobUrl }` instead of multipart form data; the backend fetches the zip from that Blob URL server-side (a plain `fetch`, not subject to the inbound body-size limit), parses it exactly as today, and deletes the temporary zip blob once parsed. `zip-import.helper.ts` and `audio-duration.helper.ts` are unchanged — only how the buffer reaches them changes. Alternative considered: raise `maxDuration`/rely on a paid plan's larger body limit — rejected, Vercel's per-function body limit isn't configurable upward the way execution duration is, so it doesn't fix the ceiling at any plan tier.

### Staging state moves to Postgres (manifest) + Blob (files), not local temp dir
A new `staging_imports` table (one migration, object-based like every other table) replaces `os.tmpdir()/hub-import-<uuid>/manifest.json`:

| column | type | notes |
|---|---|---|
| `id` | `uuid` | the `importId` |
| `suggested_name` | `varchar` | from the zip filename |
| `manifest` | `jsonb` | array of `{ tempChannelId, suggestedName, fileName, mimeType, durationSeconds, blobPathname }` |
| `created_at` | `timestamptz` | default `now()`, used for orphan sweep |

Staged audio files go to Blob under `staging/<importId>/<tempChannelId>.<ext>`. `StagingService` keeps the same public methods (`createStagingImport`, `readManifest`, `moveChannelsToTracksDir`, `discardStagingImport`, `sweepOrphans`) so `TracksService` barely changes — only their internals move from `fs`/`os.tmpdir()` calls to a `staging_imports` repository and `@vercel/blob`'s `put`/`copy`/`del`/`list`. `moveChannelsToTracksDir`'s existing EXDEV copy-then-unlink fallback becomes `@vercel/blob`'s `copy()` (server-side, no bytes downloaded) followed by `del()` on the staging path — same two-step "copy then remove source" shape as today, now against Blob instead of a filesystem. This keeps the delta to `TracksService`/`TracksController` minimal; the staging *mechanism* changes completely, but every method signature it's called through stays the same.

### Orphan sweep becomes a Vercel Cron job, not `OnModuleInit`
`sweepOrphans()`'s trigger (today: NestJS `OnModuleInit`, run once when the long-lived process boots) has no equivalent on Vercel — a function instance's "start" isn't a meaningful once-a-day moment, and instances are recycled unpredictably. It becomes a dedicated `POST /internal/sweep-staging` endpoint invoked by a Vercel Cron (`vercel.json`'s `crons` field, e.g. daily), instead of `OnModuleInit`. The endpoint checks a shared secret header so it can't be triggered by an outside request, since the API has no other auth.

### Channel audio is served directly from Blob's URL, not proxied through the function
`Channel` gains a `fileUrl` column (the Blob object's public URL, produced by `put()` at confirm time) replacing disk-relative `filePath`. `GET /tracks/:id` already returns each channel's data to the frontend; it now includes `fileUrl` directly, and `usePlayerEngine.ts`'s audio fetch (`fetch(url).then(r => r.blob())`) points at that Blob URL instead of a backend streaming endpoint. `TracksController.getChannelAudio` and `TracksService.getChannelFile` are removed — nothing proxies audio bytes through a function anymore. This avoids function execution time/cost for what could be large WAV files, and Vercel Blob's public URLs serve with CORS already permissive for browser `fetch`. Trade-off: anyone who obtains a channel's `fileUrl` can fetch it without going through the app at all — accepted, consistent with the no-auth Non-Goal; Blob URLs include a long random path segment, so this is a capability-URL model, not directory-listable.

### Postgres connection: pooled URL for the app, non-pooling for migrations
Vercel Postgres (Neon-backed) exposes both a PgBouncer-pooled connection string and a direct one. The app's TypeORM datasource uses the pooled URL with a small per-instance pool (`max: 1–3`) since many concurrent function instances each holding a pool can exhaust Postgres' connection limit; `database/data-source.ts` (the CLI datasource used for `migration:run`) uses the non-pooling URL, since TypeORM's migration locking and some DDL don't play well with transaction-mode pooling. Both resolve from the same `getDatabaseOptions()` pure function pattern already in place (`database-options.ts`), now reading `DATABASE_URL`/`DATABASE_URL_NON_POOLING` instead of `DB_PATH`.

### Existing migrations are rewritten for Postgres in place, not forked
All 4 existing migrations (`CreateTracks`, `CreateChannels`, `AddPitchEditableToChannels`, `UpdateTracksTonalityClearInvalid`) are edited in place to Postgres-compatible types, following the exact conventions already used in the reference template's own Postgres migrations (`timestamptz` + `default: 'now()'` instead of SQLite's `datetime` + `(datetime('now'))`; native `uuid` type for `id`/`track_id` instead of `varchar`). This is safe because local SQLite is being fully retired (Non-Goals: no data migration), so there is no live SQLite deployment whose migration history needs to stay SQLite-shaped. `UpdateTracksTonalityClearInvalid`'s raw `queryRunner.query(...)` (the one existing exception to "no inline SQL", justified originally as a one-off data cleanup rather than schema DDL) is rewritten using Postgres parameter syntax (`$1, $2, ...` instead of SQLite's `?`).

### Local dev: real Postgres via Docker, real Blob store via a separate dev token
`docker-compose.yml` at the repo root runs `postgres:16` for local dev (`yarn dev:api` connects via `DATABASE_URL=postgres://...@localhost:5432/...`) — full parity with production's engine, per the user's request. Vercel Blob has no local emulator, so local dev talks to a **real** Blob store rather than a fake one; to avoid local development writing test objects into the same store production serves from, a second Blob store is provisioned scoped to Preview/Development and its token used locally (`BLOB_READ_WRITE_TOKEN` in `apps/api/.env`, pulled from the Vercel dashboard/CLI). This is a deliberate asymmetry (DB gets full local parity via Docker, Blob does not) — flagged as an Open Question below since it needs the user's Vercel project already provisioned before it can be set up.

## Risks / Trade-offs

- **[Risk]** Vercel Hobby plan's function execution-time ceiling (10s) may be too short to parse a large multi-track `.zip` and probe every channel's duration in one request. → **Mitigation**: `maxDuration` is set to the plan's maximum in `apps/api/vercel.json`; if imports of realistic zip sizes still time out, this is a signal to move to Vercel Pro (higher ceiling), tracked as an open question rather than blocking this design.
- **[Risk]** Many concurrent function instances each opening their own Postgres connection can exhaust Neon's connection limit under load. → **Mitigation**: pooled connection string + small per-instance `max` pool size (see Decisions).
- **[Risk]** Cold starts add Nest bootstrap latency to the first request after idle. → **Mitigation**: module-level cached bootstrap promise so only cold starts pay it; accepted as inherent to serverless, not something this change can fully remove.
- **[Risk]** Public Blob URLs mean a leaked link grants access to that one audio file without going through the app. → **Mitigation/acceptance**: consistent with the app having no authentication at all today; documented as a Non-Goal rather than silently introduced.
- **[Trade-off]** Local Blob usage hits the real cloud store (no emulator exists), unlike Postgres which gets true local parity via Docker. → Mitigated by using a separate dev-scoped Blob store, not the production one.

## Migration Plan

1. Add `pg`, `@vercel/blob`; remove `better-sqlite3` from `apps/api`.
2. Rewrite the 4 existing migrations for Postgres syntax (in place); add the `staging_imports` migration.
3. Rework `StagingService`, `TracksService`, `TracksController`, `Channel` entity, DTOs for Blob + Postgres-backed staging; add the `authorize`-upload and `internal/sweep-staging` endpoints; remove the audio-streaming endpoint.
4. Add `apps/api/api/index.ts` (serverless entry point) and `apps/api/vercel.json`; guard `main.ts`'s `app.listen` to skip when `process.env.VERCEL` is set.
5. Add `apps/web/vercel.json` (API rewrite + SPA fallback); update `usePlayerEngine.ts`/`api.ts` for direct Blob playback URLs and the two-step zip upload.
6. Add root `docker-compose.yml`; update `.env.example` files (`DATABASE_URL`, `DATABASE_URL_NON_POOLING`, `BLOB_READ_WRITE_TOKEN` replacing `DB_PATH`/`TRACKS_DIR`).
7. Provision Vercel Postgres and two Blob stores (production + dev/preview), create the two Vercel projects linked to `montanari2019/hub-ensaios` with the right `rootDirectory`s, wire env vars.
8. Run migrations against the fresh Postgres database; deploy both projects; smoke test the full import → review → confirm → playback flow against the live URLs.

Rollback: this targets brand-new infrastructure with no production users yet, so rollback is either not promoting a bad deployment (Vercel keeps the previous deployment live until you do) or `git revert`ing the change locally — no data-migration rollback is needed since Non-Goals excludes migrating the existing SQLite data.

## Open Questions

- Which Vercel plan (Hobby vs Pro) will this run on? Affects the realistic ceiling for `.zip` import size/duration (execution-time limit). Doesn't change the approach — Blob client-uploads already remove the body-size ceiling regardless of plan — so this can be resolved after deploying, by watching for timeouts on real imports.
- Should the dev/preview Blob store be provisioned now or left for the user to create in the Vercel dashboard themselves before the first local `yarn dev:api` run against Blob?
