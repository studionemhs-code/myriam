import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import FloatingAgentIcon from './FloatingAgentIcon';
import FloatingAgentChat from './FloatingAgentChat';

const POS_KEY = 'floating_agent_bottom';
const DRAG_THRESHOLD = 6; // px — abaixo disso conta como clique

export default function FloatingAgentButton() {
  const { isVisible } = useFeatureFlags();
  const [agent, setAgent] = useState(null);
  const [open, setOpen] = useState(false);
  const [bottomPx, setBottomPx] = useState(() => {
    try { return parseInt(localStorage.getItem(POS_KEY)) || 80; } catch { return 80; }
  });
  const dragRef = useRef({ dragging: false, startY: 0, startBottom: 0, moved: false });

  useEffect(() => {
    if (!isVisible('assistente_ia_flutuante')) return;
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('listActiveAgents', {});
        if (active && res.data?.floatingMain) setAgent(res.data.floatingMain);
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arraste vertical apenas no desktop (mouse). No mobile, clique simples abre o chat.
  const onMouseDown = (e) => {
    dragRef.current = { dragging: true, startY: e.clientY, startBottom: bottomPx, moved: false };
    const onMove = (ev) => {
      if (!dragRef.current.dragging) return;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dy) > DRAG_THRESHOLD) dragRef.current.moved = true;
      let next = dragRef.current.startBottom - dy;
      const maxBottom = Math.max(80, window.innerHeight - 70);
      next = Math.max(8, Math.min(maxBottom, next));
      setBottomPx(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (dragRef.current.dragging && dragRef.current.moved) {
        try { localStorage.setItem(POS_KEY, String(bottomPx)); } catch {}
      }
      dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onClick = () => {
    // No desktop, se houve arraste, não abre o chat.
    if (dragRef.current.moved) { dragRef.current.moved = false; return; }
    setOpen(true);
  };

  if (!isVisible('assistente_ia_flutuante') || !agent) return null;

  return (
    <>
      <button
        onClick={onClick}
        onMouseDown={onMouseDown}
        style={{ bottom: `${bottomPx}px` }}
        className="group fixed right-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-lg ring-2 ring-gold/30 transition hover:scale-105 hover:shadow-xl active:scale-95 lg:right-6"
        aria-label={`Conversar com ${agent.name}`}
        title={`${agent.name}`}
      >
        {agent.icon_url ? (
          <img src={agent.icon_url} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-deep">
            <FloatingAgentIcon className="h-11 w-11" />
          </div>
        )}
        {/* halo pulse */}
        <span className="pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full bg-gold/20" style={{ animationDuration: '2.5s' }} />
      </button>

      {open && <FloatingAgentChat agent={agent} onClose={() => setOpen(false)} />}
    </>
  );
}