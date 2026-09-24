const CACHE_NAME = 'omr-scanner-v1.1.0';
const ASSETS = ['./', './index.html', './manifest.json', './css/styles.css', './js/app.js',
  ...['Camera', 'Template', 'OMREngine', 'Scanner', 'Config', 'Storage', 'UI', 'ExamReview', 'Evidence', 'Roster'].map(name => `./js/modules/${name}.js`)];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('omr-scanner-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
