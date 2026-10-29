import type { Country } from './geography'

export type Outcome = 'correct' | 'missed' | 'skipped'
export const ORDER_POLICY = 'no-small-first-10-v1'
export function createDeck(countries: Country[], random = Math.random): Country[] {
  const deck = countries.filter(country => country.playable)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
  }
  const opening = deck.filter(country => !country.small).slice(0, 10)
  const selected = new Set(opening.map(country => country.id))
  return [...opening, ...deck.filter(country => !selected.has(country.id))]
}
export interface Answer { id: string; name: string; outcome: Outcome; attempt: number }
export interface Session {
  deck: Country[]
  answers: Answer[]
  phase: 'playing' | 'complete'
  lastCorrectMs: number
  attempts: number
}
export interface OutcomeCounts { green: number; yellow: number; orange: number; red: number }
export interface RankedScore { id: string; name: string; correct: number; total: number; timeMs: number; finishedAt?: number | null; skipped?: number | null; score?: number; green?: number; yellow?: number; orange?: number; red?: number }
export function answerGrade(answer: Pick<Answer, 'outcome' | 'attempt'>): keyof OutcomeCounts {return answer.outcome !== 'correct' ? 'red' : answer.attempt === 1 ? 'green' : answer.attempt === 2 ? 'yellow' : 'orange'}
export function outcomeCounts(answers: Answer[]): OutcomeCounts {
  const counts = { green: 0, yellow: 0, orange: 0, red: 0 }
  for (const answer of answers) {counts[answerGrade(answer)]++}
  return counts
}
export function weightedScore(counts: OutcomeCounts): number {return counts.green + counts.yellow / 2 + counts.orange / 4}
export function sessionScore(session: Session): number {return weightedScore(outcomeCounts(session.answers))}
export function validScoreOutcomes(value: RankedScore): boolean {
  if (value.skipped !== undefined && value.skipped !== null && (!Number.isSafeInteger(value.skipped) || value.skipped < 0 || value.skipped > (value.red ?? value.total - value.correct))) {return false}
  if (value.score === undefined && value.green === undefined && value.yellow === undefined && value.orange === undefined && value.red === undefined) {return true} // Explicit legacy score buckets.
  const { green, yellow, orange, red } = value
  return [green, yellow, orange, red].every(n => Number.isSafeInteger(n) && n! >= 0) && green! + yellow! + orange! + red! === value.total && green! + yellow! + orange! === value.correct && value.score === weightedScore({ green: green!, yellow: yellow!, orange: orange!, red: red! })
}
export function isGuestId(value: unknown): value is string { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) }
export function readPersonalScores(storage: Pick<Storage, 'getItem'>, key = 'atlas-runs-v4'): RankedScore[] {
  try {
    const rows = JSON.parse(storage.getItem(key) || '[]')
    if (!Array.isArray(rows)) {return []}
    return rows.filter(s => s && typeof s.name === 'string' && s.name.length <= 24 && s.total === 195 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= 195 && Number.isFinite(s.timeMs) && s.timeMs >= 0 && s.timeMs <= 86400000 && validScoreOutcomes(s) && (key.includes('v3') || s.score !== undefined)).map((s, i) => ({ ...s, id: typeof s.id === 'string' ? s.id : `local-${i}` })).sort(compareScores).slice(0, 20)
  } catch {return []}
}

export function createSession(countries: Country[], order?: string[], random = Math.random): Session {
  let deck = countries.filter(country => country.playable)
  if (!deck.length) {throw new Error('No countries available.')}
  if (order) {
    const byId = new Map(deck.map(country => [country.id, country]))
    if (order.length !== deck.length || new Set(order).size !== deck.length || order.some(id => !byId.has(id))) {throw new Error('Invalid country order.')}
    deck = order.map(id => byId.get(id)!)
  } else {deck = createDeck(countries, random)}
  return { deck, answers: [], phase: 'playing', lastCorrectMs: 0, attempts: 0 }
}

export function answerCountry(session: Session, country: Country | null | undefined, elapsedMs: number): Session {
  if (session.phase !== 'playing' || country === undefined) {return session}
  if (country && session.answers.some(answer => answer.id === country.id)) {return session}
  const target = session.deck[session.answers.length]!
  if (country !== null && country.id !== target.id && session.attempts < 2) {return { ...session, attempts: session.attempts + 1 }}
  const outcome: Outcome = country === null ? 'skipped' : country.id === target.id ? 'correct' : 'missed'
  const answers = [...session.answers, { id: target.id, name: target.name, outcome, attempt: session.attempts + 1 }]
  return { ...session, answers, attempts: 0, phase: answers.length === session.deck.length ? 'complete' : 'playing', lastCorrectMs: outcome === 'correct' ? Math.max(session.lastCorrectMs, elapsedMs) : session.lastCorrectMs }
}

export interface CountryStat extends OutcomeCounts { id: string; played: number; found: number; skipped: number }
export function validCountryStats(rows: unknown): CountryStat[] {
  if (!Array.isArray(rows) || rows.length > 195) {return []}
  return rows.filter((row): row is CountryStat => !!row && /^[A-Z]{3}$/.test(row.id) && [row.played, row.found, row.skipped, row.green, row.yellow, row.orange, row.red].every(n => Number.isSafeInteger(n) && n >= 0) && row.played > 0 && row.green + row.yellow + row.orange + row.red === row.played && row.found === row.green + row.yellow + row.orange && row.skipped <= row.red)
}
export function readCountryStats(storage: Pick<Storage, 'getItem'>): CountryStat[] {
  try {
    const rows: unknown = JSON.parse(storage.getItem('atlas-country-stats-v4') || '[]')
    return validCountryStats(rows)
  } catch {return []}
}
export function recordCountryStat(rows: CountryStat[], answer: Answer): CountryStat[] {
  const previous = rows.find(row => row.id === answer.id) || { id: answer.id, played: 0, found: 0, skipped: 0, green: 0, yellow: 0, orange: 0, red: 0 }
  return [...rows.filter(row => row.id !== answer.id), { ...previous, played: previous.played + 1, found: previous.found + Number(answer.outcome === 'correct'), skipped: previous.skipped + Number(answer.outcome === 'skipped'), [answerGrade(answer)]: previous[answerGrade(answer)] + 1 }]
}

export function correctCount(session: Session): number { return session.answers.filter(answer => answer.outcome === 'correct').length }
export function percentage(correct: number, total: number): number { return total ? Math.round(correct / total * 1000) / 10 : 0 }
export function compareScores(a: RankedScore, b: RankedScore): number { return (b.score ?? b.correct) / b.total - (a.score ?? a.correct) / a.total || a.timeMs - b.timeMs || a.id.localeCompare(b.id) }
export function formatTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100)
  return `${Math.floor(tenths / 600).toString().padStart(2, '0')}:${Math.floor(tenths / 10 % 60).toString().padStart(2, '0')}.${tenths % 10}`
}
