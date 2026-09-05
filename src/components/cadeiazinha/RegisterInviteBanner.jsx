import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';

const KEY = 'quote_register_banner_dismissed';

export default function RegisterInviteBanner() {
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(KEY) === '1');
  if (hidden) return null;

  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  const dismiss = () => { sessionStorage.setItem(KEY, '1'); setHidden(true); };

  return (
    <div className="sticky top-0 z-40 border-b border-gold/30 bg-deep text-primary-foreground">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <Sparkles className="h-4 w-4 shrink-0 text-gold" />
        <p className="flex-1 text-xs leading-snug sm:text-sm">
          <span className="font-medium">Faça parte da comunidade Myriam.</span>{' '}
          <span className="text-primary-foreground/70">Cadastre-se para acompanhar seu pedido e viver a Consagração.</span>
        </p>
        <Link
          to={`/register?returnTo=${returnTo}`}
          className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-deep transition hover:bg-gold/90"
        >
          Cadastrar
        </Link>
        <button onClick={dismiss} aria-label="Fechar" className="shrink-0 rounded-full p-1 text-primary-foreground/60 transition hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}