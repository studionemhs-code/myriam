import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Field, inputCls, Loading } from '@/components/admin/ui';
import { Switch } from '@/components/ui/switch';

const empty = { whatsapp: '', email: '', phone: '', site_url: '', enabled: true };

export default function SuporteAdmin() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.SupportSettings.list();
        setSettings(list[0] || { ...empty });
      } catch (e) {
        setSettings({ ...empty });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k, v) => setSettings((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        const updated = await base44.entities.SupportSettings.update(settings.id, settings);
        setSettings(updated);
      } else {
        const created = await base44.entities.SupportSettings.create(settings);
        setSettings(created);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <Loading />;

  return (
    <div>
      <AdminPageTitle
        title="Suporte"
        subtitle="Configure os canais de contato exibidos para os usuários"
      />
      <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <Field label="WhatsApp" hint="Número com DDI e DDD (ex.: 5511999999999)">
          <input className={inputCls} value={settings.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="5511999999999" />
        </Field>
        <Field label="E-mail">
          <input className={inputCls} type="email" value={settings.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="suporte@exemplo.com" />
        </Field>
        <Field label="Telefone" hint="Número com DDI e DDD">
          <input className={inputCls} value={settings.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="5511999999999" />
        </Field>
        <Field label="Site / Página de Ajuda">
          <input className={inputCls} type="url" value={settings.site_url || ''} onChange={(e) => set('site_url', e.target.value)} placeholder="https://ajuda.exemplo.com" />
        </Field>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Exibir suporte para os usuários</p>
            <p className="text-xs text-muted-foreground">Quando desativado, o card e o menu de suporte ficam ocultos</p>
          </div>
          <Switch checked={settings.enabled !== false} onCheckedChange={(v) => set('enabled', v)} />
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}