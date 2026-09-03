import React, { useState, useRef, useEffect } from 'react';

const VIDEO_URL = 'https://media.base44.com/videos/public/6a874a7d3ea0948ad718c3b8/e580afddd_STORIESIGTHEOTOKOS.mp4';
const SESSION_KEY = 'splash_shown_session';
const START_TIMEOUT = 3000; // se o vídeo não começar a tocar, revela o app
const MAX_TIMEOUT = 9000;   // limite absoluto da splash

export default function SplashVideo() {
  // Apenas mobile / app (APK) — nunca no desktop
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  const [visible, setVisible] = useState(() => {
    try {
      return isMobile && !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return false;
    }
  });
  const [fading, setFading] = useState(false);
  const startTimer = useRef(null);
  const maxTimer = useRef(null);
  const fadeTimer = useRef(null);
  const started = useRef(false);

  const finish = () => {
    clearTimeout(startTimer.current);
    clearTimeout(maxTimer.current);
    setFading(true);
    fadeTimer.current = setTimeout(() => setVisible(false), 400);
  };

  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}

    // Se o vídeo não começou a tocar dentro do tempo, não prende o usuário
    startTimer.current = setTimeout(() => {
      if (!started.current) finish();
    }, START_TIMEOUT);

    // Limite absoluto, mesmo se o vídeo travar no meio
    maxTimer.current = setTimeout(finish, MAX_TIMEOUT);

    return () => {
      clearTimeout(startTimer.current);
      clearTimeout(maxTimer.current);
      clearTimeout(fadeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-[400ms] ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <video
        src={VIDEO_URL}
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={() => { started.current = true; }}
        onEnded={finish}
        onError={finish}
        onStalled={() => { if (!started.current) finish(); }}
        className="h-full w-full object-contain"
      />
    </div>
  );
}