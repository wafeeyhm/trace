// Trace Pulse — Service Worker (Phase Two: Offline Resilience)
const CACHE_NAME = 'trace-pulse-v3';

const STATIC_ASSETS = [
    '/trace/pos/index.html',
    '/trace/pos/kds.html',
    '/trace/pos/assets/css/style.css',
    '/trace/pos/assets/css/print.css',
    '/trace/pos/assets/js/core.js',
    '/trace/pos/assets/js/pos.js',
    '/trace/pos/assets/js/offline-queue.js',
    '/trace/pos/assets/js/theme.js',
    '/trace/pos/assets/js/kds.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

// Read-only API calls that should be cached for offline fallback.
// Must match exactly what core.js and kds.js fetch.
const API_CACHE_URLS = [
    '/trace/api/?action=get_menu',
    '/trace/api/?action=get_inventory',
    '/trace/api/?action=get_menu_categories',
    '/trace/api/?action=get_taxes',
];

// Install: pre-cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(STATIC_ASSETS).catch(() => {
                // Non-fatal: CDN resources may fail in offline installs
            })
        )
    );
    self.skipWaiting();
});

// Activate: purge old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch strategy:
//   - POST requests:        never intercept (handled by offline-queue.js)
//   - Read-only API GETs:   network-first, fall back to cache
//   - Static assets:        cache-first, fall back to network
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isReadOnlyApi = API_CACHE_URLS.some(u => event.request.url.includes(u));

    if (isReadOnlyApi) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request))
        );
    }
});
