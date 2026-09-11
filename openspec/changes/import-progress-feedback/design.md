## Context

See [proposal.md](./proposal.md) for motivation. Current import flow (`apps/web/src/lib/api.ts` `startImport`, `apps/web/src/screens/TrackLibrary/TrackLibrary.tsx`):

1. Browser calls `@vercel/blob/client`'s `upload(file.name, file, { access: 'private', handleUploadUrl })` — uploads the `.zip` directly to Blob. `upload()` accepts an `onUploadProgress?: (event: { loaded, total, percentage }) => void` option that already exists in the installed SDK (`@vercel/blob@2.8.0`) but isn't passed today.
2. Browser calls `POST /tracks/import` with `{ blobUrl, originalName }`. The function (`TracksService.startImport`) fetches the zip from Blob, extracts channels (`zip-import.helper.ts`), and for each channel sequentially: probes duration (`music-metadata`) and uploads it to Blob staging (`StagingService.createStagingImport`). This is one request/response — nothing streams back progress during this phase with today's plumbing.
3. `apps/api/vercel.json` has no `functions` block, so the API function runs at the platform default `maxDuration` (10s). A multi-file, ~200MB zip's extract+probe+re-upload loop can easily exceed that, and the function is killed mid-request with no response the client can distinguish from a slow network.
4. `TrackLibrary.tsx` tracks only `isImporting: boolean`, rendering "Importando…" for the entire duration of both phases combined.
5. `api.ts`'s `request()` catches all `fetch` rejections (including whatever failure mode a killed function produces) into one message: "Não foi possível conectar ao backend local. Verifique se ele está rodando (yarn dev)." — stale text from the pre-migration local-only architecture, actively misleading now.

## Goals / Non-Goals

**Goals:**
- Real percentage feedback for the part of the flow that can report one (the upload).
- A visibly distinct state for the part that can't (server-side processing), so the user knows the flow moved forward rather than assuming it's frozen on 100%.
- A bounded wait: the client gives up with a clear, correct error message once the server-side phase has run longer than the function could possibly still be alive for, instead of hanging on a dead connection indefinitely.
- Raise `maxDuration` to reduce how often large-but-reasonable imports get killed by the platform default.

**Non-Goals:**
- True percentage progress for the server-side processing phase (would need polling a status endpoint or a streaming response — a bigger change than this proposal's scope; the indeterminate state is the intentional stand-in).
- Parallelizing `StagingService.createStagingImport`'s per-channel loop for raw speed — out of scope here; if 60s still isn't enough for very large imports after this change, that parallelization (or moving processing off the request/response cycle entirely) is the natural follow-up, tracked as an open question below rather than folded into this change.
- Any change to the confirm/review step after staging succeeds — this proposal only covers the upload+processing phase before the review screen.

## Decisions

### Upload progress via the SDK's existing `onUploadProgress`, no new endpoint
`startImport(file, onProgress?)` in `api.ts` forwards a callback straight to `upload()`'s `onUploadProgress`. No backend change needed for this phase — the percentage is purely a property of the browser-to-Blob upload, which the SDK already tracks.

### Client-side timeout via `AbortController`, sized to the function's `maxDuration`
`request()` gains an internal timeout (`maxDuration` + a several-second buffer for network/cold-start overhead) using `AbortController`, so a killed function reliably surfaces as a recognizable timeout to the UI within a bounded, known time — instead of however long the browser's own TCP-level timeout happens to take (which can be minutes, and isn't a "the server told you it failed" signal). `request()` exposes whether a given failure was a timeout (`ApiError` gets an `isTimeout` flag) so the import UI can show "processamento demorou demais" instead of a generic connection-failure message.

### `maxDuration` raised to the Hobby plan's configurable ceiling (60s)
Set via `apps/api/vercel.json`'s `functions` block, scoped to the function path. This is the highest value settable on the account's current (Hobby) plan; it does not guarantee every possible zip size completes in time, but it removes the current default-10s ceiling as the most likely cause of the reported failure. If the account moves to Pro later, this value can be raised further without other changes.

### Import phase modeled as a small state union, not a second boolean
`TrackLibrary.tsx` replaces `isImporting: boolean` with:
```ts
type ImportPhase =
  | { status: 'idle' }
  | { status: 'uploading'; percent: number }
  | { status: 'processing' }
  | { status: 'error'; message: string }
```
This is a direct, minimal replacement for the existing single boolean plus the existing `importError` string — not a new abstraction layered on top — and maps cleanly to the four spec scenarios (uploading-with-percent, processing-indeterminate, done/cleared, error).

## Risks / Trade-offs

- **[Risk]** 60s may still be insufficient for very large zips with many channels, since `createStagingImport`'s loop is sequential. → **Mitigation**: this change at least turns a silent hang into a clear, correctly-worded timeout error the user can act on (retry, or ask to split the zip) instead of a frozen screen; further speedup is tracked as an open question, not blocking this change.
- **[Trade-off]** The indeterminate "processando" state gives no ETA. → Accepted: an honest indeterminate state is better than a fake percentage for a phase with no natural progress signal today.

## Open Questions

- If 60s continues to be insufficient for real-world zip sizes after this change ships, should `StagingService.createStagingImport`'s per-channel loop be parallelized (`Promise.all`), or should processing move off the request/response cycle entirely (e.g., a queued job with polling)? Doesn't change this change's approach or task breakdown — worth revisiting once real failure data exists post-deploy.
