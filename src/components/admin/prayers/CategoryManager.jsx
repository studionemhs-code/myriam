import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { Field, inputCls, Loading } from '@/components/admin/ui';

const empty = { name: '', sort_order: 0, icon: '', color: '' };

export default function CategoryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PrayerCategory.list('sort_order', 100);
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!editing.name) return;
    setSaving(true);
    try {
      if (editing.id) await base44.entities.PrayerCategory.update(editing.id, editing);
      else await base44.entities.PrayerCategory.create(editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (confirm('Excluir esta categoria?')) { await base44.entities.PrayerCategory.delete(id); await load(); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova Categoria
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Ordem</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{it.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{it.sort_order}</td>
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
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Nome"><input className={inputCls} value={editing.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="Ordem"><input type="number" className={inputCls} value={editing.sort_order} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} /></Field>
              <Field label="Cor (hex)" hint="Opcional, ex.: #673ab7"><input className={inputCls} value={editing.color || ''} onChange={(e) => set('color', e.target.value)} placeholder="#673ab7" /></Field>
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