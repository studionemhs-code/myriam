import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, ExternalLink, Music, Loader2 } from 'lucide-react';
import { detectSourceType, useUnifiedPlayer } from '@/hooks/useUnifiedPlayer';

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function FallbackLink({ url, label }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2.5 text-sm text-primary-foreground/80 hover:bg-primary-foreground/15">
      <Music className="h-4 w-4 text-gold" />
      <span className="flex-1 truncate">{label || 'Abrir áudio'}</span>
      <ExternalLink className="h-4 w-4 shrink-0" />
    </a>
  );
}

/**
 * Media Session API — expõe metadados e controles na tela de bloqueio / notificações do sistema.
 * Funciona melhor com áudios diretos (HTML5 <audio>); YouTube/SoundCloud via iframe oculto
 * podem ser pausados pelo SO ao bloquear a tela (limitação de plataforma).
 */
function useMediaSession({ title, playing, duration, currentTime, onPlay, onPause, onSeek }) {
  useEffect(() => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || 'Oração',
      artist: 'Myriam',
      album: 'Orações Marianas'
    });
    return () => {
      if (navigator.mediaSession) navigator.mediaSession.metadata = null;
    };
  }, [title]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playing]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    if (onSeek) navigator.mediaSession.setActionHandler('seekto', (e) => {
      if (e.seekTime != null) onSeek(e.seekTime);
    });
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [onPlay, onPause, onSeek]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(currentTime, duration),
        playbackRate: 1
      });
    } catch { /* ignore */ }
  }, [duration, currentTime]);
}

function MinimalPlayer({ src, youtubeId, title }) {
  const type = detectSourceType(src, youtubeId);
  const { ready, playing, currentTime, duration, error, play, pause, seek, audioElRef } =
    useUnifiedPlayer({ type, url: src, youtubeId, enabled: true });

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
  }, [currentTime, duration]);

  // playsInline para iOS
  useEffect(() => {
    const el = audioElRef.current;
    if (el) el.setAttribute('playsinline', 'true');
  }, [audioElRef]);

  useMediaSession({ title, playing, duration, currentTime, onPlay: play, onPause: pause, onSeek: seek });

  const toggle = () => { if (playing) pause(); else play(); };

  const handleSeek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, pct)) * duration);
  };

  if (error) {
    return <FallbackLink url={src} label="Não foi possível reproduzir — abrir em nova aba" />;
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-primary-foreground/10 px-4 py-2.5">
      {type === 'audio' && <audio ref={audioElRef} preload="metadata" playsInline className="hidden" />}
      <button
        onClick={toggle}
        disabled={!ready}
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-deep transition hover:bg-gold/90 disabled:opacity-50"
      >
        {!ready ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <span className="w-10 shrink-0 text-xs tabular-nums text-primary-foreground/70">{fmtTime(currentTime)}</span>
      <div onClick={handleSeek} className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-primary-foreground/15">
        <div className="absolute left-0 top-0 h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
      </div>
      <span className="w-10 shrink-0 text-xs tabular-nums text-primary-foreground/50">{fmtTime(duration)}</span>
    </div>
  );
}

export default function AudioPlayer({ src, youtubeId, title }) {
  const type = detectSourceType(src, youtubeId);

  if (type === 'spotify') {
    const embedUrl = src.replace('open.spotify.com/', 'open.spotify.com/embed/');
    return (
      <div className="overflow-hidden rounded-2xl border border-border">
        <iframe src={embedUrl} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media" title="Player Spotify" />
      </div>
    );
  }

  if (type === 'none') return <span />;

  return <MinimalPlayer src={src} youtubeId={youtubeId} title={title} />;
}