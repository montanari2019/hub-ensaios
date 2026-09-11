import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, NoteField, NumberField, TextField } from '../../components'
import {
  ApiError,
  cancelImport,
  confirmImport,
  getImportPreview,
  type ApiImportPreview,
} from '../../lib/api'
import type { MusicalNote } from '../../types'
import styles from './ImportReview.module.css'

interface LocationState {
  preview?: ApiImportPreview
}

export function ImportReview() {
  const { importId } = useParams<{ importId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationPreview = (location.state as LocationState | null)?.preview

  const [preview, setPreview] = useState<ApiImportPreview | null>(navigationPreview ?? null)
  const [loading, setLoading] = useState(!navigationPreview)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [trackName, setTrackName] = useState('')
  const [channelNames, setChannelNames] = useState<Record<string, string>>({})
  const [bpm, setBpm] = useState<number | undefined>(undefined)
  const [tonality, setTonality] = useState<MusicalNote | undefined>(undefined)
  const [pitchEditableByChannel, setPitchEditableByChannel] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Sem preview vindo da navegação (ex.: reload na tela de revisão) —
  // rebusca a partir do manifest de staging, que ainda existe no backend.
  useEffect(() => {
    if (preview || !importId) return
    let cancelled = false
    setLoading(true)
    getImportPreview(importId)
      .then((result) => {
        if (!cancelled) setPreview(result)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof ApiError ? error.message : 'Não foi possível carregar a importação.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [importId, preview])

  useEffect(() => {
    if (!preview) return
    setTrackName(preview.suggestedName)
    setChannelNames(
      Object.fromEntries(preview.channels.map((channel) => [channel.tempChannelId, channel.suggestedName])),
    )
    setPitchEditableByChannel(
      Object.fromEntries(preview.channels.map((channel) => [channel.tempChannelId, true])),
    )
  }, [preview])

  if (!importId) {
    return <Navigate to="/" replace />
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault()
    if (!importId || !preview) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const track = await confirmImport(importId, {
        name: trackName,
        bpm,
        tonality,
        channels: preview.channels.map((channel) => ({
          tempChannelId: channel.tempChannelId,
          name: channelNames[channel.tempChannelId]?.trim() || channel.suggestedName,
          pitchEditable: pitchEditableByChannel[channel.tempChannelId] ?? true,
        })),
      })
      navigate(`/tracks/${track.id}`)
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Não foi possível salvar a track.')
      setIsSubmitting(false)
    }
  }

  async function handleCancel() {
    if (importId) {
      await cancelImport(importId).catch(() => {
        // já expirado/removido — segue pra biblioteca de qualquer jeito
      })
    }
    navigate('/')
  }

  if (loading) {
    return <p className={styles.status}>Carregando importação…</p>
  }

  if (loadError || !preview) {
    return (
      <div className={styles.status}>
        <p>{loadError ?? 'Importação não encontrada ou expirada.'}</p>
        <Button variant="ghost" icon="arrow_back" onClick={() => navigate('/')}>
          Voltar para a biblioteca
        </Button>
      </div>
    )
  }

  return (
    <form className={styles.screen} onSubmit={handleConfirm}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          Revisão da importação · {preview.channels.length}{' '}
          {preview.channels.length === 1 ? 'canal' : 'canais'}
        </span>
        <h1 className={styles.title}>Confira antes de salvar</h1>
        <p className={styles.subtitle}>
          Ajuste os nomes e, se quiser, preencha o BPM e a tonalidade. Nada é salvo até você
          confirmar.
        </p>
      </header>

      <Card className={styles.card}>
        <TextField
          label="Nome da track"
          value={trackName}
          onChange={(event) => setTrackName(event.target.value)}
          required
        />

        <div className={styles.metaRow}>
          <NumberField
            label="BPM"
            value={bpm}
            onValueChange={setBpm}
            min={1}
            max={400}
            placeholder="opcional"
          />
          <NoteField label="Tonalidade" value={tonality} onValueChange={setTonality} />
        </div>
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.channelsTitle}>Canais</h2>
        <div className={styles.channelsList}>
          {preview.channels.map((channel) => (
            <div key={channel.tempChannelId} className={styles.channelRow}>
              <TextField
                label={`Canal (${channel.suggestedName})`}
                value={channelNames[channel.tempChannelId] ?? ''}
                onChange={(event) =>
                  setChannelNames((current) => ({
                    ...current,
                    [channel.tempChannelId]: event.target.value,
                  }))
                }
                required
              />
              <label className={styles.pitchEditableLabel}>
                <input
                  type="checkbox"
                  checked={pitchEditableByChannel[channel.tempChannelId] ?? true}
                  onChange={(event) =>
                    setPitchEditableByChannel((current) => ({
                      ...current,
                      [channel.tempChannelId]: event.target.checked,
                    }))
                  }
                />
                Pitch editável
              </label>
            </div>
          ))}
        </div>
      </Card>

      {submitError ? <p className={styles.submitError}>{submitError}</p> : null}

      <div className={styles.actions}>
        <Button type="submit" icon="check" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Confirmar e salvar'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          icon="close"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
