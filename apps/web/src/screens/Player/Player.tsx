import { useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, ChannelStrip, TonalitySelector } from '../../components'
import { useTonalityOverride } from '../../hooks/useTonalityOverride'
import { usePlayerEngine } from '../../hooks/usePlayerEngine'
import { ApiError, updateTrackTonality } from '../../lib/api'
import { formatDuration } from '../../lib/format'
import { semitoneOffset } from '../../lib/transpose'
import { isChannelAudible } from '../../types'
import type { CSSVarStyle } from '../../types/css'
import type { MusicalNote, OctaveShift } from '../../types'
import styles from './Player.module.css'

export function Player() {
  const navigate = useNavigate()
  const { trackId } = useParams<{ trackId: string }>()
  const {
    track,
    channels,
    channelStates,
    transport,
    loading,
    loadingProgress,
    error,
    togglePlay,
    seek,
    setMasterVolume,
    setChannelVolume,
    toggleMute,
    toggleSolo,
    setTranspose,
    applySyncedTonality,
  } = usePlayerEngine(trackId)

  const { override, setOverride, clearOverride } = useTonalityOverride(trackId)
  const [isTonalityOpen, setIsTonalityOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const anySoloed = Object.values(channelStates).some((state) => state.soloed)

  const effectiveNote = override?.note ?? track?.tonality ?? null
  const effectiveOctave: OctaveShift = override?.octave ?? 0
  const isUnsynced = override !== null && track !== null && override.note !== track.tonality

  function handleTonalityChange(note: MusicalNote, octave: OctaveShift) {
    if (!track?.tonality) return
    setOverride({ note, octave })
    setTranspose(semitoneOffset(track.tonality, note, octave))
  }

  async function handleSync() {
    if (!trackId || !override) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      await updateTrackTonality(trackId, override.note)
      applySyncedTonality(override.note)
      clearOverride()
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : 'Não foi possível sincronizar a tonalidade.')
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingPercent}>{loadingProgress}%</span>
        <span className={styles.loadingBar}>
          <span
            className={styles.loadingBarFill}
            style={{ '--progress': `${loadingProgress}%` } as CSSVarStyle}
          />
        </span>
        <span className={styles.loadingLabel}>Carregando os canais da track…</span>
      </div>
    )
  }

  if (error || !track) {
    return (
      <div className={styles.notFound}>
        <p>{error ?? 'Track não encontrada.'}</p>
        <Button variant="ghost" icon="arrow_back" onClick={() => navigate('/')}>
          Voltar para a biblioteca
        </Button>
      </div>
    )
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    seek(Number(event.target.value))
  }

  function handleMasterVolume(event: ChangeEvent<HTMLInputElement>) {
    setMasterVolume(Number(event.target.value) / 100)
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          Player · {channels.length} {channels.length === 1 ? 'canal' : 'canais'}
        </span>
        <h1 className={styles.title}>{track.name}</h1>
        {track.bpm || track.tonality ? (
          <div className={styles.trackMeta}>
            {track.bpm ? (
              <Badge variant="outline" icon="speed" className={styles.metaBadge}>
                {track.bpm} BPM
              </Badge>
            ) : null}
            {track.tonality ? (
              <div className={styles.tonalityWrap}>
                <button
                  type="button"
                  className={styles.tonalityButton}
                  onClick={() => setIsTonalityOpen((open) => !open)}
                  aria-haspopup="dialog"
                  aria-expanded={isTonalityOpen}
                >
                  <Badge variant="outline" icon="music_note" className={styles.metaBadge}>
                    {effectiveNote}
                  </Badge>
                </button>
                {isUnsynced ? (
                  <button
                    type="button"
                    className={styles.syncButton}
                    onClick={handleSync}
                    disabled={isSyncing}
                    title="Salvar esta tonalidade como o original da track"
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">
                      cloud_upload
                    </span>
                  </button>
                ) : null}
                {isTonalityOpen && effectiveNote ? (
                  <TonalitySelector
                    note={effectiveNote}
                    octave={effectiveOctave}
                    onChange={handleTonalityChange}
                    onClose={() => setIsTonalityOpen(false)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {syncError ? <p className={styles.syncError}>{syncError}</p> : null}
      </header>

      <div className={styles.transport}>
        <button
          type="button"
          className={styles.playButton}
          onClick={togglePlay}
          aria-label={transport.status === 'playing' ? 'Pausar' : 'Tocar'}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            {transport.status === 'playing' ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <span className={styles.time}>{formatDuration(transport.currentTime)}</span>

        <input
          type="range"
          className={styles.seek}
          min={0}
          max={transport.duration}
          step={0.1}
          value={transport.currentTime}
          onChange={handleSeek}
          aria-label="Posição de reprodução"
        />

        <span className={styles.time}>{formatDuration(transport.duration)}</span>

        <div className={styles.masterVolume}>
          <span className="material-symbols-rounded" aria-hidden="true">
            volume_up
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(transport.masterVolume * 100)}
            onChange={handleMasterVolume}
            aria-label="Volume master"
          />
        </div>
      </div>

      <div className={styles.stripsWrap}>
        <div className={styles.strips}>
          {channels.map((channel) => {
            const state = channelStates[channel.id]
            return (
              <ChannelStrip
                key={channel.id}
                channel={channel}
                state={state}
                audible={isChannelAudible(state, anySoloed)}
                onVolumeChange={(volume) => setChannelVolume(channel.id, volume)}
                onToggleMute={() => toggleMute(channel.id)}
                onToggleSolo={() => toggleSolo(channel.id)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
