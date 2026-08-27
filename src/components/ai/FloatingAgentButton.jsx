import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import FloatingAgentIcon from './FloatingAgentIcon';
import FloatingAgentChat from './FloatingAgentChat';

export default function FloatingAgentButton() {
  const { isVisible } = useFeatureFlags();
  const [agent, setAgent] = useState(null);
  const [open, setOpen] = useState(false);

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
  }, [isVisible]);

  // Reseta o chat ao fechar
  useEffect(() => {
    if (!open) {
      // pequeno delay para a animação de fechar
      const t = setTimeout(() => {}, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!isVisible('assistente_ia_flutuante') || !agent) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-lg ring-2 ring-gold/30 transition hover:scale-105 hover:shadow-xl active:scale-95 lg:bottom-6 lg:right-6"
        aria-label={`Conversar com ${agent.name}`}
        title={agent.name}
      >
        {agent.icon_url ? (
          <img src={agent.icon_url} alt="" className="h-full w-full object-cover" />
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