## Context

Current player screen (`apps/web/src/screens/Player`) renders `track.name`
in the header but not `track.bpm`/`track.tonality`, even though both are
already fetched into the `track` object by `usePlayerEngine`. Channel
faders are a native `<input type="range" min={0} max={100}>` rotated -90deg
inside `ChannelStrip` (`apps/web/src/components/ChannelStrip`), styled with
generic dark-glass tokens rather than the mixer-console language the app is
meant to follow. End-of-track is handled by `playerEngine.ts`'s
`scheduleEnd()` (sets `scheduledOffset` to `getDuration()`) and
`usePlayerEngine.ts`'s `onEnded` callback (sets `currentTime` to
`engine.getDuration()`), both parking the transport at the end instead of
0. The channel row (`Player.module.css` `.strips`) sets
`width: max-content; min-width: 100%`, which pins the flex container's
width to its content, silently defeating any `justify-content` spacing.
See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Surface BPM/tonality on the player screen using existing data, no API changes.
- Bring `ChannelStrip`'s visual language in line with the x32-control
  mixer-console reference (dark thin fader rail, zero-gain mark, segmented
  LED-style meter, channel-color-tinted strip background) without
  reimplementing the fader's interaction model.
- Make playback replayable immediately after it finishes.
- Let a channel be boosted to 120% with real gain effect.
- Make the channel strip row lay out at fixed strip width with
  `space-between`, filling the available width predictably regardless of
  channel count.
- Let a channel's volume be reset to its 80% starting default via
  double-click, without adding a new visible control.
- Make the player screen's fader, mute, and solo controls comfortably
  operable by touch on narrow viewports, as a concrete instance of
  `design-system`'s existing responsive-layout requirement.

**Non-Goals:**
- Replacing the native `<input type="range">` with a custom pointer/drag
  fader component (rejected — keeps existing accessibility/keyboard/touch
  support and drag logic, restyle only).
- Adding a new "click"/metronome field to the data model — confirmed
  during exploration that "click" refers to the existing `bpm` field, not
  a new one.
- Master volume boost above 100% — the proposal and spec changes are
  scoped to per-channel volume only; master volume stays 0-100%.
- Any backend/schema change — `bpm` and `tonality` already exist
  end-to-end.
- Responsive/mobile work on the Library or Import Review screens —
  confirmed with the user this change covers the player screen only;
  broader app-wide responsive work is a separate future change.

## Decisions

**Fader restyle keeps the native range input.** Rebuilding the fader as a
custom pointer-driven component would match x32-control's non-linear
dB-mapped drag behavior more closely, but reimplements drag, keyboard, and
touch handling that the native `<input type="range">` already provides for
free. Chosen approach: keep the rotated native range input, restyle via
CSS Module only — thinner track (closer to the reference's 8px rail),
darker near-black track color, a zero-gain tick mark at the 100%-of-120%
position (i.e., at `100/120 ≈ 83.3%` along the rotated track, expressed as
a CSS gradient/pseudo-element positioned with a custom property, not a
hardcoded pixel value), and a channel-color-tinted strip background
(reusing the existing `--channel-color` custom property already set per
strip). The level meter becomes a segmented/stepped gradient
(`repeating-linear-gradient`) instead of a continuous fill, approximating
the reference's LED-ladder look without introducing per-segment DOM nodes.

**Channel strip row: fixed width + `space-between`, not flex-grow.**
Confirmed with the user: strips keep their current fixed width so a
track's mix always looks the same regardless of channel count; when
channels don't fill the row, the browser distributes leftover space
between strips via `justify-content: space-between` on `.strips`. This
requires removing `.strips`'s current `width: max-content` (which pins the
flex container to content width and silently cancels
`justify-content`) and instead sizing `.strips` to the wrap's full width
(`width: 100%`), while `.stripsWrap`'s existing `overflow-x: auto` still
handles the case where enough channels exist to overflow (space-between
has no effect once content exceeds the container, which is the desired
fallback).

