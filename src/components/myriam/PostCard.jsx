import React, { useEffect, useState } from 'react';
import { Heart, Leaf, MessageCircle, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ints = await base44.entities.MyriamInteraction.filter({ post_id: post.id });
        setLiked(ints.some((i) => i.type === 'like'));
        setPrayed(ints.some((i) => i.type === 'pray'));
      } catch (e) {}
    })();
  }, [post.id]);

  const loadComments = async () => {
    setLoadingComments(true);
    const list = await base44.entities.MyriamComment.filter({ post_id: post.id }, 'created_date', 100);
    setComments(list);
    setLoadingComments(false);
  };

  const toggleLike = async () => {
    if (liked) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'like' });
    await base44.entities.MyriamPost.update(post.id, { like_count: likeCount + 1 });
  };

  const togglePray = async () => {
    if (prayed) return;
    setPrayed(true);
    setPrayerCount((c) => c + 1);
    await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'pray' });
    await base44.entities.MyriamPost.update(post.id, { prayer_count: prayerCount + 1 });
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    const c = await base44.entities.MyriamComment.create({
      post_id: post.id,
      text: commentText.trim(),
      author_name: user.full_name || 'Alma',
      author_photo: user.photo_url || ''
    });
    setComments((p) => [...p, c]);
    setCommentText('');
    await base44.entities.MyriamPost.update(post.id, { comment_count: (post.comment_count || 0) + (comments.length + 1) });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marian/15 font-display text-sm text-marian">
          {post.author_photo ? <img src={post.author_photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : (post.author_name || 'A')[0]}
        </div>
        <div>
          <p className="text-sm font-medium">{post.author_name || 'Alma'}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusTone[post.author_status] || statusTone.interessado}`}>
            {statusLabel[post.author_status] || 'Interessado'}
          </span>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm">{post.text}</p>
      {post.image_url && <img src={post.image_url} alt="" className="mt-3 w-full rounded-xl object-cover" />}

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
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {loadingComments && <p className="text-xs text-muted-foreground">Carregando...</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{(c.author_name || 'A')[0]}</div>
              <div className="rounded-2xl rounded-tl-sm bg-muted/50 px-3 py-2">
                <p className="text-xs font-medium">{c.author_name}</p>
                <p className="text-sm">{c.text}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Escreva um comentário..."
              className="flex-1 rounded-full border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            <button onClick={submitComment} className="rounded-full bg-primary p-2 text-primary-foreground"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}