import { useEffect, useRef, useState } from 'react'
import { getChannelAudioUrl, getTrack as fetchTrackDetail } from '../lib/api'
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

async function fetchChannelBlob(trackId: string, channelId: string, channelName: string): Promise<Blob> {
  const response = await fetch(getChannelAudioUrl(trackId, channelId))
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o áudio do canal "${channelName}".`)
  }
  return response.blob()
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
    setError(null)

    async function load(id: string) {
      try {
        const detail = await fetchTrackDetail(id)
        if (detail.channels.length === 0) {
          throw new Error('Track não encontrada.')
        }

        const channelBlobs = await Promise.all(
          detail.channels.map(async (channel) => ({
            id: channel.id,
            blob: await fetchChannelBlob(id, channel.id, channel.name),
            pitchEditable: channel.pitchEditable,
          })),
        )

        const engine = await PlayerEngine.create(channelBlobs)

        if (cancelled) {
          engine.destroy()
          return
        }

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
