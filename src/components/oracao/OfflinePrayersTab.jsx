import React, { useEffect, useState } from 'react';
import { Download, Trash2, Music, Loader2, WifiOff } from 'lucide-react';
import { listOfflineAudioUrls, removeAudio } from '@/lib/offlineAudio';

export default function OfflinePrayersTab({ prayers, onPlay }) {
  const [offlineUrls, setOfflineUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const urls = await listOfflineAudioUrls();
      setOfflineUrls(urls);
    } catch (e) { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const urlSet = new Set(offlineUrls);
  const offlinePrayers = prayers.filter((p) => p.audio_url && urlSet.has(p.audio_url));

  const remove = async (prayer) => {
    setRemoving(prayer.id);
    try {
      await removeAudio(prayer.audio_url);
      await refresh();
    } catch (e) { /* ignore */ } finally { setRemoving(null); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <WifiOff className="h-5 w-5 text-gold" />
        <h2 className="font-display text-2xl">Offline</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Orações salvas no aparelho para escutar sem internet.</p>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : offlinePrayers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          <Download className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhuma oração baixada ainda.
          <br />Abra uma oração e toque em "Baixar para offline".
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {offlinePrayers.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
              {p.cover_url ? (
                <img src={p.cover_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"><Music className="h-5 w-5 text-primary" /></div>
              )}
              <button onClick={() => onPlay?.(p)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-xs text-[#2E7DFF]">Disponível offline</p>
              </button>
              <button
                onClick={() => remove(p)}
                disabled={removing === p.id}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="Remover download"
              >
                {removing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}