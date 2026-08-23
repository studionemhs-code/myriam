import React, { useEffect, useState, useCallback } from 'react';
import { Pin, Heart, MessageCircle, Leaf, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function MuralTestimonials() {
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.MyriamPost.filter({ is_testimonial: true }, '-created_date', 50);
      // Sort: pinned first, then by created_date
      list.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
      setPosts(list);
      if (user) {
        const myInts = await base44.entities.MyriamInteraction.filter({ created_by_id: user.id });
        const map = {};
        myInts.forEach((i) => { map[i.post_id] = i.type; });
        setInteractions(map);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const togglePin = async (post) => {
    try {
      await base44.entities.MyriamPost.update(post.id, { is_pinned: !post.is_pinned });
      load();
    } catch { alert('Erro ao fixar testemunho.'); }
  };

  const toggleLike = async (post) => {
    if (interactions[post.id] === 'like') {
      const myInt = (await base44.entities.MyriamInteraction.filter({ post_id: post.id, created_by_id: user.id, type: 'like' }))[0];
      if (myInt) await base44.entities.MyriamInteraction.delete(myInt.id);
      setInteractions((p) => ({ ...p, [post.id]: undefined }));
      await base44.entities.MyriamPost.update(post.id, { like_count: Math.max(0, (post.like_count || 0) - 1) });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } : p));
    } else {
      await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'like' });
      setInteractions((p) => ({ ...p, [post.id]: 'like' }));
      await base44.entities.MyriamPost.update(post.id, { like_count: (post.like_count || 0) + 1 });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, like_count: (p.like_count || 0) + 1 } : p));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 font-display text-lg">Nenhum testemunho ainda</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Compartilhe seu testemunho de consagração marcando a opção "Testemunho de Consagração" ao publicar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => {
        const isPinned = post.is_pinned;
        const liked = interactions[post.id] === 'like';
        return (
          <div
            key={post.id}
            className={`rounded-2xl border bg-card p-5 shadow-sm ${isPinned ? 'border-gold/50 ring-1 ring-gold/20' : 'border-border'}`}
          >
            {isPinned && (
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gold">
                <Pin className="h-3.5 w-3.5" /> Fixado em destaque
              </div>
            )}
            <div className="flex items-center gap-3">
              <Link to={`/perfil/${post.created_by_id}`}>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-marian/15 font-display text-sm text-marian">
                  {post.author_photo ? <img src={post.author_photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : (post.author_name || 'A')[0]}
                </div>
              </Link>
              <div>
                <Link to={`/perfil/${post.created_by_id}`} className="text-sm font-medium hover:underline">{post.author_name || 'Alma'}</Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => togglePin(post)}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${isPinned ? 'bg-gold/15 text-gold' : 'border border-border text-muted-foreground hover:text-gold'}`}
                >
                  <Pin className="h-3.5 w-3.5" /> {isPinned ? 'Desafixar' : 'Fixar'}
                </button>
              )}
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{post.text}</p>
            {post.image_url && <img src={post.image_url} alt="" className="mt-3 w-full rounded-xl object-cover" />}

            <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-sm">
              <button onClick={() => toggleLike(post)} className={`flex items-center gap-1.5 transition ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> {post.like_count || 0}
              </button>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MessageCircle className="h-4 w-4" /> {post.comment_count || 0}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Leaf className="h-4 w-4" /> {post.prayer_count || 0}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}