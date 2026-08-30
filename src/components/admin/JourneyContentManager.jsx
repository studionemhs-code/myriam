import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { Field, inputCls, Badge } from '@/components/admin/ui';
import FileUpload from '@/components/admin/FileUpload';
import ImageUpload from '@/components/admin/ImageUpload';
import ReactQuill from 'react-quill-new';
import { toast } from '@/components/ui/use-toast';
import 'react-quill-new/dist/quill.snow.css';

const typeLabels = { texto: 'Texto', pdf: 'PDF', audio: 'Áudio', video: 'Vídeo', imagem: 'Imagem' };

const empty = { title: '', content: '', content_type: 'texto', file_url: '', audio_url: '', cover_url: '', youtube_id: '', is_published: true };

export default function JourneyContentManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.JourneyContent.list('-created_date', 200);
      setItems(list);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => { setSaveError(''); setEditing((p) => ({ ...p, [k]: v })); };

  const save = async () => {
    if (!editing.title) {
      setSaveError('Informe um título para o conteúdo.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      if (editing.id) await base44.entities.JourneyContent.update(editing.id, editing);
      else await base44.entities.JourneyContent.create(editing);
      setEditing(null);
      await load();
      toast({ title: editing.id ? 'Conteúdo atualizado' : 'Conteúdo criado' });
    } catch (e) {
      const msg = e?.message || String(e);
      setSaveError(msg);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (confirm('Excluir este conteúdo da biblioteca de jornadas?')) {
      await base44.entities.JourneyContent.delete(id);
      await load();
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="font-display text-sm">Biblioteca de Conteúdos de Jornada</h4>
          <p className="text-xs text-muted-foreground">Conteúdos reutilizáveis entre jornadas (sem ligação com a ACAMF).</p>
        </div>
        <button onClick={() => { setSaveError(''); setEditing({ ...empty }); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Novo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Nenhum conteúdo na biblioteca ainda.</p>
      ) : (
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
              {it.cover_url ? <img src={it.cover_url} className="h-8 w-8 rounded object-cover" /> :
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted"><Plus className="h-3 w-3 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.title}</p>
                <div className="flex items-center gap-1.5">
                  <Badge tone="muted">{typeLabels[it.content_type] || it.content_type}</Badge>
                  {!it.is_published && <Badge tone="muted">Rascunho</Badge>}
                </div>
              </div>
              <button onClick={() => { setSaveError(''); setEditing({ ...empty, ...it }); }} className="rounded p-1.5 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => remove(it.id)} className="rounded p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">{editing.id ? 'Editar Conteúdo' : 'Novo Conteúdo de Jornada'}</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
              <Field label="Tipo">
                <select className={inputCls} value={editing.content_type} onChange={(e) => set('content_type', e.target.value)}>
                  {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <ImageUpload label="Capa" value={editing.cover_url} onChange={(v) => set('cover_url', v)} aspect="video" />
              {(editing.content_type === 'pdf' || editing.content_type === 'imagem') && (
                <FileUpload value={editing.file_url} onChange={(v) => set('file_url', v)} contentType={editing.content_type} accept={editing.content_type === 'pdf' ? 'application/pdf' : 'image/*'} label="Arquivo" />
              )}
              {editing.content_type === 'audio' && (
                <FileUpload value={editing.audio_url} onChange={(v) => set('audio_url', v)} contentType="audio" accept="audio/*" label="Áudio" />
              )}
              {editing.content_type === 'video' && (
                <Field label="ID do YouTube" hint="Cole o link — o ID é extraído automaticamente">
                  <input className={inputCls} placeholder="https://youtube.com/watch?v=..." value={editing.youtube_id || ''} onChange={(e) => {
                    const v = e.target.value;
                    const m = v.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
                    set('youtube_id', m ? m[1] : v);
                  }} />
                </Field>
              )}
              <Field label="Conteúdo (rich text)">
                <ReactQuill theme="snow" value={editing.content} onChange={(v) => set('content', v)} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_published} onChange={(e) => set('is_published', e.target.checked)} />
                Publicado
              </label>
            </div>
            {saveError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">{saveError}</span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}