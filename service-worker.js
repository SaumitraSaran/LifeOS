const CACHE = 'lifeos-demo-v1';
const BASE = new URL('./', self.location).pathname;
const ASSETS = [BASE, `${BASE}index.html`, `${BASE}manifest.json`, `${BASE}logo.png`, `${BASE}static/main.css`, `${BASE}static/config.js`, `${BASE}static/api.js`, `${BASE}static/app.js`, `${BASE}static/enhanced.js`];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(`${BASE}index.html`)))));
