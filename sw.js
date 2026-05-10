const CACHE_NAME = 'v1_cache';
const ASSETS_TO_CACHE = [
  'index.html',
  'styles.css',
  'script.js',
  'icons/netball-icon-192.png',
  'icons/netball-icon-512.png'
];

// Install the service worker and cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});