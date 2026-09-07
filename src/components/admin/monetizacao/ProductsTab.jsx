import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Loading, Badge } from '@/components/admin/ui';
import { formatPrice } from '@/lib/access';
import { PRODUCT_TYPE_LABELS, BILLING_LABELS, PLATFORM_LABELS, logMonetizationEvent } from '@/lib/monetizationAdmin';
import { clearAccessCache } from '@/hooks/useAccess';
import ProductEditor from '@/components/admin/monetizacao/ProductEditor';

export default function ProductsTab() {
  const [items, setItems] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [p, i, r] = await Promise.all([
      base44.entities.Product.list('-created_date', 200),
      base44.entities.PaymentIntegration.list('name', 100),
      base44.entities.ProductResource.list('created_date', 1000)
    ]);
    setItems(p); setIntegrations(i); setResources(r);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (p) => {
    if (!confirm(`Excluir o produto "${p.name}"? Permissões já concedidas não serão removidas.`)) return;
    await base44.entities.ProductResource.deleteMany({ product_id: p.id });
    await base44.entities.Product.delete(p.id);
    await logMonetizationEvent('alteracao_produto', { product_id: p.id, details: { action: 'excluido', name: p.name } });
    clearAccessCache();
    await load();
  };

  if (loading) return <Loading />;
  const integName = (id) => integrations.find((i) => i.id === id);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} produtos · um produto pode liberar vários recursos</p>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((p) => {
          const integ = integName(p.integration_id);
          const count = resources.filter((r) => r.product_id === p.id).length;
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-0.5 font-display text-lg text-gold">{formatPrice(p.price, p.currency)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={p.is_active ? 'green' : 'muted'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge>
                <Badge>{PRODUCT_TYPE_LABELS[p.product_type]}</Badge>
                <Badge>{BILLING_LABELS[p.billing_type]}</Badge>
                {integ && <Badge tone="blue">{PLATFORM_LABELS[integ.platform]}</Badge>}
                <Badge tone="purple">{count} recurso{count === 1 ? '' : 's'}</Badge>
                {!p.checkout_url && <Badge tone="gold">Sem checkout</Badge>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="col-span-2 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado. Crie um produto e vincule os conteúdos, cursos ou funcionalidades que ele libera.
          </p>
        )}
      </div>
      {editing && (
        <ProductEditor
          product={editing} integrations={integrations}
          resources={resources.filter((r) => r.product_id === editing.id)}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); clearAccessCache(); load(); }}
        />
      )}
    </div>
  );
}