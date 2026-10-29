import { validScoreOutcomes, type RankedScore } from './game'
import type { RequestIssue } from './recording'

const endpoint = (import.meta.env.VITE_ATLAS_API_URL || '/atlas-api').replace(/\/$/, '')
export function runSource(native = import.meta.env.VITE_NATIVE === 'true', device = navigator): 'native-app' | 'mobile-web' | 'desktop-web' {
  if (native) {return 'native-app'}
  return /Android|iPhone|iPad|iPod/i.test(device.userAgent) || (/Macintosh/i.test(device.userAgent) && device.maxTouchPoints > 1) ? 'mobile-web' : 'desktop-web'
}
export async function rankingRequest<T>(path: string, body?: unknown, retries = 0, onIssue?: (issue: RequestIssue) => void): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let retryable = true
    let status = 0
    try {
      const response = await fetch(`${endpoint}${path}`, { credentials: 'include', method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(6000) })
      status = response.status
      retryable = response.status >= 500 || response.status === 429
      if (!response.ok) {throw new Error('Shared ranking unavailable.')}
      return await response.json() as T
    } catch (error) {
      onIssue?.({ kind: status >= 400 ? 'http' : status > 0 ? 'response' : error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network', status, attempt })
      if (!retryable || attempt >= retries) {throw error}
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt))
    }
  }
}
export function validRanking(value: unknown, total = 195): RankedScore[] {
  if (!Array.isArray(value) || value.length > 20) {throw new Error('Invalid ranking.')}
  return value.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string' && s.name.length <= 24 && s.total === total && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= total && Number.isFinite(s.timeMs) && s.timeMs >= 0 && validScoreOutcomes(s))
}
