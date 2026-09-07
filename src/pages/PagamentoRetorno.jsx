import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { isGrantActive } from '@/lib/access';

const POLL_MS = 5000;
const MAX_POLLS = 24; // ~2 minutos

// Página de retorno após checkout externo: aguarda o webhook liberar o acesso.
export default function PagamentoRetorno() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('product') || sessionStorage.getItem('checkout_product_id');
  const returnTo = sessionStorage.getItem('checkout_return_to') || '/';
  const { grants, products, refresh } = useAccess();
  const [polls, setPolls] = useState(0);

  const product = products.find((p) => p.id === productId);
  const released = grants.some((g) => g.product_id === productId && isGrantActive(g));

  useEffect(() => {
    if (released || polls >= MAX_POLLS) return;
    const t = setTimeout(async () => { await refresh(); setPolls((n) => n + 1); }, POLL_MS);
    return () => clearTimeout(t);
  }, [released, polls, refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  if (released) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h1 className="mt-4 font-display text-2xl">Acesso liberado!</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Seu pagamento foi confirmado{product ? ` e "${product.name}" já está disponível` : ''}.
        </p>
        <Link to={returnTo} className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">Acessar agora</Link>
      </div>
    );
  }

  const timedOut = polls >= MAX_POLLS;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {timedOut ? <Clock className="h-14 w-14 text-gold" /> : <Loader2 className="h-14 w-14 animate-spin text-primary" />}
      <h1 className="mt-4 font-display text-2xl">{timedOut ? 'Aguardando confirmação' : 'Verificando seu pagamento…'}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {timedOut
          ? 'Assim que a plataforma de pagamento confirmar, seu acesso será liberado automaticamente — sem precisar falar com a equipe. Pagamentos por boleto ou Pix podem levar alguns minutos.'
          : 'Conclua o pagamento na aba que foi aberta. Esta tela é atualizada automaticamente quando a confirmação chegar.'}
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => { setPolls(0); refresh(); }} className="rounded-lg border border-border px-5 py-2.5 text-sm">Verificar novamente</button>
        <Link to={returnTo} className="rounded-lg bg-muted px-5 py-2.5 text-sm">Voltar</Link>
      </div>
    </div>
  );
}