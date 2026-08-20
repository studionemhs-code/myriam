import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading } from '@/components/admin/ui';

const empty = { name: '', slug: '', description: '', color: '', icon: '', sort_order: 0 };

export default function CategoriesAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.ACAMFCategory.list('sort_order', 100);
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!editing.name) return;
    setSaving(true);
    try {
      if (editing.id) await base44.entities.ACAMFCategory.update(editing.id, editing);
      else await base44.entities.ACAMFCategory.create(editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };
  const remove = async (id) => { if (confirm('Excluir categoria?')) { await base44.entities.ACAMFCategory.delete(id); await load(); } };
  const move = async (item, delta) => {
    await base44.entities.ACAMFCategory.update(item.id, { sort_order: (item.sort_order || 0) + delta });
    await load();
  };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle
        title="Categorias ACAMF"
        subtitle={`${items.length} categorias`}
        action={
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Nova Categoria
          </button>
        }
      />

      <div className="space-y-2">
        {items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p> : items.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            {c.color && <span className="h-6 w-6 rounded-full" style={{ backgroundColor: c.color }} />}
            <div className="flex-1">
              <p className="font-medium">{c.name}</p>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => move(c, -1)} className="text-muted-foreground hover:text-primary"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => move(c, 1)} className="text-muted-foreground hover:text-primary"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => setEditing({ ...empty, ...c })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Nome"><input className={inputCls} value={editing.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="Descrição"><input className={inputCls} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field>
              <Field label="Cor (hex)"><input className={inputCls} value={editing.color} onChange={(e) => set('color', e.target.value)} placeholder="#6b21a8" /></Field>
              <Field label="Ícone (lucide)"><input className={inputCls} value={editing.icon} onChange={(e) => set('icon', e.target.value)} placeholder="BookOpen" /></Field>
              <Field label="Ordem"><input type="number" className={inputCls} value={editing.sort_order} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} /></Field>
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