import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loading, Badge } from '@/components/admin/ui';
import { EVENT_LABELS, PLATFORM_LABELS, fmtDate } from '@/lib/monetizationAdmin';

const TONE = (t) => t.includes('aprovado') || t.includes('renovado') || t === 'concessao_manual' ? 'green'
  : t.includes('rejeitado') || t.includes('chargeback') || t.includes('reembols') || t === 'acesso_revogado' ? 'red'
  : t.includes('pendente') ? 'gold' : 'muted';

export default function EventsTab() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.MonetizationEvent.list('-created_date', 300),
      base44.entities.Product.list('name', 200)
    ]).then(([e, p]) => { setItems(e); setProducts(p); setLoading(false); });
  }, []);

  if (loading) return <Loading />;
  const pname = (id) => products.find((p) => p.id === id)?.name;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <ul className="divide-y divide-border">
        {items.map((e) => (
          <li key={e.id} className="flex flex-wrap items-start gap-3 p-4">
            <Badge tone={TONE(e.event_type)}>{EVENT_LABELS[e.event_type] || e.event_type}</Badge>
            <div className="min-w-0 flex-1 text-sm">
              <p>
                {e.user_email && <span className="font-medium">{e.user_email}</span>}
                {pname(e.product_id) && <span className="text-muted-foreground"> · {pname(e.product_id)}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {fmtDate(e.created_date)} · origem: {e.source || '—'}{e.platform && ` · ${PLATFORM_LABELS[e.platform] || e.platform}`}{e.actor && ` · por ${e.actor}`}
                {e.external_transaction_id && ` · transação ${e.external_transaction_id}`}
              </p>
              {e.details && Object.keys(e.details).length > 0 && (
                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground/80">{JSON.stringify(e.details)}</p>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">Nenhum evento registrado.</li>}
      </ul>
    </div>
  );
}