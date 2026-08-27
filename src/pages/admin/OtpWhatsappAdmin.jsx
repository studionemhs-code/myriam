import React, { useEffect, useState } from 'react';
import { Loader2, Save, MessageCircle, Power } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle } from '@/components/admin/ui';
import { useToast } from '@/components/ui/use-toast';

export default function OtpWhatsappAdmin() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.WhatsappOtpSettings.list('-created_date', 1);
      const s = list[0] || null;
      setSettings(s);
      setForm({
        enabled: s?.enabled ?? false,
        webhook_url: s?.webhook_url || '',
        message_template: s?.message_template || 'Olá! Seu código de verificação Theotokos é: {{token}}',
        token_expiration_minutes: s?.token_expiration_minutes ?? 5,
        max_attempts: s?.max_attempts ?? 5,
        max_resends: s?.max_resends ?? 3
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (settings?.id) {
        await base44.entities.WhatsappOtpSettings.update(settings.id, payload);
      } else {
        const created = await base44.entities.WhatsappOtpSettings.create(payload);
        setSettings(created);
      }
      toast({ description: 'Configurações de OTP WhatsApp salvas.' });
      await load();
    } catch (err) {
      toast({ variant: 'destructive', description: 'Erro ao salvar: ' + (err.message || '') });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div>
      <AdminPageTitle
        title="OTP Cadastro via WhatsApp"
        subtitle="Verificação por código no WhatsApp durante o cadastro de novos usuários."
      />

      {/* Toggle principal */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full ${form.enabled ? 'bg-green-500/10' : 'bg-muted'}`}>
            <Power className={`h-5 w-5 ${form.enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-medium">{form.enabled ? 'Verificação ativa' : 'Verificação desativada'}</p>
            <p className="text-xs text-muted-foreground">
              {form.enabled
                ? 'Novos cadastros receberão um código no WhatsApp para validar o acesso.'
                : 'Cadastros entram direto, sem verificação por WhatsApp.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => set('enabled', !form.enabled)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${form.enabled ? 'bg-green-600' : 'bg-muted-foreground/30'}`}
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${form.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Configurações do webhook */}
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <h2 className="font-display text-base">Configurações do Webhook</h2>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">URL do Webhook</span>
          <input
            value={form.webhook_url}
            onChange={(e) => set('webhook_url', e.target.value)}
            placeholder="https://hook.zapier.com/... ou https://sua-api.com/whatsapp"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            A URL receberá um POST com: <code className="rounded bg-muted px-1">{'{ whatsapp_number, message, token, email }'}</code>
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Template da Mensagem</span>
          <textarea
            value={form.message_template}
            onChange={(e) => set('message_template', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Placeholders: <code className="rounded bg-muted px-1">{'{{token}}'}</code> (código de 6 dígitos) e <code className="rounded bg-muted px-1">{'{{nome}}'}</code> (nome do usuário)
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Expira em (min)</span>
            <input
              type="number"
              min={1}
              value={form.token_expiration_minutes}
              onChange={(e) => set('token_expiration_minutes', parseInt(e.target.value) || 5)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Máx. tentativas</span>
            <input
              type="number"
              min={1}
              value={form.max_attempts}
              onChange={(e) => set('max_attempts', parseInt(e.target.value) || 5)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Máx. reenvios</span>
            <input
              type="number"
              min={0}
              value={form.max_resends}
              onChange={(e) => set('max_resends', parseInt(e.target.value) || 3)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        O serviço externo (Zapier, Make, n8n ou API própria) conectado à URL do webhook é responsável por enviar a mensagem via WhatsApp Business API.
      </p>
    </div>
  );
}