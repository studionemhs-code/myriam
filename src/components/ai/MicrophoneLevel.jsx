import React, { useEffect, useState } from 'react';

export default function MicrophoneLevel({ stream, muted }) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || muted) { setLevel(0); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
      setLevel(Math.min(100, Math.round(rms * 500)));
    }, 100);
    context.resume();
    return () => { clearInterval(timer); source.disconnect(); context.close(); };
  }, [stream, muted]);
  if (!stream) return null;
  return <div className="mt-5 w-48 text-primary-foreground">
    <div role="meter" aria-label="Nível do microfone" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} className="h-2 overflow-hidden rounded-full bg-primary-foreground/20">
      <div className="h-full rounded-full bg-gold" style={{ width: `${muted ? 0 : level}%` }} />
    </div>
    <p className="mt-2 text-xs text-primary-foreground/70">{muted ? 'Microfone desligado' : 'Nível do seu microfone'}</p>
  </div>;
}