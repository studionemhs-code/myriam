import { useEffect, useState } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function usePwaInstall() {
  // O evento pode ter sido capturado pelo script em index.html antes do React montar
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__pwaInstallEvent || null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onInstallable = () => setDeferredPrompt(window.__pwaInstallEvent || null);
    const onBeforePrompt = (e) => {
      e.preventDefault();
      window.__pwaInstallEvent = e;
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      window.__pwaInstallEvent = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('beforeinstallprompt', onBeforePrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('pwa-installable', onInstallable);
      window.removeEventListener('beforeinstallprompt', onBeforePrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    const evt = deferredPrompt || window.__pwaInstallEvent;
    if (!evt) return null;
    evt.prompt();
    const { outcome } = await evt.userChoice;
    window.__pwaInstallEvent = null;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
    return outcome;
  };

  return { canInstall: !!deferredPrompt && !installed, installed, promptInstall };
}