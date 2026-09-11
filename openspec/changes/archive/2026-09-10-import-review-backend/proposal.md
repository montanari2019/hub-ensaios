## Why

The MVP proved the core idea works (validated by the user importing real
zips and playing them back), but two gaps showed up once real use started:
tracks and their metadata are trapped inside the browser's IndexedDB
(opaque, not inspectable/backupable as files), and the import is "blind" —
whatever names are in the zip's filenames become permanent, with no way to
attach the BPM or key the band actually needs to rehearse with. This change
moves persistence to a real local backend (files on disk + SQLite) and adds
a review step so the user fixes names and fills in BPM/tonality before a
track is saved.

## What Changes

- **BREAKING**: Persistence moves from the browser's IndexedDB to a local
  backend (NestJS + TypeORM + SQLite, audio files on disk under `tracks/`
  at the project root). Tracks previously imported into IndexedDB are not
  migrated — the user re-imports their zips after this change ships.
- New backend service (`apps/api`) that owns all track/channel storage:
  accepts a `.zip` upload, extracts it, serves the audio files back to the
  player, and persists track/channel metadata in SQLite.
- Repo restructured into a Yarn workspaces monorepo: existing frontend
  moves to `apps/web`, new backend lives in `apps/api`.
- Import flow gains a review step between "pick a `.zip`" and "track saved
  in the library": the user sees the parsed channels and can edit the
  track's name, edit each channel's name, and optionally fill in BPM and
  tonality before confirming. Cancelling discards the parse — nothing is
  written to disk or the database.
- Track metadata gains two new optional fields, BPM and tonality, editable
  at import review time and shown in the library listing when present.

## Capabilities

### New Capabilities
- `local-backend`: the local NestJS service that stores track/channel
  metadata in SQLite and audio files on disk, serves them to the frontend
  over HTTP, and is reachable only from the user's own machine.

### Modified Capabilities
- `track-library`: zip upload now leads to an editable review step instead
  of creating a track immediately; storage moves from browser IndexedDB to
  the local backend; track metadata gains optional BPM and tonality;
  library listing surfaces BPM/tonality when present.
- `design-system`: adds shared, token-styled form input primitives (text
  and number fields) for the new review screen, following the same
  CSS-Modules-only rule as every other component.

## Impact

- New `apps/api` NestJS project: TypeORM entities for `Track` and
  `Channel` (adding `bpm`, `key` on `Track`), a SQLite datasource file, a
  `tracks/` folder at the repo root for extracted audio, upload/list/
  get/delete endpoints, and a static/streaming endpoint to serve channel
  audio to the player.
- `apps/web` frontend: the `src/lib/db.ts` (IndexedDB), `src/lib/zip.ts`,
  `src/lib/importTrack.ts` and `src/hooks/usePlayerEngine.ts` modules are
  reworked to call the backend's HTTP API instead of IndexedDB directly;
  new `ImportReview` screen; `Player` fetches channel audio from the
  backend instead of reading an IndexedDB `Blob`.
- Repo root gains Yarn workspaces config; `apps/web`'s existing
  `package.json`/`vite.config.ts`/etc. move as-is into the new subfolder.
- New dependencies: `@nestjs/*`, `typeorm`, `sqlite3` (or `better-sqlite3`)
  and `@nestjs/platform-express` + `multer` for upload handling, on the
  `apps/api` side.
