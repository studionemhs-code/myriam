import React, { useEffect, useState, useCallback } from 'react';
import { Leaf } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import Composer from '@/components/myriam/Composer';
import PostCard from '@/components/myriam/PostCard';

export default function Myriam() {
  const { user, loading } = useCurrentUser();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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

  return (
    <div>
      <PageHeader title="Myriam" subtitle="A rede social da comunidade mariana" icon={Leaf} />

      <div className="mb-5 rounded-2xl bg-gradient-to-br from-marian/10 to-gold/10 p-4">
        <p className="font-display italic text-sm text-muted-foreground">
          "Eis aqui a serva do Senhor." — Um espaço para partilhar a caminhada, testemunhos e intenções com seus irmãos e irmãs em Maria.
        </p>
      </div>

      <div className="mb-5">
        <Composer user={user} onPosted={load} />
      </div>

      {loadingPosts ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">Carregando publicações...</div>
      ) : posts.length === 0 ? (
        <EmptyState icon={Leaf} title="Nenhuma publicação ainda" subtitle="Seja o primeiro a partilhar algo com a comunidade." />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}