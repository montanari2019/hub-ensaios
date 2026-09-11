## Context

See `proposal.md` - Why/What Changes for motivation and scope. Relevant
current state:

- `tracks.tonality` is free-text (`text`, nullable) in SQLite via TypeORM;
  `channels` has no pitch-related column at all.
- `playerEngine.ts` plays each channel from its own `AudioBufferSourceNode`
  (one-shot, recreated on every play/seek) → `GainNode` → `AnalyserNode` →
  shared `masterGain`, all scheduled off one `audioContext.currentTime` to
  keep channels sample-accurate. Neither `detune` nor `playbackRate` is
  used anywhere today.
- No `PATCH`/update endpoint exists for tracks; the only writes are
  create-via-import and delete.
- No select/popover-style component exists in the design system yet —
  every existing form field (`TextField`, `NumberField`) is a plain
  labeled input.
- SQLite has no native enum type, and this codebase already avoids
  `ALTER TABLE` on SQLite where possible (see the comment at the top of
  `CreateChannels1789052040577` — adding a constraint to an existing
  SQLite table forces a full table rebuild).

## Goals / Non-Goals

**Goals:**
- Real-time pitch shift that only ever touches channels flagged
  `pitch_editable`, without breaking the existing multichannel sync
  guarantee for any channel, editable or not.
- End-to-end enum enforcement for tonality (DTO validation in, selector
  UI out — never free text on either side).
- Local-first tonality edits: instant, per-browser, no prompt; explicit,
  separate action to make an edit the shared value.

**Non-Goals:**
- BPM editing. BPM gets the same visual treatment as tonality but stays
  display-only in this change.
- Mode/scale (major/minor) selection — tonality is root pitch class only,
  per the proposal's 12-note enum.
- Tempo/time-stretching. This change only ever shifts pitch; BPM and
  playback duration are untouched.
- Persisting the octave shift server-side — see Decisions below for why
  it's inherently local-only.
- Conflict resolution when two people sync the same track around the same
  time — last-write-wins is acceptable for this tool's scale.

## Decisions

### Pitch-shift technique: real-time, tempo-independent shift via a library, not `detune`
`AudioBufferSourceNode.detune`/`playbackRate` would be a few lines, but
both resample the buffer, which changes playback duration. With some
channels shifted and others not, the shifted ones would finish at a
different instant than the rest — a direct violation of `channel-player`'s
existing "Channels stay synchronized during playback" requirement. Any
technique used here must keep every channel's duration identical
regardless of pitch shift.

**Choice:** integrate a tempo-independent pitch-shift library into the
per-channel node graph, applied only to channels marked
`pitch_editable`: `source → [pitch-shift node, if editable] → gainNode →
analyserNode → masterGain`. Non-editable channels are wired exactly as
today, with no new node in their chain.

**Library:** Signalsmith Stretch (WASM + AudioWorklet), chosen over the
alternatives researched:
- **SoundTouchJS** (`@soundtouchjs/audio-worklet`) — mature, but known to
  mishandle transients (drum-like hits doubled or dropped), which is a
  worse fit even for the melodic channels this targets.
- **Tone.js `PitchShift`** — pure JS (delay-line/sawtooth technique), no
  WASM/AudioWorklet build complexity, but noticeably more artifacts at
  the ±1 octave range this feature needs. Kept as the fallback if
  Signalsmith's AudioWorklet+WASM bundling proves too costly in this
  Vite app during implementation.

Because playback already streams each channel's buffer through its node
chain in real time (not a pre-rendered offline pass), Signalsmith's
streaming AudioWorklet model fits the existing architecture without
restructuring how channels are scheduled.

### Semitone offset: nearest pitch class + explicit octave
The user picks a target note and an independent octave control (-1, 0,
+1). The interval between the track's original note and the picked note
is resolved to the *nearest* direction (range -6..+5 semitones), then the
octave adds ±12:

```
pitchClassDelta   = ((targetIndex - originalIndex + 6 + 12) % 12) - 6
totalSemitones    = pitchClassDelta + octaveShift * 12   // octaveShift ∈ {-1, 0, 1}
```

This matches the standard "note selector + octave stepper" DAW pattern
researched during exploration, and keeps the selector's displayed
note/octave in 1:1 correspondence with what's stored (see next decision),
rather than reverse-deriving a note from a raw semitone count.

### Octave shift is always local, never synced
The backend's `tracks.tonality` column only ever stores a pitch class
(one of the 12 enum notes) — there is no octave column, and this change
doesn't add one. So:
- The **note** component of a local override is what can be synced to
  the server.
