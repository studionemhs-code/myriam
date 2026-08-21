import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Maximize, Gauge } from 'lucide-react';

let apiPromise = null;

function loadYouTubeAPI() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  });
  return apiPromise;
}

export default function PrivacyVideoPlayer({ videoId, title, onComplete }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef(null);
  const completedRef = useRef(false);

  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    completedRef.current = false;

    const createPlayer = () => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          cc_load_policy: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            const iframe = e.target.getIframe();
            if (iframe) {
              iframe.style.width = '100%';
              iframe.style.height = '100%';
              iframe.style.position = 'absolute';
              iframe.style.top = '0';
              iframe.style.left = '0';
            }
            setReady(true);
            setDuration(e.target.getDuration() || 0);
          },
          onStateChange: (e) => {
            setPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === 0 && onComplete && !completedRef.current) {
              completedRef.current = true;
              onComplete();
            }
          },
        },
      });
    };

    loadYouTubeAPI().then(createPlayer);

    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const cur = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        if (dur > 0) {
          const pct = (cur / dur) * 100;
          setProgress(pct);
          if (pct >= 95 && onComplete && !completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [videoId]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [playing]);

  const handleSeek = useCallback((e) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const dur = playerRef.current.getDuration();
    if (dur > 0) playerRef.current.seekTo(pct * dur, true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  const changeRate = useCallback((r) => {
    setRate(r);
    playerRef.current?.setPlaybackRate?.(r);
    setShowSpeed(false);
  }, []);

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={wrapperRef} className="relative aspect-video overflow-hidden rounded-xl bg-black select-none">
      {/* YouTube iframe (API replaces this div) */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Transparent overlay — blocks ALL clicks from reaching YouTube */}
      <div className="absolute inset-0 z-10" />

      {/* Top gradient — masks YouTube title/channel overlay */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-20 bg-gradient-to-b from-black/70 to-transparent" />

      {/* Center play/pause */}
      <button
        onClick={togglePlay}
        disabled={!ready}
        className="absolute inset-0 z-20 flex items-center justify-center"
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
      >
        {ready && !playing && (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition hover:scale-110">
            <Play className="h-8 w-8 fill-white text-white" />
          </div>
        )}
      </button>

      {/* Bottom controls */}
      {ready && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-10">
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="text-white hover:text-white/80" aria-label={playing ? 'Pausar' : 'Reproduzir'}>
              {playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white" />}
            </button>
            <span className="text-[10px] text-white/70 tabular-nums">{fmtTime((progress / 100) * duration)}</span>
            <div className="relative flex-1 cursor-pointer py-1" onClick={handleSeek}>
              <div className="h-1 w-full rounded-full bg-white/30">
                <div className="h-1 rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-white/70 tabular-nums">{fmtTime(duration)}</span>

            {/* Speed control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeed((v) => !v)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-white hover:bg-white/20"
              >
                <Gauge className="h-3.5 w-3.5" />
                {rate}x
              </button>
              {showSpeed && (
                <div className="absolute bottom-6 right-0 w-20 rounded-lg bg-black/90 py-1 shadow-xl">
                  {rates.map((r) => (
                    <button
                      key={r}
                      onClick={() => changeRate(r)}
                      className={`block w-full px-3 py-1 text-left text-[11px] hover:bg-white/20 ${r === rate ? 'text-gold' : 'text-white'}`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-white/80" aria-label="Tela cheia">
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}