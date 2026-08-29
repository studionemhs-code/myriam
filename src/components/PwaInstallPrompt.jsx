import React, { useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { LOGO_URL } from '@/lib/logoUrl';

const DISMISS_THRESHOLD = 120; // px — arrastar além disso dispensa

export default function PwaInstallPrompt() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa-install-dismissed') === 'true'; } catch { return false; }
  });
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef({ dragging: false, startX: 0 });

  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('pwa-install-dismissed', 'true'); } catch {}
  };

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') dismiss();
  };

  const onPointerDown = (e) => {
    // Não inicia arraste se o toque começou num botão (Instalar / Dispensar)
    if (e.target.closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dragging: true, startX: e.clientX };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    setDragX(e.clientX - dragRef.current.startX);
  };

  const onPointerUp = (e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (Math.abs(dragX) > DISMISS_THRESHOLD) {
      dismiss();
    }
    setDragX(0);
  };

  const opacity = Math.max(0.25, 1 - Math.abs(dragX) / 320);

  return (
    <div
      className="mx-auto max-w-sm select-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ transform: `translateX(${dragX}px)`, opacity, touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-card/95 p-3 shadow-lg backdrop-blur">
        <img src={LOGO_URL} alt="Theotokos" className="h-10 w-10 shrink-0 rounded-lg object-cover" draggable={false} />
        <div className="flex-1">
          <p className="text-sm font-medium leading-tight">Instalar Theotokos</p>
          <p className="text-xs text-muted-foreground leading-tight">Arraste para o lado para dispensar</p>
        </div>
        <button
          onClick={install}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-medium text-deep transition hover:bg-gold/90"
        >
          <Download className="h-3.5 w-3.5" /> Instalar
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}