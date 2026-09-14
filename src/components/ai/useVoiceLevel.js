import { useEffect, useState } from 'react';

export default function useVoiceLevel(stream, enabled = true) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    setLevel(0);
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!stream || !enabled || !AudioContext) return;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame;
    let last = 0;
    let smoothed = 0;
    const sample = (time) => {
      if (time - last >= 50) {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
        smoothed = smoothed * 0.35 + Math.min(1, rms * 5) * 0.65;
        setLevel(smoothed);
        last = time;
      }
      frame = requestAnimationFrame(sample);
    };
    const resume = () => { if (context.state === 'suspended') void context.resume(); };
    resume();
    document.addEventListener('pointerdown', resume);
    frame = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', resume);
      source.disconnect(); analyser.disconnect(); void context.close();
    };
  }, [stream, enabled]);
  return level;
}