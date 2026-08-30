import React from 'react';
import { X, Sparkles, RefreshCw } from 'lucide-react';

export default function IntentPopup({ journeyTitle, onClose, onSelect }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Antes de participar...</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Na jornada <span className="font-medium text-foreground">"{journeyTitle}"</span>, você está se consagrando pela primeira vez ou renovando sua consagração?
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => onSelect('primeira_consagracao')}
            className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-border p-5 text-center transition hover:border-gold/50 hover:bg-gold/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-gold/15 group-hover:text-gold">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="font-display text-sm">Primeira Consagração</p>
            <p className="text-xs text-muted-foreground">Vou me consagrar pela primeira vez</p>
          </button>
          <button
            onClick={() => onSelect('renovacao')}
            className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-border p-5 text-center transition hover:border-gold/50 hover:bg-gold/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold transition group-hover:bg-gold/25">
              <RefreshCw className="h-6 w-6" />
            </div>
            <p className="font-display text-sm">Renovação</p>
            <p className="text-xs text-muted-foreground">Já sou consagrado e desejo renovar</p>
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Esta informação ajuda a equipe a acompanhar quem está se consagrando e quem está renovando.
        </p>
      </div>
    </div>
  );
}