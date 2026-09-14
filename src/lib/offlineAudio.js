// Cache de áudios de oração para escuta offline via Cache API do navegador.
const CACHE_NAME = 'prayer-audio-v1';

async function openCache() {
  if (typeof caches === 'undefined') return null;
  return caches.open(CACHE_NAME);
}

export function isOfflineSupported() {
  return typeof caches !== 'undefined';
}

export async function downloadAudio(url) {
  const cache = await openCache();
  if (!cache) throw new Error('Armazenamento offline não suportado neste dispositivo.');
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('Não foi possível baixar este áudio.');
  await cache.put(url, res.clone());
  return true;
}

export async function isAudioDownloaded(url) {
  const cache = await openCache();
  if (!cache) return false;
  const match = await cache.match(url);
  return !!match;
}

// Retorna uma URL blob: local se o áudio estiver em cache, senão a URL original.
export async function getPlayableAudioUrl(url) {
  if (!url) return url;
  const cache = await openCache();
  if (!cache) return url;
  const match = await cache.match(url);
  if (match) {
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  }
  return url;
}

export async function removeAudio(url) {
  const cache = await openCache();
  if (!cache) return false;
  return cache.delete(url);
}

export async function listOfflineAudioUrls() {
  const cache = await openCache();
  if (!cache) return [];
  const keys = await cache.keys();
  return keys.map((r) => r.url);
}