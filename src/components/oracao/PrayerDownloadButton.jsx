import React, { useEffect, useState } from 'react';
import { Download, Check, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { downloadAudio, isAudioDownloaded, removeAudio } from '@/lib/offlineAudio';

// Apenas áudios diretos (mp3/wav/etc.) podem ser baixados — embeds de terceiros não.
function isDirectAudio(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('soundcloud.com') || u.includes('youtube.com') || u.includes('youtu.be') || u.includes('spotify.com')) return false;
  return true;
}

export default function PrayerDownloadButton({ audioUrl }) {
  const [status, setStatus] = useState('idle'); // idle | downloading | downloaded | error
  const [error, setError] = useState('');

  const check = async () => {
    if (!audioUrl) return;
    const dl = await isAudioDownloaded(audioUrl).catch(() => false);
    setStatus(dl ? 'downloaded' : 'idle');
  };

  useEffect(() => { check(); }, [audioUrl]);

  const download = async () => {
    setStatus('downloading');
    setError('');
    try {
      await downloadAudio(audioUrl);
      setStatus('downloaded');
    } catch (e) {
      setStatus('error');
      setError(e.message || 'Falha no download');
    }
  };

  const remove = async () => {
    try {
      await removeAudio(audioUrl);
      setStatus('idle');
    } catch (e) { /* ignore */ }
  };

  if (!audioUrl) return null;
  if (!isDirectAudio(audioUrl)) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5" /> Download offline indisponível para este player externo
      </p>
    );
  }

  if (status === 'downloading') {
    return (
      <button disabled className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Baixando...
      </button>
    );
  }
  if (status === 'downloaded') {
    return (
      <button onClick={remove} className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600 transition hover:bg-emerald-500/20">
        <Check className="h-4 w-4" /> Disponível offline · Remover
      </button>
    );
  }
  if (status === 'error') {
    return (
      <button onClick={download} className="flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm text-destructive transition hover:bg-destructive/20">
        <AlertCircle className="h-4 w-4" /> {error || 'Erro'} · Tentar de novo
      </button>
    );
  }
  return (
    <button onClick={download} className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground transition hover:bg-primary hover:text-primary-foreground">
      <Download className="h-4 w-4" /> Baixar para offline
    </button>
  );
}