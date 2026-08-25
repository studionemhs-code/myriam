import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2, Loader2, CornerDownRight, Edit2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUS_LABEL = {
  interessado: 'Interessado',
  preparacao: 'Em Preparação',
  consagrado: 'Consagrado'
};
const STATUS_COLOR = {
  interessado: 'bg-muted text-muted-foreground',
  preparacao: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  consagrado: 'bg-gold/15 text-gold'
};

export default function ContentComments({ contentId, user }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const loadComments = async () => {
    if (!contentId) return;
    try {
      const list = await base44.entities.ContentComment.filter({ content_id: contentId }, 'created_date');
      setComments(list);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadComments(); }, [contentId]);

  const addComment = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.ContentComment.create({
        content_id: contentId,
        text: text.trim(),
        author_name: user?.display_name || user?.full_name || user?.email || 'Anônimo',
        author_photo: user?.photo_url || null,
        author_status: user?.status || 'interessado'
      });
      setComments([...comments, created]);
      setText('');
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const addReply = async (parentId) => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.ContentComment.create({
        content_id: contentId,
        text: replyText.trim(),
        parent_id: parentId,
        author_name: user?.display_name || user?.full_name || user?.email || 'Anônimo',
        author_photo: user?.photo_url || null,
        author_status: user?.status || 'interessado'
      });
      setComments([...comments, created]);
      setReplyText('');
      setReplyTo(null);
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const deleteComment = async (id) => {
    try {
      await base44.entities.ContentComment.delete(id);
      setComments(comments.filter((c) => c.id !== id && c.parent_id !== id));
    } catch (e) { /* ignore */ }
  };

  const editComment = async (id, newText) => {
    try {
      await base44.entities.ContentComment.update(id, { text: newText });
      setComments((p) => p.map((c) => c.id === id ? { ...c, text: newText } : c));
    } catch (e) { /* ignore */ }
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (parentId) => comments.filter((c) => c.parent_id === parentId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-gold" />
          <h3 className="font-display text-sm">Comentários da comunidade</h3>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Compartilhe dúvidas e reflexões</p>
      </div>

      {/* Composer */}
      <div className="border-b border-border p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={addComment}
          disabled={!text.trim() || saving}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-deep disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Publicar
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : topLevel.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Seja o primeiro a comentar sobre este conteúdo.</p>
        ) : (
          topLevel.map((c) => (
            <div key={c.id}>
              <CommentItem comment={c} onDelete={deleteComment} onEdit={editComment} onReply={() => setReplyTo(c.id)} canManage={c.created_by_id === user?.id || user?.role === 'admin'} />
              <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-3">
                {repliesOf(c.id).map((r) => (
                  <CommentItem key={r.id} comment={r} onDelete={deleteComment} onEdit={editComment} canManage={r.created_by_id === user?.id || user?.role === 'admin'} isReply />
                ))}
              </div>
              {replyTo === c.id && (
                <div className="ml-6 mt-2 border-l-2 border-border pl-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Respondendo a ${c.author_name?.split(' ')[0]}...`}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    autoFocus
                  />
                  <div className="mt-1.5 flex gap-2">
                    <button onClick={() => addReply(c.id)} disabled={!replyText.trim() || saving} className="inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1 text-xs font-medium text-deep disabled:opacity-40">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Responder
                    </button>
                    <button onClick={() => { setReplyTo(null); setReplyText(''); }} className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, onDelete, onEdit, onReply, canManage, isReply }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const saveEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment.id, editText.trim());
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <div className="flex items-center gap-2">
        {comment.author_photo ? (
          <img src={comment.author_photo} alt="" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
            {(comment.author_name || '?')[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-xs font-medium">{comment.author_name || 'Anônimo'}</p>
          {comment.author_status && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${STATUS_COLOR[comment.author_status] || STATUS_COLOR.interessado}`}>
              {STATUS_LABEL[comment.author_status] || comment.author_status}
            </span>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-1.5">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <div className="mt-1 flex gap-2">
            <button onClick={saveEdit} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
              <Check className="h-3 w-3" /> Salvar
            </button>
            <button onClick={() => { setEditing(false); setEditText(comment.text); }} className="text-[11px] text-muted-foreground">Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{comment.text}</p>
          <div className="mt-1.5 flex items-center gap-3">
            {!isReply && (
              <button onClick={onReply} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                <CornerDownRight className="h-3 w-3" /> Responder
              </button>
            )}
            {canManage && (
              <button onClick={() => { setEditing(true); setEditText(comment.text); }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">
                <Edit2 className="h-3 w-3" /> Editar
              </button>
            )}
            {canManage && (
              <button onClick={() => onDelete(comment.id)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}