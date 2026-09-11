import React, { useState } from 'react';
import { Smartphone, Download, Check, Share, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

function isIOS() {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function InstallAppSection() {
  const { canInstall, installed, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintType, setHintType] = useState('ios'); // 'ios' | 'android'

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
      setHintType('ios');
      setShowHint(true);
      return;
    }
    // Se temos o prompt nativo, usa ele
    if (canInstall) {
      setInstalling(true);
      try {
        await promptInstall();
      } finally {
        setInstalling(false);
      }
      return;
    }
    // Sem prompt nativo (preview em iframe, cooldown do Chrome, etc.)
    // Mostra instruções manuais para Android
    setHintType('android');
    setShowHint(true);
  };

  if (showHint) {
    return (
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-lg">
            <Smartphone className="h-4 w-4 text-gold" /> Como instalar
          </p>
          <button onClick={() => setShowHint(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {hintType === 'ios' ? (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Toque no botão <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Compartilhar (quadrado com seta para cima).</li>
            <li>Role e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
            <li>Confirme tocando em <strong>"Adicionar"</strong>.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Toque no ícone de <strong>três pontos</strong> (⋮) no canto superior do navegador.</li>
            <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong>.</li>
            <li>Confirme a instalação.</li>
          </ol>
        )}
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 font-display text-lg">
        <Smartphone className="h-4 w-4 text-gold" /> Aplicativo
      </p>
      <button
        onClick={handleInstall}
        className="flex w-full items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3 text-left transition hover:bg-gold/10"
      >
        <Download className="h-5 w-5 shrink-0 text-gold" />
        <div className="flex-1">
          <p className="text-sm font-medium">Instalar aplicativo</p>
          <p className="text-xs text-muted-foreground">
            {isIOS()
              ? 'Toque para ver como instalar no iPhone/iPad'
              : canInstall
                ? 'Instale o Theotokos na sua tela inicial'
                : 'Adicione o Theotokos à sua tela inicial'}
          </p>
        </div>
        {installing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />}
      </button>
    </section>
  );
}