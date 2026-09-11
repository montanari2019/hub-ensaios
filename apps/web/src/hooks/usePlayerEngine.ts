import { useEffect, useRef, useState } from 'react'
import { getTrack as fetchTrackDetail } from '../lib/api'
import { cacheChannelAudio, getCachedChannelAudio } from '../lib/audioCache'
import { PlayerEngine } from '../lib/playerEngine'
import { toChannel, toTrack } from '../lib/trackMappers'
import { effectiveGain, isChannelAudible } from '../types'
import type { Channel, ChannelPlaybackState, MusicalNote, Track, TransportState } from '../types'

export const DEFAULT_VOLUME = 0.8

export interface UsePlayerEngineResult {
  track: Track | null
  channels: Channel[]
  channelStates: Record<string, ChannelPlaybackState>
  transport: TransportState
  loading: boolean
  /** 0-100, agregando o download de todos os canais (cache conta como 100% na hora). */
  loadingProgress: number
  error: string | null
  togglePlay: () => void
  seek: (time: number) => void
  setMasterVolume: (volume: number) => void
  setChannelVolume: (channelId: string, volume: number) => void
  toggleMute: (channelId: string) => void
  toggleSolo: (channelId: string) => void
  setTranspose: (semitones: number) => void
  applySyncedTonality: (tonality: MusicalNote) => void
}

function buildInitialChannelStates(channels: Channel[]): Record<string, ChannelPlaybackState> {
  return Object.fromEntries(
    channels.map((channel) => [
      channel.id,
      { channelId: channel.id, volume: DEFAULT_VOLUME, muted: false, soloed: false, level: 0 },
    ]),
  )
}

// Generoso mas finito: sem isso, um fetch que trava (rede instável,
// extensão do navegador bloqueando a requisição, hiccup do CDN) nunca
// resolve nem rejeita — o Promise.all em load() fica esperando pra sempre
// e a porcentagem agregada congela no valor que os outros canais já
// tinham alcançado, sem erro nenhum aparecer. Já aconteceu em produção.
const CHANNEL_FETCH_TIMEOUT_MS = 60_000

