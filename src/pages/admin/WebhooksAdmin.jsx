import React, { useState, useEffect, useCallback } from 'react';
import { Webhook, Plus, Trash2, Edit2, Send, Power, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WebhookEditor from '@/components/admin/WebhookEditor';

const TRIGGER_LABELS = {
  chat: 'Chat', caminho: 'Caminho', renovacao: 'Renovação', myriam: 'Myriam',
  intencoes: 'Intenções', acamf: 'ACAMF', jornadas: 'Jornadas', novidades: 'Novidades', associacao: 'Associação'
};

export default function WebhooksAdmin() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.WebhookAutomation.list('-created_date', 100);
      setWebhooks(list);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNew = () => {
    setEditing(null);
    setShowEditor(true);
  };

  const edit = (webhook) => {
    setEditing(webhook);
    setShowEditor(true);
  };

  const toggleEnabled = async (webhook) => {
    try {
      await base44.entities.WebhookAutomation.update(webhook.id, { enabled: !webhook.enabled });
      setWebhooks((prev) => prev.map((w) => w.id === webhook.id ? { ...w, enabled: !w.enabled } : w));
    } catch (e) { alert('Erro ao alterar status.'); }
  };

  const remove = async (webhook) => {
    if (!confirm(`Excluir o webhook "${webhook.name}"?`)) return;
    try {
      await base44.entities.WebhookAutomation.delete(webhook.id);
      setWebhooks((prev) => prev.filter((w) => w.id !== webhook.id));
    } catch (e) { alert('Erro ao excluir.'); }
  };

  const testWebhook = async (webhook) => {
    setTestingId(webhook.id);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('testWebhook', {
        url: webhook.url,
        custom_headers: webhook.custom_headers,
        message_template: webhook.message_template
      });
      setTestResult({ id: webhook.id, ...res.data });
    } catch (e) {
      setTestResult({ id: webhook.id, error: e.message });
    }
    setTestingId(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Automações de Webhook</h1>
          <p className="text-sm text-muted-foreground">Dispare webhooks quando usuários offline recebem mensagens ou notificações importantes.</p>
        </div>
        <button
          onClick={createNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Novo Webhook
        </button>
      </div>

      {/* Info card */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Como funciona</p>
          <p className="mt-1">Quando uma mensagem de chat ou notificação é criada, o sistema aguarda o tempo configurado e verifica se o destinatário leu. Se não leu (offline), dispara um POST para a URL com a mensagem personalizada. Use placeholders no template para incluir dados dinâmicos.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Webhook className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-lg">Nenhum webhook configurado</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro webhook para automatizar notificações externas.</p>
          <button onClick={createNew} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Criar Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base">{w.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${w.enabled ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {w.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{w.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(w.trigger_types || []).map((t) => (
                      <span key={t} className="rounded-full bg-marian/10 px-2 py-0.5 text-[10px] font-medium text-marian">
                        {TRIGGER_LABELS[t] || t}
                      </span>
                    ))}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Aguarda {w.wait_seconds || 30}s
                    </span>
                  </div>
                  <p className="mt-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs italic text-muted-foreground">
                    "{w.message_template}"
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button onClick={() => toggleEnabled(w)} title={w.enabled ? 'Desativar' : 'Ativar'} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary">
                    <Power className="h-4 w-4" />
                  </button>
                  <button onClick={() => testWebhook(w)} disabled={testingId === w.id} title="Disparar teste" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-gold">
                    {testingId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                  <button onClick={() => edit(w)} title="Editar" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(w)} title="Excluir" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {testResult?.id === w.id && (
                <div className={`mt-3 rounded-lg border p-3 text-sm ${testResult.error ? 'border-destructive/30 bg-destructive/5' : testResult.ok ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-muted/50'}`}>
                  <div className="flex items-center gap-2">
                    {testResult.error ? <AlertCircle className="h-4 w-4 text-destructive" /> : testResult.ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                    <span className="font-medium">
                      {testResult.error ? `Erro: ${testResult.error}` : `Resposta: ${testResult.status} ${testResult.ok ? '(Sucesso)' : ''}`}
                    </span>
                  </div>
                  {testResult.response && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-background p-2 text-xs">{testResult.response}</pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <WebhookEditor
          webhook={editing}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}
    </div>
  );
}