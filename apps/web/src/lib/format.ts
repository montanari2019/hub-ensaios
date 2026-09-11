export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = Math.floor(safeSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatImportDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate))
}
