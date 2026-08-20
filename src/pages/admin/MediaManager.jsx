import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Trash2, Film, FileText, Music, Image as ImageIcon, Youtube } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';

const typeIcon = { image: ImageIcon, video: Film, audio: Music, pdf: FileText, ebook: FileText, document: FileText, youtube: Youtube };

export default function MediaManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'image', youtube_id: '' });
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.MediaAsset.filter({ status: 'ativo' }, '-created_date', 200);
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const type = form.type === 'youtube' ? 'youtube' : form.type;
      const record = {
        name: form.name || file.name,
        type,
        file_url: form.type === 'youtube' ? '' : file_url,
        youtube_id: form.type === 'youtube' ? form.youtube_id : '',
        uploaded_by_name: 'Admin'
      };
      await base44.entities.MediaAsset.create(record);
      setForm({ name: '', type: 'image', youtube_id: '' });
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } finally {
      setUploading(false);
    }
  };

  const addYoutube = async () => {
    if (!form.youtube_id) return;
    setUploading(true);
    try {
      await base44.entities.MediaAsset.create({
        name: form.name || 'Vídeo do YouTube',
        type: 'youtube',
        file_url: `https://youtu.be/${form.youtube_id}`,
        youtube_id: form.youtube_id,
        uploaded_by_name: 'Admin'
      });
      setForm({ name: '', type: 'image', youtube_id: '' });
      await load();
    } finally { setUploading(false); }
  };

  const remove = async (id) => {
    if (confirm('Arquivar esta mídia?')) {
      await base44.entities.MediaAsset.update(id, { status: 'arquivado' });
      await load();
    }
  };

  return (
    <div>
      <AdminPageTitle title="Gestor de Mídias" subtitle={`${items.length} mídias ativas`} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Nome"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome da mídia" /></Field>
          <Field label="Tipo">
            <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
              <option value="audio">Áudio</option>
              <option value="pdf">PDF</option>
              <option value="ebook">E-book</option>
              <option value="document">Documento</option>
              <option value="youtube">YouTube</option>
            </select>
          </Field>
          {form.type === 'youtube' ? (
            <Field label="YouTube ID">
              <div className="flex gap-2">
                <input className={inputCls} value={form.youtube_id} onChange={(e) => setForm({ ...form, youtube_id: e.target.value })} placeholder="ex.: dQw4w9WgXcQ" />
                <button onClick={addYoutube} disabled={uploading} className="rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">Add</button>
              </div>
            </Field>
          ) : (
            <Field label="Arquivo">
              <input ref={fileRef} type="file" onChange={onUpload} disabled={uploading} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground" />
            </Field>
          )}
        </div>
        {uploading && <p className="mt-3 text-sm text-muted-foreground">Enviando...</p>}
      </div>

      {loading ? <Loading /> : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma mídia cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((m) => {
            const Icon = typeIcon[m.type] || FileText;
            return (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                  <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                <p className="mt-3 truncate text-sm font-medium">{m.name}</p>
                <Badge>{m.type}</Badge>
                {m.file_url && <p className="mt-2 truncate text-[11px] text-muted-foreground">{m.file_url}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}