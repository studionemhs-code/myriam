import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Loading, Badge } from '@/components/admin/ui';
import { PLATFORM_LABELS, logMonetizationEvent } from '@/lib/monetizationAdmin';
import IntegrationEditor from '@/components/admin/monetizacao/IntegrationEditor';

export default function IntegrationsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    setItems(await base44.entities.PaymentIntegration.list('name', 100));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (i) => {
    if (!confirm(`Excluir a integração "${i.name}"? Webhooks apontando para ela deixarão de funcionar.`)) return;
    await base44.entities.PaymentIntegration.delete(i.id);
    await logMonetizationEvent('alteracao_checkout', { platform: i.platform, details: { action: 'excluida', name: i.name } });
    await load();
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Plataformas que processam pagamentos e notificam o app por webhook.</p>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova integração
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{i.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="blue">{PLATFORM_LABELS[i.platform]}</Badge>
                  <Badge>{i.checkout_mode === 'nativo' ? 'Checkout nativo' : 'Checkout externo'}</Badge>
                  <Badge tone={i.enabled ? 'green' : 'muted'}>{i.enabled ? 'Ativa' : 'Desativada'}</Badge>
                  <Badge tone={i.webhook_secret ? 'green' : 'gold'}>{i.webhook_secret ? 'Webhook protegido' : 'Sem segredo'}</Badge>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing(i)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(i)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">Nenhuma integração cadastrada.</li>}
        </ul>
      </div>
      {editing && <IntegrationEditor integration={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}