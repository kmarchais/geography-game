import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createBugReports, publishGithubReport } from '../../server/reports.mjs'
import { createRankingServer } from '../../server/ranking.mjs'

const context = { platform: 'Web', version: '1.1.0 (test)', width: 1440, height: 1000, country: 'AND' }
const payload = (playerId = randomUUID()) => ({ id: randomUUID(), playerId, title: 'Could not select Andorra', description: 'I zoomed in, clicked the territory, and expected the next country.', context })

test('stores reports before publication, retries after an outage, and deduplicates client retries', async () => {
  const db = new DatabaseSync(':memory:')
  let time = Date.now(), calls = 0
  const data = payload()
  const reports = createBugReports(db, { now: () => time, publish: async () => {if (++calls === 1) {throw new Error('Offline')} return 'https://github.com/kmarchais/geography-game/issues/123'} })
  try {
    assert.equal(reports.submit(data).status, 202)
    assert.equal(db.prepare('SELECT COUNT(*) n FROM bug_reports').get().n, 1)
    await reports.publishPending()
    assert.equal(reports.status(data.id).state, 'pending')
    assert.equal(reports.submit(data).status, 200)
    assert.equal(reports.submit({ ...data, description: 'Changed content' }).status, 409)
    time += 3001; await reports.publishPending()
    assert.equal(reports.status(data.id).issueUrl, 'https://github.com/kmarchais/geography-game/issues/123')
    assert.equal(calls, 2)
    assert.deepEqual(Object.keys(reports.status(data.id)).sort(), ['id', 'issueUrl', 'state'])
    assert.equal(db.prepare('SELECT COUNT(*) n FROM bug_reports').get().n, 1)
  } finally {reports.close(); db.close()}
})

test('pending reports survive publisher restart and report limits bound public issue spam', async () => {
  const db = new DatabaseSync(':memory:'), player = randomUUID()
  const first = createBugReports(db, { publish: async () => {throw new Error('Unavailable')} })
  const data = payload(player); first.submit(data); first.close()
  const second = createBugReports(db, { publish: async () => 'https://github.com/kmarchais/geography-game/issues/124' })
  try {
    await second.publishPending()
    assert.equal(second.status(data.id).state, 'published')
    assert.equal(second.submit(payload(player)).status, 202)
    assert.equal(second.submit(payload(player)).status, 202)
    assert.equal(second.submit(payload(player)).status, 429)
    for (let index = 0; index < 17; index++) {assert.equal(second.submit(payload()).status, 202)}
    assert.equal(second.submit(payload()).status, 429)
    assert.equal(second.submit({ ...payload(), context: { ...context, token: 'must-not-be-stored' } }).status, 400)
    assert.equal(second.submit({ ...payload(), title: '' }).status, 400)
  } finally {second.close(); db.close()}
})

test('a lost GitHub create response finds the existing issue instead of opening another one', async () => {
  let creates = 0, issue = ''
  const data = payload(), report = { ...data, context: JSON.stringify(context) }
  const request = async (args, body) => {
    if (args[0] === 'auth') {return ''}
    if (args[1] === 'user') {return 'kmarchais\n'}
    if (args.includes('POST')) {
      creates++; const value = JSON.parse(body)
      assert.ok(value.body.includes(`<!-- atlas-report:${data.id} -->`))
      assert.equal(value.body.includes(data.playerId), false)
      issue = 'https://github.com/kmarchais/geography-game/issues/125'
      throw new Error('Response lost after commit')
    }
    return issue
  }
  await assert.rejects(publishGithubReport(report, request))
  assert.equal(await publishGithubReport(report, request), issue)
  assert.equal(creates, 1)
  await assert.rejects(publishGithubReport(report, async args => args[1] === 'user' ? 'another-user' : ''), /Wrong GitHub account/)
})

test('report HTTP endpoints accept guest feedback without exposing report contents', async t => {
  const server = createRankingServer({ databasePath: ':memory:', reportPublisher: async () => 'https://github.com/kmarchais/geography-game/issues/126' })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}`, data = payload()
  const response = await fetch(`${url}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  assert.equal(response.status, 202)
  const status = await (await fetch(`${url}/reports/${data.id}`)).json()
  assert.equal(status.id, data.id); assert.equal('description' in status, false)
  assert.equal((await fetch(`${url}/reports/${randomUUID()}`)).status, 404)
})
