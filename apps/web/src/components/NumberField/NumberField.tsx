import { useId, type ChangeEvent } from 'react'
import styles from './NumberField.module.css'

interface NumberFieldProps {
  label: string
  value: number | undefined
  onValueChange: (value: number | undefined) => void
  min?: number
  max?: number
  placeholder?: string
}

export function NumberField({ label, value, onValueChange, min, max, placeholder }: NumberFieldProps) {
  const id = useId()

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    onValueChange(raw === '' ? undefined : Number(raw))
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className={styles.input}
        value={value ?? ''}
        onChange={handleChange}
        min={min}
        max={max}
        placeholder={placeholder}
      />
    </div>
  )
}
