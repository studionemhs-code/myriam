import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Loader2, Music, Plus } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';

export default function PrayerPickerModal({ open, onClose, existingIds = [], onAdd }) {
  const [prayers, setPrayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [adding, setAdding] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    if (!open) return;
    setAddedIds(new Set());
    (async () => {
      setLoading(true);
      try {
        const [prs, cats] = await Promise.all([
          supabaseEntities.Prayer.list('sort_order', 300),
          supabaseEntities.PrayerCategory.list('sort_order', 100)
        ]);
        setPrayers(prs.filter((p) => p.audio_url));
        setCategories(cats);
      } catch (e) { /* ignore */ } finally { setLoading(false); }
    })();
  }, [open]);

  const existingSet = new Set(existingIds);

  const filtered = prayers.filter((p) => {
    const matchCat = activeCat === 'all' || p.category_id === activeCat;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleAdd = async (prayer) => {
    if (adding || existingSet.has(prayer.id) || addedIds.has(prayer.id)) return;
    setAdding(prayer.id);
    try {
      await onAdd(prayer);
      setAddedIds((s) => new Set([...s, prayer.id]));
    } catch (e) { /* ignore */ } finally { setAdding(null); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display text-lg">Adicionar orações</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3 p-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar oração..."
                  className="w-full rounded-full border border-input bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCat('all')}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  Todas
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma oração com áudio encontrada.</p>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map((p) => {
                    const isExisting = existingSet.has(p.id);
                    const isAdded = addedIds.has(p.id);
                    const isAdding = adding === p.id;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5"
                      >
                        {p.cover_url ? (
                          <img src={p.cover_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Music className="h-4 w-4 text-primary" /></div>
                        )}
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</p>
                        {isExisting || isAdded ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-500">
                            <Check className="h-4 w-4" /> {isExisting ? 'Já está' : 'Adicionada'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAdd(p)}
                            disabled={isAdding}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                          >
                            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}