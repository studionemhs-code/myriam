import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let query = admin().from('ai_agents').select('*').eq('is_active', true);
    if (user.role !== 'admin') query = query.eq('admin_only', false);
    const { data: agents, error } = await query;
    if (error) throw error;

    // Sanitiza: nunca expõe a chave API do agente.
    const sanitized = (agents || []).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      welcome_message: a.welcome_message,
      model: a.model,
      icon_url: a.icon_url || null,
      is_floating_main: a.is_floating_main || false,
      voice_enabled: a.voice_enabled !== false,
      files_enabled: a.files_enabled !== false,
      default_voice: a.default_voice || 'river',
      voice_language: a.voice_language || 'pt-BR',
      admin_only: a.admin_only === true,
      architect_mode_enabled: user.role === 'admin' && a.architect_mode_enabled === true
    }));

    // Agente principal do botão flutuante (apenas um por vez pode ter a flag).
    const floatingMain = sanitized.find((a) => a.is_floating_main) || null;

    return json({ agents: sanitized, floatingMain });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});