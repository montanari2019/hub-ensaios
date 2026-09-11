import { useId } from 'react'
import type { ChangeEvent } from 'react'
import { DEFAULT_VOLUME } from '../../hooks/usePlayerEngine'
import type { Channel, ChannelPlaybackState } from '../../types'
import type { CSSVarStyle } from '../../types/css'
import styles from './ChannelStrip.module.css'

const MAX_VOLUME_PERCENT = 120
const UNITY_VOLUME_PERCENT = 100

interface ChannelStripProps {
  channel: Channel
  state: ChannelPlaybackState
  audible: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  onToggleSolo: () => void
}

export function ChannelStrip({
  channel,
  state,
  audible,
  onVolumeChange,
  onToggleMute,
  onToggleSolo,
}: ChannelStripProps) {
  const sliderId = useId()
  const volumePercent = Math.round(state.volume * 100)
  const meterPercent = audible ? Math.round(state.level * 100) : 0

  function handleVolumeInput(event: ChangeEvent<HTMLInputElement>) {
    onVolumeChange(Number(event.target.value) / 100)
  }

  function handleVolumeReset() {
    onVolumeChange(DEFAULT_VOLUME)
  }

  return (
    <div
      className={styles.strip}
      data-audible={audible}
      style={{ '--channel-color': channel.color } as CSSVarStyle}
    >
      <div className={styles.name} title={channel.name}>
        {channel.name}
      </div>

      <span className={styles.volumeValue}>{volumePercent}</span>

      <div className={styles.faderArea}>
        <div className={styles.meter} aria-hidden="true">
          <span
            className={styles.meterFill}
            style={{ '--level': `${meterPercent}%` } as CSSVarStyle}
          />
        </div>

        <div
          className={styles.faderTrack}
          style={{ '--unity-fraction': UNITY_VOLUME_PERCENT / MAX_VOLUME_PERCENT } as CSSVarStyle}
        >
          <span className={styles.unityMark} aria-hidden="true" />
          <label htmlFor={sliderId} className={styles.srOnly}>
            Volume de {channel.name}
          </label>
          <input
            id={sliderId}
            className={styles.faderInput}
            type="range"
            min={0}
            max={MAX_VOLUME_PERCENT}
            value={volumePercent}
            onChange={handleVolumeInput}
            onDoubleClick={handleVolumeReset}
          />
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.muteButton}
          aria-pressed={state.muted}
          onClick={onToggleMute}
        >
          MUTE
        </button>
        <button
          type="button"
          className={styles.soloButton}
          aria-pressed={state.soloed}
          onClick={onToggleSolo}
        >
          SOLO
        </button>
      </div>
    </div>
  )
}
