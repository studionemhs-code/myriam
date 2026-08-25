import React, { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

export default function AudioBubble({ url, duration, mine }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dur, setDur] = useState(duration || 0);
  const audioRef = useRef(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => {
          const a = e.target;
          setProgress(a.currentTime / (a.duration || 1));
          if (a.duration && !dur) setDur(a.duration);
        }}
      />
      <button
        onClick={toggle}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${mine ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground'}`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const active = (i / 24) <= progress;
            return (
              <span
                key={i}
                className={`w-0.5 rounded-full ${active ? (mine ? 'bg-primary-foreground' : 'bg-primary') : (mine ? 'bg-primary-foreground/30' : 'bg-primary/30')}`}
                style={{ height: `${8 + Math.abs(Math.sin(i * 1.3)) * 14}px` }}
              />
            );
          })}
        </div>
        <span className={`mt-1 block text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{fmt(dur)}</span>
      </div>
    </div>
  );
}