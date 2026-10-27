import { validScoreOutcomes, type RankedScore } from './game'

const endpoint = (import.meta.env.VITE_ATLAS_API_URL || '/atlas-api').replace(/\/$/, '')
export async function rankingRequest<T>(path: string, body?: unknown, retries = 0): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let retryable = true
    try {
      const response = await fetch(`${endpoint}${path}`, { credentials: 'include', method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(6000) })
      retryable = response.status >= 500 || response.status === 429
      if (!response.ok) {throw new Error('Shared ranking unavailable.')}
      return await response.json() as T
    } catch (error) {
      if (!retryable || attempt >= retries) {throw error}
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt))
    }
  }
}
export function validRanking(value: unknown): RankedScore[] {
  if (!Array.isArray(value) || value.length > 20) {throw new Error('Invalid ranking.')}
  return value.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string' && s.name.length <= 24 && s.total === 195 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= 195 && Number.isFinite(s.timeMs) && s.timeMs >= 0 && validScoreOutcomes(s))
}
