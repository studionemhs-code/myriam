import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Star, X } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';
import ImageUpload from '@/components/admin/ImageUpload';

const empty = {
  title: '', description: '', cover_url: '', poster_url: '', trailer_youtube_id: '',
  category_id: '', level: 'iniciante', status: 'rascunho', featured: false, sort_order: 0,
  accent_color: '#663399'
};

const levelLabels = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

function extractYouTubeId(value) {
  if (!value) return '';
  const v = value.trim();
  if (!v.includes('/') && !v.includes('=') && v.length === 11) return v;
  const m = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : v;
}

export default function CoursesAdmin() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, cc] = await Promise.all([
      base44.entities.Course.list('-created_date', 200),
      base44.entities.ACAMFCategory.list('sort_order', 50)
    ]);
    setItems(c);
    setCats(cc);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!editing.title) return;
    setSaving(true);
    try {
      if (editing.id) await base44.entities.Course.update(editing.id, editing);
      else await base44.entities.Course.create(editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (confirm('Excluir este curso? As aulas não serão excluídas.')) {
      await base44.entities.Course.delete(id);
      await load();
    }
  };

  if (loading) return <Loading />;

  const catName = (id) => cats.find((c) => c.id === id)?.name || '—';

  return (
    <div>
      <AdminPageTitle
        title="ACAMF — Cursos"
        subtitle={`${items.length} cursos cadastrados`}
        action={
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Novo Curso
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative aspect-[9/16] overflow-hidden bg-muted">
              {(it.poster_url || it.cover_url) ? (
                <img src={it.poster_url || it.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-deep/30">
                  <span className="text-xs text-muted-foreground">Sem capa</span>
                </div>
              )}
              {it.featured && (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-deep">
                  <Star className="h-3 w-3" /> Destaque
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate font-medium">{it.title}</p>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge tone={it.status === 'publicado' ? 'green' : it.status === 'arquivado' ? 'muted' : 'gold'}>{it.status}</Badge>
                <span>{catName(it.category_id)}</span>
                <span>·</span>
                <span>{levelLabels[it.level]}</span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setEditing({ ...empty, ...it })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Curso' : 'Novo Curso'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
              </div>
              <div className="col-span-2">
                <Field label="Descrição"><textarea className={inputCls} rows={2} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field>
              </div>
              <Field label="Categoria">
                <select className={inputCls} value={editing.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">—</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Nível">
                <select className={inputCls} value={editing.level} onChange={(e) => set('level', e.target.value)}>
                  {Object.entries(levelLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={editing.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="rascunho">Rascunho</option>
                  <option value="publicado">Publicado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </Field>
              <Field label="Ordem"><input type="number" className={inputCls} value={editing.sort_order} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} /></Field>
              <div className="col-span-2">
                <Field label="Trailer (YouTube)" hint="Link do YouTube — o ID é extraído automaticamente">
                  <input className={inputCls} placeholder="https://youtube.com/watch?v=..." value={editing.trailer_youtube_id} onChange={(e) => set('trailer_youtube_id', extractYouTubeId(e.target.value))} />
                </Field>
              </div>
              <div className="col-span-2">
                <ImageUpload label="Capa wide (hero)" hint="Imagem 16:9 para o banner principal" value={editing.cover_url} onChange={(v) => set('cover_url', v)} aspect="video" />
              </div>
              <div className="col-span-2">
                <ImageUpload label="Pôster vertical (card)" hint="Imagem 1080×1920px (9:16) para cards" value={editing.poster_url} onChange={(v) => set('poster_url', v)} aspect="poster" />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.featured} onChange={(e) => set('featured', e.target.checked)} />
                Destacar no banner principal da ACAMF
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