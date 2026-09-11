import { MUSICAL_NOTES, type MusicalNote, type OctaveShift } from '../types'

/**
 * Intervalo em semitons entre duas notas, resolvido pela direção mais curta
 * (-6..+5), somado ao deslocamento de oitava (±12). Ver design.md da change
 * add-track-pitch-transpose para o raciocínio completo.
 */
export function semitoneOffset(
  originalNote: MusicalNote,
  targetNote: MusicalNote,
  octave: OctaveShift,
): number {
  const originalIndex = MUSICAL_NOTES.indexOf(originalNote)
  const targetIndex = MUSICAL_NOTES.indexOf(targetNote)
  const pitchClassDelta = ((((targetIndex - originalIndex + 6) % 12) + 12) % 12) - 6
  return pitchClassDelta + octave * 12
}
