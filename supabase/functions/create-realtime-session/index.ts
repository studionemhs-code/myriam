import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

const VOICES: Record<string, string> = { river: 'marin', honey: 'shimmer', sunny: 'nova', storm: 'onyx', spark: 'cedar' };

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { agent_id } = await req.json();
    if (!agent_id) return json({ error: 'agent_id é obrigatório' }, 400);

    const { data: agent } = await admin().from('ai_agents')
      .select('name,instructions,knowledge_content,voice_enabled,default_voice,is_active')
      .eq('id', agent_id).maybeSingle();
    if (!agent?.is_active || agent.voice_enabled === false) return json({ error: 'Conversa por voz indisponível para este agente.' }, 403);

    const prompt = [agent.instructions, agent.knowledge_content ? `Conhecimento do agente:\n${agent.knowledge_content.slice(0, 12000)}` : '', `Você está conversando por voz com ${user.display_name || user.full_name || 'um usuário'}. Responda em português brasileiro, de forma natural, acolhedora e concisa. Não use markdown.`].filter(Boolean).join('\n\n');
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { type: 'realtime', model: 'gpt-realtime', instructions: prompt, audio: { output: { voice: VOICES[agent.default_voice] || 'marin' } } } })
    });
    const data = await response.json();
    if (!response.ok || !data?.value) return json({ error: data?.error?.message || 'Não foi possível iniciar a sessão de voz.' }, 500);
    return json({ client_secret: data.value, expires_at: data.expires_at });
  } catch (error) { return json({ error: (error as Error).message }, 500); }
});