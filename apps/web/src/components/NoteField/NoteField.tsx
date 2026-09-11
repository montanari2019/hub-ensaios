import { useId, type ChangeEvent } from 'react'
import { MUSICAL_NOTES, type MusicalNote } from '../../types'
import styles from './NoteField.module.css'

interface NoteFieldProps {
  label: string
  value: MusicalNote | undefined
  onValueChange: (value: MusicalNote | undefined) => void
}

export function NoteField({ label, value, onValueChange }: NoteFieldProps) {
  const id = useId()

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const raw = event.target.value
    onValueChange(raw === '' ? undefined : (raw as MusicalNote))
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} className={styles.select} value={value ?? ''} onChange={handleChange}>
        <option value="">opcional</option>
        {MUSICAL_NOTES.map((note) => (
          <option key={note} value={note}>
            {note}
          </option>
        ))}
      </select>
    </div>
  )
}
