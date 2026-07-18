const CACHE_NAME = 'apex-link-v4';
const APP_SHELL = [
  '/offline.html',
  '/manifest.webmanifest',
  '/logo.webp?v=20260716'
];

const HTML_CONTENT_TYPE = 'text/html';

const isHtmlResponse = (response) => {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes(HTML_CONTENT_TYPE);
};

const isCacheableStaticResponse = (response) =>
  response && response.status === 200 && response.type !== 'opaque' && !isHtmlResponse(response);

const isStaticAssetRequest = (request, url) =>
  url.pathname.startsWith('/assets/') ||
  ['font', 'image', 'manifest', 'script', 'style'].includes(request.destination);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => response)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  if (!isStaticAssetRequest(request, url)) {
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((response) => {
        if (isCacheableStaticResponse(response)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Apex Link Group';
  const options = {
    body: data.body || 'You have a new marketplace update.',
    icon: '/logo.webp?v=20260716',
    badge: '/logo.webp?v=20260716',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url.endsWith(url));

      if (matchingClient) {
        return matchingClient.focus();
      }

      return self.clients.openWindow(url);
    })
  );
});
