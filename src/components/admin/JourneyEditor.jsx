import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Bell, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';

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
    content_ids: [],
    notices: [],
    steps: [],
    ...journey
  });
  const [contents, setContents] = useState([]);
  const [loadingContents, setLoadingContents] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ACAMFContent.filter({ status: 'publicado' }, '-published_date', 100);
        setContents(list);
      } catch (e) { /* ignore */ }
      setLoadingContents(false);
    })();
  }, []);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Notices
  const addNotice = () => {
    const next = [...(form.notices || []), { text: '', date: new Date().toISOString() }];
    set('notices', next);
  };
  const updateNotice = (i, text) => {
    const next = (form.notices || []).map((n, idx) => idx === i ? { ...n, text } : n);
    set('notices', next);
  };
  const removeNotice = (i) => {
    const next = (form.notices || []).filter((_, idx) => idx !== i);
    set('notices', next);
  };

  // Steps
  const addStep = () => {
    const next = [...(form.steps || []), { title: '', description: '' }];
    set('steps', next);
  };
  const updateStep = (i, k, v) => {
    const next = (form.steps || []).map((s, idx) => idx === i ? { ...s, [k]: v } : s);
    set('steps', next);
  };
  const removeStep = (i) => {
    const next = (form.steps || []).filter((_, idx) => idx !== i);
    set('steps', next);
  };

  // Contents
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
        </div>

        {/* Etapas (gamificação) */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base"><Target className="h-4 w-4 text-gold" /> Etapas da jornada</h3>
            <button onClick={addStep} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Adicionar etapa</button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">Cada etapa é um marco que o usuário conclui para avançar na gamificação.</p>
          <div className="space-y-2">
            {(form.steps || []).map((s, i) => (
              <div key={i} className="flex gap-2 rounded-xl border border-border p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{i + 1}</div>
                <div className="flex-1 space-y-2">
                  <input className={inputCls} placeholder="Título da etapa" value={s.title || ''} onChange={(e) => updateStep(i, 'title', e.target.value)} />
                  <input className={inputCls} placeholder="Descrição (opcional)" value={s.description || ''} onChange={(e) => updateStep(i, 'description', e.target.value)} />
                </div>
                <button onClick={() => removeStep(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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

        {/* Conteúdos associados */}
        <div className="mt-6">
          <h3 className="mb-2 font-display text-base">Conteúdos da ACAMF</h3>
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