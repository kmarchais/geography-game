import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

// Explicit opt-in: this creates a completed test run in an isolated local Worker.
const base = process.env.ATLAS_WORKER_TEST_URL
test('Cloudflare runtime persists ordered answers, retries, rankings and profile transactions', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, '127.0.0.1', 'Never write synthetic runs to production')
  const post = (path, body, origin) => fetch(`${base}/atlas-api${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body),
  })
  assert.equal((await fetch(`${base}/atlas-api/health`)).status, 200)
  assert.equal((await post('/runs', {}, 'https://untrusted.example')).status, 403)
  assert.equal((await post('/auth/profile', { name: 'Intruder', avatar: 'google' })).status, 401)
  const created = await post('/runs', {})
  assert.equal(created.status, 201)
  const run = await created.json()
  assert.equal(run.deck.length, 195)
  const answer = { index: 0, attempt: 0, guess: run.deck[0], elapsedMs: 0 }
  const first = await post(`/runs/${run.id}/answers`, answer)
  assert.equal(first.status, 200)
  assert.equal((await first.json()).correct, 1)
  assert.equal((await post(`/runs/${run.id}/answers`, answer)).status, 200)
  assert.equal((await post(`/runs/${run.id}/answers`, { index: 2, attempt: 0, guess: null, elapsedMs: 0 })).status, 409)
  for (let index = 1; index < run.deck.length; index++) {
    const response = await post(`/runs/${run.id}/answers`, { index, attempt: 0, guess: null, elapsedMs: 0 })
    assert.equal(response.status, 200)
    const value = await response.json()
    assert.equal(value.complete, index === 194)
    assert.equal(value.correct, 1)
  }
  const privateRanking = await (await fetch(`${base}/atlas-api/leaderboard`)).json()
  assert.ok(!privateRanking.some(row => row.id === run.id))
  assert.equal((await post(`/runs/${run.id}/publish`, { claimToken: run.claimToken, playerId: randomUUID(), name: 'Worker test' })).status, 200)
  const ranking = await (await fetch(`${base}/atlas-api/leaderboard`)).json()
  assert.ok(ranking.some(row => row.id === run.id && row.correct === 1 && row.total === 195))
  assert.equal((await fetch(`${base}/atlas-api/auth/session`)).status, 200)
  const statistics = await (await fetch(`${base}/atlas-api/stats`)).json()
  assert.equal(statistics.length, 195)
})
