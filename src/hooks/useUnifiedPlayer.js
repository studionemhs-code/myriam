import { useEffect, useRef, useState, useCallback } from 'react';
import { getPlayableAudioUrl } from '@/lib/offlineAudio';

export function detectSourceType(url, youtubeId) {
  if (youtubeId) return 'youtube';
  if (!url) return 'none';
  const u = url.toLowerCase();
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  return 'audio';
}

function getYouTubeId(url, youtubeId) {
  if (youtubeId) return youtubeId;
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Carrega a YouTube IFrame API uma única vez
let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// Carrega a SoundCloud Widget API uma única vez
let scApiPromise = null;
function loadSoundCloudApi() {
  if (window.SC && window.SC.Widget) return Promise.resolve();
  if (scApiPromise) return scApiPromise;
  scApiPromise = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = 'https://w.soundcloud.com/player/api.js';
    tag.onload = () => resolve();
    tag.onerror = () => reject(new Error('SoundCloud API falhou'));
    document.head.appendChild(tag);
  });
  return scApiPromise;
}

/**
 * Hook unificado: expõe play/pause/seek e estados currentTime/duration/playing
 * independentemente da fonte (YouTube IFrame API, SoundCloud Widget, HTML5 audio, offline).
 *
 * Sincronização bidirecional:
 *  - play()/pause() propagam para o player ativo
 *  - eventos do player atualizam `playing`, `currentTime`, `duration`
 */
