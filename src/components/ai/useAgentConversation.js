import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/api/supabase/client';

export default function useAgentConversation(agent, busy) {
  const [messages, setMessages] = useState([]), [conversationId, setConversationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false), [historyError, setHistoryError] = useState('');
  const busyRef = useRef(busy), refreshRef = useRef(() => {}); busyRef.current = busy;
  useEffect(() => {
    if (!agent?.id) return;
    let active = true, fetching = false, fingerprint = '', channel;
    setMessages([]); setConversationId(null); setLoadingHistory(true); setHistoryError('');
    const sync = async () => {
      if (!active || fetching || busyRef.current || document.hidden) return;
      fetching = true;
      const { data, error } = await supabase.rpc('load_agent_conversation', { p_agent_id: agent.id });
      fetching = false;
      if (!active || busyRef.current) return;
      if (error) { setHistoryError('Não foi possível sincronizar a conversa. Tentando novamente...'); setLoadingHistory(false); return; }
      setHistoryError(''); setLoadingHistory(false);
      const conversation = data?.[0], signature = JSON.stringify([conversation?.id, conversation?.messages, conversation?.pending_action]);
      if (signature === fingerprint) return;
      fingerprint = signature; setConversationId(conversation?.id || null);
      const next = (conversation?.messages || []).filter(m => m.role !== 'system');
      if (conversation?.pending_action) next.push({ role: 'assistant', pending_action: conversation.pending_action });
      setMessages(next.length ? next : agent.welcome_message ? [{ role: 'assistant', content: agent.welcome_message }] : []);
      if (conversation) await supabase.rpc('mark_agent_conversation_read', { p_agent_id: agent.id });
    };
    refreshRef.current = sync; sync();
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      channel = supabase.channel(`agent-thread:${agent.id}:${Math.random()}`).on('postgres_changes', {
        event: '*', schema: 'public', table: 'agent_conversations', filter: `created_by_id=eq.${data.user.id}`
      }, sync).subscribe();
    });
    const timer = setInterval(sync, 3000);
    window.addEventListener('focus', sync); window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync);
    return () => { active = false; clearInterval(timer); if (channel) supabase.removeChannel(channel); window.removeEventListener('focus', sync); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync); };
  }, [agent?.id]);
  useEffect(() => { if (!busy) refreshRef.current(); }, [busy]);
  return { messages, setMessages, conversationId, setConversationId, loadingHistory, historyError };
}