import { json, preflight, currentUser, admin } from '../_shared/utils.ts';
import { accessibleAgent } from '../_shared/agentAccess.ts';
import { loadAgentThread, appendAgentMessages } from '../_shared/agentConversation.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { agent_id, role, content, event_id } = await req.json();
    if (!['user', 'assistant'].includes(role) || typeof content !== 'string' || !content.trim() || content.length > 20000 || typeof event_id !== 'string' || !/^[A-Za-z0-9_:-]{1,200}$/.test(event_id)) return json({ error: 'Transcrição inválida.' }, 400);
    const agent = await accessibleAgent(agent_id, user);
    if (agent.voice_enabled === false) return json({ error: 'Voz desativada.' }, 403);
    const db = admin(), conversation = await loadAgentThread(db, agent_id, user.id);
    const id = `voice:${role}:${event_id}`;
    if (!(conversation.messages || []).some((m: any) => m.id === id)) await appendAgentMessages(db, conversation.id, user.id, [
      { id, role, content, timestamp: new Date().toISOString(), source: 'live_voice' }
    ], conversation.pending_action || null);
    return json({ conversation_id: conversation.id });
  } catch (error) { return json({ error: (error as Error).message }, 500); }
});