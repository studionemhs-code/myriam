import React, { useState, useEffect } from 'react';
import { X, Save, Webhook, Code, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabase';
import { ORDER_STATUSES, STATUS_LABEL } from '@/lib/quoteUtils';

const TRIGGER_OPTIONS = [
  { value: 'chat', label: 'Chat (Mensagens Myriam)' },
  { value: 'caminho', label: 'Caminho' },
  { value: 'renovacao', label: 'Renovação' },
  { value: 'myriam', label: 'Myriam (Posts)' },
  { value: 'intencoes', label: 'Intenções' },
  { value: 'acamf', label: 'ACAMF' },
  { value: 'jornadas', label: 'Jornadas' },
  { value: 'novidades', label: 'Novidades' },
  { value: 'associacao', label: 'Associação' },
  { value: 'orcamento', label: 'Orçamento (Pedidos)' }
];

const PLACEHOLDERS = [
  '{remetente_nome}', '{destinatario_nome}', '{destinatario_email}', '{destinatario_telefone}',
  '{mensagem_texto}', '{categoria}', '{titulo}', '{corpo}',
  '{link_app}', '{conversation_id}', '{data}',
  '{cliente_nome}', '{codigo_rastreio}', '{status}', '{status_pedido}', '{pedido_id}'
];

export default function WebhookEditor({ webhook, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    enabled: true,
    message_template: 'Você recebeu uma nova mensagem de {remetente_nome}: {mensagem_texto}',
    trigger_types: ['chat'],
    orcamento_statuses: [],
    wait_seconds: 30,
    custom_headers: {}
  });
  const [headersText, setHeadersText] = useState('{}');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (webhook) {
      setForm({
        name: webhook.name || '',
        url: webhook.url || '',
        enabled: webhook.enabled ?? true,
        message_template: webhook.message_template || '',
        trigger_types: webhook.trigger_types || ['chat'],
        orcamento_statuses: webhook.orcamento_statuses || [],
        wait_seconds: webhook.wait_seconds || 30,
        custom_headers: webhook.custom_headers || {}
      });
      setHeadersText(JSON.stringify(webhook.custom_headers || {}, null, 2));
    }
  }, [webhook]);

  const testConnection = async () => {
    if (!form.url.trim()) {
      setError('Informe a URL de destino antes de testar.');
      return;
    }
    let parsedHeaders = {};
    try {
      parsedHeaders = JSON.parse(headersText || '{}');
    } catch {
      setError('Headers customizados inválidos (use JSON válido).');
      return;
    }
    setTesting(true);
    setTestResult(null);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('test-webhook', {
        body: {
          url: form.url,
          custom_headers: parsedHeaders,
          message_template: form.message_template
        }
      });
      if (invokeError) throw invokeError;
      setTestResult(data);
    } catch (e) {
      setTestResult({ error: e.message || 'Erro ao testar conexão.' });
    }
    setTesting(false);
  };

  const toggleTrigger = (val) => {
    setForm((f) => ({
      ...f,
      trigger_types: f.trigger_types.includes(val)
        ? f.trigger_types.filter((t) => t !== val)
        : [...f.trigger_types, val]
    }));
  };

  const toggleOrcamentoStatus = (val) => {
    setForm((f) => ({
      ...f,
      orcamento_statuses: (f.orcamento_statuses || []).includes(val)
        ? f.orcamento_statuses.filter((s) => s !== val)
        : [...(f.orcamento_statuses || []), val]
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
        const { error: updateError } = await supabase
          .from('webhook_automations')
          .update(data)
          .eq('id', webhook.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('webhook_automations')
          .insert(data);
        if (insertError) throw insertError;
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

            {form.trigger_types.includes('orcamento') && (
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Disparar para quais status do pedido?</p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleOrcamentoStatus(s)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        (form.orcamento_statuses || []).includes(s)
                          ? 'bg-gold text-deep'
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {STATUS_LABEL[s] || s}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Deixe vazio para disparar em qualquer status do pedido.</p>
              </div>
            )}
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

          {testResult && (
            <div className={`rounded-lg border p-3 text-sm ${testResult.error ? 'border-destructive/30 bg-destructive/5' : testResult.ok ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
              <div className="flex items-center gap-2">
                {testResult.error ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                ) : testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
                )}
                <span className="font-medium">
                  {testResult.error
                    ? `Erro: ${testResult.error}`
                    : testResult.ok
                      ? `Conexão estabelecida com sucesso! (HTTP ${testResult.status})`
                      : `Resposta recebida (HTTP ${testResult.status}), mas com possível problema.`}
                </span>
              </div>
              {testResult.ok && (
                <p className="mt-1.5 pl-6 text-xs text-green-700 dark:text-green-400">
                  O URL de destino recebeu os campos corretamente. O webhook está pronto para uso.
                </p>
              )}
              {testResult.response && (
                <pre className="mt-2 max-h-28 overflow-auto rounded bg-background p-2 text-xs">{testResult.response}</pre>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
          <div className="flex gap-2">
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
    </div>
  );
}
