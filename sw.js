const CACHE = 'clubclem-v2';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const isImg = u.pathname.includes('/img/') || u.pathname.includes('/fonts/');
  if (isImg) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return res; })));
  } else {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});
