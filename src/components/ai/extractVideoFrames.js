const waitFor = (video, event) => new Promise((resolve, reject) => {
  const cleanup = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener('error', fail); };
  const done = () => { cleanup(); resolve(); };
  const fail = () => { cleanup(); reject(new Error('Não foi possível ler o vídeo. Tente um MP4 compatível com seu navegador.')); };
  const timer = setTimeout(fail, 15000);
  video.addEventListener(event, done, { once: true }); video.addEventListener('error', fail, { once: true });
});

export default async function extractVideoFrames(file) {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.preload = 'auto'; video.muted = true; video.playsInline = true;
  try {
    const ready = waitFor(video, 'loadeddata'); video.src = url; video.load(); await ready;
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('O vídeo não possui uma duração válida.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 768 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d'); const frames = [];
    for (let i = 0; i < 8; i++) {
      const time = (video.duration - 0.01) * i / 7;
      if (Math.abs(video.currentTime - time) > 0.001) { const seek = waitFor(video, 'seeked'); video.currentTime = time; await seek; }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ time: Math.round(time * 100) / 100, url: canvas.toDataURL('image/jpeg', 0.7) });
    }
    return frames;
  } finally { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
}