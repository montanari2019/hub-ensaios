const CHANNEL_COLORS = [
  '#ff6a5c',
  '#ffa84a',
  '#ff6ce6',
  '#cdf35a',
  '#f8dd5c',
  '#8ad9ff',
  '#bd9bff',
  '#7bea9f',
]

export function getChannelColor(index: number): string {
  return CHANNEL_COLORS[index % CHANNEL_COLORS.length]
}
