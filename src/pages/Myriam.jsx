import React, { useEffect, useState, useCallback } from 'react';
import { Leaf, MessageCircle, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import Composer from '@/components/myriam/Composer';
import PostCard from '@/components/myriam/PostCard';
import StoriesBar from '@/components/myriam/StoriesBar';
import ChatList from '@/components/myriam/ChatList';
import MuralTestimonials from '@/components/myriam/MuralTestimonials';

export default function Myriam() {
  const { user, loading } = useCurrentUser();
  const { isVisible } = useFeatureFlags();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [tab, setTab] = useState('feed');

  const load = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const list = await base44.entities.MyriamPost.list('-created_date', 50);
      setPosts(list);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    const unsub = base44.entities.MyriamPost.subscribe(() => load());
    load();
    return unsub;
  }, [load]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const showChat = isVisible('chat');

  return (
    <div>
      <PageHeader title="Myriam" subtitle="A rede social da comunidade mariana" icon={Leaf} />

      <div className="mb-4 flex gap-1 rounded-xl bg-muted/60 p-1">
        <button onClick={() => setTab('feed')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition sm:text-sm ${tab === 'feed' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
          <Leaf className="h-4 w-4" /> <span className="hidden sm:inline">Feed</span>
        </button>
        <button onClick={() => setTab('mural')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition sm:text-sm ${tab === 'mural' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
          <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Mural</span>
        </button>
        {showChat && (
          <button onClick={() => setTab('chat')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition sm:text-sm ${tab === 'chat' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
            <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Conversas</span>
          </button>
        )}
      </div>

      {tab === 'mural' ? (
        <>
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-marian/10 to-gold/10 p-3 sm:p-4">
            <p className="font-display italic text-xs leading-relaxed text-muted-foreground sm:text-sm">
              "Mural dos Testemunhos" — Partilhe a graça de sua consagração. Seus testemunhos podem ser fixados em destaque pela administração e curtidos por toda a comunidade.
            </p>
          </div>
          <div className="mb-4">
            <Composer user={user} onPosted={load} />
          </div>
          <MuralTestimonials />
        </>
      ) : tab === 'feed' ? (
        <>
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-marian/10 to-gold/10 p-3 sm:p-4">
        <p className="font-display italic text-xs leading-relaxed text-muted-foreground sm:text-sm">
          "Eis aqui a serva do Senhor." — Um espaço para partilhar a caminhada, testemunhos e intenções com seus irmãos e irmãs em Maria.
        </p>
      </div>

      <div className="mb-4">
        <StoriesBar />
      </div>

      <div className="mb-4">
        <Composer user={user} onPosted={load} />
      </div>

      {loadingPosts ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">Carregando publicações...</div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Leaf} title="Nenhuma publicação ainda" subtitle="Seja o primeiro a partilhar algo com a comunidade." />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} user={user} />
          ))}
        </div>
      )}
        </>
      ) : (
        <ChatList user={user} />
      )}
    </div>
  );
}