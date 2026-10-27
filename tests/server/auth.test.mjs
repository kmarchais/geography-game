import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, sign, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { OAuth2Client } from 'google-auth-library'
import { googleVerifier } from '../../server/auth.mjs'
import { createRankingServer } from '../../server/ranking.mjs'
import { readFileSync } from 'node:fs'

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
  const request = (path, body, cookie, origin = 'http://client.test') => fetch(url + path + (['/leaderboard', '/auth/session'].includes(path) ? '?rules=2' : ''), { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  const challenge = async (origin) => {const response = await request('/auth/challenge', undefined, undefined, origin); return { nonce: (await response.json()).nonce, cookie: response.headers.get('set-cookie').split(';')[0] }}
  const login = async (sub = 'google-one', extra = {}) => {const pending = await challenge(); const response = await request('/auth/google', { credential: credential(pending.nonce, { sub, ...extra }) }, pending.cookie); assert.equal(response.status, 200); return { cookie: response.headers.get('set-cookie').split(';')[0], user: (await response.json()).user }}
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
  const json = await response.json(); assert.deepEqual(Object.keys(json.user).sort(), ['avatar', 'id', 'name', 'picture'])
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

test('claims a completed guest run with its private token, preserves its score and retries safely', async t => {
  const { request, login, clock } = await setup(t)
  const run = await (await request('/runs', { playerId: randomUUID(), name: 'Guest score' })).json()
  const first = await login(), second = await login(), other = await login('google-two')
  const path = `/runs/${run.id}/claim`
  assert.ok(run.claimToken)
  assert.equal((await request(path, { claimToken: run.claimToken })).status, 401)
  assert.equal((await request(path, { claimToken: randomUUID() }, first.cookie)).status, 403)
  assert.equal((await request(path, {}, first.cookie)).status, 403)
  assert.equal((await request(path, { claimToken: run.claimToken }, first.cookie)).status, 409)
  for (let index = 0; index < 3; index++) {
    clock.time += 1000
    await request(`/runs/${run.id}/answers`, { index, guess: index === 0 ? run.deck[0] : null, elapsedMs: (index + 1) * 1000 })
  }
  const before = await (await request('/leaderboard')).json()
  assert.equal(JSON.stringify(before).includes(run.claimToken), false)
  assert.equal((await request(path, { claimToken: run.claimToken, correct: 195 }, first.cookie)).status, 403)
  assert.equal((await request(path, { claimToken: run.claimToken }, first.cookie)).status, 200)
  // A committed claim whose response was lost must be safe to retry.
  assert.equal((await request(path, { claimToken: run.claimToken }, second.cookie)).status, 200)
  assert.deepEqual(await (await request('/leaderboard')).json(), before.map(score => ({ ...score, name: first.user.name })))
  const session = await (await request('/auth/session', undefined, second.cookie)).json()
  assert.equal(session.best.id, run.id)
  assert.equal(session.best.correct, 1)
  assert.equal(session.best.timeMs, 1000)
  assert.equal((await request(path, { claimToken: run.claimToken }, other.cookie)).status, 409)
  assert.equal((await (await request('/auth/session', undefined, other.cookie)).json()).best, null)
  const signedInRun = await (await request('/runs', { playerId: randomUUID(), name: 'Account run' }, first.cookie)).json()
  assert.equal(signedInRun.claimToken, undefined)
})

test('Google photo, chosen username and avatar persist across devices and Google logins', async t => {
  const { request, login, clock } = await setup(t)
  const photo = 'https://lh3.googleusercontent.com/atlas-avatar'
  const first = await login('google-one', { picture: photo }), second = await login('google-one', { picture: photo }), other = await login('google-two')
  assert.equal(first.user.picture, photo); assert.equal(first.user.avatar, 'google')
  assert.equal((await request('/auth/profile', { name: 'Navigator', avatar: 'preset:compass' })).status, 401)
  const run = await (await request('/runs', { playerId: randomUUID(), name: 'Client spoof' }, first.cookie)).json()
  for (let index = 0; index < 3; index++) {
    clock.time += 1000
    await request(`/runs/${run.id}/answers`, { index, guess: run.deck[index], elapsedMs: (index + 1) * 1000 }, first.cookie)
  }
  const saved = await request('/auth/profile', { name: '  Navigator  ', avatar: 'preset:compass' }, first.cookie)
  assert.equal(saved.status, 200)
  const session = await (await request('/auth/session', undefined, second.cookie)).json()
  assert.equal(session.user.name, 'Navigator'); assert.equal(session.user.avatar, 'preset:compass')
  assert.equal(session.best.name, 'Navigator'); assert.equal(session.best.correct, 3)
  assert.equal((await (await request('/leaderboard')).json())[0].name, 'Navigator')
  const returned = await login('google-one', { given_name: 'Different Google name', picture: photo })
  assert.equal(returned.user.name, 'Navigator'); assert.equal(returned.user.avatar, 'preset:compass')
  assert.equal((await (await request('/auth/session', undefined, other.cookie)).json()).user.name, 'Player')
  const jpeg = readFileSync(new URL('./fixtures/avatar.jpg', import.meta.url))
  const padding = Buffer.alloc(6004); padding[0] = 0xff; padding[1] = 0xef; padding.writeUInt16BE(6002, 2)
  const custom = `data:image/jpeg;base64,${Buffer.concat([jpeg.subarray(0, 2), padding, jpeg.subarray(2)]).toString('base64')}`
  assert.ok(custom.length > 4096)
  assert.equal((await request('/auth/profile', { name: 'Navigator', avatar: custom }, first.cookie)).status, 200)
  assert.equal((await (await request('/auth/session', undefined, second.cookie)).json()).user.avatar, custom)
  assert.equal((await request('/auth/profile', { name: 'Navigator', avatar: 'google' }, first.cookie)).status, 200)
  assert.equal((await (await request('/auth/session', undefined, second.cookie)).json()).user.picture, photo)
})

test('profile validation rejects impersonation, unsafe images, oversized photos and unknown presets', async t => {
  const { request, login } = await setup(t)
  const player = await login('google-one', { picture: 'https://attacker.example/avatar.svg' })
  assert.equal(player.user.picture, null)
  const jpeg = readFileSync(new URL('./fixtures/avatar.jpg', import.meta.url))
  const oversized = Buffer.from(jpeg), frame = oversized.indexOf(Buffer.from([0xff, 0xc0]))
  assert.ok(frame > 0); oversized.writeUInt16BE(4096, frame + 7)
  for (const invalid of [
    { name: '', avatar: 'google' }, { name: '<script>', avatar: 'google' },
    { name: 'A'.repeat(25), avatar: 'google' }, { name: 'Player', avatar: 'preset:unknown' },
    { name: 'Player', avatar: 'https://attacker.example/photo.jpg' },
    { name: 'Player', avatar: `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}` },
    { name: 'Player', avatar: 'data:image/jpeg;base64,AAAA' },
    { name: 'Player', avatar: `data:image/jpeg;base64,${oversized.toString('base64')}` },
    { name: 'Player', avatar: 'google', id: randomUUID() },
  ]) {assert.equal((await request('/auth/profile', invalid, player.cookie)).status, 400)}
  assert.equal((await request('/auth/profile', { name: 'Player', avatar: 'A'.repeat(132000) }, player.cookie)).status, 413)
  const unchanged = await (await request('/auth/session', undefined, player.cookie)).json()
  assert.equal(unchanged.user.name, 'Player'); assert.equal(unchanged.user.avatar, 'google')
})
