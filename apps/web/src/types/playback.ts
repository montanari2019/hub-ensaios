export interface ChannelPlaybackState {
  channelId: string
  volume: number
  muted: boolean
  soloed: boolean
  level: number
}

export interface TransportState {
  status: 'playing' | 'paused'
  currentTime: number
  duration: number
  masterVolume: number
}

export function isChannelAudible(
  channel: ChannelPlaybackState,
  anySoloed: boolean,
): boolean {
  if (channel.muted) return false
  if (anySoloed) return channel.soloed
  return true
}

export function effectiveGain(
  channel: ChannelPlaybackState,
  anySoloed: boolean,
): number {
  return isChannelAudible(channel, anySoloed) ? channel.volume : 0
}
