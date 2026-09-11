// Service worker mínimo: apenas satisfaz o critério de instalabilidade do PWA.
// Não faz cache para garantir que o app sempre carregue a versão mais recente.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through obrigatório para o Chrome considerar o app instalável.
  event.respondWith(fetch(event.request));
});
