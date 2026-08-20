import React, { useRef, useState } from 'react';
import { ImagePlus, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Composer({ user, onPosted }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImage(file_url);
    } finally { setPosting(false); }
  };

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await base44.entities.MyriamPost.create({
        text: text.trim(),
        image_url: image,
        author_name: user.full_name || 'Alma',
        author_photo: user.photo_url || '',
        author_status: user.status || 'interessado'
      });
      setText('');
      setImage('');
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
          {image && (
            <div className="relative mt-2">
              <img src={image} alt="" className="max-h-48 rounded-xl object-cover" />
              <button onClick={() => setImage('')} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">Remover</button>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
              <ImagePlus className="h-4 w-4" /> Imagem
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            <button onClick={submit} disabled={posting || !text.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
              <Send className="h-4 w-4" /> {posting ? 'Enviando...' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}