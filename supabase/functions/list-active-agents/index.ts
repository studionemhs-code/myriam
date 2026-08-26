import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: agents } = await admin().from('ai_agents').select('*').eq('is_active', true);

    // Sanitiza: nunca expõe a chave API do agente.
    const sanitized = (agents || []).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      welcome_message: a.welcome_message,
      model: a.model
    }));

    return json({ agents: sanitized });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});