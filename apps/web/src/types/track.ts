export const MUSICAL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export type MusicalNote = (typeof MUSICAL_NOTES)[number]

/** Deslocamento de oitava do transpose ao vivo — no máximo 1 oitava pra cada lado. */
export type OctaveShift = -1 | 0 | 1

export interface Track {
  id: string
  name: string
  importedAt: string
  channelCount: number
  durationSeconds: number
  bpm: number | null
  tonality: MusicalNote | null
}

export interface Channel {
  id: string
  trackId: string
  name: string
  color: string
  pitchEditable: boolean
}
