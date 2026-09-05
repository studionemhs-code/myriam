import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabase/client';

export const ONLINE_WINDOW_MS = 3 * 60 * 1000;
export const isOnline = (u) => !!u?.last_seen_at && Date.now() - new Date(u.last_seen_at).getTime() < ONLINE_WINDOW_MS;

// Lista de usuários vistos nos últimos minutos, atualizada a cada 30s (uso admin).
export function useOnlineUsers() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, email, photo_url, status, last_seen_at')
        .gte('last_seen_at', since)
        .order('last_seen_at', { ascending: false });
      setUsers(data || []);
    };
    load();
    const timer = setInterval(load, 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  return users;
}