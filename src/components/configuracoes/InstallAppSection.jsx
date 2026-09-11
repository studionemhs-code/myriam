import React, { useState } from 'react';
import { Smartphone, Download, Check, Share } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

function isIOS() {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallAppSection() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  // Já instalado (modo standalone)
  if (installed) {
    return (
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Aplicativo instalado</p>
            <p className="text-xs text-muted-foreground">Você já está usando o app instalado.</p>
          </div>
        </div>
      </section>
    );
  }

  const handleInstall = async () => {
    // iOS não dispara beforeinstallprompt — mostra instruções manuais
    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }
    if (!canInstall) return;
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 font-display text-lg">
        <Smartphone className="h-4 w-4 text-gold" /> Aplicativo
      </p>

      {showIOSHint ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            No iPhone/iPad, a instalação é manual:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Toque no botão <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Compartilhar (quadrado com seta para cima).</li>
            <li>Role e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
            <li>Confirme tocando em <strong>"Adicionar"</strong>.</li>
          </ol>
          <button
            onClick={() => setShowIOSHint(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Entendi
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstall}
          disabled={!canInstall && !isIOS()}
          className="flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-left transition hover:bg-gold/10 disabled:opacity-50"
        >
          <Download className="h-5 w-5 shrink-0 text-gold" />
          <div className="flex-1">
            <p className="text-sm font-medium">Instalar aplicativo</p>
            <p className="text-xs text-muted-foreground">
              {isIOS()
                ? 'Toque para ver como instalar no iPhone/iPad'
                : canInstall
                  ? 'Instale o Theotokos na sua tela inicial'
                  : 'Disponível após o carregamento completo do app'}
            </p>
          </div>
          {installing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />}
        </button>
      )}
    </section>
  );
}