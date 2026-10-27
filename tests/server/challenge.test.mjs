import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRankingServer } from '../../server/ranking.mjs'

async function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'atlas-challenge-')), databasePath = join(directory, 'game.sqlite')
  let time = 100000
  const server = createRankingServer({ databasePath, countries: ['AAA', 'BBB', 'CCC'].map(id => ({ id, playable: true })), now: () => time,
    googleClientId: 'mock.test', verifyGoogle: async token => JSON.parse(token), reportPublisher: async () => {throw Error('No live issue tests')} })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (path, body, cookie) => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  const db = new DatabaseSync(databasePath, { readOnly: true })
  t.after(async () => {db.close(); await new Promise(resolve => {server.close(resolve); server.closeAllConnections()}); rmSync(directory, { recursive: true, force: true })})
  const start = async cookie => {const result = await request('/runs', {}, cookie); assert.equal(result.status, 201); return result.json()}
  const answer = async (run, index, attempt, guess, cookie) => {time += 100; return request(`/runs/${run.id}/answers`, { index, attempt, guess, elapsedMs: time - 100000 }, cookie)}
  const login = async sub => {
    const challenge = await request('/auth/challenge')
    const cookie = challenge.headers.get('set-cookie').split(';')[0]
    const response = await request('/auth/google', { credential: JSON.stringify({ sub, name: 'Navigator', nonce: (await challenge.json()).nonce }) }, cookie)
    assert.equal(response.status, 200)
    return response.headers.get('set-cookie').split(';')[0]
  }
  return { request, start, answer, login, db, elapsed: () => time - 100000 }
}

test('starts without a name, keeps three ordered attempts, and aggregates each country exactly once', async t => {
  const { request, start, answer, db, elapsed } = await setup(t)
  const run = await start(), path = `/runs/${run.id}/answers`
  const stored = db.prepare('SELECT * FROM runs WHERE id=?').get(run.id)
  assert.equal(stored.name, '')
  assert.equal(stored.player, `anonymous:${run.id}`)
  assert.equal(stored.published, 0)
  assert.equal((await answer(run, 0, 1, run.deck[1])).status, 409)
  let first = await answer(run, 0, 0, run.deck[1])
  assert.equal((await first.json()).attemptsLeft, 2)
  assert.deepEqual(await (await request('/stats')).json(), [])
  const retry = await request(path, { index: 0, attempt: 0, guess: run.deck[1], elapsedMs: elapsed() })
  assert.equal(retry.status, 200)
  await answer(run, 0, 1, run.deck[1])
  const solved = await (await answer(run, 0, 2, run.deck[0])).json()
  assert.equal(solved.correct, 1); assert.equal(solved.resolved, true)
  assert.deepEqual(await (await request('/stats')).json(), [{ id: run.deck[0], played: 1, found: 1, skipped: 0 }])
  assert.equal((await request(path, { index: 0, attempt: 2, guess: run.deck[0], elapsedMs: elapsed() })).status, 200)
  assert.equal((await (await request('/stats')).json())[0].played, 1)
  for (let attempt = 0; attempt < 3; attempt++) {await answer(run, 1, attempt, run.deck[0])}
  await answer(run, 2, 0, null)
  const all = await (await request('/stats')).json()
  assert.equal(all.reduce((n, row) => n + row.played, 0), 3)
  assert.equal(all.reduce((n, row) => n + row.skipped, 0), 1)
  assert.equal(db.prepare('SELECT complete FROM runs WHERE id=?').get(run.id).complete, 1)
  assert.deepEqual(await (await request('/leaderboard')).json(), [])
})

test('publishes only a completed run with its private token and an explicit nickname', async t => {
  const { request, start, answer } = await setup(t)
  const run = await start(), playerId = randomUUID(), body = { claimToken: run.claimToken, playerId, name: 'Captain' }
  const publish = `/runs/${run.id}/publish`
  assert.equal((await request(publish, body)).status, 409)
  for (let index = 0; index < 3; index++) {await answer(run, index, 0, index ? null : run.deck[index])}
  assert.equal((await request(publish, { ...body, claimToken: randomUUID() })).status, 403)
  assert.equal((await request(publish, { ...body, name: '<script>' })).status, 400)
  assert.equal((await request(publish, body)).status, 200)
  assert.equal((await request(publish, body)).status, 200)
  assert.equal((await request(publish, { ...body, playerId: randomUUID() })).status, 409)
  const rows = await (await request('/leaderboard')).json()
  assert.equal(rows.length, 1); assert.equal(rows[0].name, 'Captain'); assert.equal(rows[0].correct, 1)
  assert.equal((await request('/stats/me')).status, 401)
})

test('Google claims private guest statistics once and isolates another account', async t => {
  const { request, start, answer, login } = await setup(t)
  const run = await start()
  for (let index = 0; index < 3; index++) {await answer(run, index, 0, run.deck[index])}
  const cookie = await login('google-one')
  assert.deepEqual(await (await request('/stats/me', undefined, cookie)).json(), [])
  const claim = `/runs/${run.id}/claim`, body = { claimToken: run.claimToken }
  assert.equal((await request(claim, body, cookie)).status, 200)
  assert.equal((await request(claim, body, cookie)).status, 200)
  const rows = await (await request('/stats/me', undefined, cookie)).json()
  assert.equal(rows.length, 3); assert.ok(rows.every(row => row.played === 1 && row.found === 1))
  const other = await login('google-other')
  assert.equal((await request(claim, body, other)).status, 409)
  assert.deepEqual(await (await request('/stats/me', undefined, other)).json(), [])
  assert.ok((await (await request('/stats')).json()).every(row => row.played === 1))
})

test('signed-in country statistics stay private until publishing and old rules keep a separate ranking', async t => {
  const { request, start, answer, login } = await setup(t)
  const cookie = await login('google-one'), run = await start(cookie)
  for (let index = 0; index < 3; index++) {await answer(run, index, 0, run.deck[index], cookie)}
  assert.deepEqual(await (await request('/leaderboard')).json(), [])
  assert.equal((await (await request('/auth/session', undefined, cookie)).json()).best.correct, 3)
  assert.equal((await (await request('/stats/me', undefined, cookie)).json()).length, 3)
  assert.equal((await request(`/runs/${run.id}/claim`, { claimToken: run.claimToken }, cookie)).status, 200)
  assert.ok((await (await request('/stats/me', undefined, cookie)).json()).every(row => row.played === 1))
  const legacy = await (await request('/runs', { playerId: randomUUID(), name: 'Legacy' })).json()
  for (let index = 0; index < 3; index++) {await request(`/runs/${legacy.id}/answers`, { index, guess: null, elapsedMs: 0 })}
  assert.equal((await (await request('/leaderboard')).json()).length, 1)
  assert.equal((await (await request('/leaderboard?rules=2')).json())[0].name, 'Legacy')
})

test('personal scores include private completed runs only for the authenticated account', async t => {
  const { request, start, answer, login } = await setup(t)
  const first = await login('score-owner'), run = await start(first)
  assert.equal((await request('/scores/me')).status, 401)
  assert.deepEqual(await (await request('/scores/me', undefined, first)).json(), [])
  for (let i = 0; i < 3; i++) {await answer(run, i, 0, run.deck[i], first)}
  const rows = await (await request('/scores/me', undefined, first)).json()
  assert.equal(rows.length, 1); assert.equal(rows[0].id, run.id); assert.equal(rows[0].correct, 3)
  assert.deepEqual(await (await request('/leaderboard')).json(), [])
  const other = await login('other-score-owner')
  assert.deepEqual(await (await request('/scores/me', undefined, other)).json(), [])
})
