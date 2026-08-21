import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, FileText, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function AgentEditor({ agent, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: agent?.name || '',
    description: agent?.description || '',
    instructions: agent?.instructions || '',
    welcome_message: agent?.welcome_message || '',
    model: agent?.model || 'gpt-4o-mini',
    temperature: agent?.temperature ?? 0.7,
    knowledge_content: agent?.knowledge_content || '',
    knowledge_files: agent?.knowledge_files || [],
    openai_api_key: agent?.openai_api_key || '',
    is_active: agent?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: 'object', properties: { text_content: { type: 'string' } } }
      });
      const text = extracted?.output?.text_content || extracted?.output?.text || '';
      if (text) {
        setForm(f => ({
          ...f,
          knowledge_content: (f.knowledge_content ? f.knowledge_content + '\n\n' : '') + `--- ${file.name} ---\n${text}`,
          knowledge_files: [...f.knowledge_files, { url: file_url, label: file.name }]
        }));
      } else {
        setForm(f => ({
          ...f,
          knowledge_files: [...f.knowledge_files, { url: file_url, label: file.name }]
        }));
      }
    } catch (err) {
      alert('Erro ao processar arquivo: ' + (err.message || 'tente outro formato'));
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx) => {
    setForm(f => ({ ...f, knowledge_files: f.knowledge_files.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    setSaving(true);
    try {
      if (agent?.id) {
        await base44.entities.AIAgent.update(agent.id, form);
      } else {
        await base44.entities.AIAgent.create(form);
      }
      onSave();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nome">
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Assistente Theotokos" />
        </Field>
        <Field label="Modelo OpenAI">
          <select className={inputCls} value={form.model} onChange={e => set('model', e.target.value)}>
            <option value="gpt-4o-mini">GPT-4o Mini (rápido e econômico)</option>
            <option value="gpt-4o">GPT-4o (mais capaz)</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (básico)</option>
          </select>
        </Field>
      </div>

      <Field label="Chave API OpenAI" hint="Chave pessoal do admin. Se vazio, usa a chave padrão do backend. Assim o app não depende do backend ao clonar.">
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showKey ? 'text' : 'password'}
            className={inputCls + ' pl-9 pr-10'}
            value={form.openai_api_key}
            onChange={e => set('openai_api_key', e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Field label="Descrição" hint="Texto curto exibido aos usuários">
        <input className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Tire dúvidas sobre a consagração" />
      </Field>

      <Field label="Mensagem de boas-vindas">
        <input className={inputCls} value={form.welcome_message} onChange={e => set('welcome_message', e.target.value)} placeholder="Ex: Olá! Como posso ajudar você hoje?" />
      </Field>

      <Field label="Instruções (System Prompt)" hint="Define o comportamento e personalidade do agente">
        <textarea className={inputCls} rows={6} value={form.instructions} onChange={e => set('instructions', e.target.value)} placeholder="Você é um assistente especializado em..." />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={`Temperatura: ${form.temperature.toFixed(1)}`} hint="0 = preciso, 1 = criativo">
          <input type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={e => set('temperature', parseFloat(e.target.value))} className="w-full" />
        </Field>
        <Field label="Status">
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="h-4 w-4 rounded border-border" />
            <span className="text-sm">Disponível para os usuários</span>
          </label>
        </Field>
      </div>

      <Field label="Fontes de Conhecimento" hint="Carregue arquivos (PDF, DOC, TXT) ou cole o texto diretamente">
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm hover:bg-muted">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Processando arquivo...' : 'Carregar arquivo de conhecimento'}
            <input type="file" className="hidden" onChange={onUpload} accept=".pdf,.doc,.docx,.txt,.csv,.html" disabled={uploading} />
          </label>
          {form.knowledge_files.length > 0 && (
            <div className="space-y-1">
              {form.knowledge_files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{f.label}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <textarea className={inputCls} rows={8} value={form.knowledge_content} onChange={e => set('knowledge_content', e.target.value)} placeholder="Conteúdo de conhecimento do agente (extraído dos arquivos ou digitado manualmente)..." />
        </div>
      </Field>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={save} disabled={saving || !form.name || !form.instructions}>
          {saving ? 'Salvando...' : 'Salvar Agente'}
        </Button>
      </div>
    </div>
  );
}