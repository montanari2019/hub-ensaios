import { upload } from '@vercel/blob/client'
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
  fileUrl: string
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

// A API roda com maxDuration de 60s (apps/api/vercel.json) — esse timeout
// cliente precisa ficar acima disso, senão desiste antes da própria função
// ter chance de terminar (ou de a plataforma matá-la e devolver erro).
const DEFAULT_TIMEOUT_MS = 20_000
const IMPORT_PROCESSING_TIMEOUT_MS = 70_000

export class ApiError extends Error {
  status?: number
  isTimeout: boolean

  constructor(message: string, status?: number, isTimeout = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.isTimeout = isTimeout
  }
}

interface ApiErrorBody {
  error?: { message?: string }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'O processamento demorou mais do que o esperado e foi interrompido. Tente novamente — se o arquivo for muito grande, considere dividir em partes menores.',
        undefined,
        true,
      )
    }
    throw new ApiError(
      'Não foi possível conectar ao backend. Verifique sua conexão e tente novamente.',
    )
  } finally {
    clearTimeout(timeoutId)
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

export async function startImport(
  file: File,
  onUploadProgress?: (percent: number) => void,
): Promise<ApiImportPreview> {
  // O .zip vai direto pro Blob a partir do browser (contorna o limite de
  // tamanho de body das funções serverless da Vercel) — o backend só recebe
  // a URL resultante em POST /tracks/import, nunca os bytes do arquivo.
  const blob = await upload(file.name, file, {
    access: 'private',
    handleUploadUrl: `${API_BASE}/tracks/import/authorize`,
    onUploadProgress: onUploadProgress
      ? (event) => onUploadProgress(event.percentage)
      : undefined,
  })

  return request(
    '/tracks/import',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blobUrl: blob.url, originalName: file.name }),
    },
    IMPORT_PROCESSING_TIMEOUT_MS,
  )
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
