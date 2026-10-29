import { expect, it } from 'vitest'
import { saveRecording, validAnswerRecording, validNetworkIssues, type AnswerRecording, type RunRecording } from './recording'

const answer: AnswerRecording = { coordinate: [-61.4, 15.3], input: 'touch', hit: 'marker', cameraDistance: 2.1, viewport: [412, 800], markers: true, borders: true, paintFound: true, priorResolved: 2 }
it('accepts bounded map selections, but rejects malformed coordinates, viewports, and unrelated data', () => {
  expect(validAnswerRecording(answer)).toBe(true)
  expect(validAnswerRecording({ ...answer, coordinate: null, hit: 'skip', input: 'keyboard' })).toBe(true)
  for (const invalid of [null, [], { ...answer, coordinate: [181, 0] }, { ...answer, coordinate: [0, -91] }, { ...answer, coordinate: [NaN, 0] }, { ...answer, coordinate: [0, 0, 0] }, { ...answer, viewport: [0, 800] }, { ...answer, cameraDistance: Infinity }, { ...answer, priorResolved: -1 }, { ...answer, input: 'gps' }, { ...answer, extra: 'data' }]) {expect(validAnswerRecording(invalid)).toBe(false)}
})
it('bounds network events and excludes arbitrary request data', () => {
  const issue = { kind: 'http', status: 503, attempt: 1, operation: 'answer', at: 100000 }
  expect(validNetworkIssues([issue, { ...issue, kind: 'timeout', status: 0 }])).toBe(true)
  for (const invalid of [Array(33).fill(issue), [{ ...issue, token: 'secret' }], [{ ...issue, attempt: 99 }], [{ ...issue, status: 200 }], [{ ...issue, kind: 'network' }]]) {expect(validNetworkIssues(invalid)).toBe(false)}
})
it('keeps only ten local run recordings, updates retries in place, and tolerates unavailable storage', () => {
  let stored = '[]'
  const storage = { getItem: () => stored, setItem: (_key: string, value: string) => {stored = value} }
  const run: RunRecording = { id: '0', mode: 'world-countries', rules: 4, dataset: 'unknown', orderPolicy: 'test', build: 'test', source: 'desktop-web', authAtStart: 'guest', startedAt: 100000, status: 'active', attempts: [], networkIssues: [] }
  for (let i = 0; i < 15; i++) {saveRecording(storage, { ...run, id: String(i) }, 'recordings')}
  expect(JSON.parse(stored).map((r: RunRecording) => r.id)).toEqual(['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'])
  saveRecording(storage, { ...run, id: '14', status: 'stopped' }, 'recordings')
  expect(JSON.parse(stored)).toHaveLength(10)
  expect(JSON.parse(stored).at(-1).status).toBe('stopped')
  expect(() => saveRecording({ getItem: () => {throw Error('Blocked')}, setItem: () => {} }, run, 'recordings')).not.toThrow()
})
