import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Service role: AIAgent read é restrito a admin (contém a chave API).
    const agents = await base44.asServiceRole.entities.AIAgent.filter({ is_active: true });

    // Sanitiza: retorna apenas campos seguros para o usuário final.
    const sanitized = agents.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      welcome_message: a.welcome_message,
      model: a.model,
      icon_url: a.icon_url,
      is_floating_main: a.is_floating_main === true
    }));

    // Agente principal do botão flutuante (primeiro ativo marcado).
    const floatingMain = sanitized.find(a => a.is_floating_main) || null;

    return Response.json({ agents: sanitized, floatingMain });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}