import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { OAuth2Client } from 'google-auth-library'
import { googleVerifier } from '../../server/auth.mjs'
import { createRankingServer } from '../../server/ranking.mjs'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const client = new OAuth2Client()
client.getFederatedSignonCertsAsync = async () => ({ certs: { test: publicKey.export({ type: 'spki', format: 'pem' }) } })
const verify = googleVerifier('atlas.test', client)
function credential(nonce, extra = {}) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ sub: 'google-one', given_name: 'Player', aud: 'atlas.test', iss: 'https://accounts.google.com', iat: now - 1, exp: now + 3600, nonce, ...extra })).toString('base64url')
  return `${header}.${body}.${sign('RSA-SHA256', Buffer.from(`${header}.${body}`), privateKey).toString('base64url')}`
}
async function setup(t) {
  const clock = { time: Date.now() }
  const server = createRankingServer({ databasePath: ':memory:', countries: ['AAA', 'BBB', 'CCC'].map(id => ({ id, playable: true })), now: () => clock.time, googleClientId: 'atlas.test', verifyGoogle: verify, origins: ['http://client.test', 'https://localhost', 'https://atlas.native'], crossSiteOrigins: ['https://localhost', 'https://atlas.native'] })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}`
  const request = (path, body, cookie, origin = 'http://client.test') => fetch(url + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  const challenge = async (origin) => {const response = await request('/auth/challenge', undefined, undefined, origin); return { nonce: (await response.json()).nonce, cookie: response.headers.get('set-cookie').split(';')[0] }}
  const login = async (sub = 'google-one') => {const pending = await challenge(); const response = await request('/auth/google', { credential: credential(pending.nonce, { sub }) }, pending.cookie); assert.equal(response.status, 200); return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user }}
  return { request, challenge, login, clock }
}

test('verifies Google signatures, audience, issuer and expiry with the official verifier', async () => {
  assert.equal((await verify(credential('nonce'))).sub, 'google-one')
  await assert.rejects(verify(credential('nonce', { aud: 'another-app' })))
  await assert.rejects(verify(credential('nonce', { iss: 'https://attacker.test' })))
  await assert.rejects(verify(credential('nonce', { iat: 1, exp: 2 })))
  const valid = credential('nonce')
  const pieces = valid.split('.'); pieces[1] = Buffer.from(JSON.stringify({ sub: 'forged' })).toString('base64url')
  await assert.rejects(verify(pieces.join('.')))
})
test('binds login to an expiring browser challenge and rejects nonce substitution and replay', async t => {
  const { request, challenge, clock } = await setup(t)
  const pending = await challenge()
  assert.equal((await request('/auth/google', { credential: credential(pending.nonce) })).status, 401)
  assert.equal((await request('/auth/google', { credential: credential('another-nonce') }, pending.cookie)).status, 401)
  const response = await request('/auth/google', { credential: credential(pending.nonce) }, pending.cookie)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/)
  const json = await response.json(); assert.deepEqual(Object.keys(json.user).sort(), ['id', 'name'])
  assert.equal((await request('/auth/google', { credential: credential(pending.nonce) }, pending.cookie)).status, 401)
  const expired = await challenge(); clock.time += 300001
  assert.equal((await request('/auth/google', { credential: credential(expired.nonce) }, expired.cookie)).status, 401)
})
test('isolates challenges between browsers and supports secure native cross-site cookies', async t => {
  const { request, challenge } = await setup(t)
  const first = await challenge(), second = await challenge()
  assert.equal((await request('/auth/google', { credential: credential(first.nonce) }, second.cookie)).status, 401)
  for (const origin of ['https://localhost', 'https://atlas.native']) {
    const pending = await challenge(origin)
    const response = await request('/auth/google', { credential: credential(pending.nonce) }, pending.cookie, origin)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=None; Partitioned/)
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
    const session = response.headers.get('set-cookie').split(';')[0]
    assert.ok((await (await request('/auth/session', undefined, session, origin)).json()).user)
    const logout = await request('/auth/logout', {}, session, origin)
    assert.match(logout.headers.get('set-cookie'), /SameSite=None; Partitioned/)
    assert.equal((await (await request('/auth/session', undefined, session, origin)).json()).user, null)
  }
  assert.equal((await request('/auth/session', undefined, undefined, 'https://attacker.test')).status, 403)
})
test('refreshing the Google button preserves a nonce already in an open sign-in window', async t => {
  const { request, challenge } = await setup(t)
  const first = await challenge()
  const newer = await request('/auth/challenge', undefined, first.cookie)
  assert.equal(newer.headers.get('set-cookie').split(';')[0], first.cookie)
  assert.notEqual((await newer.json()).nonce, first.nonce)
  assert.equal((await request('/auth/google', { credential: credential(first.nonce) }, first.cookie)).status, 200)
  assert.equal((await request('/auth/google', { credential: credential(first.nonce) }, first.cookie)).status, 401)
})
test('shares a Google identity and best across devices, prevents guest impersonation, and revokes sessions', async t => {
  const { request, login, clock } = await setup(t)
  const first = await login(), second = await login(), other = await login('google-two')
  assert.equal(first.user.id, second.user.id)
  const start = await request('/runs', { playerId: randomUUID(), name: 'Connected player' }, first.cookie)
  const run = await start.json()
  assert.equal((await request(`/runs/${run.id}/answers`, { index: 0, guess: run.deck[0], elapsedMs: 1000 }, other.cookie)).status, 401)
  for (let index = 0; index < 3; index++) {clock.time += 1000; assert.equal((await request(`/runs/${run.id}/answers`, { index, guess: index === 0 ? run.deck[0] : null, elapsedMs: (index + 1) * 1000 }, first.cookie)).status, 200)}
  const session = await (await request('/auth/session', undefined, second.cookie)).json()
  assert.equal(session.best.correct, 1); assert.equal(session.best.timeMs, 1000)
  const guest = await (await request('/runs', { playerId: first.user.id, name: 'Guest' })).json()
  for (let index = 0; index < 3; index++) {clock.time += 1000; await request(`/runs/${guest.id}/answers`, { index, guess: guest.deck[index], elapsedMs: (index + 1) * 1000 })}
  assert.equal((await (await request('/auth/session', undefined, second.cookie)).json()).best.correct, 1)
  await request('/auth/logout', {}, first.cookie)
  assert.equal((await (await request('/auth/session', undefined, first.cookie)).json()).user, null)
  assert.equal((await (await request('/auth/session', undefined, second.cookie)).json()).user.id, first.user.id)
  clock.time += 2592000001
  assert.equal((await (await request('/auth/session', undefined, second.cookie)).json()).user, null)
})
