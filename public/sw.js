// Service Worker à prova de cache obsoleto.
// Não faz cache do shell: a rede é sempre a fonte da verdade.
// Ao ativar, remove TODOS os caches antigos e assume o controle imediatamente,
// evitando que o TWA/APK rode uma versão obsoleta do app.
//
// O handler fetch é pass-through (rede sempre) — necessário para que o Chrome
// considere o PWA instalável e dispare o evento beforeinstallprompt.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

// Pass-through: tudo vai direto para a rede, sem cache.
// A presença deste handler satisfaz o critério de instalabilidade do Chrome.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 504 })));
});
