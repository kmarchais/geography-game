import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'

const sessionName = '__Host-atlas-session', challengeName = '__Host-atlas-challenge'
const hash = value => createHash('sha256').update(value).digest('hex')
const token = () => randomBytes(32).toString('base64url')
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
  const user = req => {
    const value = cookie(req, sessionName)
    return value ? db.prepare('SELECT u.id,u.name FROM atlas_sessions s JOIN atlas_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(hash(value), now()) : undefined
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
    db.prepare('INSERT INTO atlas_users(id,google_sub,name) VALUES(?,?,?) ON CONFLICT(google_sub) DO NOTHING').run(randomUUID(), identity.sub, name)
    const account = db.prepare('SELECT id,name FROM atlas_users WHERE google_sub=?').get(identity.sub)
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
  return { clientId, user, challenge, login, logout }
}
