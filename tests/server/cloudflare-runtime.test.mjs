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
  const created = await post('/runs?rules=4', { source: 'mobile-web', build: 'worker-recording-test' })
  assert.equal(created.status, 201)
  const run = await created.json()
  assert.equal(run.deck.length, 195)
  assert.equal(run.orderPolicy, 'no-small-first-10-v1')
  const answer = { index: 0, attempt: 0, guess: run.deck[0], elapsedMs: 0, recording: { coordinate: [10, 20], input: 'touch', hit: 'land', cameraDistance: 2.1, viewport: [412, 800], markers: true, borders: true, paintFound: true, priorResolved: 0 } }
  const first = await post(`/runs/${run.id}/answers`, answer)
  assert.equal(first.status, 200)
  const firstValue = await first.json()
  assert.equal(firstValue.correct, 1); assert.equal(firstValue.score, 1); assert.equal(firstValue.green, 1)
  assert.equal((await post(`/runs/${run.id}/answers`, answer)).status, 200)
  assert.equal((await post(`/runs/${run.id}/answers`, { index: 2, attempt: 0, guess: null, elapsedMs: 0 })).status, 409)
  for (let index = 1; index < run.deck.length; index++) {
    if (index === 1 || index === 2) {
      for (let attempt = 0; attempt < index; attempt++) {assert.equal((await post(`/runs/${run.id}/answers`, { index, attempt, guess: run.deck[0], elapsedMs: 0 })).status, 200)}
    }
    const response = await post(`/runs/${run.id}/answers`, { index, attempt: index <= 2 ? index : 0, guess: index <= 2 ? run.deck[index] : null, elapsedMs: 0 })
    assert.equal(response.status, 200)
    const value = await response.json()
    assert.equal(value.complete, index === 194)
    assert.equal(value.correct, Math.min(3, index + 1))
    assert.equal(value.score, index === 1 ? 1.5 : 1.75)
  }
  const privateRanking = await (await fetch(`${base}/atlas-api/leaderboard?rules=4`)).json()
  assert.ok(!privateRanking.some(row => row.id === run.id))
  assert.equal((await post(`/runs/${run.id}/publish`, { claimToken: run.claimToken, playerId: randomUUID(), name: 'Worker test' })).status, 200)
  assert.equal((await post(`/runs/${run.id}/recording`, { claimToken: run.claimToken, status: 'complete', networkIssues: [{ operation: 'answer', kind: 'network', status: 0, attempt: 0, at: Date.now() }] })).status, 200)
  const ranking = await (await fetch(`${base}/atlas-api/leaderboard?rules=4`)).json()
  assert.ok(ranking.some(row => row.id === run.id && row.correct === 3 && row.total === 195 && row.score === 1.75 && row.green === 1 && row.yellow === 1 && row.orange === 1 && row.red === 192))
  assert.equal((await fetch(`${base}/atlas-api/auth/session`)).status, 200)
  const statistics = await (await fetch(`${base}/atlas-api/stats?rules=4`)).json()
  assert.equal(statistics.length, 195)
  assert.ok(statistics.every(row => row.green + row.yellow + row.orange + row.red === row.played))
  assert.deepEqual(statistics.reduce((a, row) => a.map((n, i) => n + row[['green','yellow','orange','red'][i]]), [0,0,0,0]), [1,1,1,192])
})


test('Cloudflare runtime keeps regional decks and published scores separate from World', { skip: !base }, async () => {
  assert.equal(new URL(base).hostname, '127.0.0.1', 'Never write synthetic runs to production')
  const post = (path, body) => fetch(`${base}/atlas-api${path}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
  const before = await (await fetch(`${base}/atlas-api/stats?rules=4`)).json()
  const created = await post('/runs?rules=4&mode=oceania', {ignoreAnswered: true})
  assert.equal(created.status, 201)
  const run = await created.json()
  assert.equal(run.deck.length, 29)
  assert.ok(run.deck.includes('USA-HI'))
  for (let index = 0; index < run.deck.length; index++) {
    const response = await post(`/runs/${run.id}/answers`, {index, attempt: 0, guess: run.deck[index], elapsedMs: 0})
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(result.total, 29)
    assert.equal(result.complete, index === 28)
  }
  assert.equal((await post(`/runs/${run.id}/publish`, {claimToken: run.claimToken, playerId: randomUUID(), name: 'Regional worker'})).status, 200)
  const regional = await (await fetch(`${base}/atlas-api/leaderboard?rules=4&mode=oceania`)).json()
  assert.ok(regional.some(row => row.id === run.id && row.score === 29 && row.total === 29))
  const world = await (await fetch(`${base}/atlas-api/leaderboard?rules=4`)).json()
  assert.ok(!world.some(row => row.id === run.id))
  assert.deepEqual(await (await fetch(`${base}/atlas-api/stats?rules=4`)).json(), before)
})
