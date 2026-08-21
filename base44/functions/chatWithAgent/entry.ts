import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import OpenAI from 'npm:openai';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { agent_id, message, conversation_id } = body;

    if (!agent_id || !message) {
      return Response.json({ error: 'agent_id e message são obrigatórios' }, { status: 400 });
    }

    const agent = await base44.entities.AIAgent.get(agent_id);
    if (!agent || !agent.is_active) {
      return Response.json({ error: 'Agente não disponível' }, { status: 404 });
    }

    let systemPrompt = agent.instructions || 'Você é um assistente útil.';
    if (agent.knowledge_content) {
      systemPrompt += '\n\n--- CONHECIMENTO DE REFERÊNCIA ---\n' + agent.knowledge_content + '\n--- FIM DO CONHECIMENTO ---';
    }

    let conversation = null;
    let history = [];
    if (conversation_id) {
      conversation = await base44.entities.AgentConversation.get(conversation_id);
      if (conversation) {
        history = (conversation.messages || [])
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content }));
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];

    const openai = new OpenAI({ apiKey: secrets.get('OPENAI_API_KEY') });
    const response = await openai.chat.completions.create({
      model: agent.model || 'gpt-4o-mini',
      messages,
      temperature: agent.temperature ?? 0.7
    });

    const assistantMessage = response.choices[0].message.content;

    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: message, timestamp: now };
    const assistantMsg = { role: 'assistant', content: assistantMessage, timestamp: now };

    if (conversation) {
      const updatedMessages = [...(conversation.messages || []), userMsg, assistantMsg];
      await base44.entities.AgentConversation.update(conversation_id, { messages: updatedMessages });
    } else {
      conversation = await base44.entities.AgentConversation.create({
        agent_id,
        agent_name: agent.name,
        title: message.substring(0, 50),
        messages: [userMsg, assistantMsg]
      });
    }

    return Response.json({
      reply: assistantMessage,
      conversation_id: conversation.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}