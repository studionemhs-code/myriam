import React, { useEffect, useState, useCallback } from 'react';
import { Pin, Heart, MessageCircle, Leaf, Sparkles, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';
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
      const newCount = Math.max(0, (post.like_count || 0) - 1);
      await base44.entities.MyriamPost.update(post.id, { like_count: newCount });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, like_count: newCount } : p));
    } else {
      await base44.entities.MyriamInteraction.create({ post_id: post.id, type: 'like' });
      setInteractions((p) => ({ ...p, [post.id]: 'like' }));
      const newCount = (post.like_count || 0) + 1;
      await base44.entities.MyriamPost.update(post.id, { like_count: newCount });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, like_count: newCount } : p));
    }
  };

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const saveEdit = async (post) => {
    if (!editText.trim()) return;
    try {
      await base44.entities.MyriamPost.update(post.id, { text: editText.trim() });
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, text: editText.trim() } : p));
      setEditingId(null);
    } catch (e) { alert('Erro ao editar.'); }
  };

  const deletePost = async (post) => {
    if (!confirm('Excluir este testemunho?')) return;
    try {
      await base44.entities.MyriamPost.delete(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) { alert('Erro ao excluir.'); }
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
    <div className="space-y-3 sm:space-y-4">
      {posts.map((post) => {
        const isPinned = post.is_pinned;
        const liked = interactions[post.id] === 'like';
        return (
          <div
            key={post.id}
            className={`rounded-2xl border bg-card p-3 shadow-sm sm:p-5 ${isPinned ? 'border-gold/50 ring-1 ring-gold/20' : 'border-border'}`}
          >
            {isPinned && (
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gold">
                <Pin className="h-3.5 w-3.5" /> Fixado em destaque
              </div>
            )}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link to={`/perfil/${post.created_by_id}`} className="shrink-0">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-marian/15 font-display text-sm text-marian sm:h-10 sm:w-10">
                  {post.author_photo ? <img src={post.author_photo} alt="" className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10" /> : (post.author_name || 'A')[0]}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/perfil/${post.created_by_id}`} className="text-sm font-medium hover:underline">{post.author_name || 'Alma'}</Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => togglePin(post)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium sm:px-3 ${isPinned ? 'bg-gold/15 text-gold' : 'border border-border text-muted-foreground hover:text-gold'}`}
                  >
                    <Pin className="h-3.5 w-3.5" /> {isPinned ? 'Desafixar' : 'Fixar'}
                  </button>
                )}
                {(post.created_by_id === user?.id || user?.role === 'admin') && (
                  <>
                    <button
                      onClick={() => { setEditingId(post.id); setEditText(post.text); }}
                      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deletePost(post)}
                      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingId === post.id ? (
              <div className="mt-2.5 sm:mt-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-primary"
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => saveEdit(post)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    <Check className="h-3.5 w-3.5" /> Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed sm:mt-3">{post.text}</p>
            )}
            {post.image_url && <img src={post.image_url} alt="" className="mt-2.5 w-full rounded-xl object-cover sm:mt-3" />}

            <div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5 text-sm sm:mt-3 sm:gap-4 sm:pt-3">
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