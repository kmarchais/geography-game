import type { Country } from './geography'

export type Outcome = 'correct' | 'missed' | 'skipped'
export interface Answer { id: string; name: string; outcome: Outcome }
export interface Session {
  deck: Country[]
  answers: Answer[]
  phase: 'playing' | 'complete'
  lastCorrectMs: number
}
export interface RankedScore { id: string; name: string; correct: number; total: number; timeMs: number }
export function isGuestId(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) }
export function readPersonalScores(storage: Pick<Storage, 'getItem'>): RankedScore[] {
  try {
    const rows = JSON.parse(storage.getItem('atlas-runs') || '[]')
    if (!Array.isArray(rows)) {return []}
    return rows.filter(s => s && typeof s.name === 'string' && s.name.length <= 24 && s.total === 195 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= 195 && Number.isFinite(s.timeMs) && s.timeMs >= 0 && s.timeMs <= 86400000).map((s, i) => ({ ...s, id: typeof s.id === 'string' ? s.id : `local-${i}` })).sort(compareScores).slice(0, 20)
  } catch {return []}
}

export function createSession(countries: Country[], order?: string[], random = Math.random): Session {
  let deck = countries.filter(country => country.playable)
  if (!deck.length) {throw new Error('No countries available.')}
  if (order) {
    const byId = new Map(deck.map(country => [country.id, country]))
    if (order.length !== deck.length || new Set(order).size !== deck.length || order.some(id => !byId.has(id))) {throw new Error('Invalid country order.')}
    deck = order.map(id => byId.get(id)!)
  } else {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
    }
  }
  return { deck, answers: [], phase: 'playing', lastCorrectMs: 0 }
}

export function answerCountry(session: Session, country: Country | null | undefined, elapsedMs: number): Session {
  if (session.phase !== 'playing' || country === undefined) {return session}
  const target = session.deck[session.answers.length]!
  const outcome: Outcome = country === null ? 'skipped' : country.id === target.id ? 'correct' : 'missed'
  const answers = [...session.answers, { id: target.id, name: target.name, outcome }]
  return { ...session, answers, phase: answers.length === session.deck.length ? 'complete' : 'playing', lastCorrectMs: outcome === 'correct' ? Math.max(session.lastCorrectMs, elapsedMs) : session.lastCorrectMs }
}

export function correctCount(session: Session): number { return session.answers.filter(answer => answer.outcome === 'correct').length }
export function percentage(correct: number, total: number): number { return total ? Math.round(correct / total * 1000) / 10 : 0 }
export function compareScores(a: RankedScore, b: RankedScore): number { return b.correct / b.total - a.correct / a.total || a.timeMs - b.timeMs || a.id.localeCompare(b.id) }
export function formatTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100)
  return `${Math.floor(tenths / 600).toString().padStart(2, '0')}:${Math.floor(tenths / 10 % 60).toString().padStart(2, '0')}.${tenths % 10}`
}
