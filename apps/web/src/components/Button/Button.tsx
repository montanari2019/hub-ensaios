import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: string
  children: ReactNode
}

export function Button({
  variant = 'primary',
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const variantClass = variant === 'primary' ? styles.primary : styles.ghost
  const classes = [styles.button, variantClass, className].filter(Boolean).join(' ')

  return (
    <button type="button" className={classes} {...rest}>
      {icon ? (
        <span className={`material-symbols-rounded ${styles.icon}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  )
}
