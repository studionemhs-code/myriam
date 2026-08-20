import React, { useRef, useState } from 'react';
import { ImagePlus, Video, FileText, Send, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_SIZE = 100 * 1024 * 1024;

export default function Composer({ user, onPosted }) {
  const [text, setText] = useState('');
  const [media, setMedia] = useState({ url: '', type: '' });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) { setError('Arquivo muito grande (máx 100MB)'); e.target.value = ''; return; }
    setError('');
    setPosting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'document';
      setMedia({ url: file_url, type });
    } catch (e) { setError('Falha no upload'); } finally { setPosting(false); }
  };

  const submit = async () => {
    if (!text.trim() && !media.url) return;
    setPosting(true);
    try {
      const post = {
        text: text.trim(),
        author_name: user.full_name || 'Alma',
        author_photo: user.photo_url || '',
        author_status: user.status || 'interessado'
      };
      if (media.type === 'image') post.image_url = media.url;
      else if (media.type === 'video') post.video_url = media.url;
      else if (media.type === 'document') post.document_url = media.url;
      await base44.entities.MyriamPost.create(post);
      setText('');
      setMedia({ url: '', type: '' });
      if (fileRef.current) fileRef.current.value = '';
      onPosted();
    } finally { setPosting(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-marian/15 font-display text-sm text-marian">
          {(user.full_name || 'A')[0]}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Compartilhe algo com a comunidade mariana..."
            rows={2}
            className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm outline-none focus:border-primary"
          />
          {media.url && (
            <div className="relative mt-2">
              {media.type === 'image' && <img src={media.url} alt="" className="max-h-48 rounded-xl object-cover" />}
              {media.type === 'video' && <video src={media.url} className="max-h-48 w-full rounded-xl" controls />}
              {media.type === 'document' && <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"><FileText className="h-5 w-5 text-marian" /> Documento anexo</div>}
              <button onClick={() => setMedia({ url: '', type: '' })} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"><X className="h-3 w-3" /></button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ImagePlus className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              </label>
              <label className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <Video className="h-4 w-4" />
                <input type="file" accept="video/*" onChange={onFile} className="hidden" />
              </label>
              <label className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <FileText className="h-4 w-4" />
                <input type="file" accept="application/pdf,.doc,.docx" onChange={onFile} className="hidden" />
              </label>
            </div>
            <button onClick={submit} disabled={posting || (!text.trim() && !media.url)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
              <Send className="h-4 w-4" /> {posting ? 'Enviando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}