## 1. Shared musical-note enum

- [x] 1.1 Define the `MusicalNote` value list (`C`, `C#`, `D`, `D#`, `E`, `F`, `F#`, `G`, `G#`, `A`, `A#`, `B`) in `apps/api/src/tracks` (e.g. alongside the DTOs) and verify it's imported by the DTO/entity changes in section 2, not redefined ad hoc
- [x] 1.2 Define the matching `MusicalNote` type/const array in `apps/web/src/types/track.ts` and verify it's imported by the import-review selector, the transpose selector, and the API client types (no duplicate literal lists)

## 2. Backend: data model and migrations

- [x] 2.1 Add a migration creating `channels.pitch_editable` (`boolean`, `default: true`) and verify it runs cleanly against the existing SQLite dev DB (`yarn` migration command) with pre-existing channel rows backfilled to `true`
- [x] 2.2 Add a migration that clears any `tracks.tonality` value not in the 12-note enum (`UPDATE tracks SET tonality = NULL WHERE tonality NOT IN (...)`) and verify by seeding a row with an out-of-enum value before the migration and confirming it's `NULL` after
- [x] 2.3 Add `pitchEditable: boolean` to `Channel` entity and verify `channel.entity.ts` compiles and the column maps correctly (read back a row via TypeORM in a quick script or existing test)
- [x] 2.4 Constrain `Track.tonality` and `Channel`/DTO fields to `MusicalNote | null` at the TypeScript level (entity stays `text`/`varchar` at the DB level per design.md) and verify `tsc` passes

## 3. Backend: DTO validation and confirm-import flow

- [x] 3.1 Add `@IsEnum(MusicalNote)` validation to `tonality` in `ConfirmImportDto`, replacing the current free `@IsString`, and verify by posting a confirm-import request with an invalid tonality string and confirming a 400 is returned
- [x] 3.2 Add `pitchEditable: boolean` (with a default of `true` when omitted) to `ConfirmImportChannelDto` and verify a confirm-import request omitting the field still creates a channel with `pitchEditable: true`
- [x] 3.3 Verify `tracks.service.ts`'s confirm-import path persists each channel's `pitchEditable` flag and the track's validated `tonality`, by confirming an import with mixed flags and reading the created track/channels back via `GET /tracks/:id`

## 4. Backend: tonality sync endpoint

- [x] 4.1 Add `PATCH /tracks/:id` accepting `{ tonality: MusicalNote }` in `tracks.controller.ts`, backed by a new `tracks.service.ts` method, and verify it returns the updated track and rejects an out-of-enum value with 400
- [x] 4.2 Add the corresponding `updateTrackTonality` call to `apps/web/src/lib/api.ts` (new `ApiTrackSummary`/`ApiTrackDetail` stay compatible) and verify the TypeScript client compiles against the new endpoint shape

## 5. Frontend: import review — enum selector and per-channel flag

- [x] 5.1 Replace the free-text Tonality `TextField` in `ImportReview.tsx` with a selector restricted to the 12-note enum (reusing/extending the new component from section 7) and verify submitting without selecting a tonality still saves the track with `tonality: null`
- [x] 5.2 Add a "pitch editável" checkbox to each channel row in `ImportReview.tsx`, defaulted to checked, and verify unchecking one channel and confirming import results in that channel alone saved with `pitchEditable: false`
- [x] 5.3 Verify end-to-end: import a `.zip` with a drum-like channel unchecked and a melodic channel left checked, confirm, and read the created track's channels back to confirm the flags match what was set in review

## 6. Frontend: player header visual treatment

- [x] 6.1 Restyle the BPM and tonality `Badge`s in `Player.tsx`/`Player.module.css` to a moderately larger, more emphasized shared style (using existing design tokens only, no hardcoded hex/px) and verify visually against a track with both values set
- [x] 6.2 Make the tonality control clickable (BPM stays display-only) and verify via keyboard/aria (button semantics, accessible label) as well as visually — clicking it is what opens the selector built in section 7

## 7. Frontend: transpose selector component

- [x] 7.1 Build a new selector component (first popover/select-style component in the design system) offering the 12-note enum plus an octave control with exactly three options (-1, 0, +1), styled with existing tokens, and verify it renders and is keyboard-navigable
- [x] 7.2 Wire the selector's initial state to the track's local override if one exists in `localStorage`, else the track's original `tonality` with octave 0, and verify by reloading a track with and without a prior local edit
- [x] 7.3 Verify the selector never allows a value outside the 12 notes or outside the three octave options (no free text, no way to submit an out-of-range value)

## 8. Frontend: live pitch-shift engine integration

- [ ] 8.1 Add the pitch-shift dependency (Signalsmith Stretch web release per design.md, verifying the exact package name/version at this step; fall back to Tone.js `PitchShift` if AudioWorklet+WASM bundling in this Vite app proves too costly) and verify the dev build still runs
- [ ] 8.2 Extend `playerEngine.ts`'s per-channel node graph so channels flagged `pitchEditable` route through the pitch-shift node (`source → pitchShiftNode → gainNode → ...`) while non-editable channels keep their current, unchanged chain, and verify by inspecting the constructed graph for one editable and one non-editable channel
- [ ] 8.3 Implement the semitone-offset calculation from design.md (nearest pitch-class delta + octave × 12) as a pure function and verify with unit tests covering same-note/no-shift, wrap-around cases (e.g. B → C), and each octave option
- [ ] 8.4 Implement applying a new pitch-shift value live: reschedule only the affected (`pitchEditable`) channels' sources at the current shared playhead (reusing the `seek()` offset math), leaving non-editable channels' sources untouched, and verify by transposing mid-playback and confirming non-editable channels never glitch or restart
- [ ] 8.5 Verify all channels remain sample-accurate in sync after a mid-playback transposition, by playing a track with mixed editable/non-editable channels through a full transpose-then-continue cycle and checking no audible drift by the end of playback

## 9. Frontend: local override persistence and sync

- [x] 9.1 Implement a `localStorage`-backed hook storing `{ note, octave }` per `trackId` under a namespaced key, applied without any confirmation prompt on every selector change, and verify a change persists across a page reload in the same browser
- [x] 9.2 Derive "unsynced" state as `localOverride.note !== track.tonality` (octave never included, per design.md) and show a sync control in the player header only when true, and verify the control appears/disappears correctly across edit, sync, and no-edit cases
- [x] 9.3 Wire the sync control to call the `PATCH /tracks/:id/tonality` endpoint from section 4, updating the in-memory track's `tonality` and clearing the unsynced indicator on success, and verify by syncing an edit and confirming a fresh load (simulating another browser, e.g. via a private window) now shows the synced note as the original
- [x] 9.4 Verify octave shift is never sent to the backend and always resets to 0 on a track load that has no local override, per design.md's local-only octave decision

## 10. Verification

- [ ] 10.1 Run the existing backend and frontend test suites/lint/typecheck and confirm no regressions
- [ ] 10.2 Manually exercise the full flow end-to-end: import a track with mixed pitch-editable flags and a chosen tonality, open the player, transpose live while listening, confirm drum/click-like channels never change pitch, sync the edit, and confirm a second browser session shows the synced tonality as the new original
