## 1. Player header: BPM and tonality

- [x] 1.1 Add BPM/tonality display to `Player.tsx` header (conditionally rendering only present values, matching the omit-if-absent pattern already used in `TrackLibrary.tsx`) and verify by opening a track with both values set and confirming they render, then opening one with neither set and confirming no placeholder appears
- [x] 1.2 Add corresponding styles to `Player.module.css` using existing theme tokens (no hardcoded hex/px) and verify no inline `style` attributes were introduced

## 2. Volume range boost to 120%

- [x] 2.1 Raise `max` from `100` to `120` on the channel volume `<input type="range">` in `ChannelStrip.tsx` and verify the slider can be dragged past the old 100% position up to 120%
- [x] 2.2 Verify `usePlayerEngine`'s `setChannelVolume` and `playerEngine.ts`'s `setChannelGain` pass the resulting 0-1.2 value through to `GainNode.gain` unclamped (no code change expected here per design.md, confirm by reading the call chain) and verify by playing a channel at 120% and confirming its audible level is louder than at 100% for the same source material
- [x] 2.3 Update `ChannelStrip.tsx`'s displayed volume value/label to correctly show values above 100 (e.g. "120") and verify visually

## 3. Fader and channel strip restyle (x32-control visual language)

- [x] 3.1 Restyle `ChannelStrip.module.css`'s fader track/thumb to a thinner, near-black rail matching the x32-control reference proportions, using theme tokens for color/radius and verify visually against the reference
- [x] 3.2 Add a zero-gain tick mark on the fader track positioned via a CSS custom property at the 100%-of-120% point (not a hardcoded pixel value) and verify it visually lines up with the 100% slider position
- [x] 3.3 Change the level meter from a continuous fill to a segmented/stepped look via `repeating-linear-gradient` (or equivalent CSS-only technique) and verify the meter still reflects live audio level during playback
- [x] 3.4 Apply a channel-color-tinted background to the strip using the existing `--channel-color` custom property and verify each channel strip is visually distinguishable by its assigned color
- [x] 3.5 Confirm no inline `style` attributes were added beyond existing dynamic CSS-variable usage (`--channel-color`, `--level`, meter/fader custom properties), consistent with the design-system CSS Modules rule

## 4. Channel strip row layout (full width, space-between)

- [x] 4.1 Remove `width: max-content` from `.strips` in `Player.module.css` and set it to fill `.stripsWrap`'s width, with `justify-content: space-between`, keeping each strip's existing fixed width and verify visually with a track that has few channels (strips spread across the row) and a track with many channels (row still scrolls via existing `overflow-x: auto`, no layout break)

## 5. End-of-track reset to start

- [x] 5.1 Change `scheduleEnd()` in `playerEngine.ts` to set `this.scheduledOffset = 0` instead of `this.getDuration()` when playback finishes naturally and verify by playing a short track to completion and checking the engine's internal position
- [x] 5.2 Change the `onEnded` callback in `usePlayerEngine.ts` to set `currentTime: 0` instead of `currentTime: engine.getDuration()` and verify the seek bar visually returns to the start when a track finishes
- [ ] 5.3 Verify end-to-end: play a short track to completion, confirm the transport shows position 0 and status paused, then press play again and confirm playback restarts from the beginning without manual seeking

## 6. Volume reset via double-click

- [x] 6.1 Export `DEFAULT_VOLUME` from `usePlayerEngine.ts` and add an `onDoubleClick` handler on the channel fader in `ChannelStrip.tsx` that calls `onVolumeChange(DEFAULT_VOLUME)`, and verify by moving a channel's fader away from 80% then double-clicking it and confirming it snaps back to 80%
- [x] 6.2 Confirm double-clicking one channel's fader does not affect any other channel's volume, mute, or solo state

## 7. Mobile touch-target responsiveness (player screen only)

- [x] 7.1 Add a `(max-width: 640px)` media query rule in `ChannelStrip.module.css` giving `.muteButton`/`.soloButton` a `min-height: 44px` and verify visually at a narrow viewport width
- [x] 7.2 Add a `(max-width: 640px)` media query rule enlarging the fader's touch hit area (`.faderTrack`/`.faderInput` cross-axis size) to at least 44px without changing the visual rail thickness, and verify the fader remains draggable via touch/pointer at a narrow viewport width
- [ ] 7.3 Verify the channel strip row still scrolls horizontally without page-level horizontal overflow at a narrow viewport width (existing `.stripsWrap` `overflow-x: auto` behavior), consistent with `design-system`'s existing responsive-layout requirement
- [x] 7.4 Confirm no inline `style` attributes were introduced and all new sizing comes from theme tokens or the component's CSS Module

## 8. Verification

- [x] 8.1 Run the existing frontend test suite/lint/typecheck for `apps/web` and confirm no regressions
- [ ] 8.2 Manually exercise the full player screen end-to-end (BPM/tonality display, restyled faders, 120% boost, double-click reset, row layout with different channel counts, end-of-track reset, narrow-viewport touch targets) against a real imported track
