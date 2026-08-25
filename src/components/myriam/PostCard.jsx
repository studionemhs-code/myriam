import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Leaf, MessageCircle, Send, MoreHorizontal, Share2, Flag, Trash2, CornerDownRight, FileText, X, Pin, Sparkles, Edit2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { notifyUser } from '@/lib/notify';
import ReportDialog from './ReportDialog';

const statusTone = { consagrado: 'bg-gold/15 text-gold', preparacao: 'bg-marian/15 text-marian', interessado: 'bg-muted text-muted-foreground' };
const statusLabel = { consagrado: 'Consagrado', preparacao: 'Em Preparação', interessado: 'Interessado' };

export default function PostCard({ post, user, onDeleted }) {
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [prayerCount, setPrayerCount] = useState(post.prayer_count || 0);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState(null);
  const [shared, setShared] = useState(false);
  const [pinned, setPinned] = useState(post.is_pinned || false);
  const [editingPost, setEditingPost] = useState(false);
  const [editPostText, setEditPostText] = useState(post.text || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const isAuthor = post.created_by_id === user.id;
  const isAdmin = user.role === 'admin';
  const canManagePost = isAuthor || isAdmin;

  const togglePin = async () => {
    try {
      const newVal = !pinned;
      setPinned(newVal);
      await base44.entities.MyriamPost.update(post.id, { is_pinned: newVal });
      setShowMenu(false);
    } catch { setPinned(post.is_pinned); alert('Erro ao fixar.'); }
  };

  useEffect(() => {
    (async () => {
      try {
        const ints = await base44.entities.MyriamInteraction.filter({ post_id: post.id, created_by_id: user.id });
        setLiked(ints.some((i) => i.type === 'like'));
        setPrayed(ints.some((i) => i.type === 'pray'));
      } catch (e) { /* ignore */ }
    })();
  }, [post.id, user.id]);

  const loadComments = async () => {
    setLoadingComments(true);
    const list = await base44.entities.MyriamComment.filter({ post_id: post.id }, 'created_date', 100);
    setComments(list);
    setCommentCount(list.length);
    setLoadingComments(false);
  };

  const toggleLike = async () => {
    const newCount = liked ? Math.max(0, likeCount - 1) : likeCount + 1;
    setLiked(!liked);
    setLikeCount(newCount);
    try {
      if (liked) {
        const myInt = (await base44.entities.MyriamInteraction.filter({ post_id: post.id, created_by_id: user.id, type: 'like' }))[0];
        if (myInt) await base44.entities.MyriamInteraction.delete(myInt.id);
      } else {
        await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'like' });
        if (post.created_by_id !== user.id) {
          await notifyUser({ user_id: post.created_by_id, category: 'myriam', title: 'Nova curtida', body: 'Alguém curtiu sua publicação.', link: '/myriam', related_id: post.id });
        }
      }
      await base44.entities.MyriamPost.update(post.id, { like_count: newCount });
    } catch (e) { /* revert on error */ }
  };

  const togglePray = async () => {
    if (prayed) return;
    const newCount = prayerCount + 1;
    setPrayed(true);
    setPrayerCount(newCount);
    try {
      await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'pray' });
      await base44.entities.MyriamPost.update(post.id, { prayer_count: newCount });
      if (post.created_by_id !== user.id) {
        await notifyUser({ user_id: post.created_by_id, category: 'myriam', title: 'Alguém rezou por sua publicação', body: 'Alguém ofereceu uma oração pela sua publicação.', link: '/myriam', related_id: post.id });
      }
    } catch (e) { /* ignore */ }
  };

  const submitComment = async (parentId = null) => {
    if (!commentText.trim()) return;
    try {
      const c = await base44.entities.MyriamComment.create({
        post_id: post.id,
        parent_id: parentId || undefined,
        author_id: user.id,
        text: commentText.trim(),
        author_name: user.display_name || user.full_name || 'Alma',
        author_photo: user.photo_url || ''
      });
      setComments((p) => [...p, c]);
      const newCount = commentCount + 1;
      setCommentCount(newCount);
      await base44.entities.MyriamPost.update(post.id, { comment_count: newCount });
      setCommentText('');
      setReplyTo(null);
      if (post.created_by_id !== user.id) {
        await notifyUser({ user_id: post.created_by_id, category: 'myriam', title: 'Novo comentário', body: commentText.trim().slice(0, 100), link: '/myriam', related_id: post.id });
      }
      if (parentId) {
        const parentComment = comments.find((c) => c.id === parentId);
        if (parentComment && parentComment.author_id && parentComment.author_id !== user.id && parentComment.author_id !== post.created_by_id) {
          await notifyUser({ user_id: parentComment.author_id, category: 'myriam', title: 'Alguém respondeu seu comentário', body: commentText.trim().slice(0, 100), link: '/myriam', related_id: post.id });
        }
      }
    } catch (e) { /* ignore */ }
  };

  const deleteComment = async (commentId) => {
    try {
      await base44.entities.MyriamComment.delete(commentId);
      const removed = comments.filter((c) => c.id === commentId || c.parent_id === commentId);
      setComments((p) => p.filter((c) => c.id !== commentId && c.parent_id !== commentId));
      const newCount = Math.max(0, commentCount - removed.length);
      setCommentCount(newCount);
      await base44.entities.MyriamPost.update(post.id, { comment_count: newCount });
    } catch (e) { /* ignore */ }
  };

  const editComment = async (commentId, newText) => {
    try {
      await base44.entities.MyriamComment.update(commentId, { text: newText });
      setComments((p) => p.map((c) => c.id === commentId ? { ...c, text: newText } : c));
    } catch (e) { /* ignore */ }
  };

  const savePostEdit = async () => {
    if (!editPostText.trim()) return;
    setSavingEdit(true);
    try {
      await base44.entities.MyriamPost.update(post.id, { text: editPostText.trim() });
      setEditingPost(false);
    } catch (e) { /* ignore */ }
    setSavingEdit(false);
  };

  const deletePost = async () => {
    if (!confirm('Excluir esta publicação?')) return;
    try {
      await base44.entities.MyriamPost.delete(post.id);
      if (onDeleted) onDeleted(post.id);
    } catch (e) { alert('Erro ao excluir.'); }
  };

  const share = async () => {
    setShared(true);
    await base44.entities.MyriamPost.create({
      text: post.text,
      image_url: post.image_url,
      video_url: post.video_url,
      document_url: post.document_url,
      author_name: user.display_name || user.full_name || 'Alma',
      author_photo: user.photo_url || '',
      author_status: user.status || 'interessado',
      tags: ['compartilhado']
    });
    setTimeout(() => setShared(false), 2000);
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (cid) => comments.filter((c) => c.parent_id === cid);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Link to={`/perfil/${post.created_by_id}`} className="shrink-0">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-marian/15 font-display text-sm text-marian sm:h-10 sm:w-10">
            {post.author_photo ? <img src={post.author_photo} alt="" className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10" /> : (post.author_name || 'A')[0]}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/perfil/${post.created_by_id}`} className="text-sm font-medium hover:underline">{post.author_name || 'Alma'}</Link>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusTone[post.author_status] || statusTone.interessado}`}>
              {statusLabel[post.author_status] || 'Interessado'}
            </span>
            {post.is_testimonial && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                <Sparkles className="h-2.5 w-2.5" /> Testemunho
              </span>
            )}
            {pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-marian/15 px-2 py-0.5 text-[10px] text-marian">
                <Pin className="h-2.5 w-2.5" /> Fixado
              </span>
            )}
          </div>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setShowMenu((s) => !s)} className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-5 w-5" /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-border bg-card p-1 shadow-lg">
                <button onClick={() => { setReportOpen(true); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50">
                  <Flag className="h-4 w-4" /> Denunciar
                </button>
                <button onClick={() => { share(); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50">
                  <Share2 className="h-4 w-4" /> Compartilhar
                </button>
                {canManagePost && (
                  <button onClick={() => { setEditingPost(true); setEditPostText(post.text || ''); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <Edit2 className="h-4 w-4" /> Editar
                  </button>
                )}
                {canManagePost && (
                  <button onClick={() => { deletePost(); setShowMenu(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-muted/50">
                    <Trash2 className="h-4 w-4" /> Excluir
                  </button>
                )}
                {isAdmin && post.is_testimonial && (
                  <button onClick={togglePin} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <Pin className="h-4 w-4" /> {pinned ? 'Desafixar' : 'Fixar'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editingPost ? (
        <div className="mt-2.5 sm:mt-3">
          <textarea
            value={editPostText}
            onChange={(e) => setEditPostText(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={savePostEdit} disabled={savingEdit} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40">
              <Check className="h-3.5 w-3.5" /> Salvar
            </button>
            <button onClick={() => setEditingPost(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground">Cancelar</button>
          </div>
        </div>
      ) : (
        <p className="mt-2.5 whitespace-pre-wrap text-sm sm:mt-3">{post.text}</p>
      )}
      {post.image_url && <img src={post.image_url} alt="" className="mt-2.5 w-full rounded-xl object-cover sm:mt-3" />}
      {post.video_url && <video src={post.video_url} className="mt-2.5 w-full rounded-xl sm:mt-3" controls />}
      {post.document_url && <a href={post.document_url} target="_blank" rel="noreferrer" className="mt-2.5 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm hover:bg-muted/70 sm:mt-3"><FileText className="h-5 w-5 text-marian" /> Abrir documento</a>}

      <div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5 text-sm sm:gap-4 sm:pt-3">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {likeCount}
        </button>
        <button onClick={togglePray} className={`flex items-center gap-1.5 transition ${prayed ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}>
          <Leaf className="h-4 w-4" /> <span className="hidden sm:inline">Rezei</span> {prayerCount > 0 && `(${prayerCount})`}
        </button>
        <button
          onClick={() => { setShowComments((s) => !s); if (!showComments) loadComments(); }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" /> {commentCount}
        </button>
        <button onClick={share} className={`flex items-center gap-1.5 transition ${shared ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}>
          <Share2 className="h-4 w-4" /> {shared && <span className="hidden sm:inline">Compartilhado!</span>}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {loadingComments && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <CommentItem comment={c} currentUserId={user.id} isAdmin={isAdmin} onDelete={deleteComment} onEdit={editComment} onReply={() => setReplyTo(c.id)} onReport={(cid) => { setReportCommentId(cid); setReportOpen(true); }} />
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-6">
                  <CommentItem comment={r} currentUserId={user.id} isAdmin={isAdmin} onDelete={deleteComment} onEdit={editComment} onReport={(cid) => { setReportCommentId(cid); setReportOpen(true); }} isReply />
                </div>
              ))}
            </div>
          ))}
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CornerDownRight className="h-3 w-3" /> Respondendo
              <button onClick={() => setReplyTo(null)} className="text-destructive"><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (replyTo ? submitComment(replyTo) : submitComment(null))}
              placeholder={replyTo ? 'Responder...' : 'Escreva um comentário...'}
              className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button onClick={() => replyTo ? submitComment(replyTo) : submitComment(null)} className="rounded-full bg-primary p-2 text-primary-foreground"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <ReportDialog open={reportOpen} onClose={() => { setReportOpen(false); setReportCommentId(null); }} targetType={reportCommentId ? 'comentario' : 'publicacao'} targetId={reportCommentId || post.id} />
    </div>
  );
}

function CommentItem({ comment, currentUserId, isAdmin, onDelete, onEdit, onReply, onReport, isReply }) {
  const canManage = comment.author_id === currentUserId || isAdmin;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const saveEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment.id, editText.trim());
    setEditing(false);
  };

  return (
    <div className="flex gap-2">
      <Link to={`/perfil/${comment.author_id || ''}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{(comment.author_name || 'A')[0]}</div>
      </Link>
      <div className="flex-1">
        {editing ? (
          <div>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <div className="mt-1 flex gap-2">
              <button onClick={saveEdit} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground"><Check className="h-3 w-3" /> Salvar</button>
              <button onClick={() => { setEditing(false); setEditText(comment.text); }} className="text-[11px] text-muted-foreground">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl rounded-tl-sm bg-muted/50 px-3 py-2">
              <Link to={`/perfil/${comment.author_id || ''}`} className="text-xs font-medium hover:underline">{comment.author_name}</Link>
              <p className="text-sm">{comment.text}</p>
            </div>
            <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
              {!isReply && <button onClick={onReply} className="flex items-center gap-1 hover:text-primary"><CornerDownRight className="h-3 w-3" /> Responder</button>}
              <button onClick={() => onReport(comment.id)} className="hover:text-destructive"><Flag className="mr-1 inline h-3 w-3" /> Denunciar</button>
              {canManage && <button onClick={() => { setEditing(true); setEditText(comment.text); }} className="hover:text-primary"><Edit2 className="mr-1 inline h-3 w-3" /> Editar</button>}
              {canManage && <button onClick={() => onDelete(comment.id)} className="hover:text-destructive"><Trash2 className="mr-1 inline h-3 w-3" /> Excluir</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}