## Why

Bands often need to play a song in a different key than it was originally recorded in — a different singer's range, a capo change, whatever — but shifting the pitch of drums or a click track sounds wrong, since they carry no defined pitch to begin with. Today `tracks.tonality` is free text, shown but never editable, so there's no way to try a different key at all, let alone one that leaves percussion untouched. Musicians rehearsing need a fast, no-friction way to audition a different key live, per person, without permanently altering the track unless they choose to.

## What Changes

- Replace `tracks.tonality`'s free-text storage with a closed enum of the 12 chromatic notes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B) — enforced both when a track is created and whenever its tonality is later updated.
- **BREAKING**: import review's tonality field becomes a selector restricted to the enum instead of a free-text input; the backend rejects any tonality value outside the enum.
- **BREAKING**: existing `tracks.tonality` values that don't match one of the 12 enum notes are cleared to `null` by the migration (no known production data at risk at this stage of the project).
- Import review gains a per-channel "editable for pitch" checkbox, persisted per channel (`channels.pitch_editable`), so channels like drums/click can be excluded from pitch transposition at import time.
- Player screen's BPM and Tonality badges become clickable and visually more prominent (larger, more highlighted — a subtle size/emphasis bump, not a redesign); BPM's click target gets the same visual treatment for consistency but stays display-only in this change (no BPM editing).
- Clicking the Tonality control opens a selector: pick a note (enum) and shift by up to one octave up or down.
- Changing the selector re-pitches, live, every channel flagged `pitch_editable`, leaving non-editable channels untouched — using a genuine pitch-shift technique (not `detune`/`playbackRate`) so every channel's duration stays identical and the existing multichannel sync guarantee holds.
- The edit is personal and instant: it writes straight to that browser's `localStorage` (no confirmation dialog), scoped to that track and machine. Anyone else opening the same track — another person, or the same person on another machine/browser — hears the server's stored tonality until they make their own local edit.
- A sync control appears whenever the local edit differs from the server's stored tonality; activating it calls a new endpoint that persists the edit as the track's tonality for everyone, clearing the local "unsynced" state.

## Capabilities

### New Capabilities
- `track-pitch-transpose`: live, per-user pitch transposition of a track's pitch-editable channels during playback, with local-only persistence by default and an explicit action to sync an edit as the track's shared tonality.

### Modified Capabilities
- `track-library`: the import review's tonality field changes from free text to a selection restricted to the 12-note enum; adds a per-channel pitch-editable flag captured during import review and persisted with each channel.

## Impact

- **Backend**: `track.entity.ts` (enum-typed `tonality`), `channel.entity.ts` (new `pitchEditable` column), `confirm-import.dto.ts` / `confirm-import-channel.dto.ts` (enum + flag validation), new migrations (enum constraint on `tracks.tonality`, `pitch_editable` column on `channels`, cleanup of non-conforming legacy values), `tracks.controller.ts` / `tracks.service.ts` (new endpoint to update a track's tonality).
- **Frontend**: `ImportReview.tsx` (tonality selector, per-channel checkbox), `Player.tsx` (clickable/larger BPM + tonality controls), a new tonality-selector component (first select/popover-style component in the design system), `playerEngine.ts` (integrates a real-time pitch-shift technique for flagged channels), `api.ts` (enum type, `pitchEditable` field, new update call), a new `localStorage`-backed hook for the per-track local override and its synced/unsynced state.
- **New dependency**: a real-time pitch-shift library independent of playback speed (evaluated in design.md).
- No requirement-level changes to `local-backend` or `design-system` — the new update endpoint is an implementation detail of `local-backend`'s existing "metadata persistence" requirement, and the visual/selector work follows `design-system`'s existing tokens.
