import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, FileText, Eye, EyeOff, KeyRound, Bot, Calculator, Globe, Database, Brain, BookHeart, Sparkles, Footprints, Hammer } from 'lucide-react';

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
    is_active: agent?.is_active ?? true,
    icon_url: agent?.icon_url || '',
    is_floating_main: agent?.is_floating_main ?? false,
    tools_enabled: agent?.tools_enabled || [],
    reasoning_enabled: agent?.reasoning_enabled ?? false,
    architect_mode_enabled: agent?.architect_mode_enabled ?? false,
    message_delay_ms: agent?.message_delay_ms ?? 0
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
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

  const onIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('icon_url', file_url);
    } catch {
      alert('Erro ao enviar ícone.');
    } finally {
      setUploadingIcon(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      // Garante exclusividade do agente principal do botão flutuante
      if (form.is_floating_main) {
        const all = await base44.entities.AIAgent.filter({ is_floating_main: true });
        await Promise.all(
          all
            .filter((a) => a.id !== agent?.id)
            .map((a) => base44.entities.AIAgent.update(a.id, { is_floating_main: false }))
        );
      }
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

      {/* Ícone do agente (botão flutuante) */}
      <Field label="Ícone do agente (botão flutuante)" hint="Logo/ícone exibido no botão flutuante. Em branco usa o ícone padrão.">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-border">
            {form.icon_url
              ? <img src={form.icon_url} alt="" className="h-full w-full object-cover" />
              : <Bot className="h-7 w-7 text-primary" />}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm hover:bg-muted">
            {uploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploadingIcon ? 'Enviando...' : (form.icon_url ? 'Trocar ícone' : 'Enviar ícone')}
            <input type="file" accept="image/*" className="hidden" onChange={onIconUpload} disabled={uploadingIcon} />
          </label>
          {form.icon_url && (
            <button type="button" onClick={() => set('icon_url', '')} className="text-xs text-muted-foreground hover:text-destructive">Remover</button>
          )}
        </div>
      </Field>

      {/* Agente principal do botão flutuante */}
      <Field label="Botão flutuante" hint="Marque para que este agente seja o principal do botão flutuante. Apenas um agente por vez pode ter esta marcação.">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_floating_main}
            onChange={e => set('is_floating_main', e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm">Definir como agente principal do botão flutuante</span>
        </label>
      </Field>

      {/* Capacidades Avançadas */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium"><Brain className="h-4 w-4 text-gold" /> Capacidades Avançadas</p>

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ferramentas gerais</p>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ToolToggle
            icon={Calculator}
            label="Calculadora"
            description="Cálculos matemáticos"
            checked={form.tools_enabled.includes('calculator')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'calculator'] : form.tools_enabled.filter(t => t !== 'calculator'))}
          />
          <ToolToggle
            icon={Globe}
            label="Pesquisa na Internet"
            description="Busca via DuckDuckGo"
            checked={form.tools_enabled.includes('web_search')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'web_search'] : form.tools_enabled.filter(t => t !== 'web_search'))}
          />
          <ToolToggle
            icon={Database}
            label="Estatísticas do Sistema"
            description="Total de membros, intenções..."
            checked={form.tools_enabled.includes('system_query')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'system_query'] : form.tools_enabled.filter(t => t !== 'system_query'))}
          />
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Integração com o sistema (copiloto espiritual)</p>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ToolToggle
            icon={Footprints}
            label="Exercícios da Caminhada"
            description="Busca conteúdo do dia atual da preparação"
            checked={form.tools_enabled.includes('get_preparation_day')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'get_preparation_day'] : form.tools_enabled.filter(t => t !== 'get_preparation_day'))}
          />
          <ToolToggle
            icon={BookHeart}
            label="Conteúdos ACAMF"
            description="Lista e recomenda conteúdos publicados"
            checked={form.tools_enabled.includes('list_acamf_content')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'list_acamf_content'] : form.tools_enabled.filter(t => t !== 'list_acamf_content'))}
          />
          <ToolToggle
            icon={Sparkles}
            label="Orações"
            description="Lista orações disponíveis por categoria"
            checked={form.tools_enabled.includes('list_prayers')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'list_prayers'] : form.tools_enabled.filter(t => t !== 'list_prayers'))}
          />
          <ToolToggle
            icon={Footprints}
            label="Jornadas Coletivas"
            description="Lista jornadas ativas e participação"
            checked={form.tools_enabled.includes('get_active_journeys')}
            onChange={(v) => set('tools_enabled', v ? [...form.tools_enabled, 'get_active_journeys'] : form.tools_enabled.filter(t => t !== 'get_active_journeys'))}
          />
        </div>

        <label className="mb-3 flex items-center gap-2">
          <input type="checkbox" checked={form.reasoning_enabled} onChange={e => set('reasoning_enabled', e.target.checked)} className="h-4 w-4 rounded border-border" />
          <span className="text-sm">Raciocínio Avançado — usa modelo mais capaz e pensa passo a passo</span>
        </label>

        <div className="mb-3 rounded-lg border border-amber-300/40 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-950/20">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.architect_mode_enabled} onChange={e => set('architect_mode_enabled', e.target.checked)} className="h-4 w-4 rounded border-border" />
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Hammer className="h-4 w-4" /> Modo Arquiteto (admin only)
            </span>
          </label>
          <p className="mt-1.5 pl-6 text-xs text-amber-600/80 dark:text-amber-500/70">
            Dá ao agente liberdade total para criar, editar e excluir conteúdos, orações, notificações, jornadas, usuários e configurações do sistema. Funciona apenas para contas admin.
          </p>
        </div>

        <Field label={`Atraso entre partes da resposta: ${form.message_delay_ms}ms`} hint="Quebra mensagens longas em partes e envia com pausa. 0 = resposta instantânea.">
          <input type="range" min="0" max="3000" step="200" value={form.message_delay_ms} onChange={e => set('message_delay_ms', parseInt(e.target.value))} className="w-full" />
        </Field>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={save} disabled={saving || !form.name || !form.instructions}>
          {saving ? 'Salvando...' : 'Salvar Agente'}
        </Button>
      </div>
    </div>
  );
}

function ToolToggle({ icon: Icon, label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
        checked ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40'
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}