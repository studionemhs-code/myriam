import { useEffect } from 'react';
import { supabase } from '@/api/supabase/client';

const HEARTBEAT_MS = 60 * 1000;

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Registra uma vez por dia que o usuário esteve ativo (relatório de ativos)
// e envia um "batimento" periódico de presença (usuários online agora).
export function useTrackActivity(user) {
  useEffect(() => {
    if (!user?.id) return;
    const day = localDay();
    const key = `activity_logged_${user.id}_${day}`;
    if (localStorage.getItem(key)) return;
    supabase
      .from('daily_activity')
      .upsert({ day }, { onConflict: 'created_by_id,day', ignoreDuplicates: true })
      .then(({ error }) => { if (!error) localStorage.setItem(key, '1'); });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const beat = () => {
      if (document.visibilityState === 'hidden') return;
      supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id).then(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', beat); };
  }, [user?.id]);
}