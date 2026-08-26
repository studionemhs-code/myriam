import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

export const preflight = (req: Request) =>
  req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cliente com privilégios totais (ignora RLS).
export const admin = () => createClient(URL_, SERVICE, { auth: { persistSession: false } });

// Cliente no contexto do usuário que fez a chamada.
export const asUser = (req: Request) =>
  createClient(URL_, ANON, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false }
  });

// Perfil do usuário autenticado, com `id` no formato usado pelos dados do app.
export async function currentUser(req: Request) {
  const { data: { user } } = await asUser(req).auth.getUser();
  if (!user) return null;
  const { data: profile } = await admin().from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  return { ...profile, id: profile.legacy_id || profile.id, profile_id: profile.id, email: profile.email || user.email };
}

// Localiza um perfil pelo ID do app (legado do Base44 ou UUID do Supabase Auth).
export async function findProfile(appUserId: string) {
  const { data } = await admin()
    .from('profiles').select('*')
    .or(`legacy_id.eq.${appUserId},id.eq.${appUserId}`)
    .limit(1).maybeSingle();
  return data;
}

// Cria uma notificação respeitando as preferências do usuário.
export async function notifyUser(
  userId: string, category: string, title: string,
  body?: string, link?: string, relatedId?: string, videoUrl?: string, youtubeId?: string
) {
  try {
    const profile = await findProfile(userId);
    if (profile?.notification_prefs && profile.notification_prefs[category] === false) {
      return { skipped: true, reason: 'disabled' };
    }
    const { error } = await admin().from('notifications').insert({
      user_id: userId,
      category, title,
      body: body || '',
      link: link || '',
      related_id: relatedId || '',
      video_url: videoUrl || '',
      youtube_id: youtubeId || '',
      read: false
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export function fillTemplate(template: string, payload: Record<string, unknown>) {
  let msg = template || '';
  for (const [key, value] of Object.entries(payload)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''));
  }
  return msg;
}

export const APP_URL = Deno.env.get('APP_URL') || 'https://theotokos.app';