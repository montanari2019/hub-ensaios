import type { CSSProperties } from 'react'

/**
 * Permite passar CSS custom properties (`--minha-var`) no atributo `style`
 * tipado, para o único caso aceito de estilo inline: valores calculados em
 * runtime consumidos por uma regra no `.module.css` do componente.
 */
export type CSSVarStyle = CSSProperties & Record<`--${string}`, string | number>
