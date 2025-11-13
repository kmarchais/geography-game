/**
 * Service Worker for Geography Game
 * Provides offline caching and performance optimization
 *
 * TODO: Migrate to vite-plugin-pwa when Vite 6+ compatibility is resolved
 * See vite.config.mts for migration instructions and configuration template
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `geography-game-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `geography-game-data-${CACHE_VERSION}`;

// Assets to cache on install
// TODO: These paths should be generated at build time by vite-plugin-pwa
// because Vite generates hashed filenames (e.g., index-a1b2c3d4.js)
// For now, we'll skip static asset caching and only cache GeoJSON data
const STATIC_ASSETS = [
  '/geography-game/',
  '/geography-game/index.html',
  // NOTE: Commented out because Vite generates hashed asset names
  // Use vite-plugin-pwa to generate these automatically
  // '/geography-game/assets/index.css',
  // '/geography-game/assets/index.js',
];

// GeoJSON data URLs to cache
const GEOJSON_URLS = [
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson',
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_1_states_provinces_shp.geojson',
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
      .then(() => {
        console.log('[SW] Service worker installed, skipping waiting...');
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated, claiming clients...');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - cache strategy based on request type
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (except GeoJSON data)
  if (url.origin !== location.origin && !isGeoJSONRequest(request)) {
    return;
  }

  // Handle different request types
  if (isGeoJSONRequest(request)) {
    event.respondWith(handleGeoJSONRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

/**
 * Check if request is for GeoJSON data
 */
function isGeoJSONRequest(request) {
  return request.url.includes('.geojson') ||
         request.url.includes('naturalearth') ||
         request.url.includes('cloudfront');
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|ttf|eot)$/);
}

/**
 * Handle GeoJSON requests with stale-while-revalidate strategy
 * This provides instant response from cache while updating in background
 */
async function handleGeoJSONRequest(request) {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch from network in background
  const networkPromise = fetch(request)
    .then((response) => {
      // Only cache successful responses
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.error('[SW] Network request failed:', error);
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving GeoJSON from cache:', request.url);
    // Update cache in background
    networkPromise.catch(() => {
      // Silently fail - we have cached version
    });
    return cachedResponse;
  }

  // No cache, wait for network
  console.log('[SW] No cache, fetching from network:', request.url);
  const networkResponse = await networkPromise;

  if (networkResponse) {
    return networkResponse;
  }

  // Network failed and no cache - return error response
  return new Response('Offline and no cached data available', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving static asset from cache:', request.url);
    return cachedResponse;
  }

  try {
    console.log('[SW] Fetching static asset from network:', request.url);
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', error);
    return new Response('Offline and asset not cached', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Handle navigation requests with network-first strategy
 */
async function handleNavigationRequest(request) {
  try {
    console.log('[SW] Fetching navigation from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);

    // Try cache fallback
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving navigation from cache:', request.url);
      return cachedResponse;
    }

    // Return offline page fallback
    const offlineResponse = await cache.match('/geography-game/index.html');
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response('Offline and no cached page available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      })
    );
  }
});

/**
 * Get total cache size
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

console.log('[SW] Service worker script loaded');
