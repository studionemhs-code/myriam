// Service Worker mínimo e à prova de cache obsoleto.
// Não faz cache do shell: a rede é sempre a fonte da verdade.
// Ao ativar, remove TODOS os caches antigos e assume o controle imediatamente,
// evitando que o TWA/APK rode uma versão obsoleta do app.

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

// Sem interceptação de fetch: tudo passa direto para a rede/navegador.