export function useUnifiedPlayer({ type, url, youtubeId, enabled }) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  const ytPlayerRef = useRef(null);
  const scWidgetRef = useRef(null);
  const audioElRef = useRef(null);
  const containerRef = useRef(null); // div oculto para o iframe do YT
  const scIframeRef = useRef(null); // iframe oculto do SoundCloud
  const audioSrcRef = useRef(null); // URL resolvida (offline) para <audio>
  const audioCleanupRef = useRef(null); // cleanup dos listeners do <audio>
  const ytVideoId = useRef(null);

  // Polling de currentTime para YouTube e SoundCloud (não há timeupdate nativo)
  const pollRef = useRef(null);
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      if (ytPlayerRef.current && type === 'youtube') {
        try {
          setCurrentTime(ytPlayerRef.current.getCurrentTime() || 0);
          const d = ytPlayerRef.current.getDuration();
          if (d && isFinite(d)) setDuration(d);
        } catch {}
      } else if (scWidgetRef.current && type === 'soundcloud') {
        scWidgetRef.current.getPosition((pos) => setCurrentTime(pos ? pos / 1000 : 0));
        scWidgetRef.current.getDuration((dur) => { if (dur) setDuration(dur / 1000); });
      }
    }, 500);
  }, [type]);
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Limpa players anterior
  const cleanup = useCallback(() => {
    stopPolling();
    if (audioCleanupRef.current) { audioCleanupRef.current(); audioCleanupRef.current = null; }
    if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch {} ytPlayerRef.current = null; }
    if (scWidgetRef.current) { scWidgetRef.current = null; }
    if (scIframeRef.current) { scIframeRef.current.remove(); scIframeRef.current = null; }
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.removeAttribute('src'); }
    audioSrcRef.current = null;
    setReady(false); setPlaying(false); setCurrentTime(0); setDuration(0);
  }, [stopPolling]);

  // Inicializa o player conforme o tipo
  useEffect(() => {
    if (!enabled) { cleanup(); return; }
    if (type === 'none' || type === 'spotify') { cleanup(); return; }

    let cancelled = false;
    setError(null);
    setReady(false);

    (async () => {
      if (type === 'youtube') {
        const id = getYouTubeId(url, youtubeId);
        if (!id) { setError('ID do YouTube não encontrado'); return; }
        ytVideoId.current = id;
        try {
          await loadYouTubeApi();
          if (cancelled) return;
          // Cria container oculto se necessário
          if (!containerRef.current) {
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
            document.body.appendChild(div);
            containerRef.current = div;
          }
          containerRef.current.innerHTML = '';
          const host = document.createElement('div');
          host.style.cssText = 'width:200px;height:200px;';
          containerRef.current.appendChild(host);
          ytPlayerRef.current = new window.YT.Player(host, {
            videoId: id,
            playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
            events: {
              onReady: () => { if (!cancelled) setReady(true); },
              onStateChange: (e) => {
                const YT = window.YT;
                if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
                else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) setPlaying(false);
                if (e.data === YT.PlayerState.ENDED) setCurrentTime(0);
              },
              onError: () => setError('Falha ao carregar o vídeo do YouTube')
            }
          });
        } catch (e) { if (!cancelled) setError('Falha ao carregar a API do YouTube'); }
      } else if (type === 'soundcloud') {
        try {
          await loadSoundCloudApi();
          if (cancelled) return;
          // Cria iframe oculto
          if (!containerRef.current) {
            const div = document.createElement('div');
            div.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
            document.body.appendChild(div);
            containerRef.current = div;
          }
          containerRef.current.innerHTML = '';
          const iframe = document.createElement('iframe');
          iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&buying=false&sharing=false&download=false&show_artwork=false&visual=false`;
          iframe.width = '1'; iframe.height = '1'; iframe.frameBorder = '0';
          iframe.allow = 'autoplay';
          containerRef.current.appendChild(iframe);
          scIframeRef.current = iframe;
          const widget = window.SC.Widget(iframe);
          scWidgetRef.current = widget;
          widget.bind(window.SC.Widget.Events.READY, () => { if (!cancelled) setReady(true); });
          widget.bind(window.SC.Widget.Events.PLAY, () => setPlaying(true));
          widget.bind(window.SC.Widget.Events.PAUSE, () => setPlaying(false));
          widget.bind(window.SC.Widget.Events.FINISH, () => { setPlaying(false); setCurrentTime(0); });
          widget.bind(window.SC.Widget.Events.ERROR, () => setError('Falha ao carregar o SoundCloud'));
        } catch (e) { if (!cancelled) setError('Falha ao carregar a API do SoundCloud'); }
      } else if (type === 'audio') {
        // Resolve URL offline, depois cria <audio>
        let src = url;
        try {
          const playable = await getPlayableAudioUrl(url);
          if (playable) src = playable;
        } catch {}
        if (cancelled) return;
        audioSrcRef.current = src;
        const el = audioElRef.current;
        if (el) {
          el.src = src;
          el.load();
          // Anexa listeners imediatamente (antes de loadedmetadata disparar)
          const onTime = () => setCurrentTime(el.currentTime || 0);
          const onMeta = () => setDuration(el.duration || 0);
          const onPlay = () => setPlaying(true);
          const onPause = () => setPlaying(false);
          const onEnded = () => { setPlaying(false); setCurrentTime(0); };
          el.addEventListener('timeupdate', onTime);
          el.addEventListener('loadedmetadata', onMeta);
          el.addEventListener('durationchange', onMeta);
          el.addEventListener('play', onPlay);
          el.addEventListener('pause', onPause);
          el.addEventListener('ended', onEnded);
          audioCleanupRef.current = () => {
            el.removeEventListener('timeupdate', onTime);
            el.removeEventListener('loadedmetadata', onMeta);
            el.removeEventListener('durationchange', onMeta);
            el.removeEventListener('play', onPlay);
            el.removeEventListener('pause', onPause);
            el.removeEventListener('ended', onEnded);
          };
        }
        setReady(true);
      }
    })();

    return () => { cancelled = true; if (audioCleanupRef.current) { audioCleanupRef.current(); audioCleanupRef.current = null; } cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, type, url, youtubeId]);

  // Inicia/para polling conforme playing
  useEffect(() => {
    if (playing && (type === 'youtube' || type === 'soundcloud')) startPolling();
    else stopPolling();
    return stopPolling;
  }, [playing, type, startPolling, stopPolling]);

  const play = useCallback(() => {
    if (type === 'youtube' && ytPlayerRef.current) { try { ytPlayerRef.current.playVideo(); } catch {} }
    else if (type === 'soundcloud' && scWidgetRef.current) { try { scWidgetRef.current.play(); } catch {} }
    else if (type === 'audio' && audioElRef.current) { audioElRef.current.play().catch(() => {}); }
  }, [type]);

  const pause = useCallback(() => {
    if (type === 'youtube' && ytPlayerRef.current) { try { ytPlayerRef.current.pauseVideo(); } catch {} }
    else if (type === 'soundcloud' && scWidgetRef.current) { try { scWidgetRef.current.pause(); } catch {} }
    else if (type === 'audio' && audioElRef.current) { audioElRef.current.pause(); }
  }, [type]);

  const seek = useCallback((seconds) => {
    if (type === 'youtube' && ytPlayerRef.current) { try { ytPlayerRef.current.seekTo(seconds, true); setCurrentTime(seconds); } catch {} }
    else if (type === 'soundcloud' && scWidgetRef.current) { try { scWidgetRef.current.seekTo(seconds * 1000); setCurrentTime(seconds); } catch {} }
    else if (type === 'audio' && audioElRef.current) { audioElRef.current.currentTime = seconds; setCurrentTime(seconds); }
  }, [type]);

  return {
    ready, playing, currentTime, duration, error,
    play, pause, seek,
    audioElRef,
    audioSrc: audioSrcRef.current,
    type
  };
}