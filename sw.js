/* Service worker: gör att appen öppnas även utan uppkoppling (kartbilder och data kräver ändå nät första gången). */
const VER = 'skogsplan-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // egna filer: hämta nytt om det går, annars från minnet
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
  } else if (url.hostname === 'www.gstatic.com' || url.hostname === 'cdnjs.cloudflare.com') {
    // versionslåsta bibliotek (Leaflet, Firebase): från minnet först
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VER).then(c => c.put(req, cp)); }
        return res;
      }))
    );
  }
  // kartrutor, Firebase-anrop m.m. går direkt mot nätet
});
