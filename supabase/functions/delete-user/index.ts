import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Helpers inlineados (não depende de ../_shared/utils.ts) ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const preflight = (req: Request) =>
  req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = () => createClient(URL_, SERVICE, { auth: { persistSession: false } });

const asUser = (req: Request) =>
  createClient(URL_, ANON, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false }
  });

async function currentUser(req: Request) {
  const { data: { user } } = await asUser(req).auth.getUser();
  if (!user) return null;
  const { data: profile } = await admin().from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) return null;
  return { ...profile, profile_id: profile.id, email: profile.email || user.email };
}
// --- Fim dos helpers ---

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    const { userId } = await req.json();
    if (!userId) return json({ error: 'Missing userId' }, 400);

    const db = admin();

    // Busca o perfil para obter o legacy_id (ID histórico do Base44 usado em created_by_id)
    const { data: profile } = await db.from('profiles').select('id, legacy_id').eq('id', userId).maybeSingle();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    // IDs possíveis: UUID do Supabase Auth e/ou legacy_id do Base44
    const ids = [profile.id, profile.legacy_id].filter(Boolean) as string[];

    // Tabelas com created_by_id
    const createdByTables = [
      'myriam_posts', 'myriam_comments', 'myriam_interactions', 'myriam_stories',
      'reflections', 'prayer_intentions', 'prayer_interactions',
      'content_notes', 'content_comments', 'lesson_progress', 'user_progress',
      'journey_participants', 'certificates', 'agent_conversations', 'reports'
    ];
    for (const table of createdByTables) {
      await db.from(table).delete().in('created_by_id', ids);
    }

    // chat_messages: remover mensagens enviadas pelo usuário
    await db.from('chat_messages').delete().in('sender_id', ids);
    await db.from('chat_messages').delete().in('created_by_id', ids);

    // chat_conversations criadas pelo usuário
    await db.from('chat_conversations').delete().in('created_by_id', ids);

    // Tabelas com user_id
    const userIdTables = ['association_requests', 'notifications', 'user_feature_access'];
    for (const table of userIdTables) {
      await db.from(table).delete().in('user_id', ids);
    }

    // Deleta o perfil
    await db.from('profiles').delete().eq('id', userId);

    // Deleta o usuário de autenticação (auth.users)
    const { error: authError } = await db.auth.admin.deleteUser(userId);
    if (authError) {
      return json({ error: 'Falha ao remover autenticação: ' + authError.message }, 500);
    }

    return json({ success: true, deleted: userId });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});