import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRankingServer } from '../../server/ranking.mjs'
import { DatabaseSync } from 'node:sqlite'

const countries = ['AAA', 'BBB', 'CCC'].map(id => ({ id, playable: true }))
async function setup(t, options = {}) {
  const clock = { time: 100000 }
  const server = createRankingServer({ databasePath: ':memory:', countries, now: () => clock.time, origins: ['http://client.test'], ...options })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const url = `http://127.0.0.1:${server.address().port}`
  t.after(() => server.listening ? new Promise(resolve => server.close(resolve)) : undefined)
  const post = async (path, data) => fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const start = async (name, playerId = randomUUID()) => { const response = await post('/runs', { name, playerId }); assert.equal(response.status, 201); return response.json() }
  return { clock, server, url, post, start }
}

test('computes accuracy itself, rejects forged scores and out-of-order answers, and deduplicates retries', async t => {
  const { post, start, clock, url } = await setup(t)
  const run = await start('Atlas player')
  assert.equal(new Set(run.deck).size, 3)
  const path = `/runs/${run.id}/answers`
  assert.equal((await post(path, { index: 0, guess: run.deck[0], elapsedMs: 0, correct: 195 })).status, 400)
  assert.equal((await post(path, { index: 1, guess: run.deck[1], elapsedMs: 0 })).status, 409)
  clock.time += 1500
  let result = await (await post(path, { index: 0, guess: run.deck[0], elapsedMs: 1500 })).json()
  assert.equal(result.correct, 1)
  clock.time += 8000
  const duplicate = await (await post(path, { index: 0, guess: run.deck[0], elapsedMs: 1500 })).json()
  assert.deepEqual(duplicate, result)
  assert.equal((await post(path, { index: 1, guess: null, elapsedMs: 1499 })).status, 400)
  assert.equal((await post(path, { index: 1, guess: null, elapsedMs: 100000000 })).status, 400)
  await post(path, { index: 1, guess: run.deck[0], elapsedMs: 1800 })
  clock.time += 20000
  result = await (await post(path, { index: 2, guess: null, elapsedMs: 2000 })).json()
  assert.deepEqual(result, { complete: true, correct: 1, total: 3, timeMs: 1500 })
  const ranks = await (await fetch(url + '/leaderboard')).json()
  assert.equal(ranks[0].correct, 1)
  assert.equal(ranks[0].timeMs, 1500)
})

test('shares rankings across clients and ranks accuracy before time, keeping each guest best', async t => {
  const { start, post, clock, url } = await setup(t)
  async function play(name, correct, duration, playerId) {
    const run = await start(name, playerId)
    for (let i = 0; i < 3; i++) {
      clock.time += duration / 3
      await post(`/runs/${run.id}/answers`, { index: i, guess: i < correct ? run.deck[i] : null, elapsedMs: Math.round((i + 1) * duration / 3) })
    }
  }
  const guest = randomUUID()
  await play('Slow', 2, 12000)
  await play('Fast', 2, 3000, guest)
  await play('Fast', 1, 1000, guest)
  await play('Accurate', 3, 90000)
  const rows = await (await fetch(url + '/leaderboard')).json()
  assert.deepEqual(rows.map(row => row.name), ['Accurate', 'Fast', 'Slow'])
  assert.equal(rows.length, 3)
})

test('rejects invalid names, non-JSON, oversized bodies, unknown countries, and foreign origins', async t => {
  const { start, post, url } = await setup(t)
  assert.equal((await post('/runs', { playerId: randomUUID(), name: '<script>' })).status, 400)
  assert.equal((await post('/runs', { playerId: 'fake', name: 'Test' })).status, 400)
  assert.equal((await fetch(url + '/runs', { method: 'POST', body: '{}' })).status, 415)
  assert.equal((await post('/runs', { name: 'a'.repeat(5000), playerId: randomUUID() })).status, 413)
  assert.equal((await fetch(url + '/leaderboard', { headers: { Origin: 'https://untrusted.test' } })).status, 403)
  const allowed = await fetch(url + '/leaderboard', { headers: { Origin: 'http://client.test' } })
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://client.test')
  const run = await start('Test')
  assert.equal((await post(`/runs/${run.id}/answers`, { index: 0, guess: 'FAKE', elapsedMs: 0 })).status, 400)
})

test('upgrades the previous database schema and persists an active run across server restarts', async t => {
  const file = join(tmpdir(), `atlas-${randomUUID()}.sqlite`)
  let first, second
  t.after(async () => {
    for (const instance of [first, second]) {if (instance?.server.listening) await new Promise(resolve => instance.server.close(resolve))}
    for (const suffix of ['', '-wal', '-shm']) rmSync(file + suffix, { force: true })
  })
  const old = new DatabaseSync(file)
  old.exec('CREATE TABLE runs(id TEXT PRIMARY KEY, player TEXT NOT NULL, name TEXT NOT NULL, started INTEGER NOT NULL, state TEXT NOT NULL, complete INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0, time_ms INTEGER NOT NULL DEFAULT 0)')
  old.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), randomUUID(), 'Previous score', 100000, JSON.stringify({ version: 2 }), 1, 0, 0)
  old.close()
  first = await setup(t, { databasePath: file })
  const run = await first.start('Persistent')
  await first.post(`/runs/${run.id}/answers`, { index: 0, guess: run.deck[0], elapsedMs: 0 })
  await new Promise(resolve => first.server.close(resolve))
  second = await setup(t, { databasePath: file })
  await second.post(`/runs/${run.id}/answers`, { index: 1, guess: null, elapsedMs: 0 })
  const response = await second.post(`/runs/${run.id}/answers`, { index: 2, guess: null, elapsedMs: 0 })
  assert.equal((await response.json()).complete, true)
  const rows = await (await fetch(second.url + '/leaderboard')).json()
  assert.equal(rows[0].name, 'Persistent')
  assert.ok(rows.some(row => row.name === 'Previous score'))
})

test('Android builds reject a missing ranking endpoint before compiling', () => {
  const env = { ...process.env }
  delete env.VITE_ATLAS_API_URL
  const result = spawnSync(process.execPath, ['scripts/build-android.mjs'], { env, encoding: 'utf8' })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Set VITE_ATLAS_API_URL/)
})
