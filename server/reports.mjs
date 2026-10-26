import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { isGuestId } from '../src/globe/game.ts'

const repository = 'kmarchais/geography-game'
function gh(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = execFile('gh', args, { timeout: 15000, maxBuffer: 16777216, encoding: 'utf8', windowsHide: true }, (error, output) => error ? reject(new Error('GitHub unavailable')) : resolve(output))
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}
export async function publishGithubReport(report, request = gh) {
  await request(['auth', 'switch', '--hostname', 'github.com', '--user', 'kmarchais'])
  await request(['auth', 'status', '--hostname', 'github.com'])
  if ((await request(['api', 'user', '--jq', '.login'])).trim() !== 'kmarchais') {throw new Error('Wrong GitHub account')}
  const marker = `<!-- atlas-report:${report.id} -->`
  // ponytail: inspect 100 recent issues; paginate if this repo exceeds that retry window.
  const existing = await request(['api', `repos/${repository}/issues?state=all&per_page=100&sort=created&direction=desc`, '--jq', `.[] | select((.body // "") | contains(${JSON.stringify(marker)})) | .html_url`])
  if (existing.trim()) {return existing.trim().split('\n')[0]}
  const context = JSON.parse(report.context)
  const quiet = text => text.replace(/@/g, '@\u200b')
  const body = `${quiet(report.description)}\n\n---\nReported from Atlas\n\n- Platform: ${context.platform}\n- Version: ${context.version}\n- Screen: ${context.width} × ${context.height}\n- Country: ${context.country || 'No active question'}\n\n${marker}`
  const result = await request(['api', '--method', 'POST', `repos/${repository}/issues`, '--input', '-'], JSON.stringify({ title: `[Atlas bug] ${quiet(report.title)}`, body }))
  return JSON.parse(result).html_url
}

export function createBugReports(db, { now = Date.now, publish = publishGithubReport } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS bug_reports(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,context TEXT NOT NULL,
    reporter TEXT NOT NULL,created INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_attempt INTEGER NOT NULL DEFAULT 0,issue_url TEXT,published_at INTEGER);`)
  let timer, busy = false, closed = false
  const status = id => {
    const row = db.prepare('SELECT id,issue_url FROM bug_reports WHERE id=?').get(id)
    return row ? { id: row.id, state: row.issue_url ? 'published' : 'pending', issueUrl: row.issue_url } : undefined
  }
  function schedule(delay = 0) {
    clearTimeout(timer)
    if (!closed) {timer = setTimeout(() => {publishPending().catch(() => schedule(60000))}, delay); timer.unref()}
  }
  async function publishPending() {
    if (closed || busy) {return}
    const time = now(), day = Math.floor(time / 86400000) * 86400000
    // Trial protection: at most 20 automatic GitHub issues a day, including recovered reports.
    if (db.prepare('SELECT COUNT(*) n FROM bug_reports WHERE published_at>=?').get(day).n >= 20) {schedule(day + 86400000 - time); return}
    const row = db.prepare('SELECT * FROM bug_reports WHERE issue_url IS NULL AND next_attempt<=? ORDER BY created,id LIMIT 1').get(time)
    if (!row) {
      const next = db.prepare('SELECT MIN(next_attempt) due FROM bug_reports WHERE issue_url IS NULL').get().due
      if (next !== null) {schedule(Math.max(10, next - time))}
      return
    }
    const claimed = db.prepare('UPDATE bug_reports SET attempts=attempts+1,next_attempt=? WHERE id=? AND next_attempt<=?').run(time + 120000, row.id, time)
    if (!claimed.changes) {schedule(); return}
    busy = true
    try {
      const url = await publish(row)
      if (!/^https:\/\/github\.com\/kmarchais\/geography-game\/issues\/\d+$/.test(url)) {throw new Error('Invalid issue URL')}
      if (!closed) {db.prepare('UPDATE bug_reports SET issue_url=?,published_at=? WHERE id=?').run(url, now(), row.id)}
    } catch {
      if (!closed) {db.prepare('UPDATE bug_reports SET next_attempt=? WHERE id=?').run(now() + Math.min(3600000, 3000 * 2 ** Math.min(row.attempts, 10)), row.id)}
    } finally {busy = false; if (!closed) {schedule()}}
  }
  function submit(data, account) {
    const title = typeof data.title === 'string' ? data.title.replace(/\s+/g, ' ').trim() : '', description = typeof data.description === 'string' ? data.description.replace(/\r\n?/g, '\n').trim() : '', context = data.context
    if (!isGuestId(data.id) || !isGuestId(data.playerId) || !title || title.length > 100 || !description || description.length > 5000 || /[\u0000-\u0008\u000b-\u001f]/.test(title + description)
      || Object.keys(data).some(key => !['id', 'playerId', 'title', 'description', 'context'].includes(key))
      || !context || typeof context !== 'object' || Array.isArray(context) || Object.keys(context).some(key => !['platform', 'version', 'width', 'height', 'country'].includes(key))
      || !['Android', 'Web'].includes(context.platform) || typeof context.version !== 'string' || !/^[A-Za-z0-9 .()+-]{1,50}$/.test(context.version)
      || ![context.width, context.height].every(value => Number.isInteger(value) && value > 0 && value <= 10000) || !(context.country === null || /^[A-Z]{3}$/.test(context.country))) {
      return { status: 400, error: 'Enter a title and description for this bug.' }
    }
    const reporter = createHash('sha256').update(account ? `google:${account.id}` : `guest:${data.playerId}`).digest('hex')
    const existing = db.prepare('SELECT * FROM bug_reports WHERE id=?').get(data.id)
    if (existing) {
      if (existing.reporter !== reporter || existing.title !== title || existing.description !== description || existing.context !== JSON.stringify(context)) {return { status: 409, error: 'Report ID already used.' }}
      return { status: 200, report: status(data.id) }
    }
    const time = now(), day = Math.floor(time / 86400000) * 86400000
    if (db.prepare('SELECT COUNT(*) n FROM bug_reports WHERE created>=?').get(day).n >= 20 || db.prepare('SELECT COUNT(*) n FROM bug_reports WHERE reporter=? AND created>=?').get(reporter, time - 3600000).n >= 3) {
      return { status: 429, error: 'Too many reports. Please try again later.' }
    }
    db.prepare('INSERT INTO bug_reports(id,title,description,context,reporter,created) VALUES(?,?,?,?,?,?)').run(data.id, title, description, JSON.stringify(context), reporter, time)
    schedule()
    return { status: 202, report: status(data.id) }
  }
  schedule()
  return { submit, status, publishPending, close: () => {closed = true; clearTimeout(timer)} }
}