/** Cache-first: um hit não bate na rede e já reporta 100% pra esse canal. */
async function fetchChannelBlob(
  channelId: string,
  fileUrl: string,
  channelName: string,
  onProgress: (loadedBytes: number, totalBytes: number) => void,
): Promise<Blob> {
  const cached = await getCachedChannelAudio(channelId)
  if (cached) {
    onProgress(cached.size, cached.size)
    return cached
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHANNEL_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(fileUrl, { signal: controller.signal })
    if (!response.ok || !response.body) {
      throw new Error(`Não foi possível carregar o áudio do canal "${channelName}".`)
    }

    // `fetch` não tem progresso de download nativo — lê a resposta em chunks
    // pra poder reportar bytes acumulados contra o Content-Length. O mesmo
    // `signal` cobre essa leitura também, não só a conexão inicial.
    const total = Number(response.headers.get('content-length') ?? 0)
    const reader = response.body.getReader()
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let loaded = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      // `value` vem tipado como Uint8Array<ArrayBufferLike> (pode ser
      // SharedArrayBuffer) sob strict mode — o construtor de Blob só aceita
      // ArrayBufferView<ArrayBuffer>, daí a cópia explícita.
      chunks.push(new Uint8Array(value))
      loaded += value.byteLength
      onProgress(loaded, total || loaded)
    }

    const blob = new Blob(chunks, { type: response.headers.get('content-type') ?? undefined })
    await cacheChannelAudio(channelId, blob)
    return blob
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        `O download do áudio do canal "${channelName}" demorou demais e foi interrompido. Tente novamente.`,
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export function usePlayerEngine(trackId: string | undefined): UsePlayerEngineResult {
  const engineRef = useRef<PlayerEngine | null>(null)
  const rafRef = useRef<number | null>(null)

  const [track, setTrack] = useState<Track | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelStates, setChannelStates] = useState<Record<string, ChannelPlaybackState>>({})
  const [transport, setTransport] = useState<TransportState>({
    status: 'paused',
    currentTime: 0,
    duration: 0,
    masterVolume: 1,
  })
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  function resetChannelLevels() {
    setChannelStates((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, state]) => [id, { ...state, level: 0 }]),
      ),
    )
  }

  useEffect(() => {
    if (!trackId) {
      setLoading(false)
      setError('Track não encontrada.')
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadingProgress(0)
    setError(null)

    async function load(id: string) {
      try {
        const detail = await fetchTrackDetail(id)
        if (detail.channels.length === 0) {
          throw new Error('Track não encontrada.')
        }

        // Soma bytes carregados/totais entre todos os canais pra uma única
        // porcentagem agregada — cada canal reporta pro seu próprio slot.
        const progressByChannel = new Map(
          detail.channels.map((channel) => [channel.id, { loaded: 0, total: 0 }]),
        )
        function reportAggregateProgress() {
          let loaded = 0
          let total = 0
          for (const entry of progressByChannel.values()) {
            loaded += entry.loaded
            total += entry.total
          }
          if (!cancelled) {
            setLoadingProgress(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0)
          }
        }

        const channelBlobs = await Promise.all(
          detail.channels.map(async (channel) => ({
            id: channel.id,
            blob: await fetchChannelBlob(channel.id, channel.fileUrl, channel.name, (loadedBytes, totalBytes) => {
              progressByChannel.set(channel.id, { loaded: loadedBytes, total: totalBytes })
              reportAggregateProgress()
            }),
            pitchEditable: channel.pitchEditable,
          })),
        )

        const engine = await PlayerEngine.create(channelBlobs)

        if (cancelled) {
          engine.destroy()
          return
        }

        // Garante 100 exato ao final — arredondamento por canal pode deixar
        // a soma agregada em 99 mesmo com todo mundo já carregado.
        setLoadingProgress(100)

        const uiChannels = detail.channels.map((channel, index) => toChannel(id, channel, index))
        for (const channel of uiChannels) {
          engine.setChannelGain(channel.id, DEFAULT_VOLUME)
        }
        engine.onEnded(() => {
          setTransport((current) => ({
            ...current,
            status: 'paused',
            currentTime: 0,
          }))
          resetChannelLevels()
        })

        engineRef.current = engine
        setTrack(toTrack(detail))
        setChannels(uiChannels)
        setChannelStates(buildInitialChannelStates(uiChannels))
        setTransport({
          status: 'paused',
          currentTime: 0,
          duration: engine.getDuration(),
          masterVolume: 1,
        })
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar a track.')
          setLoading(false)
        }
      }
    }

    load(trackId)

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      engineRef.current?.destroy()
      engineRef.current = null
    }
  }, [trackId])

  useEffect(() => {
    function tick() {
      const engine = engineRef.current
      if (!engine) return

      setTransport((current) => ({ ...current, currentTime: engine.getCurrentTime() }))
      setChannelStates((current) => {
        const anySoloed = Object.values(current).some((state) => state.soloed)
        const next: Record<string, ChannelPlaybackState> = {}
        for (const [id, state] of Object.entries(current)) {
          const audible = isChannelAudible(state, anySoloed)
          next[id] = { ...state, level: audible ? engine.getChannelLevel(id) : 0 }
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    if (transport.status === 'playing') {
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [transport.status])

  function togglePlay() {
    const engine = engineRef.current
    if (!engine) return
    if (transport.status === 'playing') {
      engine.pause()
      setTransport((current) => ({
        ...current,
        status: 'paused',
        currentTime: engine.getCurrentTime(),
      }))
      resetChannelLevels()
    } else {
      engine.play()
      setTransport((current) => ({ ...current, status: 'playing' }))
    }
  }

  function seek(time: number) {
    const engine = engineRef.current
    if (!engine) return
    engine.seek(time)
    setTransport((current) => ({ ...current, currentTime: engine.getCurrentTime() }))
  }

  function setMasterVolume(volume: number) {
    engineRef.current?.setMasterVolume(volume)
    setTransport((current) => ({ ...current, masterVolume: volume }))
  }

  function setChannelVolume(channelId: string, volume: number) {
    setChannelStates((current) => {
      const next = { ...current, [channelId]: { ...current[channelId], volume } }
      const anySoloed = Object.values(next).some((state) => state.soloed)
      engineRef.current?.setChannelGain(channelId, effectiveGain(next[channelId], anySoloed))
      return next
    })
  }

  function toggleMute(channelId: string) {
    setChannelStates((current) => {
      const target = current[channelId]
      const next = { ...current, [channelId]: { ...target, muted: !target.muted } }
      const anySoloed = Object.values(next).some((state) => state.soloed)
      engineRef.current?.setChannelGain(channelId, effectiveGain(next[channelId], anySoloed))
      return next
    })
  }

  function toggleSolo(channelId: string) {
    setChannelStates((current) => {
      const target = current[channelId]
      const next = { ...current, [channelId]: { ...target, soloed: !target.soloed } }
      // soloar/dessolar recalcula o ganho efetivo de TODOS os canais, não só deste
      const anySoloed = Object.values(next).some((state) => state.soloed)
      for (const [id, state] of Object.entries(next)) {
        engineRef.current?.setChannelGain(id, effectiveGain(state, anySoloed))
      }
      return next
    })
  }

  function setTranspose(semitones: number) {
    const engine = engineRef.current
    if (!engine) return
    for (const channel of channels) {
      if (!channel.pitchEditable) continue
      engine.setChannelPitch(channel.id, semitones)
    }
  }

  function applySyncedTonality(tonality: MusicalNote) {
    setTrack((current) => (current ? { ...current, tonality } : current))
  }

  return {
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
  }
}
