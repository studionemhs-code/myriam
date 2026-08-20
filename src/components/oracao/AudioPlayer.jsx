import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export default function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrent(audio.currentTime);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
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