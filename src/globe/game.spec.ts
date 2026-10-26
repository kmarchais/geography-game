import { expect, it } from 'vitest'
import { answerCountry, compareScores, correctCount, createSession, formatTime, isGuestId, percentage, readPersonalScores, type RankedScore } from './game'
import type { Country } from './geography'

const country = (id: string, playable = true): Country => ({ id, name: id, playable, continent: 'Europe', center: [0, 0], small: false, polygons: [] })
const a = country('AAA'), b = country('BBB'), c = country('CCC')
const game = () => createSession([a, b, c, country('XXX', false)], ['AAA', 'BBB', 'CCC'])

it('always includes every quiz country once and excludes territories', () => {
  const input = Array.from({ length: 195 }, (_, i) => country(String(i)))
  const session = createSession([...input, country('territory', false)], undefined, () => .37)
  expect(session.deck).toHaveLength(195)
  expect(new Set(session.deck.map(c => c.id)).size).toBe(195)
  expect(session.deck).not.toEqual(input)
  expect(input[0]!.id).toBe('0')
  expect(() => createSession([])).toThrow()
  expect(() => createSession([a, b], ['AAA', 'AAA'])).toThrow()
})
it('advances immediately after one correct or wrong answer and after skipping', () => {
  let session = answerCountry(game(), a, 1200)
  expect(session.deck[session.answers.length]!.id).toBe('BBB')
  session = answerCountry(session, a, 2000)
  session = answerCountry(session, null, 6000)
  expect(session.phase).toBe('complete')
  expect(session.answers.map(a => a.outcome)).toEqual(['correct', 'missed', 'skipped'])
  expect(correctCount(session)).toBe(1)
  expect(session.lastCorrectMs).toBe(1200)
  expect(answerCountry(session, c, 9000)).toBe(session)
})
it('counts accuracy against the whole challenge and ignores ocean clicks', () => {
  const initial = game()
  expect(answerCountry(initial, undefined, 200)).toBe(initial)
  const session = answerCountry(initial, a, 500)
  expect(percentage(correctCount(session), session.deck.length)).toBe(33.3)
  expect(percentage(1, 195)).toBe(.5)
  expect(percentage(195, 195)).toBe(100)
})
it('ranks exact accuracy before time without rounding ties', () => {
  const score = (id: string, correct: number, timeMs: number): RankedScore => ({ id, correct, timeMs, total: 195, name: id })
  const scores = [score('slow', 150, 9000), score('fast', 150, 4000), score('better', 151, 20000)]
  expect(scores.sort(compareScores).map(s => s.id)).toEqual(['better', 'fast', 'slow'])
})
it('measures time to the last correct answer, including elapsed background time', () => {
  let session = answerCountry(game(), a, 100)
  session = answerCountry(session, b, 90100)
  session = answerCountry(session, null, 120000)
  expect(session.lastCorrectMs).toBe(90100)
  expect(formatTime(session.lastCorrectMs)).toBe('01:30.1')
  expect(formatTime(0)).toBe('00:00.0')
})

it('rejects malformed stored identities and reads a durable personal best', () => {
  expect(isGuestId('a'.repeat(36))).toBe(false)
  expect(isGuestId('11111111-1111-4111-8111-111111111111')).toBe(true)
  const rows = [
    { name: 'Player', correct: 120, total: 195, timeMs: 1000 },
    { name: 'Player', correct: 150, total: 195, timeMs: 9000 },
    { name: 'Bad', correct: 196, total: 195, timeMs: 0 },
  ]
  expect(readPersonalScores({ getItem: () => JSON.stringify(rows) })[0]?.correct).toBe(150)
  expect(readPersonalScores({ getItem: () => '{' })).toEqual([])
})
