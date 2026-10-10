/* Revision Tracker service worker v5.
   Forces the browser to refresh the HTML, application JS, CSS and public config
   while online, while still keeping cached copies for offline use. */
const CACHE_NAME = 'revision-tracker-v6';
const APP_FILES = [
  './', './index.html', './styles.css', './app.js',
  './manifest.webmanifest', './icon.svg', './icon-180.png',
  './icon-192.png', './icon-512.png', './supabase-config.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const path = requestUrl.pathname;
  const refreshWhileOnline = event.request.mode === 'navigate' ||
    path.endsWith('/index.html') ||
    path.endsWith('/app.js') ||
    path.endsWith('/styles.css') ||
    path.endsWith('/supabase-config.js') ||
    path.endsWith('/manifest.webmanifest');

  if (refreshWhileOnline) {
    // Network-first for the code/config that changes during deployment.
    // cache:'reload' bypasses the normal HTTP cache where supported.
    event.respondWith(
      fetch(new Request(event.request, { cache: 'reload' }))
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for icons and other static assets.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Revision reminder', body: event.data ? event.data.text() : 'A revision session is coming up.' };
  }
  const title = payload.title || 'Revision reminder';
  const options = {
    body: payload.body || 'A revision session is coming up.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: payload.url || './' },
    tag: payload.tag || 'revision-reminder'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
    })
  );
});
