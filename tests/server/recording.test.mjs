import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createHash, randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync, readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createRankingServer } from '../../server/ranking.mjs'
import { ORDER_POLICY } from '../../src/globe/game.ts'

const selection = { coordinate: [10, 20], input: 'touch', hit: 'land', cameraDistance: 2.1, viewport: [412, 800], markers: true, borders: true, paintFound: true, priorResolved: 2 }
async function setup(t, countries = ['AAA', 'BBB', 'CCC'].map(id => ({ id, playable: true }))) {
  const databasePath = join(tmpdir(), `atlas-recording-${randomUUID()}.sqlite`)
  const clock = { time: 100000 }
  const server = createRankingServer({ databasePath, countries, now: () => clock.time })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}`
  const db = new DatabaseSync(databasePath)
  t.after(async () => {
    db.close(); await new Promise(resolve => server.close(resolve))
    for (const suffix of ['', '-wal', '-shm']) {rmSync(databasePath + suffix, { force: true })}
  })
  const post = (path, body, cookie) => fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) })
  const state = id => JSON.parse(db.prepare('SELECT state FROM runs WHERE id=?').get(id).state)
  return { post, state, db, url, clock }
}

test('retains every wrong guess before a skip with map context and response timing, without duplicating retries', async t => {
  const { post, state, clock } = await setup(t)
  const run = await (await post('/runs?rules=4', { source: 'mobile-web', build: 'test-build', dataset: 'a'.repeat(64) })).json()
  assert.equal(state(run.id).mode, 'world-countries')
  assert.equal(state(run.id).authAtStart, 'guest')
  assert.equal(state(run.id).clientDataset, 'a'.repeat(64))
  assert.equal(state(run.id).build, 'test-build')
  assert.equal(state(run.id).dataset.length, 64)
  assert.equal(state(run.id).orderPolicy, ORDER_POLICY)
  const path = `/runs/${run.id}/answers`
  clock.time += 2000
  const first = { index: 0, attempt: 0, guess: run.deck[1], elapsedMs: 2000, recording: selection }
  assert.equal((await post(path, first)).status, 200)
  const original = state(run.id).attempts[0]
  clock.time += 5000
  assert.equal((await post(path, first)).status, 200)
  assert.deepEqual(state(run.id).attempts, [original])
  assert.equal((await post(path, { index: 0, attempt: 1, guess: run.deck[2], elapsedMs: 3000, recording: { ...selection, coordinate: [30, 40], hit: 'marker' } })).status, 200)
  assert.equal((await post(path, { index: 0, attempt: 2, guess: null, elapsedMs: 5000, recording: { ...selection, coordinate: null, hit: 'skip', input: 'keyboard' } })).status, 200)
  const guesses = state(run.id).answers[0].guesses
  assert.deepEqual(guesses.map(g => g.guess), [run.deck[1], run.deck[2], null])
  assert.deepEqual(guesses.map(g => g.responseMs), [2000, 1000, 2000])
  assert.deepEqual(guesses.map(g => g.recording.coordinate), [[10, 20], [30, 40], null])
  assert.equal(guesses[0].recording.priorResolvedScope, 'device')
  assert.equal(guesses[0].recording.priorResolved, 2)
  assert.equal(state(run.id).attempts.length, 0)
  assert.equal((await post(path, { index: 1, attempt: 0, guess: run.deck[1], elapsedMs: 6000, recording: { ...selection, coordinate: [0, 91] } })).status, 400)
  assert.equal((await post(path, { index: 1, attempt: 0, guess: null, elapsedMs: 6000, recording: selection })).status, 400)
  assert.equal((await post('/runs', { dataset: ['a'.repeat(64)] })).status, 400)
})

test('records authorized stops and network failures idempotently; retains expired answers without ranking partial runs', async t => {
  const { post, state, db, url, clock } = await setup(t)
  const run = await (await post('/runs?rules=4', {})).json()
  await post(`/runs/${run.id}/answers`, { index: 0, attempt: 0, guess: null, elapsedMs: 0 })
  const path = `/runs/${run.id}/recording`
  const issues = [{ kind: 'http', status: 503, attempt: 0, operation: 'answer', at: clock.time }]
  const stop = { claimToken: run.claimToken, status: 'stopped', networkIssues: issues }
  assert.equal((await post(path, { ...stop, claimToken: randomUUID() })).status, 403)
  assert.equal((await post(path, { ...stop, networkIssues: [{ ...issues[0], token: 'not-allowed' }] })).status, 400)
  assert.equal((await post(path, { ...stop, status: 'complete' })).status, 409)
  assert.equal((await post(path, stop)).status, 200)
  const stoppedAt = state(run.id).stoppedAt
  clock.time += 10000
  assert.equal((await post(path, stop)).status, 200)
  assert.equal(state(run.id).stoppedAt, stoppedAt)
  assert.deepEqual(state(run.id).networkIssues, issues)
  assert.equal((await post(`/runs/${run.id}/answers`, { index: 1, attempt: 0, guess: null, elapsedMs: 0 })).status, 409)
  const abandoned = await (await post('/runs?rules=4', {})).json()
  await post(`/runs/${abandoned.id}/answers`, { index: 0, attempt: 0, guess: abandoned.deck[1], elapsedMs: 0 })
  clock.time += 86400001
  await post('/runs?rules=4', {})
  assert.equal(state(run.id).status, 'stopped')
  assert.equal(state(abandoned.id).status, 'inactive')
  assert.equal(state(abandoned.id).attempts.length, 1)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM runs WHERE complete=1').get().n, 0)
  assert.deepEqual(await (await fetch(url + '/leaderboard?rules=4')).json(), [])
})

test('uses the Google session for account recordings and previous encounter counts', async t => {
  const { post, state, db, clock } = await setup(t)
  const token = Buffer.alloc(32, 7).toString('base64url')
  db.prepare('INSERT INTO atlas_users(id,google_sub,name) VALUES(?,?,?)').run('account-one', 'google-one', 'Kevin')
  db.prepare('INSERT INTO atlas_sessions(hash,user_id,expires) VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'), 'account-one', clock.time + 86400000)
  const cookie = `__Host-atlas-session=${token}`
  const run = await (await post('/runs?rules=4', {}, cookie)).json()
  assert.equal(state(run.id).authAtStart, 'google')
  db.prepare('INSERT INTO country_stats VALUES(?,?,?,?,?)').run('google:account-one', run.deck[0], 7, 3, 0)
  await post(`/runs/${run.id}/answers`, { index: 0, attempt: 0, guess: run.deck[1], elapsedMs: 0, recording: { ...selection, priorResolved: 999 } }, cookie)
  assert.equal(state(run.id).attempts[0].recording.priorResolved, 7)
  assert.equal(state(run.id).attempts[0].recording.priorResolvedScope, 'account')
  const stop = { claimToken: run.claimToken, status: 'stopped', networkIssues: [] }
  assert.equal((await post(`/runs/${run.id}/recording`, stop)).status, 403)
  assert.equal((await post(`/runs/${run.id}/recording`, stop, cookie)).status, 200)
})

test('the HTTP deck excludes small targets from the first ten and retains all 195 targets', async t => {
  const countries = JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8'))
  const { post } = await setup(t, countries)
  const run = await (await post('/runs?rules=4', {})).json()
  assert.equal(run.deck.length, 195)
  assert.equal(new Set(run.deck).size, 195)
  assert.ok(run.deck.slice(0, 10).every(id => !countries.find(c => c.id === id).small))
  assert.equal(run.orderPolicy, ORDER_POLICY)
})

test('opted-in runs ignore completed territories of every colour without recording or consuming an attempt', async t => {
  const { post, state } = await setup(t, ['AAA', 'BBB', 'CCC', 'DDD'].map(id => ({ id, playable: true })))
  for (const outcome of ['green', 'yellow', 'orange', 'missed', 'skipped']) {
    const run = await (await post('/runs?rules=4', { ignoreAnswered: true })).json()
    const path = `/runs/${run.id}/answers`
    const wrong = outcome === 'yellow' ? 1 : outcome === 'orange' ? 2 : outcome === 'missed' ? 3 : 0
    for (let attempt = 0; attempt < wrong; attempt++) {await post(path, { index: 0, attempt, guess: run.deck[1], elapsedMs: 0 })}
    if (outcome !== 'missed') {await post(path, { index: 0, attempt: wrong, guess: outcome === 'skipped' ? null : run.deck[0], elapsedMs: 0 })}
    assert.equal(state(run.id).answers.length, 1)
    const before = state(run.id)
    const ignored = await (await post(path, { index: 1, attempt: 0, guess: run.deck[0], elapsedMs: 0 })).json()
    assert.equal(ignored.ignored, true); assert.equal(ignored.attemptsLeft, 3)
    assert.deepEqual(state(run.id), before)
    await post(path, { index: 1, attempt: 0, guess: run.deck[2], elapsedMs: 0 })
    const pending = state(run.id)
    const again = await (await post(path, { index: 1, attempt: 1, guess: run.deck[0], elapsedMs: 0 })).json()
    assert.equal(again.ignored, true); assert.equal(again.attemptsLeft, 2)
    assert.deepEqual(state(run.id), pending)
    assert.equal((await post(path, { index: 1, attempt: 1, guess: run.deck[1], elapsedMs: 0 })).status, 200)
  }
  assert.equal((await post('/runs?rules=4', { ignoreAnswered: 'true' })).status, 400)
})
