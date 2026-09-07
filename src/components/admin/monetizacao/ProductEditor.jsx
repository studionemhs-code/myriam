import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Field, inputCls } from '@/components/admin/ui';
import { PRODUCT_TYPE_LABELS, BILLING_LABELS, PLATFORM_LABELS, logMonetizationEvent } from '@/lib/monetizationAdmin';
import ProductResourcesPicker from '@/components/admin/monetizacao/ProductResourcesPicker';

const empty = {
  name: '', description: '', product_type: 'conteudo', price: 0, currency: 'BRL', billing_type: 'unico',
  access_duration_days: '', is_active: true, integration_id: '', checkout_url: '', external_product_id: '', image_url: ''
};

export default function ProductEditor({ product, integrations, resources, onClose, onSaved }) {
  const [p, setP] = useState({ ...empty, ...product, access_duration_days: product.access_duration_days ?? '' });
  const [selected, setSelected] = useState(resources.map((r) => `${r.resource_type}:${r.resource_id}`));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!p.name) return;
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...data } = p;
      data.price = Number(data.price) || 0;
      data.access_duration_days = data.access_duration_days === '' ? null : Number(data.access_duration_days);
      data.integration_id = data.integration_id || null;
      const saved = id ? await base44.entities.Product.update(id, data) : await base44.entities.Product.create(data);

      // Sincroniza recursos liberados
      const before = new Set(resources.map((r) => `${r.resource_type}:${r.resource_id}`));
      const after = new Set(selected);
      const toDelete = resources.filter((r) => !after.has(`${r.resource_type}:${r.resource_id}`));
      const toCreate = [...after].filter((k) => !before.has(k)).map((k) => {
        const [resource_type, ...rest] = k.split(':');
        return { product_id: saved.id, resource_type, resource_id: rest.join(':') };
      });
      await Promise.all(toDelete.map((r) => base44.entities.ProductResource.delete(r.id)));
      if (toCreate.length) await base44.entities.ProductResource.bulkCreate(toCreate);

      await logMonetizationEvent(id ? 'alteracao_produto' : 'alteracao_produto', {
        product_id: saved.id, details: { action: id ? 'editado' : 'criado', name: saved.name, checkout_url: saved.checkout_url, resources: selected.length }
      });
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{p.id ? 'Editar produto' : 'Novo produto'}</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Nome"><input className={inputCls} value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Formação Mariana Premium" /></Field></div>
          <div className="col-span-2"><Field label="Descrição"><textarea rows={2} className={inputCls} value={p.description || ''} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <Field label="Tipo">
            <select className={inputCls} value={p.product_type} onChange={(e) => set('product_type', e.target.value)}>
              {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Tipo de cobrança">
            <select className={inputCls} value={p.billing_type} onChange={(e) => set('billing_type', e.target.value)}>
              {Object.entries(BILLING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Preço"><input type="number" step="0.01" min="0" className={inputCls} value={p.price} onChange={(e) => set('price', e.target.value)} /></Field>
          <Field label="Moeda"><input className={inputCls} value={p.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} /></Field>
          <Field label="Validade do acesso (dias)" hint="Deixe vazio para acesso permanente."><input type="number" min="1" className={inputCls} value={p.access_duration_days} onChange={(e) => set('access_duration_days', e.target.value)} placeholder="Permanente" /></Field>
          <label className="flex items-center gap-3 self-end text-sm"><Switch checked={!!p.is_active} onCheckedChange={(v) => set('is_active', v)} /> Produto ativo</label>

          <div className="col-span-2 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Checkout</p>
            <Field label="Plataforma de pagamento" hint="Cadastre plataformas na aba Integrações.">
              <select className={inputCls} value={p.integration_id || ''} onChange={(e) => set('integration_id', e.target.value)}>
                <option value="">— Nenhuma / link direto —</option>
                {integrations.map((i) => <option key={i.id} value={i.id}>{i.name} ({PLATFORM_LABELS[i.platform]})</option>)}
              </select>
            </Field>
            <Field label="URL do checkout" hint="Link de pagamento da plataforma. O e-mail do usuário é preenchido automaticamente quando suportado.">
              <input className={inputCls} value={p.checkout_url || ''} onChange={(e) => set('checkout_url', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="ID do produto na plataforma" hint="Usado para o webhook reconhecer a compra (ID do produto Hotmart/Kiwify/Ticto, price/metadata no Stripe).">
              <input className={inputCls} value={p.external_product_id || ''} onChange={(e) => set('external_product_id', e.target.value)} />
            </Field>
          </div>

          <div className="col-span-2">
            <ProductResourcesPicker selected={selected} onChange={setSelected} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          <button onClick={save} disabled={saving || !p.name} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}