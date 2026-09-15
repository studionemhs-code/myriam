import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/api/supabase/client';
import { base44Source } from '@/api/base44SourceClient';

export default function useAgentConversation(agent, busy) {
  const [messages, setMessages] = useState([]), [conversationId, setConversationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false), [historyError, setHistoryError] = useState('');
  const [architectContext, setArchitectContext] = useState('');
  const [architectStatus, setArchitectStatus] = useState(null);
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
  useEffect(() => {
    if (!agent?.id || !agent.architect_mode_enabled) {
      setArchitectContext(''); setArchitectStatus(null); return;
    }
    let active = true;
    setArchitectContext(''); setArchitectStatus({ state: 'checking' });
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error('Sessão administrativa não encontrada.');
        const response = await base44Source.functions.invoke('githubArchitect', { access_token: accessToken, agent_id: agent.id, bootstrap: true });
        if (!active) return;
        setArchitectContext(response.data.context || '');
        setArchitectStatus({ state: 'connected', diagnostics: response.data.diagnostics });
      } catch (error) {
        if (active) setArchitectStatus({ state: 'error', message: error.message || 'Falha no diagnóstico técnico.' });
      }
    });
    return () => { active = false; };
  }, [agent?.id, agent?.architect_mode_enabled]);
  useEffect(() => { if (!busy) refreshRef.current(); }, [busy]);
  return { messages, setMessages, conversationId, setConversationId, loadingHistory, historyError, architectContext, architectStatus };
}