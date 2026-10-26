import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAtlasApi } from './api.mjs'
import { serveStatic } from './static.mjs'

const snapshot = JSON.parse(readFileSync(new URL('../public/data/globe/countries.json', import.meta.url)))

export function createRankingServer({ databasePath = '.local/atlas.sqlite', countries = snapshot, staticDirectory, ...options } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(resolve(databasePath)), { recursive: true })
  const db = new DatabaseSync(databasePath)
  db.exec('PRAGMA journal_mode=WAL')
  const transaction = action => {
    db.exec('BEGIN')
    try {const result = action(); db.exec('COMMIT'); return result}
    catch (error) {db.exec('ROLLBACK'); throw error}
  }
  const api = createAtlasApi({ ...options, db, transaction, countries })
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname
    if (staticDirectory && path !== '/health' && !/^\/atlas-api(?:\/|$)/.test(path)) {await serveStatic(req, res, staticDirectory); return}
    await api.handle(req, res)
  })
  server.on('close', () => {api.close(); db.close()})
  return server
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.RAILWAY_ENVIRONMENT_ID && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {throw new Error('Attach a persistent Railway volume before starting Atlas.')}
  const publicOrigin = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ''
  const server = createRankingServer({ databasePath: process.env.ATLAS_DB || '.local/atlas.sqlite', googleClientId: process.env.GOOGLE_CLIENT_ID || '', staticDirectory: process.env.ATLAS_STATIC_DIR, crossSiteOrigins: (process.env.ATLAS_CROSS_SITE_ORIGINS || 'https://localhost').split(','), origins: (process.env.ATLAS_ALLOWED_ORIGINS || ['https://localhost', 'http://127.0.0.1:3000', 'http://127.0.0.1:4174', publicOrigin].filter(Boolean).join(',')).split(',') })
  server.listen(Number(process.env.PORT || process.env.ATLAS_PORT) || 4178, process.env.ATLAS_HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1'), () => console.log('Atlas service ready'))
  process.on('SIGTERM', () => server.close())
  process.on('SIGINT', () => server.close())
}
