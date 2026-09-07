import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loading, Badge } from '@/components/admin/ui';
import { formatPrice } from '@/lib/access';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, PLATFORM_LABELS, fmtDate } from '@/lib/monetizationAdmin';

export default function PaymentsTab() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Payment.list('-created_date', 300),
      base44.entities.Product.list('name', 200)
    ]).then(([p, pr]) => { setItems(p); setProducts(pr); setLoading(false); });
  }, []);

  if (loading) return <Loading />;
  const pname = (id) => products.find((p) => p.id === id)?.name || '—';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Comprador</th><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Status</th><th className="hidden px-4 py-3 md:table-cell">Plataforma / Transação</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.processed_at || p.created_date)}</td>
              <td className="px-4 py-3"><p className="truncate">{p.user_name || p.user_email || '—'}</p>{p.user_name && <p className="text-xs text-muted-foreground">{p.user_email}</p>}</td>
              <td className="px-4 py-3">{pname(p.product_id)}{!p.product_id && p.external_product_id && <p className="text-xs text-amber-600">ID externo não reconhecido: {p.external_product_id}</p>}</td>
              <td className="px-4 py-3">{p.amount != null ? formatPrice(p.amount, p.currency) : '—'}</td>
              <td className="px-4 py-3"><Badge tone={PAYMENT_STATUS_TONES[p.status]}>{PAYMENT_STATUS_LABELS[p.status] || p.status}</Badge></td>
              <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{PLATFORM_LABELS[p.platform] || p.platform}<br />{p.external_transaction_id}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum pagamento registrado ainda. Eles aparecem aqui automaticamente quando a plataforma notifica o webhook.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}