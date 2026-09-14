import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, ExternalLink, Music } from 'lucide-react';

function detectType(url) {
  if (!url) return 'none';
  const u = url.toLowerCase();
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('spotify.com')) return 'spotify';
  if (/\.(mp3|wav|ogg|m4a|aac|flac|webm)(\?|#|$)/.test(u)) return 'audio';
  return 'audio'; // tenta como áudio direto
}

function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
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

function NativeAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setError(false);
    const onTime = () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onMeta = () => { setDuration(audio.duration || 0); setError(false); };
    const onEnd = () => setPlaying(false);
    const onErr = () => { setError(true); setPlaying(false); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => setError(true)); }
  };

  const seek = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(1, pct)) * audio.duration;
    setProgress(pct * 100);
  };

  const fmtTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return <FallbackLink url={src} label="Não foi possível reproduzir — abrir em nova aba" />;
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-primary-foreground/10 px-4 py-2.5">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-deep transition hover:bg-gold/90"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
      </button>
      <span className="w-10 shrink-0 text-xs tabular-nums text-primary-foreground/70">{fmtTime(current)}</span>
      <div
        onClick={seek}
        className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-primary-foreground/15"
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gold transition-all"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold opacity-0 transition group-hover:opacity-100"
          style={{ left: `${progress}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-xs tabular-nums text-primary-foreground/50">{fmtTime(duration)}</span>
      <Volume2 className="h-4 w-4 shrink-0 text-primary-foreground/40" />
    </div>
  );
}

export default function AudioPlayer({ src }) {
  const type = detectType(src);

  if (type === 'soundcloud') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border">
        <iframe
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(src)}&color=%23663399&auto_play=false`}
          width="100%"
          height="166"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          title="Player SoundCloud"
        />
      </div>
    );
  }

  if (type === 'youtube') {
    const id = getYouTubeId(src);
    if (!id) return <FallbackLink url={src} label="Abrir vídeo" />;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Player YouTube"
        />
      </div>
    );
  }

  if (type === 'spotify') {
    const embedUrl = src.replace('open.spotify.com/', 'open.spotify.com/embed/');
    return (
      <div className="overflow-hidden rounded-2xl border border-border">
        <iframe src={embedUrl} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media" title="Player Spotify" />
      </div>
    );
  }

  return <NativeAudioPlayer src={src} />;
}