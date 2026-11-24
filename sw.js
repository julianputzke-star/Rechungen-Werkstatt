/* Service Worker: hält das Programm offline verfügbar.
   Bei jeder Programmänderung VERSION erhöhen, damit Geräte die neue Fassung laden. */
const VERSION = 'v6';
const CACHE = 'rechnungen-' + VERSION;
const DATEIEN = [
  './', './index.html', './style.css', './app.js', './pdf.js', './manifest.webmanifest',
  './vendor/jspdf.umd.min.js', './vendor/jspdf.plugin.autotable.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rechnungen-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst Netz (damit Updates ankommen), bei fehlendem Internet aus dem Speicher
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const kopie = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
