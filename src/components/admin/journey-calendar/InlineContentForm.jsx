import React from 'react';
import { Field, inputCls } from '@/components/admin/ui';
import FileUpload from '@/components/admin/FileUpload';
import ImageUpload from '@/components/admin/ImageUpload';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function InlineContentForm({ data, onChange }) {
  const set = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <Field label="Título do conteúdo">
        <input className={inputCls} value={data.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Título" />
      </Field>
      <Field label="Tipo">
        <select className={inputCls} value={data.content_type || 'texto'} onChange={(e) => set('content_type', e.target.value)}>
          <option value="texto">Texto</option>
          <option value="pdf">PDF</option>
          <option value="audio">Áudio</option>
          <option value="video">Vídeo (YouTube)</option>
          <option value="imagem">Imagem</option>
        </select>
      </Field>
      <ImageUpload label="Capa (opcional)" value={data.cover_url} onChange={(v) => set('cover_url', v)} aspect="video" />
      {(data.content_type === 'pdf' || data.content_type === 'imagem') && (
        <FileUpload
          value={data.file_url}
          onChange={(v) => set('file_url', v)}
          contentType={data.content_type}
          accept={data.content_type === 'pdf' ? 'application/pdf' : 'image/*'}
          label="Arquivo"
        />
      )}
      {data.content_type === 'audio' && (
        <FileUpload value={data.audio_url} onChange={(v) => set('audio_url', v)} contentType="audio" accept="audio/*" label="Áudio" />
      )}
      {data.content_type === 'video' && (
        <Field label="ID do YouTube" hint="Cole o link — o ID é extraído automaticamente">
          <input
            className={inputCls}
            placeholder="https://youtube.com/watch?v=..."
            value={data.youtube_id || ''}
            onChange={(e) => {
              const v = e.target.value;
              const m = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
              set('youtube_id', m ? m[1] : v);
            }}
          />
        </Field>
      )}
      <Field label="Conteúdo (rich text)">
        <ReactQuill theme="snow" value={data.content || ''} onChange={(v) => set('content', v)} />
      </Field>
    </div>
  );
}