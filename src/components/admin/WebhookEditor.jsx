import React, { useState, useEffect } from 'react';
import { X, Save, Webhook, Code } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TRIGGER_OPTIONS = [
  { value: 'chat', label: 'Chat (Mensagens Myriam)' },
  { value: 'caminho', label: 'Caminho' },
  { value: 'renovacao', label: 'Renovação' },
  { value: 'myriam', label: 'Myriam (Posts)' },
  { value: 'intencoes', label: 'Intenções' },
  { value: 'acamf', label: 'ACAMF' },
  { value: 'jornadas', label: 'Jornadas' },
  { value: 'novidades', label: 'Novidades' },
  { value: 'associacao', label: 'Associação' }
];

const PLACEHOLDERS = [
  '{remetente_nome}', '{destinatario_nome}', '{destinatario_email}',
  '{mensagem_texto}', '{categoria}', '{titulo}', '{corpo}',
  '{link_app}', '{conversation_id}', '{data}'
];

export default function WebhookEditor({ webhook, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    enabled: true,
    message_template: 'Você recebeu uma nova mensagem de {remetente_nome}: {mensagem_texto}',
    trigger_types: ['chat'],
    wait_seconds: 30,
    custom_headers: {}
  });
  const [headersText, setHeadersText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (webhook) {
      setForm({
        name: webhook.name || '',
        url: webhook.url || '',
        enabled: webhook.enabled ?? true,
        message_template: webhook.message_template || '',
        trigger_types: webhook.trigger_types || ['chat'],
        wait_seconds: webhook.wait_seconds || 30,
        custom_headers: webhook.custom_headers || {}
      });
      setHeadersText(JSON.stringify(webhook.custom_headers || {}, null, 2));
    }
  }, [webhook]);

  const toggleTrigger = (val) => {
    setForm((f) => ({
      ...f,
      trigger_types: f.trigger_types.includes(val)
        ? f.trigger_types.filter((t) => t !== val)
        : [...f.trigger_types, val]
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError('Nome e URL são obrigatórios.');
      return;
    }
    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(headersText || '{}');
    } catch {
      setError('Headers customizados inválidos (use JSON válido).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = { ...form, custom_headers: parsedHeaders };
      if (webhook?.id) {
        await base44.entities.WebhookAutomation.update(webhook.id, data);
      } else {
        await base44.entities.WebhookAutomation.create(data);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Erro ao salvar.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-marian/15">
              <Webhook className="h-4 w-4 text-marian" />
            </div>
            <h2 className="font-display text-lg">{webhook?.id ? 'Editar Webhook' : 'Novo Webhook'}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Notificar equipe no Slack"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de Destino *</label>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://hooks.zapier.com/..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Disparar quando:</label>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleTrigger(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    form.trigger_types.includes(opt.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Template da Mensagem</label>
            <textarea
              value={form.message_template}
              onChange={(e) => setForm({ ...form, message_template: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PLACEHOLDERS.map((p) => (
                <code key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{p}</code>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tempo de espera (segundos)</label>
            <input
              type="number"
              min={5}
              max={300}
              value={form.wait_seconds}
              onChange={(e) => setForm({ ...form, wait_seconds: parseInt(e.target.value) || 30 })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Tempo que o sistema aguarda antes de verificar se o destinatário leu.</p>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Code className="h-3.5 w-3.5" /> Headers Customizados (JSON)
            </label>
            <textarea
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              rows={3}
              placeholder='{ "Authorization": "Bearer xxx" }'
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={`relative h-6 w-11 rounded-full transition ${form.enabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${form.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm">Webhook ativo</span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}