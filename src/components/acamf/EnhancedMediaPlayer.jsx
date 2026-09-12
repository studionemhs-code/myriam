import React, { useEffect, useRef, useState } from 'react';
import { Download, Lock, Loader2, PictureInPicture2, WifiOff, Trash2 } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { useToast } from '@/components/ui/use-toast';
import { downloadMedia, isMediaDownloaded, getMediaBlobUrl, removeMedia } from '@/lib/offlineMedia';

// Player de áudio/vídeo com PiP, reprodução em segundo plano e download offline.
// content = registro ACAMFContent com file_url, background_playback_type, offline_download_type, etc.
export default function EnhancedMediaPlayer({ content, onComplete }) {
  const { toast } = useToast();
  const { loading: accessLoading, check } = useAccess();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [useOffline, setUseOffline] = useState(false);

  const isVideo = content.content_type === 'video';
  const isAudio = content.content_type === 'audio';
  const mediaUrl = content.file_url;
  const canPiP = isVideo && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  // Verifica acesso aos recursos pagos
  const bgResult = check({
    type: 'background_playback',
    id: content.id,
    access_type: content.background_playback_type || 'gratuito',
    product_id: content.background_playback_product_id,
  });
  const canBackgroundPlay = bgResult.allowed;

  const dlResult = check({
    type: 'offline_download',
    id: content.id,
    access_type: content.offline_download_type || 'gratuito',
    product_id: content.offline_download_product_id,
  });
  const canDownload = dlResult.allowed;

  // Verifica se já está baixado
  useEffect(() => {
    if (!mediaUrl || !canDownload) return;
    isMediaDownloaded(mediaUrl).then(setDownloaded);
  }, [mediaUrl, canDownload]);

  // Media Session API para reprodução em segundo plano
  useEffect(() => {
    if (!canBackgroundPlay || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: content.title || 'Theotokos',
      artist: content.author || 'ACAMF',
      album: 'Theotokos',
    });
    return () => {
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    };
  }, [canBackgroundPlay, content.title, content.author]);

  // Auto PiP ao sair da página (se permitido)
  useEffect(() => {
    if (!canBackgroundPlay || !canPiP) return;
    const onVisibility = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.requestPictureInPicture?.().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [canBackgroundPlay, canPiP]);

  const handleDownload = async () => {
    if (!canDownload) {
      toast({ title: 'Recurso premium', description: 'O download offline está disponível para assinantes.', variant: 'destructive' });
      return;
    }
    if (!mediaUrl) return;
    setDownloading(true);
    try {
      await downloadMedia(mediaUrl, { title: content.title, type: content.content_type });
      setDownloaded(true);
      toast({ title: 'Download concluído', description: 'Conteúdo disponível offline.' });
    } catch (e) {
      toast({ title: 'Erro no download', description: 'Não foi possível baixar o conteúdo.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleRemoveDownload = async () => {
    if (!mediaUrl) return;
    await removeMedia(mediaUrl);
    setDownloaded(false);
    setUseOffline(false);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
    toast({ title: 'Download removido' });
  };

  const toggleOfflinePlay = async () => {
    if (!downloaded) return;
    if (useOffline) {
      setUseOffline(false);
      if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
    } else {
      const url = await getMediaBlobUrl(mediaUrl);
      if (url) { setBlobUrl(url); setUseOffline(true); }
    }
  };

  const requestPiP = async () => {
    if (videoRef.current && canPiP) {
      try { await videoRef.current.requestPictureInPicture(); } catch (e) { /* ignore */ }
    }
  };

  const currentSrc = useOffline && blobUrl ? blobUrl : mediaUrl;

  if (accessLoading) return null;

  return (
    <div className="space-y-2">
      {isVideo && currentSrc && (
        <video
          ref={videoRef}
          controls
          src={currentSrc}
          className="w-full rounded-2xl"
          onEnded={onComplete}
        />
      )}
      {isAudio && currentSrc && (
        <audio ref={audioRef} controls src={currentSrc} className="w-full" />
      )}

      {/* Barra de ações: PiP, Download, Offline */}
      <div className="flex flex-wrap items-center gap-2">
        {canPiP && (
          <button
            onClick={requestPiP}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
          >
            <PictureInPicture2 className="h-3.5 w-3.5" /> Picture-in-Picture
          </button>
        )}

        {canBackgroundPlay && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 2º plano ativo
          </span>
        )}

        {canDownload && mediaUrl && (
          downloaded ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleOfflinePlay}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${useOffline ? 'border-gold bg-gold/10 text-gold' : 'border-border bg-card text-muted-foreground hover:border-gold/40'}`}
              >
                <WifiOff className="h-3.5 w-3.5" /> {useOffline ? 'Lendo offline' : 'Ler offline'}
              </button>
              <button
                onClick={handleRemoveDownload}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1.5 text-muted-foreground transition hover:text-destructive"
                aria-label="Remover download"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-gold/40 hover:text-foreground disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'Baixando...' : 'Baixar offline'}
            </button>
          )
        )}

        {!canDownload && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Download premium
          </span>
        )}
      </div>
    </div>
  );
}