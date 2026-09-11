## Why

The track player screen (`/tracks/:id`) already has BPM and tonality data available but doesn't display it, its channel faders don't match the app's intended mixer-console visual language, playback gets stuck at the end of a track instead of resetting for replay, and channel volume is capped at unity gain with no way to boost a channel above its original level — all friction points reported directly from using the screen during rehearsal.

## What Changes

- Display the track's BPM and tonality in the player screen header (data already fetched via `usePlayerEngine`, just not rendered).
- Restyle `ChannelStrip`'s fader, meter, and strip chrome to match the x32-control mixer visual language (dark thin fader rail, zero-gain mark, segmented LED-style level meter, channel-color-tinted strip background) while keeping the existing native `<input type="range">` interaction (no new drag/pointer implementation).
- When a track finishes playing, the transport resets to position 0 (instead of parking at the end) so the user can press play again immediately without manually dragging the seek bar back.
- **BREAKING**: raise per-channel volume range from 0-100% to 0-120%, letting a channel be boosted above unity gain (the extra 20% is a real gain increase applied to the `GainNode`, not a visual-only cap change).
- Fix the channel strip row layout so strips use their fixed width and distribute available space with `space-between` instead of collapsing to content width (`width: max-content` currently defeats the intended spacing).
- Double-clicking a channel's fader resets its volume back to the 80% default it starts at.
- Adapt the player screen (channel strips, faders, mute/solo buttons, transport bar) for comfortable touch use on narrow/mobile viewports, extending the existing `design-system` responsive-layout requirement with a concrete touch-target-size guarantee for this screen's interactive controls.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `channel-player`: volume range requirement changes from "0% to 100%" to "0% to 120%" with boost applied as real gain; adds a requirement that playback position resets to the start when a track finishes; adds a requirement that the player screen displays the track's BPM and tonality.
- `design-system`: adds a requirement that interactive controls on the player screen (fader, mute, solo) meet a minimum touch-target size on narrow viewports, as a concrete instance of the existing responsive-layout requirement.

## Impact

- Frontend only: `apps/web/src/screens/Player/Player.tsx` + `Player.module.css`, `apps/web/src/components/ChannelStrip/ChannelStrip.tsx` + `.module.css`, `apps/web/src/lib/playerEngine.ts` (`scheduleEnd`), `apps/web/src/hooks/usePlayerEngine.ts` (`onEnded` callback).
- No backend or data-model changes — `bpm`/`tonality` already exist end-to-end; no new fields.
- No changes to `track-library` spec — the metadata display is covered by extending `channel-player`'s scope.
- Responsive work is scoped to the player screen only (`Player.module.css`, `ChannelStrip.module.css`); the Library and Import Review screens are out of scope for this change.
