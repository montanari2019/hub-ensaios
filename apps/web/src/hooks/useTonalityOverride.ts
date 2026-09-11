import { useEffect, useState } from 'react'
import type { MusicalNote, OctaveShift } from '../types'

export interface TonalityOverride {
  note: MusicalNote
  octave: OctaveShift
}

const STORAGE_PREFIX = 'tracks-gambira:tonality-override:'

function readOverride(trackId: string): TonalityOverride | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + trackId)
    if (!raw) return null
    return JSON.parse(raw) as TonalityOverride
  } catch {
    return null
  }
}

export interface UseTonalityOverrideResult {
  override: TonalityOverride | null
  setOverride: (next: TonalityOverride) => void
  clearOverride: () => void
}

/**
 * Edição de tonalidade ao vivo, local ao navegador — nunca enviada ao
 * backend sozinha. Quem quiser tornar a edição o novo original de todos
 * precisa acionar o sync (ver PATCH /tracks/:id/tonality em api.ts).
 */
export function useTonalityOverride(trackId: string | undefined): UseTonalityOverrideResult {
  const [override, setOverrideState] = useState<TonalityOverride | null>(null)

  useEffect(() => {
    setOverrideState(trackId ? readOverride(trackId) : null)
  }, [trackId])

  function setOverride(next: TonalityOverride) {
    if (!trackId) return
    window.localStorage.setItem(STORAGE_PREFIX + trackId, JSON.stringify(next))
    setOverrideState(next)
  }

  function clearOverride() {
    if (!trackId) return
    window.localStorage.removeItem(STORAGE_PREFIX + trackId)
    setOverrideState(null)
  }

  return { override, setOverride, clearOverride }
}
