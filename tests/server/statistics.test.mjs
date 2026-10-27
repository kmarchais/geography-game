import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { createCountryStatistics } from '../../server/statistics.mjs'
test('reconstructs colour counters from retained three-attempt history exactly once', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE runs(player TEXT,state TEXT)')
  const state = { version: 3, deck: ['AAA', 'BBB', 'CCC', 'DDD'], answers: [
    { guess: 'AAA', guesses: [{}] }, { guess: 'BBB', guesses: [{}, {}] },
    { guess: 'CCC', guesses: [{}, {}, {}] }, { guess: null, guesses: [{}, {}] },
  ] }
  db.prepare('INSERT INTO runs VALUES(?,?)').run('google:owner', JSON.stringify(state))
  const transaction = action => {db.exec('BEGIN'); try {action(); db.exec('COMMIT')} catch (error) {db.exec('ROLLBACK'); throw error}}
  let stats = createCountryStatistics(db, transaction)
  const expected = stats.read('global', 4)
  assert.deepEqual(expected.map(row => [row.green, row.yellow, row.orange, row.red]), [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])
  assert.deepEqual(stats.read('google:owner', 4), expected)
  stats = createCountryStatistics(db, transaction)
  assert.deepEqual(stats.read('global', 4), expected)
  assert.deepEqual(stats.read('google:other', 4), [])
  db.close()
})
