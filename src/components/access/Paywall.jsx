import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Lock, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { openCheckout } from '@/lib/checkout';
import { formatPrice } from '@/lib/access';

// Tela de bloqueio comercial exibida quando o usuário não tem permissão.
export default function Paywall({ result, title, backTo = '/' }) {
  const { settings, products, user, canStartTrial, startTrial } = useAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const candidates = (result?.productIds || []).map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const product = candidates[0] || null;

  const handleCheckout = () => {
    const opened = openCheckout(product, null, user, location.pathname);
    if (opened) navigate(`/pagamento/retorno?product=${product.id}`);
  };

  const handleTrial = async () => {
    setStarting(true);
    try { await startTrial(); } finally { setStarting(false); }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
        <Lock className="h-7 w-7 text-gold" />
      </div>
      <h1 className="mt-5 font-display text-2xl">{settings?.paywall_title || 'Conteúdo exclusivo'}</h1>
      {title && <p className="mt-1 text-sm font-medium text-foreground/80">{title}</p>}
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {settings?.paywall_message || 'Este conteúdo está disponível para usuários com acesso Premium.'}
      </p>

      {product && (
        <div className="mt-5 w-full max-w-sm rounded-2xl border border-gold/30 bg-card p-4 text-left">
          <p className="font-medium">{product.name}</p>
          {product.description && <p className="mt-1 text-xs text-muted-foreground">{product.description}</p>}
          {Number(product.price) > 0 && (
            <p className="mt-2 font-display text-xl text-gold">
              {formatPrice(product.price, product.currency)}
              {product.billing_type === 'assinatura_mensal' && <span className="text-xs text-muted-foreground"> /mês</span>}
              {product.billing_type === 'assinatura_anual' && <span className="text-xs text-muted-foreground"> /ano</span>}
            </p>
          )}
        </div>
      )}

      {product?.checkout_url ? (
        <button onClick={handleCheckout} className="mt-5 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
          {settings?.paywall_button_label || 'Ver acesso'}
        </button>
      ) : (
        <p className="mt-5 max-w-sm text-xs text-muted-foreground">
          O checkout deste recurso ainda não foi configurado. Entre em contato com a equipe para liberar seu acesso.
        </p>
      )}

      {canStartTrial && (
        <button onClick={handleTrial} disabled={starting} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gold/40 px-5 py-2.5 text-sm font-medium text-gold disabled:opacity-50">
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Experimentar grátis por {settings?.trial_days || 7} dias
        </button>
      )}

      <Link to={backTo} className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
    </div>
  );
}