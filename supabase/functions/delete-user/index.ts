import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Tabelas estruturais que não devem ser limpas pela lista dinâmica
const STRUCTURAL_TABLES = new Set(['profiles', 'users', 'auth_users']);

// Descobre dinamicamente todas as tabelas do schema public que possuem uma dada coluna.
async function discoverTablesByColumn(db: ReturnType<typeof admin>, column: string): Promise<string[]> {
  const { data, error } = await db.rpc('get_tables_by_column', { column_name: column });
  if (error || !data) return [];
  const tables: string[] = Array.isArray(data) ? data : [];
  return tables.filter((t) => !STRUCTURAL_TABLES.has(t));
}

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Forbidden' }, 403);

    const { userId } = await req.json();
    if (!userId) return json({ error: 'Missing userId' }, 400);

    if (user.role !== 'admin' && userId !== user.id) return json({ error: 'Forbidden' }, 403);

    const db = admin();

    const { data: profile, error: profileError } = await db.from('profiles')
      .select('id, legacy_id').eq('id', userId).maybeSingle();
    if (profileError) return json({ error: 'Erro ao buscar perfil: ' + profileError.message }, 500);
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const ids = [profile.id, profile.legacy_id].filter(Boolean) as string[];

    // 1) Descobre e limpa tabelas com created_by_id
    const createdByTables = await discoverTablesByColumn(db, 'created_by_id');
    for (const table of createdByTables) {
      const { error: e } = await db.from(table).delete().in('created_by_id', ids);
      if (e) return json({ error: `Falha ao limpar ${table}: ${e.message}` }, 500);
    }

    // 2) Descobre e limpa tabelas com user_id
    const userIdTables = await discoverTablesByColumn(db, 'user_id');
    for (const table of userIdTables) {
      const { error: e } = await db.from(table).delete().in('user_id', ids);
      if (e) return json({ error: `Falha ao limpar ${table}: ${e.message}` }, 500);
    }

    // 3) Descobre e limpa tabelas com sender_id (chat_messages)
    const senderTables = await discoverTablesByColumn(db, 'sender_id');
    for (const table of senderTables) {
      const { error: e } = await db.from(table).delete().in('sender_id', ids);
      if (e) return json({ error: `Falha ao limpar ${table}: ${e.message}` }, 500);
    }

    // 4) Deleta o perfil primeiro
    const { error: delProfileError } = await db.from('profiles').delete().eq('id', userId);
    if (delProfileError) return json({ error: 'Falha ao remover perfil: ' + delProfileError.message }, 500);

    // 5) Deleta auth.users (não-fatal — perfil já foi removido)
    const { error: authError } = await db.auth.admin.deleteUser(userId);
    if (authError) {
      return json({ success: true, deleted: userId, auth_warning: authError.message });
    }

    return json({ success: true, deleted: userId });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});