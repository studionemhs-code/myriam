import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Bell, Target, BookOpen, PenLine } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';
import JourneyContentManager from '@/components/admin/JourneyContentManager';

const statusLabels = { rascunho: 'Rascunho', ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

export default function JourneyEditor({ journey, onClose, onSave }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    start_date: '',
    end_date: '',
    status: 'ativa',
    journey_type: 'consagracao',
    welcome_message: '',
    presentation_text: '',
    content_ids: [],
    notices: [],
    steps: [],
    ...journey
  });
  const [contents, setContents] = useState([]);
  const [journeyLib, setJourneyLib] = useState([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [acamf, lib] = await Promise.all([
          base44.entities.ACAMFContent.filter({ status: 'publicado' }, '-published_date', 100),
          base44.entities.JourneyContent.list('-created_date', 200)
        ]);
        setContents(acamf);
        setJourneyLib(lib);
      } catch (e) { /* ignore */ }
      setLoadingContents(false);
    })();
  }, []);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Notices
  const addNotice = () => set('notices', [...(form.notices || []), { text: '', date: new Date().toISOString() }]);
  const updateNotice = (i, text) => set('notices', (form.notices || []).map((n, idx) => idx === i ? { ...n, text } : n));
  const removeNotice = (i) => set('notices', (form.notices || []).filter((_, idx) => idx !== i));

  // Steps
  const addStep = () => set('steps', [...(form.steps || []), { title: '', description: '', content_source: 'none' }]);
  const updateStep = (i, k, v) => set('steps', (form.steps || []).map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const removeStep = (i) => set('steps', (form.steps || []).filter((_, idx) => idx !== i));

  // Contents (legado)
  const toggleContent = (cid) => {
    const ids = form.content_ids || [];
    set('content_ids', ids.includes(cid) ? ids.filter((x) => x !== cid) : [...ids, cid]);
  };

  const save = async () => {
    if (!form.title || !form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        notices: (form.notices || []).filter((n) => n.text && n.text.trim()),
        steps: (form.steps || []).filter((s) => s.title && s.title.trim())
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const sourceLabels = {
    none: 'Sem conteúdo vinculado',
    acamf: 'Conteúdo da ACAMF',
    journey_library: 'Biblioteca de jornada',
    inline: 'Conteúdo próprio (inline)'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{form.id ? 'Editar Jornada' : 'Nova Jornada'}</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Básico */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Título"><input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Descrição"><textarea className={inputCls} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
          <Field label="Tipo de jornada">
            <select className={inputCls} value={form.journey_type} onChange={(e) => set('journey_type', e.target.value)}>
              <option value="consagracao">Consagração</option>
              <option value="renovacao">Renovação</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Início"><input type="date" className={inputCls} value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} /></Field>
          <Field label="Término"><input type="date" className={inputCls} value={form.end_date || ''} onChange={(e) => set('end_date', e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Imagem URL"><input className={inputCls} value={form.image_url || ''} onChange={(e) => set('image_url', e.target.value)} /></Field></div>
          <div className="col-span-2">
            <Field label="Mensagem de boas-vindas">
              <textarea className={inputCls} rows={2} value={form.welcome_message || ''} onChange={(e) => set('welcome_message', e.target.value)} placeholder="Mensagem exibida quando o usuário iniciar a jornada" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Texto de apresentação (banner)" hint="Exibido no banner fixo no topo da página de Jornadas. Se vazio, usa o texto padrão.">
              <textarea className={inputCls} rows={3} value={form.presentation_text || ''} onChange={(e) => set('presentation_text', e.target.value)} placeholder="Explique o que são as Jornadas Coletivas para os usuários..." />
            </Field>
          </div>
        </div>

        {/* Etapas (gamificação) com conteúdos */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base"><Target className="h-4 w-4 text-gold" /> Etapas da jornada</h3>
            <button onClick={addStep} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Adicionar etapa</button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Cada etapa pode ter um conteúdo vinculado: da ACAMF, da biblioteca de jornada, ou criado inline.</p>
          <div className="space-y-3">
            {(form.steps || []).map((s, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{i + 1}</div>
                  <div className="flex-1 space-y-2">
                    <input className={inputCls} placeholder="Título da etapa" value={s.title || ''} onChange={(e) => updateStep(i, 'title', e.target.value)} />
                    <input className={inputCls} placeholder="Descrição (opcional)" value={s.description || ''} onChange={(e) => updateStep(i, 'description', e.target.value)} />
                  </div>
                  <button onClick={() => removeStep(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                {/* Seletor de conteúdo da etapa */}
                <div className="mt-2 space-y-2 pl-9">
                  <Field label="Conteúdo da etapa">
                    <select className={inputCls} value={s.content_source || 'none'} onChange={(e) => updateStep(i, 'content_source', e.target.value)}>
                      {Object.entries(sourceLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                  {s.content_source === 'acamf' && (
                    <select className={inputCls} value={s.content_id || ''} onChange={(e) => updateStep(i, 'content_id', e.target.value)}>
                      <option value="">— Selecione um conteúdo ACAMF —</option>
                      {contents.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  )}
                  {s.content_source === 'journey_library' && (
                    <select className={inputCls} value={s.journey_content_id || ''} onChange={(e) => updateStep(i, 'journey_content_id', e.target.value)}>
                      <option value="">— Selecione um conteúdo da biblioteca —</option>
                      {journeyLib.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  )}
                  {s.content_source === 'inline' && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                      <input className={inputCls} placeholder="Título do conteúdo" value={s.content_data?.title || ''} onChange={(e) => updateStep(i, 'content_data', { ...s.content_data, title: e.target.value })} />
                      <select className={inputCls} value={s.content_data?.content_type || 'texto'} onChange={(e) => updateStep(i, 'content_data', { ...s.content_data, content_type: e.target.value })}>
                        <option value="texto">Texto</option>
                        <option value="pdf">PDF</option>
                        <option value="audio">Áudio</option>
                        <option value="video">Vídeo (YouTube)</option>
                        <option value="imagem">Imagem</option>
                      </select>
                      <textarea className={inputCls} rows={3} placeholder="Conteúdo (rich text / HTML)" value={s.content_data?.content || ''} onChange={(e) => updateStep(i, 'content_data', { ...s.content_data, content: e.target.value })} />
                      <input className={inputCls} placeholder="URL do arquivo (PDF, áudio, imagem)" value={s.content_data?.file_url || s.content_data?.audio_url || ''} onChange={(e) => {
                        const ct = s.content_data?.content_type;
                        const key = ct === 'audio' ? 'audio_url' : 'file_url';
                        updateStep(i, 'content_data', { ...s.content_data, [key]: e.target.value });
                      }} />
                      {s.content_data?.content_type === 'video' && (
                        <input className={inputCls} placeholder="ID do YouTube" value={s.content_data?.youtube_id || ''} onChange={(e) => updateStep(i, 'content_data', { ...s.content_data, youtube_id: e.target.value })} />
                      )}
                      <input className={inputCls} placeholder="URL da capa (opcional)" value={s.content_data?.cover_url || ''} onChange={(e) => updateStep(i, 'content_data', { ...s.content_data, cover_url: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(form.steps || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhuma etapa adicionada.</p>}
          </div>
        </div>

        {/* Avisos */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base"><Bell className="h-4 w-4 text-gold" /> Avisos / Mensagens</h3>
            <button onClick={addNotice} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Adicionar aviso</button>
          </div>
          <div className="space-y-2">
            {(form.notices || []).map((n, i) => (
              <div key={i} className="flex gap-2">
                <textarea className={`${inputCls} flex-1`} rows={2} placeholder="Mensagem para os participantes" value={n.text || ''} onChange={(e) => updateNotice(i, e.target.value)} />
                <button onClick={() => removeNotice(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {(form.notices || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum aviso adicionado.</p>}
          </div>
        </div>

        {/* Biblioteca de conteúdos de jornada */}
        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 font-display text-base"><PenLine className="h-4 w-4 text-gold" /> Biblioteca de Conteúdos</h3>
          <JourneyContentManager />
        </div>

        {/* Conteúdos ACAMF associados (legado) */}
        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 font-display text-base"><BookOpen className="h-4 w-4 text-gold" /> Conteúdos da ACAMF (extras)</h3>
          <p className="mb-2 text-xs text-muted-foreground">Conteúdos gerais da jornada (além das etapas acima).</p>
          {loadingContents ? (
            <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : contents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum conteúdo publicado.</p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {contents.map((c) => {
                const checked = (form.content_ids || []).includes(c.id);
                return (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-muted/40">
                    <input type="checkbox" checked={checked} onChange={() => toggleContent(c.id)} className="accent-primary" />
                    <span className="text-sm">{c.title}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}