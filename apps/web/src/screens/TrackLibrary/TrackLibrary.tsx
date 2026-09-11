import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../../components'
import { ApiError, deleteTrack, listTracks, startImport } from '../../lib/api'
import { formatDuration, formatImportDate } from '../../lib/format'
import { toTrack } from '../../lib/trackMappers'
import type { CSSVarStyle } from '../../types/css'
import type { Track } from '../../types'
import styles from './TrackLibrary.module.css'

function describeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

type ImportPhase =
  | { status: 'idle' }
  | { status: 'uploading'; percent: number }
  | { status: 'processing' }
  | { status: 'error'; message: string }

export function TrackLibrary() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tracks, setTracks] = useState<Track[] | null>(null)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [importPhase, setImportPhase] = useState<ImportPhase>({ status: 'idle' })
  const isImporting = importPhase.status === 'uploading' || importPhase.status === 'processing'

  const refreshTracks = useCallback(async () => {
    try {
      const summaries = await listTracks()
      setTracks(summaries.map(toTrack))
      setLibraryError(null)
    } catch (error) {
      setLibraryError(describeError(error, 'Não foi possível carregar a biblioteca.'))
    }
  }, [])

  useEffect(() => {
    refreshTracks()
  }, [refreshTracks])

  function handleImportClick() {
    setImportPhase({ status: 'idle' })
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImportPhase({ status: 'uploading', percent: 0 })
    try {
      const preview = await startImport(file, (percent) => {
        // 100% de upload não quer dizer "pronto" — o backend ainda extrai
        // os canais do zip, então esse ponto já é a virada pra "processando".
        setImportPhase(
          percent >= 100 ? { status: 'processing' } : { status: 'uploading', percent },
        )
      })
      setImportPhase({ status: 'idle' })
      navigate(`/import/${preview.importId}`, { state: { preview } })
    } catch (error) {
      setImportPhase({
        status: 'error',
        message: describeError(error, 'Não foi possível importar essa track. Tente novamente.'),
      })
    }
  }

  async function handleDeleteTrack(event: ReactMouseEvent, trackId: string) {
    event.stopPropagation()
    const confirmed = window.confirm('Excluir esta track e os canais importados com ela?')
    if (!confirmed) return
    await deleteTrack(trackId)
    await refreshTracks()
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, trackId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(`/tracks/${trackId}`)
    }
  }

  const trackCount = tracks?.length ?? 0

  function importButtonLabel(idleLabel: string): string {
    if (importPhase.status === 'uploading') return `Enviando… ${importPhase.percent}%`
    if (importPhase.status === 'processing') return 'Processando…'
    return idleLabel
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Biblioteca · {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </span>
          <h1 className={styles.title}>Suas tracks</h1>
          <p className={styles.subtitle}>
            Escolha uma track para ensaiar isolando os canais, ou importe um novo .zip com os
            canais da música.
          </p>
        </div>

        <div className={styles.importArea}>
          <Button icon="upload" onClick={handleImportClick} disabled={isImporting}>
            {importButtonLabel('Importar track')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className={styles.hiddenInput}
            onChange={handleFileSelected}
          />
          {importPhase.status === 'uploading' ? (
            <div className={styles.importProgress}>
              <span className={styles.importProgressBar}>
                <span
                  className={styles.importProgressFill}
                  style={{ '--progress': `${importPhase.percent}%` } as CSSVarStyle}
                />
              </span>
              <span className={styles.importProgressLabel}>{importPhase.percent}%</span>
            </div>
          ) : importPhase.status === 'processing' ? (
            <div className={styles.importProgress}>
              <span className={styles.importSpinner} aria-hidden="true" />
              <span className={styles.importProgressLabel}>Extraindo os canais do zip…</span>
            </div>
          ) : importPhase.status === 'error' ? (
            <span className={styles.importErrorText}>{importPhase.message}</span>
          ) : null}
        </div>
      </header>

      {libraryError ? (
        <div className={styles.empty}>
          <span className={`material-symbols-rounded ${styles.emptyIcon}`} aria-hidden="true">
            cloud_off
          </span>
          <h2 className={styles.emptyTitle}>Não foi possível falar com o backend</h2>
          <p className={styles.emptyText}>{libraryError}</p>
          <Button variant="ghost" icon="refresh" onClick={refreshTracks}>
            Tentar de novo
          </Button>
        </div>
      ) : tracks === null ? null : tracks.length === 0 ? (
        <div className={styles.empty}>
          <span className={`material-symbols-rounded ${styles.emptyIcon}`} aria-hidden="true">
            library_music
          </span>
          <h2 className={styles.emptyTitle}>Nenhuma track importada ainda</h2>
          <p className={styles.emptyText}>
            Suba um .zip com os canais de uma música para começar a ensaiar.
          </p>
          <Button icon="upload" onClick={handleImportClick} disabled={isImporting}>
            {importButtonLabel('Importar primeira track')}
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {tracks.map((track) => (
            <Card
              key={track.id}
              interactive
              className={styles.trackCard}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/tracks/${track.id}`)}
              onKeyDown={(event) => handleCardKeyDown(event, track.id)}
            >
              <div className={styles.trackHeader}>
                <h3 className={styles.trackName}>{track.name}</h3>
                <div className={styles.trackHeaderActions}>
                  <Badge icon="graphic_eq">{formatDuration(track.durationSeconds)}</Badge>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    aria-label={`Excluir ${track.name}`}
                    onClick={(event) => handleDeleteTrack(event, track.id)}
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">
                      delete
                    </span>
                  </button>
                </div>
              </div>
              <div className={styles.trackMeta}>
                <Badge variant="outline" icon="layers">
                  {track.channelCount} canais
                </Badge>
                {track.bpm ? (
                  <Badge variant="outline" icon="speed">
                    {track.bpm} BPM
                  </Badge>
                ) : null}
                {track.tonality ? (
                  <Badge variant="outline" icon="music_note">
                    {track.tonality}
                  </Badge>
                ) : null}
                <span className={styles.trackDate}>
                  Importada em {formatImportDate(track.importedAt)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
