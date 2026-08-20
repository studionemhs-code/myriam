import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Plus, Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, EmptyState } from '@/components/ui/marian';

export default function Chat() {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await base44.entities.ChatConversation.list('-last_message_date', 100);
      setConversations(list);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    const unsub = base44.entities.ChatConversation.subscribe(() => load());
    load();
    return unsub;
  }, [load]);

  const search = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await base44.functions.invoke('searchUsers', { query: searchQuery });
      setSearchResults(res.data?.users || []);
    } finally { setSearching(false); }
  };

  const startConversation = async (otherUser) => {
    const existing = conversations.find((c) => c.participants?.length === 2 && c.participants.includes(otherUser.id));
    if (existing) { setShowNew(false); navigate(`/chat/${existing.id}`); return; }
    const conv = await base44.entities.ChatConversation.create({
      participants: [user.id, otherUser.id],
      participant_names: [user.full_name || 'Eu', otherUser.full_name],
      participant_photos: [user.photo_url || '', otherUser.photo_url || ''],
      last_message_text: '',
      last_message_date: new Date().toISOString()
    });
    setShowNew(false);
    navigate(`/chat/${conv.id}`);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const otherInfo = (conv) => {
    const idx = conv.participants.indexOf(user.id);
    const otherIdx = idx === 0 ? 1 : 0;
    return { name: conv.participant_names?.[otherIdx] || 'Alma', photo: conv.participant_photos?.[otherIdx] || '' };
  };

  return (
    <div>
      <PageHeader title="Conversas" subtitle="Mensagens privadas com a comunidade" icon={MessageCircle} />

      <button onClick={() => setShowNew(true)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground">
        <Plus className="h-4 w-4" /> Nova conversa
      </button>

      {conversations.length === 0 ? (
        <EmptyState icon={MessageCircle} title="Nenhuma conversa ainda" subtitle="Inicie uma conversa com um membro da comunidade." />
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const info = otherInfo(c);
            return (
              <Link key={c.id} to={`/chat/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-gold/40">
                {info.photo ? <img src={info.photo} className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marian/15 font-display text-marian">{(info.name || 'A')[0]}</div>}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{info.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.last_message_text || 'Inicie a conversa'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNew(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg">Nova conversa</h2>
              <button onClick={() => setShowNew(false)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-2">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Buscar membro pelo nome..." className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              <button onClick={search} className="rounded-xl bg-primary px-4 text-primary-foreground"><Search className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {searching && <p className="text-center text-sm text-muted-foreground">Buscando...</p>}
              {!searching && searchResults.map((u) => (
                <button key={u.id} onClick={() => startConversation(u)} className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-muted/50">
                  {u.photo_url ? <img src={u.photo_url} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-marian/15 text-sm text-marian">{(u.full_name || 'A')[0]}</div>}
                  <span className="text-sm font-medium">{u.full_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}