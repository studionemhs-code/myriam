import React, { useEffect, useState } from 'react';
import { ListMusic, Plus, ChevronLeft, Play, Trash2, X, Loader2, Music, Pencil, Check, GripVertical } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PrayerPickerModal from '@/components/oracao/PrayerPickerModal';

export default function PlaylistManager({ onPlayQueue }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPl, setOpenPl] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await supabaseEntities.PrayerPlaylist.list('sort_order', 100);
      setPlaylists(list);
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openPlaylist = async (pl) => {
    setOpenPl(pl);
    setEditing(false);
    setLoadingItems(true);
    try {
      const its = await supabaseEntities.PrayerPlaylistItem.filter({ playlist_id: pl.id }, 'sort_order', 200);
      setItems(its);
    } catch (e) { /* ignore */ } finally { setLoadingItems(false); }
  };

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    try {
      const pl = await supabaseEntities.PrayerPlaylist.create({ name: newName.trim(), description: newDesc.trim(), sort_order: playlists.length });
      setNewName(''); setNewDesc(''); setCreating(false);
      await load();
      openPlaylist(pl);
    } catch (e) { /* ignore */ }
  };

  const removeItem = async (item) => {
    setItems((p) => p.filter((i) => i.id !== item.id));
    try { await supabaseEntities.PrayerPlaylistItem.delete(item.id); } catch (e) { /* ignore */ }
  };

  const deletePlaylist = async (pl) => {
    if (!confirm(`Excluir a playlist "${pl.name}"?`)) return;
    try {
      await supabaseEntities.PrayerPlaylistItem.deleteMany({ playlist_id: pl.id });
      await supabaseEntities.PrayerPlaylist.delete(pl.id);
      setOpenPl(null);
      load();
    } catch (e) { /* ignore */ }
  };

  const startEdit = () => {
    setEditName(openPl.name || '');
    setEditDesc(openPl.description || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await supabaseEntities.PrayerPlaylist.update(openPl.id, { name: editName.trim(), description: editDesc.trim() });
      setOpenPl(updated);
      setEditing(false);
      load();
    } catch (e) { /* ignore */ } finally { setSavingEdit(false); }
  };

  const onDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = [...items];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
    setReordering(true);
    try {
      await supabaseEntities.PrayerPlaylistItem.bulkUpdate(
        reordered.map((it, idx) => ({ id: it.id, sort_order: idx }))
      );
    } catch (e) {
      /* rollback visual mantém ordem local */
    } finally {
      setReordering(false);
    }
  };

  const addPrayerFromPicker = async (prayer) => {
    const sortOrder = items.length;
    const created = await supabaseEntities.PrayerPlaylistItem.create({
      playlist_id: openPl.id,
      prayer_id: prayer.id,
      prayer_title: prayer.title,
      prayer_audio_url: prayer.audio_url,
      prayer_cover_url: prayer.cover_url,
      sort_order: sortOrder
    });
    setItems((p) => [...p, created]);
  };

  const playAll = () => {
    if (items.length === 0) return;
    onPlayQueue?.(items.map((i) => ({
      id: i.prayer_id,
      title: i.prayer_title,
      audio_url: i.prayer_audio_url,
      cover_url: i.prayer_cover_url
    })));
  };

  if (openPl) {
    return (
      <div>
        <button onClick={() => setOpenPl(null)} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar às playlists
        </button>

        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nome da playlist"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descrição (opcional)"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl">{openPl.name}</h2>
                {openPl.description && <p className="mt-1 text-sm text-muted-foreground">{openPl.description}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{items.length} oração(ões)</p>
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {editing ? (
              <>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit || !editName.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
                </button>
                <button onClick={() => setEditing(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground" title="Cancelar">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                {items.length > 0 && (
                  <button onClick={playAll} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
                    <Play className="h-4 w-4" /> Tocar
                  </button>
                )}
                <button onClick={startEdit} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-primary" title="Editar playlist">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => deletePlaylist(openPl)} className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20" title="Excluir playlist">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Adicionar orações */}
        {!editing && (
          <button
            onClick={() => setShowPicker(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Adicionar orações
          </button>
        )}

        {loadingItems ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            <Music className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Playlist vazia. Toque em "Adicionar orações" para começar.
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="playlist-items">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {items.map((item, idx) => (
                    <Draggable key={item.id} draggableId={item.id} index={idx}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40' : ''}`}
                        >
                          <button
                            {...dragProvided.dragHandleProps}
                            className="flex h-7 w-5 cursor-grab items-center justify-center text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
                            title="Arrastar para reordenar"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <span className="w-5 text-center text-sm text-muted-foreground">{idx + 1}</span>
                          {item.prayer_cover_url ? (
                            <img src={item.prayer_cover_url} alt="" className="h-11 w-11 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10"><Music className="h-4 w-4 text-primary" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.prayer_title || 'Oração'}</p>
                          </div>
                          <button onClick={() => removeItem(item)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {reordering && <p className="mt-2 text-center text-xs text-muted-foreground">Salvando ordem...</p>}

        <PrayerPickerModal
          open={showPicker}
          onClose={() => setShowPicker(false)}
          existingIds={items.map((i) => i.prayer_id)}
          onAdd={addPrayerFromPicker}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">Minhas Playlists</h2>
        <button onClick={() => setCreating((s) => !s)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova
        </button>
      </div>

      {creating && (
        <div className="mb-4 space-y-2 rounded-2xl border border-border bg-card p-4">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome (ex.: Orações pela Manhã)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Cancelar</button>
            <button onClick={createPlaylist} disabled={!newName.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Criar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : playlists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          <ListMusic className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Você ainda não criou playlists.
          <br />Agrupe orações por temas ou intenções da sua jornada.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {playlists.map((pl) => (
            <button key={pl.id} onClick={() => openPlaylist(pl)} className="group overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition hover:shadow-md">
              <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-deep/30">
                <ListMusic className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="truncate font-display text-base font-medium">{pl.name}</h3>
              {pl.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{pl.description}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}