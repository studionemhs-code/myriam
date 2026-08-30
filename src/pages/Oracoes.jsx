import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Heart, Share2, Music, X, Search } from 'lucide-react';
import AudioPlayer from '@/components/oracao/AudioPlayer';

export default function Oracoes() {
  const [categories, setCategories] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('all');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cats, prs, favs] = await Promise.all([
        base44.entities.PrayerCategory.list('sort_order', 100),
        base44.entities.Prayer.list('sort_order', 200),
        base44.entities.PrayerFavorite.list('-created_date', 500)
      ]);
      setCategories(cats);
      setPrayers(prs);
      setFavorites(favs);
    } catch (e) {
      console.error('Failed to load prayers', e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const favIds = new Set(favorites.map((f) => f.prayer_id));

  const toggleFav = async (prayerId) => {
    const existing = favorites.find((f) => f.prayer_id === prayerId);
    if (existing) {
      setFavorites((p) => p.filter((f) => f.id !== existing.id));
      await base44.entities.PrayerFavorite.delete(existing.id);
    } else {
      const created = await base44.entities.PrayerFavorite.create({ prayer_id: prayerId });
      setFavorites((p) => [...p, created]);
    }
  };

  const sharePrayer = async (prayer) => {
    const url = `${window.location.origin}/oracoes`;
    if (navigator.share) {
      try { await navigator.share({ title: prayer.title, text: prayer.title, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert('Link copiado!'); } catch {}
    }
  };

  const filtered = prayers.filter((p) => {
    const matchCat = activeCat === 'favs' ? favIds.has(p.id) : activeCat === 'all' || p.category_id === activeCat;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';

  return (
    <div>
      <div className="mb-6 text-center">
        <p className="ornament text-sm">✦</p>
        <h1 className="mt-2 font-display text-3xl">Orações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Orações marianas para alimentar sua vida de fé</p>
      </div>

      {/* Category tabs */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={() => setActiveCat('all')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
        >
          Todas
        </button>
        {favIds.size > 0 && (
          <button
            onClick={() => setActiveCat('favs')}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${activeCat === 'favs' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            ❤ Favoritas
          </button>
        )}
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${activeCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar oração..."
          className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma oração encontrada.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
              onClick={() => setSelected(p)}
            >
              {p.cover_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={p.cover_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{catName(p.category_id)}</p>
                    <h3 className="mt-0.5 truncate font-display text-base font-medium">{p.title}</h3>
                  </div>
                  {p.audio_url && <Music className="h-4 w-4 shrink-0 text-gold" />}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${favIds.has(p.id) ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'}`}
                  >
                    <Heart className={`h-4 w-4 ${favIds.has(p.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); sharePrayer(p); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:text-primary"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {selected.cover_url ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl">
                <img src={selected.cover_url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => setSelected(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="flex justify-end px-4 pt-4">
                <button onClick={() => setSelected(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
              </div>
            )}
            <div className="p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{catName(selected.category_id)}</p>
              <h2 className="mt-1 font-display text-2xl">{selected.title}</h2>
              {selected.audio_url && (
                <div className="mt-4">
                  <AudioPlayer src={selected.audio_url} />
                </div>
              )}
              <div className="rich-text mt-6 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: selected.content || '' }} />
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <button
                  onClick={() => toggleFav(selected.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${favIds.has(selected.id) ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground hover:text-rose-500'}`}
                >
                  <Heart className={`h-4 w-4 ${favIds.has(selected.id) ? 'fill-current' : ''}`} />
                  {favIds.has(selected.id) ? 'Favoritada' : 'Favoritar'}
                </button>
                <button
                  onClick={() => sharePrayer(selected)}
                  className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
                >
                  <Share2 className="h-4 w-4" /> Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}