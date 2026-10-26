import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.gz': 'application/gzip', '.txt': 'text/plain; charset=utf-8' }
export async function serveStatic(req, res, directory) {
  const end = status => {res.writeHead(status, { 'X-Content-Type-Options': 'nosniff' }); res.end()}
  if (!['GET', 'HEAD'].includes(req.method)) {end(405); return}
  let pathname
  try {pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)} catch {end(400); return}
  const root = resolve(directory)
  let file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!file.startsWith(root + sep) || pathname.includes('\0') || pathname.split(/[\\/]/).some(part => part.startsWith('.'))) {end(403); return}
  async function size(path) {try {const info = await stat(path); return info.isFile() ? info.size : undefined} catch (error) {if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {return undefined} throw error}}
  let length = await size(file)
  if (length === undefined && !extname(pathname) && !pathname.startsWith('/assets/')) {file = resolve(root, 'index.html'); length = await size(file)}
  if (length === undefined) {end(404); return}
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': length, 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' })
  if (req.method === 'HEAD') {res.end(); return}
  await pipeline(createReadStream(file), res)
}
