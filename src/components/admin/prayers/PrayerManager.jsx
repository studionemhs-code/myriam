import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Music } from 'lucide-react';
import { Field, inputCls, Loading, Badge } from '@/components/admin/ui';
import ImageUpload from '@/components/admin/ImageUpload';
import FileUpload from '@/components/admin/FileUpload';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const empty = { title: '', category_id: '', content: '', audio_url: '', cover_url: '', sort_order: 0, is_published: true };

export default function PrayerManager() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        base44.entities.Prayer.list('-created_date', 200),
        base44.entities.PrayerCategory.list('sort_order', 100)
      ]);
      setItems(p);
      setCats(c);
    } catch (e) {
      console.error('Failed to load prayers', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!editing.title || !editing.category_id) return;
    setSaving(true);
    try {
      if (editing.id) await base44.entities.Prayer.update(editing.id, editing);
      else await base44.entities.Prayer.create(editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (confirm('Excluir esta oração?')) { await base44.entities.Prayer.delete(id); await load(); }
  };

  const catName = (id) => cats.find((c) => c.id === id)?.name || '—';

  if (loading) return <Loading />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova Oração
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Desktop table */}
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Áudio</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{it.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{catName(it.category_id)}</td>
                <td className="px-4 py-3">{it.audio_url ? <Badge tone="gold"><Music className="mr-1 h-3 w-3" />Sim</Badge> : '—'}</td>
                <td className="px-4 py-3"><Badge tone={it.is_published ? 'green' : 'muted'}>{it.is_published ? 'publicado' : 'rascunho'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing({ ...empty, ...it })} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(it.id)} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Mobile cards */}
        <div className="divide-y divide-border md:hidden">
          {items.map((it) => (
            <div key={it.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{catName(it.category_id)}</p>
                  <div className="mt-2 flex gap-2">
                    {it.audio_url && <Badge tone="gold"><Music className="mr-1 h-3 w-3" />Áudio</Badge>}
                    <Badge tone={it.is_published ? 'green' : 'muted'}>{it.is_published ? 'publicado' : 'rascunho'}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditing({ ...empty, ...it })} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(it.id)} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma oração cadastrada.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Oração' : 'Nova Oração'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
              </div>
              <Field label="Categoria">
                <select className={inputCls} value={editing.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">—</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ordem"><input type="number" className={inputCls} value={editing.sort_order} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} /></Field>
              <div className="col-span-2">
                <ImageUpload label="Capa (opcional)" value={editing.cover_url} onChange={(v) => set('cover_url', v)} aspect="video" />
              </div>
              <div className="col-span-2">
                <FileUpload value={editing.audio_url} onChange={(v) => set('audio_url', v)} accept="audio/*" contentType="audio" label="Áudio da oração (opcional)" hint="Envie um arquivo de áudio ou cole a URL direta." />
              </div>
              <div className="col-span-2">
                <Field label="Conteúdo (texto rico)">
                  <ReactQuill theme="snow" value={editing.content} onChange={(v) => set('content', v)} />
                </Field>
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_published} onChange={(e) => set('is_published', e.target.checked)} />
                Publicado
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}