import { useEffect, useRef } from 'react'
import { MUSICAL_NOTES, type MusicalNote, type OctaveShift } from '../../types'
import styles from './TonalitySelector.module.css'

interface TonalitySelectorProps {
  note: MusicalNote
  octave: OctaveShift
  onChange: (note: MusicalNote, octave: OctaveShift) => void
  onClose: () => void
}

const OCTAVE_OPTIONS: Array<{ value: OctaveShift; label: string }> = [
  { value: -1, label: '-1 oitava' },
  { value: 0, label: 'original' },
  { value: 1, label: '+1 oitava' },
]

export function TonalitySelector({ note, octave, onChange, onClose }: TonalitySelectorProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className={styles.panel} ref={panelRef} role="dialog" aria-label="Transpor tonalidade">
      <span className={styles.sectionLabel}>Nota</span>
      <div className={styles.noteGrid}>
        {MUSICAL_NOTES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={styles.noteButton}
            aria-pressed={candidate === note}
            onClick={() => onChange(candidate, octave)}
          >
            {candidate}
          </button>
        ))}
      </div>

      <span className={styles.sectionLabel}>Oitava</span>
      <div className={styles.octaveRow}>
        {OCTAVE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.octaveButton}
            aria-pressed={option.value === octave}
            onClick={() => onChange(note, option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
