import type { MusicalNote } from '../types'

export interface ApiTrackSummary {
  id: string
  name: string
  importedAt: string
  channelCount: number
  durationSeconds: number
  bpm: number | null
  tonality: MusicalNote | null
}

export interface ApiTrackChannel {
  id: string
  name: string
  order: number
  durationSeconds: number
  pitchEditable: boolean
}

export interface ApiTrackDetail extends ApiTrackSummary {
  channels: ApiTrackChannel[]
}

export interface ApiImportPreviewChannel {
  tempChannelId: string
  suggestedName: string
  durationSeconds: number
}

export interface ApiImportPreview {
  importId: string
  suggestedName: string
  channels: ApiImportPreviewChannel[]
}

export interface ConfirmImportChannelInput {
  tempChannelId: string
  name: string
  pitchEditable?: boolean
}

export interface ConfirmImportInput {
  name: string
  bpm?: number
  tonality?: MusicalNote
  channels: ConfirmImportChannelInput[]
}

const API_BASE = '/api'

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ApiErrorBody {
  error?: { message?: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao backend local. Verifique se ele está rodando (yarn dev).',
    )
  }

  if (!response.ok) {
    const body: ApiErrorBody | null = await response.json().catch(() => null)
    const message = body?.error?.message ?? `Erro ${response.status} ao comunicar com o backend.`
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export function listTracks(): Promise<ApiTrackSummary[]> {
  return request('/tracks')
}

export function getTrack(trackId: string): Promise<ApiTrackDetail> {
  return request(`/tracks/${trackId}`)
}

export function deleteTrack(trackId: string): Promise<void> {
  return request(`/tracks/${trackId}`, { method: 'DELETE' })
}

export function updateTrackTonality(
  trackId: string,
  tonality: MusicalNote,
): Promise<ApiTrackDetail> {
  return request(`/tracks/${trackId}/tonality`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tonality }),
  })
}

export function getImportPreview(importId: string): Promise<ApiImportPreview> {
  return request(`/tracks/import/${importId}`)
}

export function startImport(file: File): Promise<ApiImportPreview> {
  const formData = new FormData()
  formData.append('file', file)
  return request('/tracks/import', { method: 'POST', body: formData })
}

export function confirmImport(
  importId: string,
  input: ConfirmImportInput,
): Promise<ApiTrackDetail> {
  return request(`/tracks/import/${importId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function cancelImport(importId: string): Promise<void> {
  return request(`/tracks/import/${importId}/cancel`, { method: 'POST' })
}

export function getChannelAudioUrl(trackId: string, channelId: string): string {
  return `${API_BASE}/tracks/${trackId}/channels/${channelId}/audio`
}
