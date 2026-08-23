import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Leaf, MessageCircle, Send, MoreHorizontal, Share2, Flag, Trash2, CornerDownRight, FileText, X, Pin, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { notifyUser } from '@/lib/notify';
import ReportDialog from './ReportDialog';

const statusTone = { consagrado: 'bg-gold/15 text-gold', preparacao: 'bg-marian/15 text-marian', interessado: 'bg-muted text-muted-foreground' };
const statusLabel = { consagrado: 'Consagrado', preparacao: 'Em Preparação', interessado: 'Interessado' };

export default function PostCard({ post, user }) {
  const [liked, setLiked] = useState(false);
  const [prayed, setPrayed] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [prayerCount, setPrayerCount] = useState(post.prayer_count || 0);
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
    setLoadingComments(false);
  };

  const toggleLike = async () => {
    if (liked) {
      const myInt = (await base44.entities.MyriamInteraction.filter({ post_id: post.id, created_by_id: user.id, type: 'like' }))[0];
      if (myInt) await base44.entities.MyriamInteraction.delete(myInt.id);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await base44.entities.MyriamPost.update(post.id, { like_count: Math.max(0, likeCount - 1) });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'like' });
      await base44.entities.MyriamPost.update(post.id, { like_count: likeCount + 1 });
      if (post.created_by_id !== user.id) {
        await notifyUser({ user_id: post.created_by_id, category: 'myriam', title: 'Nova curtida', body: 'Alguém curtiu sua publicação.', link: '/myriam', related_id: post.id });
      }
    }
  };

  const togglePray = async () => {
    if (prayed) return;
    setPrayed(true);
    setPrayerCount((c) => c + 1);
    await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'pray' });
    await base44.entities.MyriamPost.update(post.id, { prayer_count: prayerCount + 1 });
    if (post.created_by_id !== user.id) {
      await notifyUser({ user_id: post.created_by_id, category: 'myriam', title: 'Alguém rezou por sua publicação', body: 'Alguém ofereceu uma oração pela sua publicação.', link: '/myriam', related_id: post.id });
    }
  };

  const submitComment = async (parentId = null) => {
    if (!commentText.trim()) return;
    const c = await base44.entities.MyriamComment.create({
      post_id: post.id,
      parent_id: parentId || undefined,
      author_id: user.id,
      text: commentText.trim(),
      author_name: user.display_name || user.full_name || 'Alma',
      author_photo: user.photo_url || ''
    });
    setComments((p) => [...p, c]);
    setCommentText('');
    setReplyTo(null);
    await base44.entities.MyriamPost.update(post.id, { comment_count: (post.comment_count || 0) + (comments.length + 1) });
    if (post.created_by_id !== user.id) {
      await notifyUser({ user_id: post.created_by_id, category: 'myriam', title: 'Novo comentário', body: commentText.trim().slice(0, 100), link: '/myriam', related_id: post.id });
    }
    if (parentId) {
      const parentComment = comments.find((c) => c.id === parentId);
      if (parentComment && parentComment.author_id && parentComment.author_id !== user.id && parentComment.author_id !== post.created_by_id) {
        await notifyUser({ user_id: parentComment.author_id, category: 'myriam', title: 'Alguém respondeu seu comentário', body: commentText.trim().slice(0, 100), link: '/myriam', related_id: post.id });
      }
    }
  };

  const deleteComment = async (commentId) => {
    await base44.entities.MyriamComment.delete(commentId);
    setComments((p) => p.filter((c) => c.id !== commentId));
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

  const isAdmin = user.role === 'admin';
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (cid) => comments.filter((c) => c.parent_id === cid);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Link to={`/perfil/${post.created_by_id}`}>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-marian/15 font-display text-sm text-marian">
            {post.author_photo ? <img src={post.author_photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : (post.author_name || 'A')[0]}
          </div>
        </Link>
        <div>
          <Link to={`/perfil/${post.created_by_id}`} className="text-sm font-medium hover:underline">{post.author_name || 'Alma'}</Link>
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${statusTone[post.author_status] || statusTone.interessado}`}>
            {statusLabel[post.author_status] || 'Interessado'}
          </span>
          {post.is_testimonial && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
              <Sparkles className="h-2.5 w-2.5" /> Testemunho
            </span>
          )}
          {pinned && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-marian/15 px-2 py-0.5 text-[10px] text-marian">
              <Pin className="h-2.5 w-2.5" /> Fixado
            </span>
          )}
        </div>
        <div className="ml-auto relative">
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
                {isAdmin && post.is_testimonial && (
                  <button onClick={togglePin} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50">
                    <Pin className="h-4 w-4" /> {pinned ? 'Desafixar do Mural' : 'Fixar no Mural'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm">{post.text}</p>
      {post.image_url && <img src={post.image_url} alt="" className="mt-3 w-full rounded-xl object-cover" />}
      {post.video_url && <video src={post.video_url} className="mt-3 w-full rounded-xl" controls />}
      {post.document_url && <a href={post.document_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm hover:bg-muted/70"><FileText className="h-5 w-5 text-marian" /> Abrir documento</a>}

      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-sm">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 transition ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {likeCount}
        </button>
        <button onClick={togglePray} className={`flex items-center gap-1.5 transition ${prayed ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}>
          <Leaf className="h-4 w-4" /> Rezei {prayerCount > 0 && `(${prayerCount})`}
        </button>
        <button
          onClick={() => { setShowComments((s) => !s); if (!showComments) loadComments(); }}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
        >
          <MessageCircle className="h-4 w-4" /> {post.comment_count || 0}
        </button>
        <button onClick={share} className={`flex items-center gap-1.5 transition ${shared ? 'text-gold' : 'text-muted-foreground hover:text-gold'}`}>
          <Share2 className="h-4 w-4" /> {shared ? 'Compartilhado!' : ''}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {loadingComments && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <CommentItem comment={c} currentUserId={user.id} isAdmin={isAdmin} onDelete={deleteComment} onReply={() => setReplyTo(c.id)} onReport={(cid) => { setReportCommentId(cid); setReportOpen(true); }} />
              {repliesOf(c.id).map((r) => (
                <div key={r.id} className="ml-6">
                  <CommentItem comment={r} currentUserId={user.id} isAdmin={isAdmin} onDelete={deleteComment} onReport={(cid) => { setReportCommentId(cid); setReportOpen(true); }} isReply />
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

function CommentItem({ comment, currentUserId, isAdmin, onDelete, onReply, onReport, isReply }) {
  const canDelete = comment.author_id === currentUserId || isAdmin;
  return (
    <div className="flex gap-2">
      <Link to={`/perfil/${comment.author_id || ''}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{(comment.author_name || 'A')[0]}</div>
      </Link>
      <div className="flex-1">
        <div className="rounded-2xl rounded-tl-sm bg-muted/50 px-3 py-2">
          <Link to={`/perfil/${comment.author_id || ''}`} className="text-xs font-medium hover:underline">{comment.author_name}</Link>
          <p className="text-sm">{comment.text}</p>
        </div>
        <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
          {!isReply && <button onClick={onReply} className="flex items-center gap-1 hover:text-primary"><CornerDownRight className="h-3 w-3" /> Responder</button>}
          <button onClick={() => onReport(comment.id)} className="hover:text-destructive"><Flag className="mr-1 inline h-3 w-3" /> Denunciar</button>
          {canDelete && <button onClick={() => onDelete(comment.id)} className="hover:text-destructive"><Trash2 className="mr-1 inline h-3 w-3" /> Excluir</button>}
        </div>
      </div>
    </div>
  );
}