import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeVariant = 'default' | 'accent' | 'success' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  icon?: string
  className?: string
  children: ReactNode
}

export function Badge({ variant = 'default', icon, className, children }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(' ')}>
      {icon ? (
        <span className={`material-symbols-rounded ${styles.icon}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  )
}
