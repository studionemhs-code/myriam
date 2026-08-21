import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Field, inputCls } from '@/components/admin/ui';
import { PRODUCT_CATEGORIES } from '@/lib/quoteUtils';
import { Plus, Pencil, Trash2, Loader2, Upload } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useConfirm } from '@/hooks/useConfirm.jsx';

export default function OrcamentosCatalogo() {
  const [products, setProducts] = useState(null);
  const [activeTab, setActiveTab] = useState('chain');
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const load = () => base44.entities.CatalogProduct.list().then((d) => d.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.sort_order || 0) - (b.sort_order || 0))).then(setProducts);
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g = {};
    (products || []).forEach((p) => { (g[p.category] ||= []).push(p); });
    return g;
  }, [products]);

  const openNew = (cat) => { setIsNew(true); setEditing({ slug: '', category: cat, label: '', image_url: '', sort_order: 0, active: true, in_stock: true, stock_quantity: null }); };
  const openEdit = (p) => { setIsNew(false); setEditing({ ...p }); };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { toast({ title: 'Imagem muito grande', description: 'Tamanho máximo: 800 KB.', variant: 'destructive' }); return; }
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditing({ ...editing, image_url: file_url });
    } catch { toast({ title: 'Erro', description: 'Falha ao enviar imagem.', variant: 'destructive' }); }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.CatalogProduct.create(editing);
      } else {
        await base44.entities.CatalogProduct.update(editing.id, editing);
      }
      setEditing(null);
      load();
      toast({ title: 'Salvo!', description: isNew ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.' });
    } catch (err) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!await confirm({ title: 'Remover produto?', description: 'Esta ação não pode ser desfeita.', confirmLabel: 'Remover', destructive: true })) return;
    await base44.entities.CatalogProduct.delete(id);
    load();
    toast({ title: 'Produto removido', description: 'O produto foi excluído com sucesso.' });
  };

  if (!products) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Catálogo" subtitle="Gerencie os produtos exibidos no formulário." />

      <div className="mb-4 flex flex-wrap gap-2">
        {PRODUCT_CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setActiveTab(c.id)} className={`rounded-lg px-3 py-2 text-sm transition ${activeTab === c.id ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex justify-end">
        <button onClick={() => openNew(activeTab)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(grouped[activeTab] || []).map((p) => (
          <div key={p.id} className={`rounded-xl border border-border bg-card p-3 ${p.active ? '' : 'opacity-60'}`}>
            <div className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0">
                {p.image_url ? <img src={p.image_url} alt={p.label} className="h-16 w-16 rounded object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs text-muted-foreground">Sem img</div>}
                {(!p.in_stock || p.stock_quantity === 0) && <span className="absolute inset-0 flex items-center justify-center rounded bg-black/50 text-[10px] font-semibold uppercase text-white">Esgotado</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.label}</p>
                <p className="truncate text-xs text-muted-foreground">{p.slug}</p>
                <p className="text-xs text-muted-foreground">Ordem: {p.sort_order}{!p.active ? ' · inativo' : ''}{p.stock_quantity === null ? (p.in_stock ? ' · disponível' : ' · esgotado') : ` · estoque: ${p.stock_quantity}`}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <button onClick={() => openEdit(p)} className="rounded-lg p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(p.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!(grouped[activeTab] || []).length && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-display text-lg">{isNew ? 'Novo produto' : 'Editar produto'}</h3>
            <div className="space-y-4">
              <Field label="Identificador (slug)">
                <input className={inputCls} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} disabled={!isNew} placeholder="ex: aparecida-inox" required />
              </Field>
              <Field label="Categoria">
                <select className={inputCls} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} disabled={!isNew}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Nome exibido">
                <input className={inputCls} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} required />
              </Field>
              <Field label="Imagem">
                <div className="space-y-2">
                  {editing.image_url && <img src={editing.image_url} alt="" className="h-32 w-32 rounded border object-cover" />}
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" /> Enviar imagem
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onUpload} />
                  </label>
                </div>
              </Field>
              <Field label="Ordem">
                <input type="number" className={inputCls} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ativo">
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                </Field>
                <Field label="Em estoque">
                  <input type="checkbox" checked={editing.in_stock} onChange={(e) => setEditing({ ...editing, in_stock: e.target.checked })} />
                </Field>
              </div>
              <Field label="Quantidade em estoque (vazio = ilimitado)">
                <input type="number" className={inputCls} value={editing.stock_quantity ?? ''} onChange={(e) => setEditing({ ...editing, stock_quantity: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Ilimitado" />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvar
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}