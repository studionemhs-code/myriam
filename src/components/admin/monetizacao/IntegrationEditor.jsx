import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SUPABASE_URL } from '@/api/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Field, inputCls } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';
import { PLATFORM_LABELS, logMonetizationEvent } from '@/lib/monetizationAdmin';

const HINTS = {
  stripe: 'Cole o "Signing secret" do endpoint de webhook (whsec_...). Envie os eventos checkout.session.completed, invoice.paid, charge.refunded e customer.subscription.deleted.',
  hotmart: 'Cole o "Hottok" da configuração de webhook da Hotmart. Cadastre a URL acima no painel Hotmart (Ferramentas → Webhook).',
  kiwify: 'Cole o token do webhook da Kiwify. A assinatura é validada pelo parâmetro "signature".',
  ticto: 'Cole o token do webhook da Ticto (enviado no campo "token" do payload).',
  infinitepay: 'Defina um segredo e envie-o no header "x-webhook-secret" ou no parâmetro "?token=" da URL.',
  link: 'Para links de pagamento sem webhook, libere o acesso manualmente na aba Permissões ou envie um POST genérico com { email, status, product_id }.',
  outro: 'Formato genérico: POST JSON { email, status (paid|refunded|canceled…), transaction_id, product_id, amount }. Proteja com "x-webhook-secret".'
};

export default function IntegrationEditor({ integration, onClose, onSaved }) {
  const [i, setI] = useState({ name: '', platform: 'hotmart', checkout_mode: 'externo', enabled: true, webhook_secret: '', notes: '', ...integration });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setI((p) => ({ ...p, [k]: v }));
  const webhookUrl = i.id ? `${SUPABASE_URL}/functions/v1/payment-webhook?integration=${i.id}` : null;

  const save = async () => {
    if (!i.name) return;
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...data } = i;
      const saved = id ? await base44.entities.PaymentIntegration.update(id, data) : await base44.entities.PaymentIntegration.create(data);
      await logMonetizationEvent('alteracao_checkout', { platform: saved.platform, details: { action: id ? 'editada' : 'criada', name: saved.name } });
      if (!id) { setI(saved); toast({ description: 'Integração criada. Copie a URL do webhook abaixo.' }); return; }
      onSaved();
    } finally { setSaving(false); }
  };

  const copy = () => { navigator.clipboard?.writeText(webhookUrl); toast({ description: 'URL copiada.' }); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{i.id ? 'Editar integração' : 'Nova integração'}</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Nome"><input className={inputCls} value={i.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex.: Hotmart — Cursos" /></Field></div>
          <Field label="Plataforma">
            <select className={inputCls} value={i.platform} onChange={(e) => set('platform', e.target.value)}>
              {Object.entries(PLATFORM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Modo de checkout">
            <select className={inputCls} value={i.checkout_mode} onChange={(e) => set('checkout_mode', e.target.value)}>
              <option value="externo">Externo (página da plataforma)</option>
              <option value="nativo">Nativo (dentro do app)</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Segredo do webhook" hint={HINTS[i.platform]}>
              <input className={inputCls} value={i.webhook_secret || ''} onChange={(e) => set('webhook_secret', e.target.value)} placeholder="Opcional, mas recomendado" />
            </Field>
          </div>
          <div className="col-span-2"><Field label="Observações"><textarea rows={2} className={inputCls} value={i.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field></div>
          <label className="col-span-2 flex items-center gap-3 text-sm"><Switch checked={!!i.enabled} onCheckedChange={(v) => set('enabled', v)} /> Integração ativa</label>

          {webhookUrl && (
            <div className="col-span-2 rounded-xl border border-gold/30 bg-gold/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">URL do webhook (cole na plataforma)</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-background px-3 py-2 text-xs">{webhookUrl}</code>
                <button onClick={copy} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary"><Copy className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Opcional: acrescente <code>&product=ID_DO_PRODUTO</code> para forçar o produto quando a plataforma não envia o ID.</p>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">{i.id ? 'Fechar' : 'Cancelar'}</button>
          <button onClick={save} disabled={saving || !i.name} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}