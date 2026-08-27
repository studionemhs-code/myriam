import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Helpers inlineados ---
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
  return { ...profile, email: profile.email || user.email };
}
// --- Fim dos helpers ---

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { category, title, body, link, related_id } = await req.json();
    if (!category || !title) return json({ error: 'Missing fields' }, 400);

    const db = admin();

    // Busca todos os admins
    const { data: admins } = await db.from('profiles').select('id').eq('role', 'admin');
    if (!admins || admins.length === 0) return json({ ok: true, created: 0 });

    let created = 0;
    for (const a of admins) {
      const { error } = await db.from('notifications').insert({
        user_id: a.id,
        category,
        title,
        body: body || '',
        link: link || '',
        related_id: related_id || '',
        read: false
      });
      if (!error) created++;
    }

    return json({ ok: true, created });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});