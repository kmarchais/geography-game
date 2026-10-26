import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { request as httpRequest } from 'node:http'
import { spawnSync } from 'node:child_process'
import { createRankingServer } from '../../server/ranking.mjs'
import { publishGithubReport } from '../../server/reports.mjs'

test('one service serves the web app and API, bounds file access, and preserves SQLite on restart', async () => {
  const root = mkdtempSync(join(tmpdir(), 'atlas-host-')), web = join(root, 'web'), databasePath = join(root, 'atlas.sqlite')
  mkdirSync(join(web, 'assets'), { recursive: true })
  writeFileSync(join(web, 'index.html'), '<!doctype html><title>Atlas</title>')
  writeFileSync(join(web, 'assets', 'app.js'), '/* Atlas */')
  writeFileSync(join(root, 'secret.txt'), 'never public')
  let server
  const start = async () => {server = createRankingServer({ databasePath, staticDirectory: web, reportPublisher: async () => {throw Error('No real issues in tests')} }); server.listen(0, '127.0.0.1'); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`}
  const stop = () => new Promise(resolve => {server.close(resolve); server.closeAllConnections()})
  try {
    let origin = await start()
    const malformedStatus = await new Promise((resolve, reject) => {
      const request = httpRequest(origin, { path: 'http://[' }, response => {response.resume(); resolve(response.statusCode)})
      request.on('error', reject)
      request.end()
    })
    assert.equal(malformedStatus, 500)
    assert.match(await (await fetch(origin)).text(), /<title>Atlas/)
    assert.match(await (await fetch(`${origin}/classic`)).text(), /<title>Atlas/)
    const asset = await fetch(`${origin}/assets/app.js`)
    assert.match(asset.headers.get('content-type'), /javascript/)
    assert.match(asset.headers.get('cache-control'), /immutable/)
    const head = await fetch(`${origin}/assets/app.js`, { method: 'HEAD' })
    assert.equal(head.headers.get('content-length'), '11'); assert.equal(await head.text(), '')
    for (const path of ['/missing.js', '/data/atlas.sqlite']) {assert.equal((await fetch(origin + path)).status, 404)}
    for (const path of ['/%2e%2e%2fsecret.txt', '/.env']) {assert.equal((await fetch(origin + path)).status, 403)}
    assert.equal((await fetch(origin, { method: 'POST' })).status, 405)
    assert.deepEqual(await (await fetch(`${origin}/atlas-api/health`)).json(), { ok: true })
    const request = await fetch(`${origin}/atlas-api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Atlas test', playerId: '11111111-1111-4111-8111-111111111111' }) })
    assert.equal(request.status, 201)
    const run = await request.json()
    await stop(); origin = await start()
    const answer = await fetch(`${origin}/atlas-api/runs/${run.id}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: 0, guess: null, elapsedMs: 0 }) })
    assert.equal(answer.status, 200)
    assert.equal((await answer.json()).complete, false)
  } finally {if (server?.listening) {await stop()} rmSync(root, { recursive: true, force: true })}
})

test('Railway startup refuses an ephemeral database when no volume is mounted', () => {
  const env = { ...process.env, RAILWAY_ENVIRONMENT_ID: 'test' }; delete env.RAILWAY_VOLUME_MOUNT_PATH
  const result = spawnSync(process.execPath, ['server/ranking.mjs'], { env, encoding: 'utf8' })
  assert.notEqual(result.status, 0); assert.match(result.stderr, /Attach a persistent Railway volume/)
})

test('hosted issue publishing verifies the token owner and recovers duplicate issues', async () => {
  const report = { id: 'test-report', title: 'Test', description: 'Controlled @mention', context: JSON.stringify({ platform: 'Web', version: '1.1.0', width: 1000, height: 800, country: null }) }
  const calls = [], url = 'https://github.com/kmarchais/geography-game/issues/123'
  const fetcher = async (path, options) => {
    calls.push({ path, options }); assert.equal(options.headers.Authorization, 'Bearer fake-test-token')
    return { ok: true, json: async () => path.endsWith('/user') ? { login: 'kmarchais' } : options.method === 'POST' ? { html_url: url } : [] }
  }
  assert.equal(await publishGithubReport(report, undefined, { token: 'fake-test-token', fetcher }), url)
  const body = JSON.parse(calls.at(-1).options.body)
  assert.match(body.body, /<!-- atlas-report:test-report -->/); assert.ok(body.body.includes('@\u200bmention'))
  const existing = async path => ({ ok: true, json: async () => path.endsWith('/user') ? { login: 'kmarchais' } : [{ body: body.body, html_url: url }] })
  assert.equal(await publishGithubReport(report, undefined, { token: 'fake-test-token', fetcher: existing }), url)
  await assert.rejects(publishGithubReport(report, undefined, { token: 'fake-test-token', fetcher: async () => ({ ok: true, json: async () => ({ login: 'another-account' }) }) }), /Wrong GitHub account/)
})
