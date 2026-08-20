import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';

const empty = { title: '', description: '', event_date: '', image_url: '', type: 'festa', is_featured: false, is_system: true };
const typeLabels = { solenidade: 'Solenidade', festa: 'Festa', memoria: 'Memória', jornada: 'Jornada', pessoal: 'Pessoal', evento: 'Evento' };

export default function CalendarAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.MarianCalendarEvent.list('-event_date', 200);
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!editing.title || !editing.event_date) return;
    setSaving(true);
    try {
      if (editing.id) await base44.entities.MarianCalendarEvent.update(editing.id, editing);
      else await base44.entities.MarianCalendarEvent.create(editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };
  const remove = async (id) => { if (confirm('Excluir evento?')) { await base44.entities.MarianCalendarEvent.delete(id); await load(); } };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle
        title="Calendário Mariano"
        subtitle={`${items.length} eventos`}
        action={
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Novo Evento
          </button>
        }
      />

      <div className="space-y-2">
        {items.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="font-display text-lg leading-none">{new Date(ev.event_date).getDate()}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{new Date(ev.event_date).toLocaleDateString('pt-BR', { month: 'short' })}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{ev.title}</p>
                <div className="flex items-center gap-2">
                  <Badge>{typeLabels[ev.type]}</Badge>
                  {ev.is_featured && <Badge tone="gold">Destaque</Badge>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing({ ...empty, ...ev })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(ev.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Evento' : 'Novo Evento'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
              <Field label="Data"><input type="date" className={inputCls} value={editing.event_date} onChange={(e) => set('event_date', e.target.value)} /></Field>
              <Field label="Tipo">
                <select className={inputCls} value={editing.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <div className="col-span-2"><Field label="Descrição"><textarea className={inputCls} rows={3} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
              <div className="col-span-2"><Field label="Imagem URL"><input className={inputCls} value={editing.image_url} onChange={(e) => set('image_url', e.target.value)} /></Field></div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Destaque
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