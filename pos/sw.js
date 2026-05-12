// Trace Pulse — Service Worker (Phase Two: Offline Resilience)
const CACHE_NAME = 'trace-pulse-v2';
const STATIC_ASSETS = [
    '/trace/pos/index.html',
    '/trace/pos/assets/css/style.css',
    '/trace/pos/assets/css/print.css',
    '/trace/pos/assets/js/core.js',
    '/trace/pos/assets/js/pos.js',
    '/trace/pos/assets/js/offline-queue.js',
    '/trace/pos/assets/js/theme.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

const API_CACHE_URLS = [
    '/trace/api/?action=get_menu',
    '/trace/api/?action=get_inventory',
    '/trace/api/?action=get_menu_categories',
    '/trace/api/?action=get_taxes'
];

// Install: pre-cache static assets + core API data
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS).catch(() => {
                // Non-fatal: CDN resources may fail in offline installs
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Never intercept POST requests — handled by offline-queue.js
    if (event.request.method !== 'GET') return;

    const isApiCall = url.pathname.includes('/trace/api/');
    const isReadOnlyApi = API_CACHE_URLS.some(u => event.request.url.includes(u));

    if (isApiCall && isReadOnlyApi) {
        // Network-first, fall back to cache for core data
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
        // Cache-first for static assets
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request))
        );
    }
});
