import type { ApiTrackChannel, ApiTrackSummary } from './api'
import { getChannelColor } from './channelColors'
import type { Track, Channel } from '../types'

export function toTrack(summary: ApiTrackSummary): Track {
  return {
    id: summary.id,
    name: summary.name,
    importedAt: summary.importedAt,
    channelCount: summary.channelCount,
    durationSeconds: summary.durationSeconds,
    bpm: summary.bpm,
    tonality: summary.tonality,
  }
}

export function toChannel(trackId: string, channel: ApiTrackChannel, index: number): Channel {
  return {
    id: channel.id,
    trackId,
    name: channel.name,
    color: getChannelColor(index),
    pitchEditable: channel.pitchEditable,
  }
}
