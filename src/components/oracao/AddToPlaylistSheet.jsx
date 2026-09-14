import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListPlus, Plus, Check, Loader2 } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';

export default function AddToPlaylistSheet({ open, onClose, prayer }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [addingTo, setAddingTo] = useState(null);
  const [added, setAdded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supabaseEntities.PrayerPlaylist.list('sort_order', 100);
      setPlaylists(list);
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) { load(); setCreating(false); setNewName(''); setAdded(null); }
  }, [open]);

  const createAndAdd = async () => {
    if (!newName.trim() || !prayer) return;
    setAddingTo('__new__');
    try {
      const pl = await supabaseEntities.PrayerPlaylist.create({ name: newName.trim(), sort_order: playlists.length });
      await supabaseEntities.PrayerPlaylistItem.create({
        playlist_id: pl.id,
        prayer_id: prayer.id,
        prayer_title: prayer.title,
        prayer_audio_url: prayer.audio_url,
        prayer_cover_url: prayer.cover_url,
        sort_order: 0
      });
      setAdded(pl.id);
      setNewName('');
      setCreating(false);
      load();
    } catch (e) { /* ignore */ } finally { setAddingTo(null); }
  };

  const addToExisting = async (pl) => {
    if (!prayer) return;
    setAddingTo(pl.id);
    try {
      const existing = await supabaseEntities.PrayerPlaylistItem.filter({ playlist_id: pl.id, prayer_id: prayer.id });
      if (existing.length === 0) {
        const items = await supabaseEntities.PrayerPlaylistItem.filter({ playlist_id: pl.id });
        await supabaseEntities.PrayerPlaylistItem.create({
          playlist_id: pl.id,
          prayer_id: prayer.id,
          prayer_title: prayer.title,
          prayer_audio_url: prayer.audio_url,
          prayer_cover_url: prayer.cover_url,
          sort_order: items.length
        });
      }
      setAdded(pl.id);
      load();
    } catch (e) { /* ignore */ } finally { setAddingTo(null); }
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
            className="w-full max-w-lg rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="h-5 w-5 text-gold" />
                <h3 className="font-display text-lg">Adicionar à playlist</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            {prayer && (
              <p className="mb-4 truncate text-sm text-muted-foreground">{prayer.title}</p>
            )}

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {playlists.length === 0 && !creating && (
                    <p className="py-4 text-center text-sm text-muted-foreground">Você ainda não tem playlists.</p>
                  )}
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => addToExisting(pl)}
                      disabled={addingTo !== null}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted disabled:opacity-50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ListPlus className="h-4 w-4" />
                      </div>
                      <span className="flex-1 truncate text-sm font-medium">{pl.name}</span>
                      {added === pl.id ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : addingTo === pl.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>

                {creating ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome da playlist (ex.: Orações pela Manhã)"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setCreating(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancelar</button>
                      <button onClick={createAndAdd} disabled={!newName.trim() || addingTo !== null} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Criar e adicionar</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Plus className="h-4 w-4" /> Criar nova playlist
                  </button>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}