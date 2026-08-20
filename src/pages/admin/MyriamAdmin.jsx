import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, MessageCircle } from 'lucide-react';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';

export default function MyriamAdmin() {
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        base44.entities.MyriamPost.list('-created_date', 200),
        base44.entities.MyriamComment.list('-created_date', 200),
        base44.entities.MyriamStory.list('-created_date', 100)
      ]);
      setPosts(p);
      setComments(c);
      setStories(s);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const deletePost = async (id) => { if (confirm('Excluir publicação?')) { await base44.entities.MyriamPost.delete(id); await load(); } };
  const deleteComment = async (id) => { if (confirm('Excluir comentário?')) { await base44.entities.MyriamComment.delete(id); await load(); } };
  const deleteStory = async (id) => { if (confirm('Excluir story?')) { await base44.entities.MyriamStory.delete(id); await load(); } };

  return (
    <div>
      <AdminPageTitle title="Moderação Myriam" subtitle="Publicações, comentários e stories" />

      <div className="mb-4 flex gap-2">
        {[['posts', 'Publicações', posts.length], ['comments', 'Comentários', comments.length], ['stories', 'Stories', stories.length]].map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-1.5 text-sm ${tab === k ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`}>
            {l} ({n})
          </button>
        ))}
      </div>

      {loading ? <Loading /> : tab === 'posts' ? (
        <div className="space-y-3">
          {posts.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma publicação.</p> : posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{p.author_name} · {new Date(p.created_date).toLocaleDateString('pt-BR')}</p>
                  <p className="mt-1 text-sm">{p.text}</p>
                  {p.image_url && <img src={p.image_url} className="mt-2 h-24 rounded-lg object-cover" />}
                  {p.video_url && <div className="mt-1"><Badge>vídeo</Badge></div>}
                  {p.document_url && <div className="mt-1"><Badge>documento</Badge></div>}
                </div>
                <button onClick={() => deletePost(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span>❤️ {p.like_count || 0}</span>
                <span>🌿 {p.prayer_count || 0}</span>
                <span><MessageCircle className="mr-1 inline h-3 w-3" />{p.comment_count || 0}</span>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'comments' ? (
        <div className="space-y-2">
          {comments.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum comentário.</p> : comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-xs text-muted-foreground">{c.author_name} · post {c.post_id?.slice(-6)}</p>
                <p className="text-sm">{c.text}</p>
              </div>
              <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stories.length === 0 ? <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum story.</p> : stories.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.author_name}</span>
                <button onClick={() => deleteStory(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              {s.media_type === 'image' && <img src={s.media_url} className="mt-2 h-24 w-full rounded-lg object-cover" />}
              {s.media_type === 'video' && <video src={s.media_url} className="mt-2 h-24 w-full rounded-lg" />}
              {s.media_type === 'text' && <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-marian p-2 text-center text-xs text-white">{s.text}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}