- The **octave** component is a performance parameter with no server
  representation at all: it lives only in `localStorage`, is never sent
  to the backend, and always starts back at 0 when a track is freshly
  loaded with no local override (sync or no sync).
- "Unsynced" state (whether the sync control shows) is computed purely
  from `localOverride.note !== track.tonality` — octave never factors
  into it.

### Enum enforcement stays application-level, not a DB constraint
Given SQLite's lack of native enum types and this project's established
aversion to `ALTER TABLE` on SQLite (rebuilds the whole table), the
`tracks.tonality` column stays `varchar`/`text`. Enforcement is:
`@IsEnum` in `ConfirmImportDto` and the new update DTO on the backend,
plus the frontend selector only ever offering the 12 values (never a free
text input) on both the import review and the player's transpose
selector. The `MusicalNote` value list is duplicated in `apps/web` and
`apps/api` (already the existing pattern in this codebase — e.g. `Track`
type is hand-mirrored between `apps/web/src/types/track.ts` and
`apps/api/src/tracks/entities/track.entity.ts`; no shared types package
exists to change that here).

### New endpoint: `PATCH /tracks/:id/tonality` with a single-field body
Scoped to `{ tonality: MusicalNote }` only — not a general track-update
endpoint — since tonality sync is the only write this change needs. The
dedicated `/tonality` sub-resource keeps the route's intent unambiguous
and leaves room for a future general track-update endpoint without
collision, versus a broader `PUT`/replace on `/tracks/:id`.

### `localStorage` schema
One key per track, e.g. `tracks-gambira:tonality-override:<trackId>`,
value `{ note: MusicalNote, octave: -1 | 0 | 1 }`. Storing the selector's
exact state (not a raw computed semitone offset) means the UI can
rehydrate the selector's displayed note/octave directly, with no reverse
mapping from an offset back to a note (which would be ambiguous — several
note/octave combinations can produce the same total semitone count).

## Risks / Trade-offs

- **[First AudioWorklet + WASM dependency in this codebase]** → adds real
  build/bundling surface to a Vite frontend that's had none so far.
  Mitigation: fully encapsulated inside `playerEngine.ts`'s existing
  per-channel node abstraction; Tone.js `PitchShift` is a documented,
  lower-risk fallback if bundling friction shows up during
  implementation.
- **[Changing the selector mid-playback re-schedules affected channels]**
  → `AudioBufferSourceNode`s are one-shot, so applying a new pitch means
  destroying and recreating the source for each *pitch-editable* channel
  at the current shared playhead (same offset math `seek()` already
  uses). Expect a brief (sub-second) audible seam on the channels being
  retuned; non-editable channels are untouched and keep playing straight
  through.
- **[Legacy `tracks.tonality` free-text values are cleared, not
  migrated/mapped]** → irreversible, but accepted per the proposal: the
  app has no real production data at this stage. Flagged here for
  visibility if that assumption is stale by the time this ships.
- **[No sync conflict handling]** → two people syncing the same track
  around the same time results in last-write-wins with no warning.
  Acceptable for this tool's scale (small group, same local backend, no
  accounts).

## Migration Plan

1. Migration: add `channels.pitch_editable` (`boolean`, `default: true`),
   consistent with "defaults to pitch-editable" in the `track-library`
   delta spec.
2. Migration: data cleanup — `UPDATE tracks SET tonality = NULL WHERE
   tonality NOT IN (<the 12 enum values>)`. No schema change to the
   column itself (stays `text`); enum enforcement is application-level
   only (see Decisions). This migration's `down()` is a no-op — cleared
   values can't be un-cleared.
3. Backend: new DTO + `PATCH /tracks/:id` endpoint; `ConfirmImportDto`
   and `ConfirmImportChannelDto` gain enum/flag validation.
4. Frontend: new pitch-shift dependency, new selector component, new
   `localStorage`-backed hook, `playerEngine.ts` node-graph changes,
   `ImportReview.tsx` and `Player.tsx` updates.

No user-facing rollout steps beyond a normal app/backend update — this is
a single-machine local tool with no phased/canary deploy concept.

## Open Questions

- Exact package name/version to pin for Signalsmith Stretch's web
  release (a WASM+AudioWorklet npm package was confirmed to exist during
  research, but the precise package name should be re-verified at
  implementation time). Doesn't affect specs, approach, or task
  breakdown — only which exact dependency string lands in
  `package.json`.
