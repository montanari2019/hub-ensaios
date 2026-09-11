import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  children: ReactNode
}

export function Card({ interactive, className, children, ...rest }: CardProps) {
  const classes = [styles.card, interactive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
