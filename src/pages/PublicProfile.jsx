import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { GoldDivider, Ornament, EmptyState } from '@/components/ui/marian';
import ReportDialog from '@/components/myriam/ReportDialog';

const statusLabel = { consagrado: 'Consagrado', preparacao: 'Em Preparação', interessado: 'Interessado' };
const statusTone = { consagrado: 'bg-gold/15 text-gold', preparacao: 'bg-marian/15 text-marian', interessado: 'bg-muted text-muted-foreground' };

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getPublicProfile', { user_id: userId });
        setProfile(res.data);
        const userPosts = await base44.entities.MyriamPost.filter({ created_by_id: userId }, '-created_date', 50);
        setPosts(userPosts);
      } catch (e) { /* ignore */ }
    })();
  }, [userId]);

  const startChat = async () => {
    setStarting(true);
    try {
      const existing = await base44.entities.ChatConversation.list('-created_date', 200);
      const conv = existing.find((c) => c.participants?.length === 2 && c.participants.includes(userId));
      if (conv) { navigate(`/chat/${conv.id}`); return; }
      const newConv = await base44.entities.ChatConversation.create({
        participants: [currentUser.id, userId],
        participant_names: [currentUser.display_name || currentUser.full_name || 'Eu', profile.display_name || profile.full_name],
        participant_photos: [currentUser.photo_url || '', profile.photo_url || ''],
        last_message_text: '',
        last_message_date: new Date().toISOString()
      });
      navigate(`/chat/${newConv.id}`);
    } finally { setStarting(false); }
  };

  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col items-center rounded-2xl bg-card p-6 shadow-sm">
        {profile.photo_url ? (
          <img src={profile.photo_url} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-marian/15 font-display text-2xl text-marian">{(profile.display_name || profile.full_name || 'A')[0]}</div>
        )}
        <h1 className="mt-3 font-display text-xl">{profile.display_name || profile.full_name}</h1>
        <span className={`mt-1 rounded-full px-3 py-0.5 text-[10px] ${statusTone[profile.status]}`}>{statusLabel[profile.status]}</span>
        {profile.bio && <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">{profile.bio}</p>}
        {currentUser?.id !== userId && (
          <div className="mt-4 flex gap-2">
            <button onClick={startChat} disabled={starting} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
              <MessageCircle className="h-4 w-4" /> Enviar mensagem
            </button>
            <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-destructive">
              <Flag className="h-4 w-4" /> Denunciar
            </button>
          </div>
        )}
      </div>

      <GoldDivider />

      <h2 className="mb-3 font-display text-lg">Publicações</h2>
      {posts.length === 0 ? (
        <EmptyState title="Sem publicações" subtitle="Este membro ainda não publicou no Myriam." />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="whitespace-pre-wrap text-sm">{p.text}</p>
              {p.image_url && <img src={p.image_url} alt="" className="mt-2 w-full rounded-xl object-cover" />}
              {p.video_url && <video src={p.video_url} className="mt-2 w-full rounded-xl" controls />}
            </div>
          ))}
        </div>
      )}

      <GoldDivider />
      <Ornament className="text-gold" />

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="usuario" targetId={userId} />
    </div>
  );
}