import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, X } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';

const phaseLabels = { desejo: 'Desejo', conhecimento: 'Conhecimento', iluminacao: 'Iluminação', entrega: 'Entrega' };

export default function PreparationDaysAdmin() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.PreparationDay.list('day_number', 50);
    setDays(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.PreparationDay.update(editing.id, editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Dias de Preparação" subtitle={`${days.length} dias cadastrados`} />

      <div className="space-y-2">
        {days.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-display text-sm text-primary">{d.day_number}</div>
              <div>
                <p className="text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">{phaseLabels[d.phase]} · {d.is_published ? 'Publicado' : 'Rascunho'}</p>
              </div>
            </div>
            <button onClick={() => setEditing({ ...d })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Dia {editing.day_number}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
              <Field label="Fase">
                <select className={inputCls} value={editing.phase} onChange={(e) => set('phase', e.target.value)}>
                  {Object.entries(phaseLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Descrição"><input className={inputCls} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field>
              </div>
              <div className="col-span-2">
                <Field label="Texto do dia">
                  <ReactQuill theme="snow" value={editing.text || ''} onChange={(v) => set('text', v)} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Oração"><textarea className={inputCls} rows={2} value={editing.prayer || ''} onChange={(e) => set('prayer', e.target.value)} /></Field>
              </div>
              <Field label="Prática"><input className={inputCls} value={editing.practice || ''} onChange={(e) => set('practice', e.target.value)} /></Field>
              <Field label="Pergunta-guia"><input className={inputCls} value={editing.reflection_prompt || ''} onChange={(e) => set('reflection_prompt', e.target.value)} /></Field>
              <Field label="YouTube ID"><input className={inputCls} value={editing.youtube_id || ''} onChange={(e) => set('youtube_id', e.target.value)} /></Field>
              <Field label="Áudio URL"><input className={inputCls} value={editing.audio_url || ''} onChange={(e) => set('audio_url', e.target.value)} /></Field>
              <Field label="Imagem URL"><input className={inputCls} value={editing.image_url || ''} onChange={(e) => set('image_url', e.target.value)} /></Field>
              <Field label="PDF URL"><input className={inputCls} value={editing.pdf_url || ''} onChange={(e) => set('pdf_url', e.target.value)} /></Field>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_published} onChange={(e) => set('is_published', e.target.checked)} />
                Publicado
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}