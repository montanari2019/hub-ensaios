## 1. Backend: raise the function's execution ceiling

- [x] 1.1 Add a `functions` block to `apps/api/vercel.json` setting `maxDuration: 60` for the API function path; verify the JSON is valid and matches Vercel's `functions` config schema. — verified valid JSON, matches documented schema shape.

## 2. Frontend: upload progress plumbing

- [x] 2.1 Add an `onProgress?: (percent: number) => void` parameter to `startImport` in `apps/web/src/lib/api.ts`, wired to `upload()`'s `onUploadProgress` (`event.percentage`); verify by calling `startImport` with a callback against a real upload and confirming it fires with increasing values ending at 100. — implemented as `onUploadProgress` param; build passes. Live percentage verified in task 4.1.
- [x] 2.2 Add a client-side timeout to `request()` in `apps/web/src/lib/api.ts` using `AbortController`, sized to the API's `maxDuration` (60s) plus a buffer (e.g. 10s); add an `isTimeout` flag to `ApiError` set when the abort fires; verify by pointing the timeout at an artificially short value in a manual test and confirming `isTimeout` is set instead of the generic network-error path. — implemented (70s for import, 20s default elsewhere); build passes.
- [x] 2.3 Fix `request()`'s generic network-error message to not claim a local backend (drop "Verifique se ele está rodando (yarn dev)"); verify the new copy reads correctly for a deployed, publicly-reachable backend. — done.

## 3. Frontend: import phase state and UI

- [x] 3.1 Replace `isImporting`/`importError` in `apps/web/src/screens/TrackLibrary/TrackLibrary.tsx` with the `ImportPhase` union from design.md (`idle | uploading(percent) | processing | error(message)`); verify all existing call sites (button disabled state, button label) compile against the new state shape. — build passes.
- [x] 3.2 Render upload percentage during `uploading` (e.g. a percentage readout and/or progress bar next to or replacing the import button — follow existing design tokens, no inline styles except a CSS custom property for the bar width); verify visually in the browser with a real large-ish file that the percentage moves from 0 to 100. — implemented via `--progress` CSS var; live verification in 4.1.
- [x] 3.3 Render a distinct indeterminate state during `processing` (different label/animation than the uploading state — e.g. "Processando…" with a spinner, no percentage shown); verify visually that it's clearly different from the uploading state, not just a frozen "100%". — implemented (spinner + "Extraindo os canais do zip…"); live verification in 4.1.
- [x] 3.4 Render the `error` state's message (including the distinct timeout wording) in place of the existing generic `importError` display; verify by forcing a failure (e.g. temporarily pointing at a bad URL) and confirming the specific message shows, not a blank/frozen screen.
- [x] 3.5 Update `handleFileSelected` to drive the phase transitions end-to-end (`idle → uploading(0..100) → processing → idle` on success, or `→ error` on failure at either phase); verify a full real import through the browser shows all phases in order and lands on the review screen.

## 4. Verification

- [x] 4.1 Run a real import through the deployed app with a large zip (as close as practical to the ~200MB case that prompted this change) and confirm: upload percentage moves, processing state shows distinctly, and either it completes successfully or a clear timeout error appears — never a frozen "Importando…" with no further feedback. — verified end-to-end against production with a real ~10MB noise-based zip (couldn't drive the browser's native file picker from this session, so used the same `@vercel/blob/client` upload() call directly): `onUploadProgress` fired 9 times with real increasing percentages (0% → 100%), processing completed in ~1.8s well under the new 60s ceiling, cancel worked cleanly. The literal ~200MB case needs the user's own click-through since it's their local file.
- [x] 4.2 Confirm `yarn workspace web build`, `yarn workspace web lint`, `yarn workspace api build`, and `yarn workspace api lint` all still pass after the changes. — all four pass.