**Volume range 0-120%, linear gain, no curve change.** The engine's
`setChannelGain` already passes the volume value straight to
`GainNode.gain` with no clamp — raising the UI's `max` from 100 to 120 and
still dividing by 100 before calling `setChannelVolume` is sufficient to
produce gain values up to 1.2, a real ~1.6 dB boost above unity. No new
gain curve or limiter is introduced; this mirrors how the existing 0-100%
range already maps linearly to 0.0-1.0 gain.

**End-of-track reset changes two call sites, not the transport model.**
`scheduleEnd()` in `playerEngine.ts` sets `this.scheduledOffset =
this.getDuration()` before calling `onEndedCallback()` — this becomes `0`.
`usePlayerEngine.ts`'s `onEnded` handler sets `currentTime:
engine.getDuration()` — this becomes `currentTime: 0`. `status` stays
`'paused'` in both cases (the spec for "Single transport controls every
channel" already treats play as starting "from the current shared
playback position", so resetting the position to 0 while leaving status
paused is sufficient for a subsequent press-play to restart from the
beginning; no change to the play/pause state machine itself).

**Volume reset via double-click, no new button.** A dedicated "reset"
button would compete for space in an already narrow 96px-wide strip.
Double-clicking the fader itself to snap it back to the 80% default
mirrors a common DAW/mixer convention and needs no new UI element — just
an `onDoubleClick` handler on the existing `<input type="range">` calling
`onVolumeChange(DEFAULT_VOLUME)`. `DEFAULT_VOLUME` (0.8) is exported from
`usePlayerEngine.ts`, the single existing source of that constant, rather
than duplicating the literal in `ChannelStrip.tsx`.

**Fader rail length as a single CSS custom property.** The meter and the
fader rail's length (180px) were duplicated as a literal in four places
(`.meter` height, `.meterFill` background-size, `.faderInput` width, the
unity mark's position calc), which drifted out of sync once (the meter and
fader visibly rendered at different lengths) when only some of the four
were updated for the 20%-taller fader request. Fixed by defining
`--fader-length` once on `.faderArea` and having all four rules read it via
`var(...)`, so the meter and fader rail are structurally guaranteed to
match rather than coincidentally matching. The fader thumb was also
enlarged (26x14px to 32x18px) per user feedback that it was too small to
grab comfortably.

**Mobile touch targets: enlarge hit areas at the existing 640px
breakpoint, don't redesign the layout.** The channel strip row already
scrolls horizontally (`overflow-x: auto` on `.stripsWrap`), which is
itself a mobile-friendly pattern consistent with real hardware mixer
touch UIs (X32/M32 apps use the same horizontal-scroll-of-fixed-width-
strips approach) — so the row layout doesn't need to change for mobile.
What does need to change: MUTE/SOLO buttons get a `min-height: 44px` under
a `(max-width: 640px)` media query (matching the breakpoint already used
in `Player.module.css` and `AppShell.module.css`), and the fader's touch
target is enlarged the same way, via a wider invisible hit area on
`.faderTrack`/`.faderInput` rather than a visually thicker rail (which
would break the restyled thin-rail look) — native range inputs already
hit-test across their full track width in touch browsers, so the change
is to that CSS track's cross-axis size on narrow viewports, not to add
JS. Desktop layout and sizing stay exactly as already implemented.

## Risks / Trade-offs

- [Risk] A 120%-capable channel could clip if the source audio was already
  near 0 dBFS, since gain boost has no limiter. → Mitigation: this is an
  explicit, requested trade-off (the user wants real emphasis boost); no
  limiter is in scope for this change, consistent with the existing
  engine's unclamped gain pass-through.
- [Risk] Segmented meter via `repeating-linear-gradient` is a coarser
  approximation of x32-control's discrete LED blocks (real per-segment
  color zones) rather than a pixel-perfect match. → Mitigation: accepted
  as part of the "restyle, not rebuild" decision; visual language match is
  the goal, not a literal port.
- [Risk] `space-between` on a row of fixed-width strips produces uneven
  visual density for tracks with very few channels (e.g., 2 channels
  stretch across the full row). → Mitigation: this is the explicitly
  chosen trade-off over flex-grow, confirmed with the user, in favor of
  visual consistency across tracks with different channel counts.
