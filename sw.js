/* ============================================================
   FINANCE X — sw.js
   Service Worker: offline-first caching strategy
   ============================================================ */

const CACHE_NAME    = 'financex-v1';
const DYNAMIC_CACHE = 'financex-dynamic-v1';

// Core app shell — these files will always be available offline
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  // External CDN resources (cached on first use)
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
];

// ============================================================
// INSTALL: Cache the app shell
// ============================================================
self.addEventListener('install', event => {
  console.log('[SW] Installing Finance X Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      // Cache what we can; ignore failures for CDN items that may block
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(err => {
          console.warn(`[SW] Failed to cache: ${url}`, err);
        }))
      );
    }).then(() => {
      console.log('[SW] App shell cached');
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ============================================================
// ACTIVATE: Clean up old caches
// ============================================================
self.addEventListener('activate', event => {
  console.log('[SW] Activating Finance X Service Worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim(); // take control of all clients
    })
  );
});

// ============================================================
// FETCH: Cache-first for app shell, network-first for dynamic
// ============================================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;

  // For Google Fonts CSS — network first, fallback to cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // For CDN JS (Chart.js, QRCode) — cache first
  if (url.hostname.includes('jsdelivr.net') || url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // For our own files — cache first, fallback to network
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // Everything else — network first
  event.respondWith(networkFirstStrategy(event.request));
});

// ============================================================
// STRATEGY: Cache First (offline-first for static assets)
// ============================================================
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ============================================================
// STRATEGY: Network First (fresh content when online)
// ============================================================
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ============================================================
// MESSAGE: Handle messages from the main thread
// ============================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
