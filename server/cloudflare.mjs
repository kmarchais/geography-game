import { DurableObject } from 'cloudflare:workers'
import { createAtlasApi } from './api.mjs'
import { publishGithubReport } from './reports.mjs'
import countries from '../public/data/globe/countries.json'

export class AtlasDatabase extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    const sql = ctx.storage.sql
    const db = {
      exec: text => {sql.exec(text).toArray()},
      prepare: text => ({
        all: (...args) => sql.exec(text, ...args).toArray(),
        get: (...args) => sql.exec(text, ...args).toArray()[0],
        run: (...args) => {
          sql.exec(text, ...args).toArray()
          return { changes: sql.exec('SELECT changes() AS n').one().n }
        },
      }),
    }
    this.api = createAtlasApi({
      db, countries, transaction: action => ctx.storage.transactionSync(action),
      origins: JSON.parse(env.ATLAS_ALLOWED_ORIGINS || '[]'),
      crossSiteOrigins: JSON.parse(env.ATLAS_CROSS_SITE_ORIGINS || '["https://localhost"]'),
      googleClientId: env.GOOGLE_CLIENT_ID || '',
      reportPublisher: row => {
        if (!env.ATLAS_GITHUB_TOKEN) {throw new Error('GitHub publisher is not configured')}
        return publishGithubReport(row, undefined, { token: env.ATLAS_GITHUB_TOKEN })
      },
      reportWake: timestamp => {ctx.waitUntil(ctx.storage.setAlarm(Math.max(Date.now() + 10, timestamp)))},
    })
  }

  async request(url, method, headers, body) {
    const responseHeaders = new Headers()
    let status = 200, payload
    const res = {
      headersSent: false,
      setHeader: (key, value) => responseHeaders.set(key, value),
      writeHead: (code, values) => {
        status = code
        for (const [key, value] of Object.entries(values)) {responseHeaders.set(key, value)}
        res.headersSent = true
      },
      end: value => {payload = value},
    }
    const req = { url, method, headers, async *[Symbol.asyncIterator]() {if (body) {yield body}} }
    await this.api.handle(req, res)
    return { status, headers: [...responseHeaders], body: payload }
  }

  async alarm() {await this.api.reports.publishPending()}
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname
    if (!/^\/atlas-api(?:\/|$)/.test(path)) {return env.ASSETS.fetch(request)}
    // Bound the body before RPC, including requests without Content-Length.
    let size = 0
    const chunks = []
    if (request.body) {
      for await (const chunk of request.body) {
        size += chunk.byteLength
        if (size > 131072) {return new Response(null, { status: 413 })}
        chunks.push(chunk)
      }
    }
    const body = Buffer.concat(chunks).toString('utf8')
    // ponytail: one shared ranking database for the initial small player pool;
    // move to D1 or partition runs if this object's request throughput becomes a limit.
    const result = await env.ATLAS_DATABASE.getByName('atlas').request(request.url, request.method, Object.fromEntries(request.headers), body)
    return new Response(result.status === 204 ? null : result.body, { status: result.status, headers: result.headers })
  },
}
