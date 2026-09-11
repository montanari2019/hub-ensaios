import type { ReactNode } from 'react'
import styles from './AppShell.module.css'

interface AppShellProps {
  children: ReactNode
  navEnd?: ReactNode
}

export function AppShell({ children, navEnd }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.aura} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={`material-symbols-rounded ${styles.brandIcon}`} aria-hidden="true">
            graphic_eq
          </span>
          Hub de Ensaios
        </div>
        {navEnd ? <div className={styles.navEnd}>{navEnd}</div> : null}
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
