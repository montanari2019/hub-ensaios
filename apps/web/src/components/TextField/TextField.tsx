import { useId, type InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function TextField({ label, id, className, ...rest }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const classes = [styles.input, className].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input id={inputId} className={classes} {...rest} />
    </div>
  )
}
