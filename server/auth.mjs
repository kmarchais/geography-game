import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { avatarPresets } from '../src/globe/avatars.ts'

const sessionName = '__Host-atlas-session', challengeName = '__Host-atlas-challenge'
const hash = value => createHash('sha256').update(value).digest('hex')
const token = () => randomBytes(32).toString('base64url')
function googlePicture(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && url.hostname.endsWith('.googleusercontent.com') ? url.href : null
  } catch {return null}
}
function validAvatar(value) {
  if (value === 'google' || avatarPresets.some(preset => value === `preset:${preset.id}`)) {return true}
  if (typeof value !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length > 88000) {return false}
  const bytes = Buffer.from(value.slice(23), 'base64')
  if (bytes.length > 65536 || bytes.length < 12 || bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) {return false}
  let frame = false
  for (let offset = 2; offset + 8 < bytes.length;) {
    if (bytes[offset++] !== 0xff) {return false}
    while (bytes[offset] === 0xff) {offset++}
    const marker = bytes[offset++]
    if (offset + 2 > bytes.length) {return false}
    const length = bytes.readUInt16BE(offset)
    if (length < 2 || offset + length > bytes.length) {return false}
    if (marker === 0xda) {return frame}
    if (marker === 0xc0 || marker === 0xc2) {
      const height = bytes.readUInt16BE(offset + 3), width = bytes.readUInt16BE(offset + 5)
      if (frame || length < 8 || !width || !height || width > 512 || height > 512) {return false}
      frame = true
    }
    offset += length
  }
  return false
}
function cookie(req, name) {
  const value = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`))?.slice(name.length + 1)
  return typeof value === 'string' && /^[\w-]{43}$/.test(value) ? value : undefined
}
function setCookie(req, res, name, value, seconds, crossSiteOrigins) {
  const sameSite = crossSiteOrigins.includes(req.headers.origin) ? 'None' : 'Lax'
  res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}${sameSite === 'None' ? '; Partitioned' : ''}; Max-Age=${seconds}`)
}
export function googleVerifier(clientId, client = new OAuth2Client({ clientId, transporterOptions: { timeout: 6000 } })) {
  return async credential => (await client.verifyIdToken({ idToken: credential, audience: clientId })).getPayload()
}
export function createAccounts(db, { clientId = '', verify = clientId ? googleVerifier(clientId) : undefined, now = Date.now, crossSiteOrigins = ['https://localhost'] } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS atlas_users(id TEXT PRIMARY KEY, google_sub TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS atlas_sessions(hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS atlas_challenges(hash TEXT PRIMARY KEY, nonce TEXT NOT NULL, expires INTEGER NOT NULL, browser_hash TEXT NOT NULL);`)
  const columns = db.prepare('PRAGMA table_info(atlas_users)').all().map(column => column.name)
  if (!columns.includes('picture')) {db.exec('ALTER TABLE atlas_users ADD COLUMN picture TEXT')}
  if (!columns.includes('avatar')) {db.exec("ALTER TABLE atlas_users ADD COLUMN avatar TEXT NOT NULL DEFAULT 'google'")}
  const user = req => {
    const value = cookie(req, sessionName)
    return value ? db.prepare('SELECT u.id,u.name,u.picture,u.avatar FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(hash(value), now()) : undefined
  }
  function challenge(req, res) {
    if (!verify) {return undefined}
    db.prepare('DELETE FROM atlas_challenges WHERE expires<=?').run(now())
    db.prepare('DELETE FROM atlas_sessions WHERE expires<=?').run(now())
    if (db.prepare('SELECT count(*) AS n FROM atlas_challenges').get().n >= 2000) {return undefined}
    const value = cookie(req, challengeName) || token(), nonce = token()
    // Multiple tabs and a background button refresh can have live nonces.
    // Each is still browser-bound, short-lived, and consumed once.
    db.prepare('INSERT INTO atlas_challenges VALUES(?,?,?,?)').run(hash(nonce), nonce, now() + 300000, hash(value))
    setCookie(req, res, challengeName, value, 300, crossSiteOrigins)
    return { nonce }
  }
  async function login(req, res, credential) {
    const value = cookie(req, challengeName)
    if (!verify || !value || typeof credential !== 'string' || credential.length > 8192) {return undefined}
    const pending = db.prepare('SELECT * FROM atlas_challenges WHERE browser_hash=? AND expires>?').all(hash(value), now())
    if (!pending.length) {return undefined}
    let identity
    try {identity = await verify(credential)} catch {return undefined}
    if (!identity || typeof identity.sub !== 'string' || !/^[\w-]{1,255}$/.test(identity.sub)) {return undefined}
    const matched = pending.find(item => item.nonce === identity.nonce)
    if (!matched) {return undefined}
    // Consume only once, including concurrent submissions while Google verifies.
    if (!db.prepare('DELETE FROM atlas_challenges WHERE hash=? AND expires>?').run(matched.hash, now()).changes) {return undefined}
    const name = String(identity.given_name || identity.name || 'Player').normalize('NFKC').replace(/[^\p{L}\p{N} ._'’-]/gu, '').trim().slice(0, 24) || 'Player'
    db.prepare('INSERT INTO atlas_users(id,google_sub,name,picture) VALUES(?,?,?,?) ON CONFLICT(google_sub) DO UPDATE SET picture=excluded.picture').run(randomUUID(), identity.sub, name, googlePicture(identity.picture))
    const account = db.prepare('SELECT id,name,picture,avatar FROM atlas_users WHERE google_sub=?').get(identity.sub)
    const session = token(), old = cookie(req, sessionName)
    if (old) {db.prepare('DELETE FROM atlas_sessions WHERE hash=?').run(hash(old))}
    db.prepare('INSERT INTO atlas_sessions VALUES(?,?,?)').run(hash(session), account.id, now() + 2592000000)
    setCookie(req, res, sessionName, session, 2592000, crossSiteOrigins)
    return account
  }
  function logout(req, res) {
    const value = cookie(req, sessionName)
    if (value) {db.prepare('DELETE FROM atlas_sessions WHERE hash=?').run(hash(value))}
    setCookie(req, res, sessionName, '', 0, crossSiteOrigins)
  }
  function updateProfile(req, data) {
    const account = user(req)
    if (!account) {return { status: 401, error: 'Sign in to edit your profile.' }}
    const name = typeof data.name === 'string' ? data.name.normalize('NFKC').trim() : ''
    if (!/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name) || !validAvatar(data.avatar) || Object.keys(data).some(key => !['name', 'avatar'].includes(key))) {
      return { status: 400, error: 'Choose a valid username and avatar.' }
    }
    db.prepare('UPDATE atlas_users SET name=?,avatar=? WHERE id=?').run(name, data.avatar, account.id)
    return { status: 200, user: { ...account, name, avatar: data.avatar } }
  }
  return { clientId, user, challenge, login, logout, updateProfile }
}
