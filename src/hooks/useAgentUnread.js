import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/api/supabase/client';

export default function useAgentUnread(agentId) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    const { data, error } = await supabase.rpc('get_agent_unread_count', { p_agent_id: agentId });
    if (!error) setUnreadCount(Number(data) || 0);
  }, [agentId]);

  const markRead = useCallback(async () => {
    if (!agentId) return;
    setUnreadCount(0);
    await supabase.rpc('mark_agent_conversation_read', { p_agent_id: agentId });
  }, [agentId]);

  useEffect(() => {
    setUnreadCount(0);
    if (!agentId) return;
    refresh();
    const timer = window.setInterval(refresh, 5000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [agentId, refresh]);

  return { unreadCount, refresh, markRead };
}