/* The build lists exact hashed dependencies for the globe route in precache.js. */
importScripts('./precache.js')
const scope = self.registration.scope
const prefix = `orbit-${new URL(scope).pathname}-`
const cacheName = `${prefix}${self.ORBIT_CACHE_VERSION}`
const core = self.ORBIT_PRECACHE.map(path => new URL(path, scope).href)

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(core)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if ((name.startsWith(prefix) && name !== cacheName) || (new URL(scope).pathname === '/geography-game/' && /^geography-game-(data-)?v1$/.test(name))) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  const isAppNavigation = request.mode === 'navigate' && url.pathname.startsWith(new URL(scope).pathname)
  if (!isAppNavigation && !core.includes(url.href)) return
  event.respondWith((async () => {
    // Refreshes use the current interface online. A new worker never reloads
    // an active game; the complete local snapshot remains the offline fallback.
    if (isAppNavigation) {
      try { const live = await fetch(request, { cache: 'no-store' }); if (live.ok) return live } catch {}
    }
    // Assets are public, same-origin build files. Preview hosts can add Vary: Origin
    // to a synthetic precache request, which otherwise misses on module requests.
    const cached = await caches.match(isAppNavigation ? scope : request, { cacheName, ignoreVary: true })
    return cached || fetch(request)
  })())
})
