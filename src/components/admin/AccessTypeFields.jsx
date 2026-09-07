import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Unlock, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';
import { formatPrice } from '@/lib/access';

// Seletor "Gratuito / Pago" + produto associado. value = { access_type, product_id }
export default function AccessTypeFields({ value, onChange }) {
  const [products, setProducts] = useState([]);
  const accessType = value?.access_type || 'gratuito';

  useEffect(() => {
    base44.entities.Product.list('name', 200).then(setProducts).catch(() => setProducts([]));
  }, []);

  const set = (patch) => onChange({ access_type: accessType, product_id: value?.product_id || '', ...patch });
  const selected = products.find((p) => p.id === value?.product_id);

  return (
    <div className="col-span-2 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Acesso</p>
      <div className="grid grid-cols-2 gap-2">
        {[['gratuito', 'Gratuito', Unlock], ['pago', 'Pago', Lock]].map(([v, label, Icon]) => (
          <button
            key={v} type="button" onClick={() => set({ access_type: v, product_id: v === 'gratuito' ? '' : value?.product_id || '' })}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${accessType === v ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-border bg-card text-muted-foreground'}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {accessType === 'pago' && (
        <>
          <Field label="Produto / Checkout" hint="O produto define preço, plataforma e URL do checkout. Vários conteúdos podem usar o mesmo produto.">
            <select className={inputCls} value={value?.product_id || ''} onChange={(e) => set({ product_id: e.target.value })}>
              <option value="">Selecionar produto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.price, p.currency)}{!p.is_active ? ' (inativo)' : ''}
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <p className="text-xs text-muted-foreground">
              Checkout: {selected.checkout_url ? <span className="break-all">{selected.checkout_url}</span> : <span className="text-amber-600">não configurado</span>}
            </p>
          )}
          <Link to="/admin/monetizacao?tab=produtos" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Plus className="h-3 w-3" /> Criar novo produto
          </Link>
        </>
      )}
    </div>
  );
}