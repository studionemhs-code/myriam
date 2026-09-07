import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Field, inputCls, Loading } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';
import { clearAccessCache } from '@/hooks/useAccess';
import { logMonetizationEvent } from '@/lib/monetizationAdmin';

const MODELS = [
  { value: 'gratuito', label: 'Gratuito', desc: 'Todo o app é livre. Marcações "pago" são ignoradas.' },
  { value: 'hibrido', label: 'Modelo híbrido', desc: 'Estrutura básica gratuita; conteúdos, cursos ou funcionalidades marcados como pagos exigem acesso.', highlight: true },
  { value: 'pago', label: 'Pago', desc: 'O acesso ao app inteiro exige um produto ativo.' }
];

export default function GeneralSettingsTab() {
  const [s, setS] = useState(null);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [list, prods] = await Promise.all([
        base44.entities.MonetizationSettings.list('-created_date', 1),
        base44.entities.Product.list('name', 200)
      ]);
      setS(list[0] || await base44.entities.MonetizationSettings.create({ access_model: 'hibrido' }));
      setProducts(prods);
    })();
  }, []);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const toggleTrialProduct = (id) => set('trial_product_ids', (s.trial_product_ids || []).includes(id)
    ? s.trial_product_ids.filter((x) => x !== id) : [...(s.trial_product_ids || []), id]);

  const save = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...data } = s;
      if (data.trial_enabled && !data.trial_enabled_at) data.trial_enabled_at = new Date().toISOString();
      await base44.entities.MonetizationSettings.update(id, data);
      clearAccessCache();
      await logMonetizationEvent('alteracao_configuracao', { details: { access_model: data.access_model, trial_enabled: data.trial_enabled, trial_days: data.trial_days } });
      toast({ description: 'Configurações salvas.' });
    } finally { setSaving(false); }
  };

  if (!s) return <Loading />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg">Modelo de acesso do aplicativo</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {MODELS.map((m) => (
            <button
              key={m.value} type="button" onClick={() => set('access_model', m.value)}
              className={`rounded-xl border p-4 text-left transition ${s.access_model === m.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
            >
              <p className="font-medium">{m.label}{m.highlight && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">Recomendado</span>}</p>
              <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
            </button>
          ))}
        </div>
        {s.access_model === 'pago' && (
          <div className="mt-4">
            <Field label="Produto que libera o app" hint="Usuários sem permissão ativa neste produto verão a tela de bloqueio ao entrar.">
              <select className={inputCls} value={s.paid_app_product_id || ''} onChange={(e) => set('paid_app_product_id', e.target.value || null)}>
                <option value="">Selecionar…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">Período de teste gratuito</h2>
            <p className="text-xs text-muted-foreground">Acesso temporário a recursos pagos. Ao terminar, tudo volta a ficar bloqueado automaticamente.</p>
          </div>
          <Switch checked={!!s.trial_enabled} onCheckedChange={(v) => set('trial_enabled', v)} />
        </div>
        {s.trial_enabled && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Duração (dias)"><input type="number" min="1" className={inputCls} value={s.trial_days} onChange={(e) => set('trial_days', parseInt(e.target.value) || 1)} /></Field>
            <Field label="Quem tem direito">
              <select className={inputCls} value={s.trial_audience} onChange={(e) => set('trial_audience', e.target.value)}>
                <option value="novos">Apenas novos usuários (cadastrados após a ativação)</option>
                <option value="todos">Todos os usuários</option>
              </select>
            </Field>
            <Field label="O que é liberado">
              <select className={inputCls} value={s.trial_scope} onChange={(e) => set('trial_scope', e.target.value)}>
                <option value="tudo">Todos os recursos pagos</option>
                <option value="produtos">Apenas produtos selecionados</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 self-end text-sm">
              <Switch checked={!!s.trial_once_per_user} onCheckedChange={(v) => set('trial_once_per_user', v)} />
              Apenas uma vez por usuário
            </label>
            {s.trial_scope === 'produtos' && (
              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Produtos liberados no teste</p>
                <div className="flex flex-wrap gap-2">
                  {products.map((p) => (
                    <button key={p.id} type="button" onClick={() => toggleTrialProduct(p.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${(s.trial_product_ids || []).includes(p.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      {p.name}
                    </button>
                  ))}
                  {products.length === 0 && <p className="text-xs text-muted-foreground">Nenhum produto cadastrado ainda.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-display text-lg">Tela de bloqueio</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Título"><input className={inputCls} value={s.paywall_title} onChange={(e) => set('paywall_title', e.target.value)} /></Field>
          <Field label="Texto do botão"><input className={inputCls} value={s.paywall_button_label} onChange={(e) => set('paywall_button_label', e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Field label="Mensagem"><textarea rows={2} className={inputCls} value={s.paywall_message} onChange={(e) => set('paywall_message', e.target.value)} /></Field>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar configurações
        </button>
      </div>
    </div>
  );
}