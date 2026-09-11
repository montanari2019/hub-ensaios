## Why

Since the cloud migration, importing a `.zip` uploads it straight to Vercel Blob from the browser and then asks the backend to parse it — both steps can take a while for a large file, but the UI only ever shows a static "Importando…" label with no percentage or phase indicator. A user importing a ~200MB zip has no way to tell whether it's progressing, stuck, or has silently failed, and reported exactly that: the screen sits on "Importando…" indefinitely with nothing to look at.

## What Changes

- The import button/area shows a real upload percentage (0–100%) while the `.zip` bytes are going to Blob, using the upload SDK's built-in progress callback (already available, just unused today).
- Once the upload reaches 100%, the UI switches to a visibly distinct "processando" (indeterminate) state for the server-side parsing phase, so it's clear the flow moved to a different step rather than being stuck on the upload.
- If server-side processing fails or times out, the UI shows a specific, actionable error instead of the generic "Não foi possível conectar ao backend local... (yarn dev)" message left over from the local-only architecture — including a distinct message for a request that timed out versus one that returned a real error.
- **BREAKING**: none — this only changes what's shown during an already-async operation; the API contract and success path are unchanged.
- The API function's `maxDuration` is raised from the platform default (10s) to the Hobby plan's configurable ceiling, since the default is almost certainly what caused very large imports to be killed mid-processing with no error surfaced to the client.

## Capabilities

### Modified Capabilities
- `track-library`: the "Import shows progress feedback" requirement is replaced with one that requires real upload percentage during the Blob upload phase, a distinct indeterminate state during server-side processing, and a specific error state on failure/timeout — not just a generic loading indicator.

## Impact

- `apps/web/src/lib/api.ts`: `startImport` gains an `onProgress` callback parameter wired to `upload()`'s `onUploadProgress`; `request()`'s generic network-error message is corrected to no longer claim a local backend, and gains a way to distinguish a timeout from other failures.
- `apps/web/src/screens/TrackLibrary/TrackLibrary.tsx`: replaces the boolean `isImporting` with an import-phase state (`idle | uploading (with percent) | processing | error`) and renders it accordingly.
- `apps/api/vercel.json`: adds a `functions` block raising `maxDuration` for the API function.
- No backend business logic changes — the parsing/staging code itself is unchanged, only how long it's allowed to run and how failures reach the client.
