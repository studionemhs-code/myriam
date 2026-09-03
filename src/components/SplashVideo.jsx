import React, { useState, useRef, useEffect } from 'react';

const VIDEO_URL = 'https://media.base44.com/videos/public/6a874a7d3ea0948ad718c3b8/e580afddd_STORIESIGTHEOTOKOS.mp4';
const SESSION_KEY = 'splash_shown_session';

export default function SplashVideo() {
  // Apenas mobile / app (APK) — nunca no desktop
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  const [visible, setVisible] = useState(() => isMobile && !sessionStorage.getItem(SESSION_KEY));
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    sessionStorage.setItem(SESSION_KEY, '1');
    // Fallback de segurança: nunca prender o usuário na splash
    timerRef.current = setTimeout(() => finish(), 12000);
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  const finish = () => {
    clearTimeout(timerRef.current);
    setFading(true);
    setTimeout(() => setVisible(false), 400);
  };

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
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-contain"
      />
    </div>
  );
}