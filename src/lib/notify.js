import { supabase } from '@/api/supabase';

// Helper para criar notificações via Edge Function (verifica preferências do destinatário).
export async function notifyUser({ user_id, category, title, body, link, related_id }) {
  try {
    const { data, error } = await supabase.functions.invoke('notify-user', {
      body: { user_id, category, title, body, link, related_id }
    });
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}