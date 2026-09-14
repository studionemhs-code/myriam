import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, ImageIcon } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';
import { Field, inputCls, Loading } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';
import FileUpload from '@/components/admin/FileUpload';

export default function PrayerGalleryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ image_url: '', label: '', sort_order: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const list = await supabaseEntities.PrayerGalleryImage.list('sort_order', 100);
      setItems(list);
    } catch (e) {
      toast({ title: 'Erro ao carregar galeria', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.image_url) {
      toast({ title: 'Envie uma imagem primeiro', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const created = await supabaseEntities.PrayerGalleryImage.create({
        image_url: draft.image_url,
        label: draft.label || 'Fundo',
        sort_order: draft.sort_order || 0,
        is_active: true
      });
      setItems((p) => [...p, created]);
      setDraft({ image_url: '', label: '', sort_order: 0 });
      toast({ description: 'Fundo adicionado à galeria.' });
    } catch (e) {
      toast({ title: 'Erro ao adicionar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remover este fundo da galeria?')) return;
    try {
      await supabaseEntities.PrayerGalleryImage.delete(id);
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (e) {
      toast({ title: 'Erro ao remover', description: e?.message, variant: 'destructive' });
    }
  };

  const move = async (idx, dir) => {
    const newOrder = [...items];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    // reatribui sort_order
    const updated = newOrder.map((it, i) => ({ ...it, sort_order: i }));
    setItems(updated);
    try {
      await supabaseEntities.PrayerGalleryImage.bulkUpdate(
        updated.map((it) => ({ id: it.id, sort_order: it.sort_order }))
      );
    } catch (e) {
      toast({ title: 'Erro ao reordenar', description: e?.message, variant: 'destructive' });
      load();
    }
  };

  const toggleActive = async (it) => {
    try {
      const updated = await supabaseEntities.PrayerGalleryImage.update(it.id, { is_active: !it.is_active });
      setItems((p) => p.map((x) => (x.id === it.id ? updated : x)));
    } catch (e) {
      toast({ title: 'Erro ao atualizar', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-gold" />
        <h2 className="font-display text-lg">Galeria do Modo Oração</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Imagens e animações que os usuários podem escolher como fundo do Modo Oração imersivo (orações em áudio e dias do Caminho).
      </p>

      {/* Adicionar novo */}
      <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4">
        <FileUpload
          value={draft.image_url}
          onChange={(v) => setDraft((d) => ({ ...d, image_url: v }))}
          accept="image/*"
          label="Imagem / animação de fundo"
          hint="Recomendado: imagem em paisagem (16:9) ou animação curta (GIF/MP4)."
          contentType="imagem"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Nome do fundo">
            <input
              className={inputCls}
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Ex.: Nossa Senhora, Velas, Terço..."
            />
          </Field>
          <Field label="Ordem">
            <input
              type="number"
              className={inputCls}
              value={draft.sort_order}
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: parseInt(e.target.value) || 0 }))}
            />
          </Field>
        </div>
        <button
          onClick={add}
          disabled={saving || !draft.image_url}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Adicionar à galeria
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <Loading label="Carregando galeria..." />
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Nenhum fundo na galeria ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.label || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">Ordem: {it.sort_order}</p>
              </div>
              <button
                onClick={() => toggleActive(it)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${it.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}
              >
                {it.is_active ? 'Ativo' : 'Inativo'}
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label="Mover para cima"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === items.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                  aria-label="Mover para baixo"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => remove(it.id)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}