const CACHE = 'sourougnon-agent-v202608262045';
const ASSETS = ['./','./login.html','./index.html','./styles.css','./app.js','./db.js','./manifest.json','./assets/logo_sourougnon1.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; })
        .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request).then(r => {
      const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r;
    }))
  );
});
