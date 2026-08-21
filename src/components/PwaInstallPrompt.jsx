import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { LOGO_URL } from '@/lib/logoUrl';

export default function PwaInstallPrompt() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa-install-dismissed') === 'true'; } catch { return false; }
  });

  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('pwa-install-dismissed', 'true'); } catch {}
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') dismiss();
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
      <img src={LOGO_URL} alt="Theotokos" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      <div className="flex-1">
        <p className="text-sm font-medium">Instalar aplicativo</p>
        <p className="text-xs text-muted-foreground">Acesso rápido na tela inicial</p>
      </div>
      <button onClick={install} className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-medium text-deep">
        <Download className="h-3.5 w-3.5" /> Instalar
      </button>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}