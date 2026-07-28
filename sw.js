/* --------------------------------------------------------------
   Service Worker – precache static assets + runtime cache for API
   -------------------------------------------------------------- */
const CACHE_NAME = 'photo-quiz-v1';
const PRECACHE = [
  '/', '/index.html', '/styles.css', '/app.js',
  '/manifest.webmanifest',
  '/tokens.json',
  // add any icon files you place in /icons/
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network‑first for API calls (adjust path as needed)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Stale‑while‑revalidate for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(r => {
        if (r.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
