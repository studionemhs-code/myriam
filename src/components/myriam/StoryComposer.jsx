import React, { useRef, useState } from 'react';
import { X, ImagePlus, Video, Type, Camera, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_SIZE = 100 * 1024 * 1024;
const BACKGROUNDS = { marian: 'bg-marian', gold: 'bg-gold', deep: 'bg-deep' };

export default function StoryComposer({ user, onClose, onPosted }) {
  const [mode, setMode] = useState(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [text, setText] = useState('');
  const [bg, setBg] = useState('marian');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const galleryRef = useRef(null);
  const cameraPhotoRef = useRef(null);
  const cameraVideoRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) { setError('Arquivo muito grande (máx 100MB)'); e.target.value = ''; return; }
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMediaUrl(file_url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      setMode('media');
    } catch (e) { setError('Falha no upload'); } finally { setUploading(false); e.target.value = ''; }
  };

  const submit = async () => {
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'media' && !mediaUrl) return;
    setPosting(true);
    try {
      await base44.entities.MyriamStory.create({
        author_name: user.display_name || user.full_name || 'Alma',
        author_photo: user.photo_url || '',
        author_status: user.status || 'interessado',
        media_type: mode === 'text' ? 'text' : mediaType,
        media_url: mode === 'text' ? '' : mediaUrl,
        text: text.trim(),
        background_color: mode === 'text' ? bg : 'marian',
        viewers: []
      });
      onPosted();
      onClose();
    } finally { setPosting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Criar story</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        {!mode && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button onClick={() => cameraPhotoRef.current?.click()} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:border-gold/40">
              <Camera className="h-6 w-6 text-gold" /> <span className="text-xs">Câmera</span>
            </button>
            <button onClick={() => cameraVideoRef.current?.click()} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:border-gold/40">
              <Video className="h-6 w-6 text-marian" /> <span className="text-xs">Vídeo</span>
            </button>
            <button onClick={() => galleryRef.current?.click()} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:border-gold/40">
              <ImagePlus className="h-6 w-6 text-marian" /> <span className="text-xs">Galeria</span>
            </button>
            <button onClick={() => setMode('text')} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 hover:border-gold/40">
              <Type className="h-6 w-6 text-marian" /> <span className="text-xs">Texto</span>
            </button>
          </div>
        )}
        {/* Gallery upload (no capture) */}
        <input ref={galleryRef} type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
        {/* Camera photo — opens rear camera on mobile */}
        <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
        {/* Camera video — opens rear camera on mobile */}
        <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" onChange={onFile} className="hidden" />
        {uploading && <p className="mt-3 text-center text-sm text-muted-foreground">Enviando...</p>}
        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
        {mode === 'media' && mediaUrl && (
          <div className="mt-3">
            {mediaType === 'video' ? (
              <video src={mediaUrl} className="max-h-64 w-full rounded-xl" controls />
            ) : (
              <img src={mediaUrl} alt="" className="max-h-64 w-full rounded-xl object-cover" />
            )}
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Legenda (opcional)" rows={2} className="mt-2 w-full rounded-xl border border-input bg-background p-2 text-sm" />
          </div>
        )}
        {mode === 'text' && (
          <div className="mt-3">
            <div className={`flex items-center justify-center rounded-xl p-6 ${BACKGROUNDS[bg]}`}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva algo..." rows={3} className="w-full bg-transparent text-center font-display text-lg text-white outline-none placeholder:text-white/50" />
            </div>
            <div className="mt-2 flex gap-2">
              {Object.entries(BACKGROUNDS).map(([k, c]) => (
                <button key={k} onClick={() => setBg(k)} className={`h-8 w-8 rounded-full ${c} ${bg === k ? 'ring-2 ring-offset-2 ring-primary' : ''}`} />
              ))}
            </div>
          </div>
        )}
        {mode && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => { setMode(null); setMediaUrl(''); setText(''); }} className="rounded-xl border border-border px-4 py-2.5 text-sm">Voltar</button>
            <button onClick={submit} disabled={uploading || posting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40">
              <Check className="h-4 w-4" /> {posting ? 'Publicando...' : 'Publicar story'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}