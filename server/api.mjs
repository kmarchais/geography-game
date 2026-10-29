import { createHash, randomInt, randomUUID } from 'node:crypto'
import { isGuestId, createDeck, ORDER_POLICY } from '../src/globe/game.ts'
import { createAccounts } from './auth.mjs'
import { createBugReports } from './reports.mjs'
import { createCountryStatistics } from './statistics.mjs'
import { validAnswerRecording, validNetworkIssues } from '../src/globe/recording.ts'

// Both hosts execute the same validation, ownership, and scoring rules.
export function createAtlasApi({ db, transaction, countries, now = Date.now, origins = [], googleClientId = '', verifyGoogle, reportPublisher, reportWake, crossSiteOrigins = ['https://localhost'] }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, player TEXT NOT NULL, name TEXT NOT NULL,
      started INTEGER NOT NULL, state TEXT NOT NULL, complete INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0, time_ms INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS ranking ON runs(complete, correct DESC, time_ms);`)
  if (!db.prepare('PRAGMA table_info(runs)').all().some(column => column.name === 'claim_token_hash')) {
    db.exec('ALTER TABLE runs ADD COLUMN claim_token_hash TEXT')
  }
  if (!db.prepare('PRAGMA table_info(runs)').all().some(column => column.name === 'published')) {
    db.exec('ALTER TABLE runs ADD COLUMN published INTEGER NOT NULL DEFAULT 1')
  }
  if (!db.prepare('PRAGMA table_info(runs)').all().some(column => column.name === 'points')) {db.exec('ALTER TABLE runs ADD COLUMN points INTEGER NOT NULL DEFAULT 0')}
  if (!db.prepare('PRAGMA table_info(runs)').all().some(column => column.name === 'finished_at')) {db.exec('ALTER TABLE runs ADD COLUMN finished_at INTEGER')}
  if (!db.prepare('PRAGMA table_info(runs)').all().some(column => column.name === 'client_source')) {db.exec("ALTER TABLE runs ADD COLUMN client_source TEXT NOT NULL DEFAULT 'unknown'")}
  const statistics = createCountryStatistics(db, transaction)
  const quiz = countries.filter(c => c.playable).map(c => c.id)
  const dataset = createHash('sha256').update(JSON.stringify(countries)).digest('hex')
  const accounts = createAccounts(db, { clientId: googleClientId, verify: verifyGoogle, now, crossSiteOrigins })
  const reports = createBugReports(db, { now, publish: reportPublisher, wake: reportWake })
  const ids = new Set(quiz)
  // Older clients can still submit their former map features as wrong guesses.
  const legacyIds = new Set([...quiz, ...'WSB ALA ASM AIA ATA ABW ATC IOA KAB BJN BMU BRT BRI IOT VGB CYM CLP COK CSI CUW ESB FLK FRO PYF ATF GIB GRL GUM USG GGY HMD HKG IMN JEY KOS MAC MSR NCL NIU NFK MNP PCN PRI BLM SHN MAF SPM SCR SER KAS SXM SOL SGS SPI TWN CYN TCA CNM UMI VIR PGA WLF ESH'.split(' ')])
  const scoreColumns = (version, personal = false) => (personal ? ",finished_at AS finishedAt,CASE WHEN json_type(state,'$.answers')='array' THEN (SELECT COUNT(*) FROM json_each(json_extract(state,'$.answers')) WHERE json_extract(value,'$.guess') IS NULL) ELSE NULL END AS skipped" : '') + (version === 4 ? ",points/4.0 AS score,json_extract(state,'$.green') AS green,json_extract(state,'$.yellow') AS yellow,json_extract(state,'$.orange') AS orange,json_extract(state,'$.red') AS red" : '')
  const leaderboard = (version = 3) => db.prepare(`SELECT id, name, correct, ? AS total, time_ms AS timeMs${scoreColumns(version)} FROM
    (SELECT *, ROW_NUMBER() OVER (PARTITION BY player ORDER BY ${version === 4 ? 'points' : 'correct'} DESC, time_ms, id) AS place FROM runs WHERE complete=1 AND published=1 AND json_extract(state,'$.version')=?)
    WHERE place=1 ORDER BY ${version === 4 ? 'score' : 'correct'} DESC, time_ms, id LIMIT 20`).all(quiz.length, version)
  const reply = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)) }
  const handle = async (req, res) => {
    try {
      const origin = req.headers.origin
      if (origin && !origins.includes(origin)) {reply(res, 403, { error: 'Origin not allowed.' }); return}
      if (origin) {res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Vary', 'Origin')}
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        reply(res, 204, undefined); return
      }
      const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/atlas-api(?=\/|$)/, '')
      const requestedRules = Number(new URL(req.url, 'http://localhost').searchParams.get('rules'))
      const rules = [2, 4].includes(requestedRules) ? requestedRules : 3
      if (req.method === 'GET' && path === '/health') {reply(res, 200, { ok: true }); return}
      const reportMatch = path.match(/^\/reports\/([0-9a-f-]{36})$/i)
      if (req.method === 'GET' && reportMatch) {const report = reports.status(reportMatch[1]); reply(res, report ? 200 : 404, report || { error: 'Report not found.' }); return}
      if (req.method === 'GET' && path === '/leaderboard') {reply(res, 200, leaderboard(rules)); return}
      if (req.method === 'GET' && path === '/scores/me') {
        const user = accounts.user(req)
        if (!user) {reply(res, 401, { error: 'Sign in to see account scores.' }); return}
        const offset = Number(new URL(req.url, 'http://localhost').searchParams.get('offset') || 0)
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) {reply(res, 400, { error: 'Invalid score offset.' }); return}
        reply(res, 200, db.prepare(`SELECT id,name,correct,? AS total,time_ms AS timeMs${scoreColumns(rules, true)} FROM runs WHERE player=? AND complete=1 AND json_extract(state,'$.version')=? ORDER BY ${rules === 4 ? 'points' : 'correct'} DESC,time_ms,id LIMIT 20 OFFSET ?`).all(quiz.length, `google:${user.id}`, rules, offset)); return
      }
      if (req.method === 'GET' && path === '/stats') {reply(res, 200, statistics.read('global', rules)); return}
      if (req.method === 'GET' && path === '/stats/me') {
        const user = accounts.user(req)
        reply(res, user ? 200 : 401, user ? statistics.read(`google:${user.id}`, rules) : { error: 'Sign in to see account statistics.' }); return
      }
      if (req.method === 'GET' && path === '/auth/session') {
        const user = accounts.user(req)
        const best = user ? db.prepare(`SELECT id,name,correct,? AS total,time_ms AS timeMs${scoreColumns(rules, true)} FROM runs WHERE player=? AND complete=1 AND json_extract(state,'$.version')=? ORDER BY ${rules === 4 ? 'points' : 'correct'} DESC,time_ms,id LIMIT 1`).get(quiz.length, `google:${user.id}`, rules) : undefined
        reply(res, 200, { user: user ?? null, best: best ?? null, googleClientId: accounts.clientId }); return
      }
      if (req.method === 'GET' && path === '/auth/challenge') {
        const challenge = accounts.challenge(req, res)
        reply(res, challenge ? 200 : 503, challenge || { error: 'Google connection is unavailable.' }); return
      }
      if (req.method !== 'POST') {reply(res, 404, { error: 'Not found.' }); return}
      if (!req.headers['content-type']?.startsWith('application/json')) {reply(res, 415, { error: 'JSON required.' }); return}
      let body = ''
      for await (const chunk of req) {
        body += chunk
        if (Buffer.byteLength(body) > (path === '/auth/profile' ? 131072 : path === '/reports' ? 32768 : path === '/auth/google' ? 12288 : 4096)) {reply(res, 413, { error: 'Request too large.' }); return}
      }
      let data
      try {data = JSON.parse(body)} catch {reply(res, 400, { error: 'Invalid JSON.' }); return}
      if (!data || typeof data !== 'object' || Array.isArray(data)) {reply(res, 400, { error: 'Invalid request.' }); return}
      if (path === '/reports') {const result = reports.submit(data, accounts.user(req)); reply(res, result.status, result.report || { error: result.error }); return}
      if (path === '/auth/google') {
        const account = await accounts.login(req, res, data.credential)
        reply(res, account ? 200 : 401, account ? { user: account } : { error: 'Google sign-in could not be verified. Try again.' }); return
      }
      if (path === '/auth/logout') {accounts.logout(req, res); reply(res, 200, { user: null }); return}
      if (path === '/auth/profile') {
        let profile
        transaction(() => {
          profile = accounts.updateProfile(req, data)
          if (profile.user) {db.prepare('UPDATE runs SET name=? WHERE player=?').run(profile.user.name, `google:${profile.user.id}`)}
        })
        reply(res, profile.status, profile.user ? { user: profile.user } : { error: profile.error }); return
      }
      if (path === '/runs') {
        const anonymous = Object.keys(data).every(key => ['source', 'build', 'dataset', 'ignoreAnswered'].includes(key))
        const source = data.source ?? 'unknown'
        if (!['desktop-web', 'mobile-web', 'native-app', 'unknown'].includes(source)) {reply(res, 400, { error: 'Invalid run source.' }); return}
        if (data.ignoreAnswered !== undefined && typeof data.ignoreAnswered !== 'boolean') {reply(res, 400, { error: 'Invalid answer policy.' }); return}
        if ((data.build !== undefined && (typeof data.build !== 'string' || !/^[\w.-]{1,80}$/.test(data.build))) || (data.dataset !== undefined && (typeof data.dataset !== 'string' || !/^(?:[0-9a-f]{64}|unknown)$/.test(data.dataset)))) {reply(res, 400, { error: 'Invalid build or dataset.' }); return}
        const name = typeof data.name === 'string' ? data.name.normalize('NFKC').trim() : ''
        if (!anonymous && (!isGuestId(data.playerId) || !/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name) || Object.keys(data).some(k => !['name', 'playerId', 'source', 'build', 'dataset', 'ignoreAnswered'].includes(k)))) {reply(res, 400, { error: 'Use a name of 1–24 letters or numbers.' }); return}
        db.prepare("UPDATE runs SET state=json_set(state,'$.status','inactive','$.inactiveAt',?) WHERE complete=0 AND started < ? AND COALESCE(json_extract(state,'$.status'),'active')='active'").run(now(), now() - 86400000)
        if (db.prepare("SELECT COUNT(*) AS n FROM runs WHERE complete=0 AND COALESCE(json_extract(state,'$.status'),'active')='active'").get().n >= 2000) {reply(res, 429, { error: 'Please try again later.' }); return}
        const deck = createDeck(countries, () => randomInt(0x100000000) / 0x100000000).map(country => country.id)
        const id = randomUUID(), started = now()
        const account = accounts.user(req)
        db.prepare('INSERT INTO runs(id,player,name,started,state,published,client_source) VALUES(?,?,?,?,?,?,?)').run(id, account ? `google:${account.id}` : anonymous ? `anonymous:${id}` : data.playerId, account?.name ?? name, started, JSON.stringify({ version: anonymous ? rules === 4 ? 4 : 3 : 2, mode: 'world-countries', dataset, clientDataset: data.dataset ?? 'unknown', build: data.build ?? 'unknown', authAtStart: account ? 'google' : 'guest', recordingVersion: 1, orderPolicy: ORDER_POLICY, ignoreAnswered: data.ignoreAnswered === true, status: 'active', deck, answers: [], attempts: [], ...(anonymous && rules === 4 ? { green: 0, yellow: 0, orange: 0, red: 0 } : {}) }), Number(!anonymous), source)
        const claimToken = anonymous || !account ? randomUUID() : undefined
        if (claimToken) {db.prepare('UPDATE runs SET claim_token_hash=? WHERE id=?').run(createHash('sha256').update(claimToken).digest('hex'), id)}
        reply(res, 201, { id, deck, claimToken, dataset, orderPolicy: ORDER_POLICY }); return
      }
      const recordingMatch = path.match(/^\/runs\/([0-9a-f-]{36})\/recording$/i)
      if (recordingMatch) {
        const run = db.prepare('SELECT * FROM runs WHERE id=?').get(recordingMatch[1])
        const ownsRun = run && (run.player.startsWith('google:') ? run.player === `google:${accounts.user(req)?.id}` : isGuestId(data.claimToken) && run.claim_token_hash === createHash('sha256').update(data.claimToken).digest('hex'))
        if (!ownsRun) {reply(res, 403, { error: 'This run cannot be updated.' }); return}
        if (!validNetworkIssues(data.networkIssues) || !['complete', 'stopped'].includes(data.status) || Object.keys(data).some(key => !['claimToken', 'networkIssues', 'status'].includes(key))) {reply(res, 400, { error: 'Invalid recording.' }); return}
        if (data.status === 'complete' && !run.complete) {reply(res, 409, { error: 'Run is incomplete.' }); return}
        const state = JSON.parse(run.state)
        state.networkIssues = data.networkIssues
        if (!run.complete && data.status === 'stopped') {state.status = 'stopped'; state.stoppedAt ??= now()}
        db.prepare('UPDATE runs SET state=? WHERE id=?').run(JSON.stringify(state), run.id)
        reply(res, 200, { recorded: true }); return
      }
      const claim = path.match(/^\/runs\/([0-9a-f-]{36})\/claim$/i)
      if (claim) {
        const account = accounts.user(req)
        if (!account) {reply(res, 401, { error: 'Sign in to save this score.' }); return}
        const run = db.prepare('SELECT * FROM runs WHERE id=?').get(claim[1])
        if (!isGuestId(data.claimToken) || !run || run.claim_token_hash !== createHash('sha256').update(data.claimToken).digest('hex') || Object.keys(data).some(key => key !== 'claimToken')) {reply(res, 403, { error: 'This score cannot be claimed.' }); return}
        const owner = `google:${account.id}`
        if (!run.complete || (run.player.startsWith('google:') && run.player !== owner)) {reply(res, 409, { error: 'This score cannot be claimed.' }); return}
        transaction(() => {
          if (run.player !== owner) {statistics.claim(owner, JSON.parse(run.state))}
          db.prepare('UPDATE runs SET player=?,name=?,published=1 WHERE id=?').run(owner, account.name, run.id)
        })
        reply(res, 200, { saved: true }); return
      }
      const publication = path.match(/^\/runs\/([0-9a-f-]{36})\/publish$/i)
      if (publication) {
        const run = db.prepare('SELECT * FROM runs WHERE id=?').get(publication[1])
        const name = typeof data.name === 'string' ? data.name.normalize('NFKC').trim() : ''
        if (!run || !isGuestId(data.claimToken) || run.claim_token_hash !== createHash('sha256').update(data.claimToken).digest('hex')) {reply(res, 403, { error: 'This score cannot be published.' }); return}
        if (!isGuestId(data.playerId) || !/^[\p{L}\p{N} ._'’-]{1,24}$/u.test(name) || Object.keys(data).some(key => !['claimToken', 'playerId', 'name'].includes(key))) {reply(res, 400, { error: 'Use a name of 1–24 letters or numbers.' }); return}
        const owner = `guest:${data.playerId}`
        if (!run.complete || (run.player !== `anonymous:${run.id}` && run.player !== owner)) {reply(res, 409, { error: 'This score cannot be published.' }); return}
        db.prepare('UPDATE runs SET player=?,name=?,published=1 WHERE id=?').run(owner, name, run.id)
        reply(res, 200, { saved: true }); return
      }
      const match = path.match(/^\/runs\/([0-9a-f-]{36})\/answers$/i)
      if (!match) {reply(res, 404, { error: 'Not found.' }); return}
      const run = db.prepare('SELECT * FROM runs WHERE id=?').get(match[1])
      if (!run || now() - run.started > 86400000) {reply(res, 404, { error: 'Run expired.' }); return}
      if (run.player.startsWith('google:') && run.player !== `google:${accounts.user(req)?.id}`) {reply(res, 401, { error: 'Sign in to finish this run.' }); return}
      const state = JSON.parse(run.state)
      if (state.status === 'stopped') {reply(res, 409, { error: 'Run was stopped.' }); return}
      if (![2, 3, 4].includes(state.version)) {reply(res, 409, { error: 'Start a new run for the updated rules.' }); return}
      const attempt = state.version >= 3 ? data.attempt : 0
      if (!Number.isInteger(data.index) || data.index < 0 || !Number.isInteger(attempt) || attempt < 0 || attempt >= (state.version >= 3 ? 3 : 1) || !(data.guess === null || (state.version === 4 ? ids : legacyIds).has(data.guess)) || !Number.isInteger(data.elapsedMs) || data.elapsedMs < 0 || (data.recording !== undefined && (!validAnswerRecording(data.recording) || (data.guess === null ? data.recording.hit !== 'skip' || data.recording.coordinate !== null : data.recording.hit === 'skip'))) || Object.keys(data).some(k => !(state.version >= 3 ? ['index', 'attempt', 'guess', 'elapsedMs', 'recording'] : ['index', 'guess', 'elapsedMs', 'recording']).includes(k))) {reply(res, 400, { error: 'Invalid answer.' }); return}
      const weighted = state.version === 4
      const scoreResult = () => weighted ? { score: run.points / 4, green: state.green, yellow: state.yellow, orange: state.orange, red: state.red } : {}
      const pending = state.attempts || []
      const previous = data.index < state.answers.length ? (state.answers[data.index].guesses || [state.answers[data.index]])[attempt] : data.index === state.answers.length ? pending[attempt] : undefined
      if (previous && previous.guess === data.guess && previous.elapsedMs === data.elapsedMs) {
        reply(res, 200, { complete: Boolean(run.complete), correct: run.correct, total: quiz.length, timeMs: run.time_ms, ...scoreResult(), ...(state.version >= 3 ? { resolved: data.index < state.answers.length, attemptsLeft: 3 - pending.length } : {}) }); return
      }
      if (run.complete || data.index !== state.answers.length || attempt !== pending.length) {reply(res, 409, { error: 'Answer out of order.' }); return}
      if (data.elapsedMs < (pending.at(-1)?.elapsedMs ?? state.answers.at(-1)?.elapsedMs ?? 0) || data.elapsedMs > Math.min(86400000, now() - run.started + 1000)) {reply(res, 400, { error: 'Invalid answer time.' }); return}
      if (state.ignoreAnswered && data.guess !== null && state.deck.slice(0, state.answers.length).includes(data.guess)) {
        reply(res, 200, { complete: false, correct: run.correct, total: quiz.length, timeMs: run.time_ms, ...scoreResult(), ...(state.version >= 3 ? { resolved: false, attemptsLeft: 3 - pending.length } : {}), ignored: true }); return
      }
      const correct = data.guess === state.deck[data.index]
      const resolved = state.version === 2 || correct || data.guess === null || attempt === 2
      const count = run.correct + Number(correct)
      const timeMs = correct ? data.elapsedMs : run.time_ms
      const previousTime = pending.at(-1)?.elapsedMs ?? state.answers.at(-1)?.elapsedMs ?? 0
      const priorResolved = run.player.startsWith('google:') ? db.prepare('SELECT played FROM country_stats WHERE scope=? AND country=?').get(run.player, state.deck[data.index])?.played ?? 0 : data.recording?.priorResolved ?? null
      const guess = { guess: data.guess, elapsedMs: data.elapsedMs, responseMs: data.elapsedMs - previousTime, receivedAt: now(), ...(data.recording ? { recording: { ...data.recording, priorResolved, priorResolvedScope: run.player.startsWith('google:') ? 'account' : priorResolved === null ? 'unknown' : 'device' } } : {}) }
      let points = run.points
      if (resolved) {
        if (weighted) {
          state[correct ? ['green', 'yellow', 'orange'][attempt] : 'red']++
          points += correct ? [4, 2, 1][attempt] : 0
        }
        state.answers.push({ ...guess, ...(state.version >= 3 ? { guesses: [...pending, guess] } : {}) })
        state.attempts = []
      } else {state.attempts = [...pending, guess]}
      const complete = state.answers.length === quiz.length
      state.lastReceivedAt = now()
      if (complete) {state.status = 'complete'}
      transaction(() => {
        db.prepare('UPDATE runs SET state=?,correct=?,time_ms=?,complete=?,points=?,finished_at=? WHERE id=?').run(JSON.stringify(state), count, timeMs, Number(complete), points, complete ? now() : null, run.id)
        if (resolved && state.version >= 3) {statistics.record(run.player, state.deck[data.index], correct, data.guess === null, attempt + 1)}
      })
      reply(res, 200, { complete, correct: count, total: quiz.length, timeMs, ...(weighted ? { score: points / 4, green: state.green, yellow: state.yellow, orange: state.orange, red: state.red } : {}), ...(state.version >= 3 ? { resolved, attemptsLeft: resolved ? 3 : 3 - state.attempts.length } : {}) })
    } catch {
      if (!res.headersSent) reply(res, 500, { error: 'Ranking unavailable.' })
      else res.end()
    }
  }
  return { handle, reports, close: () => reports.close() }
}
