// Myriam Service Worker — v2 (cache-busting reset)
// Garante que versões antigas do bundle sejam descartadas e o app
// sempre carregue o código mais recente após um deploy.
const CACHE_VERSION = 'myriam-sw-v2';
const CACHE_STATIC = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  // Assume o controle imediatamente, sem esperar o SW antigo morrer.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove TODOS os caches antigos (de qualquer versão anterior do SW).
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k))
      );
      // Assume o controle de todas as abas abertas imediatamente.
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Ignora requisições de outras origens (CDNs, APIs externas, etc.).
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): network-first — sempre busca o HTML mais recente.
  // Isso garante que o index.html referencie o bundle com hash novo.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_STATIC);
          cache.put('/index.html', fresh.clone()).catch(() => {});
          return fresh;
        } catch (e) {
          const cached = (await caches.match(request)) || (await caches.match('/index.html'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Assets estáticos (JS/CSS/imagens com hash): stale-while-revalidate.
  // Como o HTML é sempre fresco, ele referencia o hash correto do bundle,
  // então o cache só serve versões válidas.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(request, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })()
  );
});
