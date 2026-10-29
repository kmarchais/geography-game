import type { Coordinate } from './geography'

export interface AnswerRecording {
  coordinate: Coordinate | null
  input: 'mouse' | 'touch' | 'pen' | 'keyboard' | 'unknown'
  hit: 'land' | 'marker' | 'skip'
  cameraDistance: number
  viewport: [number, number]
  markers: boolean
  borders: boolean
  paintFound: boolean
  priorResolved: number | null
}
export interface RequestIssue { kind: 'network' | 'timeout' | 'http' | 'response'; status: number; attempt: number }
export interface NetworkIssue extends RequestIssue { operation: 'start' | 'answer' | 'save' | 'recording'; at: number }
export interface RecordedAttempt { target: string; index: number; attempt: number; guess: string | null; elapsedMs: number; responseMs: number; answeredAt: number; recording?: AnswerRecording }
export interface RunRecording {
  id: string; serverId?: string; mode: 'world-countries' | 'americas' | 'europe' | 'africa' | 'asia' | 'oceania'; rules: 4; dataset: string; orderPolicy: string
  build: string; source: string; authAtStart: 'google' | 'guest'; startedAt: number; finishedAt?: number
  status: 'active' | 'complete' | 'stopped' | 'inactive'; attempts: RecordedAttempt[]; networkIssues: NetworkIssue[]
}

export function validAnswerRecording(value: unknown): value is AnswerRecording {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {return false}
  const v = value as AnswerRecording
  return Object.keys(v).sort().join(',') === 'borders,cameraDistance,coordinate,hit,input,markers,paintFound,priorResolved,viewport'
    && (v.coordinate === null || (Array.isArray(v.coordinate) && v.coordinate.length === 2 && v.coordinate.every(Number.isFinite) && Math.abs(v.coordinate[0]) <= 180 && Math.abs(v.coordinate[1]) <= 90))
    && ['mouse', 'touch', 'pen', 'keyboard', 'unknown'].includes(v.input) && ['land', 'marker', 'skip'].includes(v.hit)
    && Number.isFinite(v.cameraDistance) && v.cameraDistance > 1 && v.cameraDistance <= 100
    && Array.isArray(v.viewport) && v.viewport.length === 2 && v.viewport.every(n => Number.isSafeInteger(n) && n > 0 && n <= 32768)
    && [v.markers, v.borders, v.paintFound].every(n => typeof n === 'boolean')
    && (v.priorResolved === null || (Number.isSafeInteger(v.priorResolved) && v.priorResolved >= 0 && v.priorResolved <= 1000000))
}
export function validNetworkIssues(value: unknown): value is NetworkIssue[] {
  return Array.isArray(value) && value.length <= 32 && value.every(v => v && typeof v === 'object'
    && Object.keys(v).sort().join(',') === 'at,attempt,kind,operation,status'
    && ['network', 'timeout', 'http', 'response'].includes(v.kind) && ['start', 'answer', 'save', 'recording'].includes(v.operation)
    && Number.isSafeInteger(v.status) && (v.kind === 'http' ? v.status >= 400 && v.status <= 599 : v.kind === 'response' ? v.status >= 200 && v.status < 400 : v.status === 0)
    && Number.isSafeInteger(v.attempt) && v.attempt >= 0 && v.attempt <= 3 && Number.isSafeInteger(v.at) && v.at > 0)
}
export function saveRecording(storage: Pick<Storage, 'getItem' | 'setItem'>, recording: RunRecording, key: string): void {
  try {
    const stored = JSON.parse(storage.getItem(key) || '[]')
    const previous = Array.isArray(stored) ? stored.filter(row => row && row.id !== recording.id).slice(-9) : []
    storage.setItem(key, JSON.stringify([...previous, recording]))
  } catch { /* Recording must never interrupt a game when storage is full or unavailable. */ }
}
