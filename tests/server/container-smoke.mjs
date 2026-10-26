import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const base = 'http://127.0.0.1:4180'
let ready = false
for (let i = 0; i < 40; i++) {
  try {ready = (await fetch(`${base}/atlas-api/health`)).ok} catch { /* Container may still be starting. */ }
  if (ready) {break}
  await new Promise(resolve => setTimeout(resolve, 250))
}
assert.ok(ready, 'The production container must answer its health check')
if (process.argv[2] === 'start') {
  const html = await (await fetch(base)).text()
  const entry = html.match(/<script[^>]+src="([^"]+)"/)[1]
  assert.ok(entry.startsWith('/assets/'))
  const script = await fetch(new URL(entry, base))
  assert.equal(script.status, 200); assert.match(script.headers.get('content-type'), /javascript/)
  assert.equal((await fetch(`${base}/classic`)).status, 200)
  const response = await fetch(`${base}/atlas-api/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://atlas.example' }, body: JSON.stringify({ name: 'Container test', playerId: '11111111-1111-4111-8111-111111111111' }) })
  assert.equal(response.status, 201)
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://atlas.example')
  mkdirSync('.local', { recursive: true }); writeFileSync('.local/container-run.json', JSON.stringify(await response.json()))
  console.log('Production website, root assets, SPA route, health check and API passed')
} else {
  const run = JSON.parse(readFileSync('.local/container-run.json', 'utf8'))
  const response = await fetch(`${base}/atlas-api/runs/${run.id}/answers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://atlas.example' }, body: JSON.stringify({ index: 0, guess: null, elapsedMs: 0 }) })
  assert.equal(response.status, 200); assert.equal((await response.json()).complete, false)
  console.log('The run survived the production container restart on its mounted volume')
}
