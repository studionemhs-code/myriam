import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Star, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';
import ImageUpload from '@/components/admin/ImageUpload';
import FileUpload from '@/components/admin/FileUpload';

const empty = {
  title: '', subtitle: '', description: '', category_id: '', author: '',
  content_type: 'texto', level: 'iniciante', content: '', youtube_id: '',
  use_alternative_player: false,
  file_url: '', cover_url: '', status: 'rascunho', recommended: false,
  duration: '', published_date: '', course_id: '', lesson_order: 0
};

const typeLabels = { texto: 'Texto', pdf: 'PDF', ebook: 'E-book', audio: 'Áudio', video: 'Vídeo', imagem: 'Imagem' };
const levelLabels = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

// Extrai o ID do YouTube de URLs comuns (youtube.com/watch?v=, youtu.be/, /embed/, /shorts/)
function extractYouTubeId(value) {
  if (!value) return '';
  const v = value.trim();
  // Se já é um ID bruto (11 chars, sem barras), mantém
  if (!v.includes('/') && !v.includes('=') && v.length === 11) return v;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = v.match(p);
    if (m) return m[1];
  }
  return v;
}

export default function ACAMFAdmin() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, cc, crs] = await Promise.all([
      base44.entities.ACAMFContent.list('-created_date', 200),
      base44.entities.ACAMFCategory.list('sort_order', 50),
      base44.entities.Course.list('sort_order', 100)
    ]);
    setItems(c);
    setCats(cc);
    setCourses(crs);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!editing.title) return;
    setSaving(true);
    try {
      if (editing.id) await base44.entities.ACAMFContent.update(editing.id, editing);
      else await base44.entities.ACAMFContent.create(editing);
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (confirm('Excluir este conteúdo?')) { await base44.entities.ACAMFContent.delete(id); await load(); }
  };

  if (loading) return <Loading />;

  const catName = (id) => cats.find((c) => c.id === id)?.name || '—';

  return (
    <div>
      <AdminPageTitle
        title="ACAMF — Conteúdos"
        subtitle={`${items.length} conteúdos cadastrados`}
        action={
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Novo Conteúdo
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Curso</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 font-medium">
                    {it.recommended && <Star className="h-3.5 w-3.5 text-gold" />}
                    {it.title}
                  </div>
                  {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{catName(it.category_id)}</td>
                <td className="px-4 py-3 text-muted-foreground">{courses.find((c) => c.id === it.course_id)?.title || '—'}</td>
                <td className="px-4 py-3">{typeLabels[it.content_type]}</td>
                <td className="px-4 py-3">{levelLabels[it.level]}</td>
                <td className="px-4 py-3">
                  <Badge tone={it.status === 'publicado' ? 'green' : it.status === 'arquivado' ? 'muted' : 'gold'}>
                    {it.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing({ ...empty, ...it })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Conteúdo' : 'Novo Conteúdo'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
              </div>
              <Field label="Subtítulo"><input className={inputCls} value={editing.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></Field>
              <Field label="Autor"><input className={inputCls} value={editing.author} onChange={(e) => set('author', e.target.value)} /></Field>
              <Field label="Categoria">
                <select className={inputCls} value={editing.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">—</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Curso">
                <select className={inputCls} value={editing.course_id} onChange={(e) => set('course_id', e.target.value)}>
                  <option value="">—</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
              <Field label="Ordem da aula"><input type="number" className={inputCls} value={editing.lesson_order} onChange={(e) => set('lesson_order', parseInt(e.target.value) || 0)} /></Field>
              <Field label="Tipo">
                <select className={inputCls} value={editing.content_type} onChange={(e) => set('content_type', e.target.value)}>
                  {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Nível">
                <select className={inputCls} value={editing.level} onChange={(e) => set('level', e.target.value)}>
                  {Object.entries(levelLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={editing.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="rascunho">Rascunho</option>
                  <option value="publicado">Publicado</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </Field>
              <Field label="Duração"><input className={inputCls} placeholder="ex.: 12 min" value={editing.duration} onChange={(e) => set('duration', e.target.value)} /></Field>
              <Field label="Dia recomendado (1-33)"><input type="number" min="1" max="33" className={inputCls} value={editing.related_day_number || ''} onChange={(e) => set('related_day_number', e.target.value ? parseInt(e.target.value) : null)} placeholder="Ex.: 12" /></Field>
              <Field label="Data de Publicação"><input type="date" className={inputCls} value={editing.published_date} onChange={(e) => set('published_date', e.target.value)} /></Field>
              {(editing.content_type === 'pdf' || editing.content_type === 'ebook') && (
                <div className="col-span-2">
                  <FileUpload
                    value={editing.file_url}
                    onChange={(v) => set('file_url', v)}
                    accept="application/pdf"
                    contentType={editing.content_type}
                    label={editing.content_type === 'pdf' ? 'Arquivo PDF' : 'Arquivo E-book'}
                    hint="Envie um PDF ou cole a URL direta do arquivo."
                  />
                </div>
              )}

              {editing.content_type === 'audio' && (
                <div className="col-span-2">
                  <FileUpload
                    value={editing.file_url}
                    onChange={(v) => set('file_url', v)}
                    accept="audio/*"
                    contentType="audio"
                    label="Arquivo de Áudio"
                    hint="Envie um arquivo de áudio (mp3, wav, ogg) ou cole a URL direta."
                  />
                </div>
              )}

              {editing.content_type === 'imagem' && (
                <div className="col-span-2">
                  <FileUpload
                    value={editing.file_url}
                    onChange={(v) => set('file_url', v)}
                    accept="image/*"
                    contentType="imagem"
                    label="Arquivo de Imagem"
                    hint="Envie uma imagem ou cole a URL direta."
                  />
                </div>
              )}

              {editing.content_type === 'video' && (
                <div className="col-span-2 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                  <Field label="Qual fornecedor de vídeos você utiliza?">
                    <select className={inputCls} defaultValue="youtube" disabled>
                      <option value="youtube">Youtube</option>
                    </select>
                  </Field>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold">i</div>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Temos dois players disponíveis:</p>
                        <p>Caso deseje o original do Youtube, deixe a opção abaixo desmarcada.</p>
                        <p>Caso deseje o player alternativo, ideal para vídeos não listados (não deixa o usuário ir para a página do Youtube e personalizado com a cor do portal) marque a opção abaixo.</p>
                        <p>Você também pode inserir lives do Youtube!</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Deseja usar o player alternativo?</label>
                    <Switch checked={!!editing.use_alternative_player} onCheckedChange={(v) => set('use_alternative_player', v)} />
                  </div>
                  <Field label="URL do vídeo" hint="Cole o link do YouTube — o ID é extraído automaticamente">
                    <input className={inputCls} placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..." value={editing.youtube_id} onChange={(e) => set('youtube_id', extractYouTubeId(e.target.value))} />
                  </Field>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Ou envie um arquivo de vídeo próprio (alternativo ao YouTube):</p>
                    <FileUpload
                      value={editing.file_url}
                      onChange={(v) => set('file_url', v)}
                      accept="video/*"
                      contentType="video"
                      label="Arquivo de Vídeo"
                      hint="Se enviar um arquivo, ele substitui o vídeo do YouTube."
                    />
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <ImageUpload label="Capa" value={editing.cover_url} onChange={(v) => set('cover_url', v)} aspect="video" />
              </div>
              <div className="col-span-2">
                <Field label="Descrição curta"><textarea className={inputCls} rows={2} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field>
              </div>
              <div className="col-span-2">
                <Field label="Conteúdo (rich text)">
                  <ReactQuill theme="snow" value={editing.content} onChange={(v) => set('content', v)} />
                </Field>
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.recommended} onChange={(e) => set('recommended', e.target.checked)} />
                Recomendado (destaque)
              </label>
            </div>
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