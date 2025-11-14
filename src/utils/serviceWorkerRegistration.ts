/**
 * Service Worker Registration Utility
 * Handles registration, updates, and lifecycle events
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register service worker
 */
export async function register(config?: ServiceWorkerConfig): Promise<void> {
  if (!isServiceWorkerSupported()) {
    console.log('[SW Registration] Service workers not supported');
    return;
  }

  if (import.meta.env.MODE !== 'production') {
    console.log('[SW Registration] Skipping registration in development mode');
    return;
  }

  try {
    const publicUrl = new URL(import.meta.env.BASE_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      if (import.meta.env.DEV) {
        console.log('[SW Registration] Service worker not registered (different origin)');
      }
      return;
    }

    // Register service worker
    const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    if (import.meta.env.DEV) {
      console.log('[SW Registration] Registering service worker:', swUrl);
    }

    const registration = await navigator.serviceWorker.register(swUrl);

    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            if (import.meta.env.DEV) {
              console.log('[SW Registration] New content available, please refresh');
            }
            config?.onUpdate?.(registration);
          } else {
            // Content cached for offline use
            if (import.meta.env.DEV) {
              console.log('[SW Registration] Content cached for offline use');
            }
            config?.onSuccess?.(registration);
          }
        }
      };
    };

    // Listen for online/offline events
    window.addEventListener('online', () => {
      if (import.meta.env.DEV) {
        console.log('[SW Registration] Back online');
      }
      config?.onOnline?.();
    });

    window.addEventListener('offline', () => {
      if (import.meta.env.DEV) {
        console.log('[SW Registration] Gone offline');
      }
      config?.onOffline?.();
    });

  } catch (error) {
    console.error('[SW Registration] Error registering service worker:', error);
  }
}

/**
 * Unregister service worker
 */
export async function unregister(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    if (import.meta.env.DEV) {
      console.log('[SW Registration] Service worker unregistered');
    }
  } catch (error) {
    console.error('[SW Registration] Error unregistering service worker:', error);
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  if (registration.active) {
    registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }

  // Also clear browser caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    if (import.meta.env.DEV) {
      console.log('[SW Registration] All caches cleared');
    }
  }
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  if (!isServiceWorkerSupported()) {
    return 0;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'CACHE_SIZE') {
        resolve(event.data.size);
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.active) {
        registration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      } else {
        resolve(0);
      }
    });
  });
}

/**
 * Check if app is currently offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Get service worker registration
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported()) {
    return undefined;
  }

  return navigator.serviceWorker.getRegistration();
}
