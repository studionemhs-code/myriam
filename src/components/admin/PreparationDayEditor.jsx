import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Field, inputCls } from '@/components/admin/ui';

export default function PreparationDayEditor({ day, phases, onClose, onSaved }) {
  const [form, setForm] = useState(day || { day_number: 1, title: '', phase: '', is_published: true, links: [] });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addLink = () => set('links', [...(form.links || []), { url: '', label: '' }]);
  const updateLink = (i, k, v) => {
    const links = [...(form.links || [])];
    links[i] = { ...links[i], [k]: v };
    set('links', links);
  };
  const removeLink = (i) => set('links', (form.links || []).filter((_, idx) => idx !== i));

  const save = async () => {
    if (!form.title?.trim() || !form.day_number) return;
    setSaving(true);
    try {
      const payload = { ...form, day_number: parseInt(form.day_number) };
      if (form.id) {
        await base44.entities.PreparationDay.update(form.id, payload);
      } else {
        await base44.entities.PreparationDay.create(payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{form.id ? `Editar Dia ${form.day_number}` : 'Novo Dia'}</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        {phases.length === 0 && (
          <p className="mb-3 rounded-lg bg-gold/10 p-3 text-xs text-gold">Crie as fases acima antes de cadastrar os dias.</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Número do dia (1-33)">
            <input type="number" min="1" max="33" className={inputCls} value={form.day_number} onChange={(e) => set('day_number', parseInt(e.target.value) || 1)} />
          </Field>
          <Field label="Título">
            <input className={inputCls} value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Título do dia" />
          </Field>
          <Field label="Fase">
            <select className={inputCls} value={form.phase || ''} onChange={(e) => set('phase', e.target.value)}>
              <option value="">Selecione uma fase</option>
              {phases.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Publicado">
            <select className={inputCls} value={form.is_published ? 'sim' : 'nao'} onChange={(e) => set('is_published', e.target.value === 'sim')}>
              <option value="sim">Sim</option>
              <option value="nao">Não (rascunho)</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Descrição">
              <input className={inputCls} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Breve descrição do tema" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Texto do dia (formato rico)">
              <ReactQuill theme="snow" value={form.text || ''} onChange={(v) => set('text', v)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Oração do dia">
              <textarea className={inputCls} rows={3} value={form.prayer || ''} onChange={(e) => set('prayer', e.target.value)} />
            </Field>
          </div>
          <Field label="Prática sugerida">
            <input className={inputCls} value={form.practice || ''} onChange={(e) => set('practice', e.target.value)} />
          </Field>
          <Field label="Pergunta-guia">
            <input className={inputCls} value={form.reflection_prompt || ''} onChange={(e) => set('reflection_prompt', e.target.value)} />
          </Field>
          <Field label="YouTube ID">
            <input className={inputCls} value={form.youtube_id || ''} onChange={(e) => set('youtube_id', e.target.value)} placeholder="ex: dQw4w9WgXcQ" />
          </Field>
          <Field label="Vídeo URL (arquivo)">
            <input className={inputCls} value={form.video_url || ''} onChange={(e) => set('video_url', e.target.value)} placeholder="URL direta do vídeo" />
          </Field>
          <Field label="Áudio URL">
            <input className={inputCls} value={form.audio_url || ''} onChange={(e) => set('audio_url', e.target.value)} />
          </Field>
          <Field label="Imagem URL">
            <input className={inputCls} value={form.image_url || ''} onChange={(e) => set('image_url', e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="PDF URL">
              <input className={inputCls} value={form.pdf_url || ''} onChange={(e) => set('pdf_url', e.target.value)} />
            </Field>
          </div>

          {/* Links externos */}
          <div className="col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Links externos</label>
              <button onClick={addLink} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Adicionar link</button>
            </div>
            <div className="mt-2 space-y-2">
              {(form.links || []).map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input className={`${inputCls} flex-1`} placeholder="Rótulo (ex: Leitura recomendada)" value={l.label || ''} onChange={(e) => updateLink(i, 'label', e.target.value)} />
                  <input className={`${inputCls} flex-1`} placeholder="https://..." value={l.url || ''} onChange={(e) => updateLink(i, 'url', e.target.value)} />
                  <button onClick={() => removeLink(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
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