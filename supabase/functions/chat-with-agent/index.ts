import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { agent_id, message, conversation_id } = await req.json();
    if (!agent_id || !message) return json({ error: 'agent_id e message são obrigatórios' }, 400);

    const db = admin();
    const { data: agent } = await db.from('ai_agents').select('*').eq('id', agent_id).maybeSingle();
    if (!agent || !agent.is_active) return json({ error: 'Agente não disponível' }, 404);

    const apiKey = agent.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'Nenhuma chave API da OpenAI configurada. Adicione uma chave no painel de agentes.' }, 500);
    }

    let systemPrompt = agent.instructions || 'Você é um assistente útil.';
    if (agent.knowledge_content) {
      systemPrompt += '\n\n--- CONHECIMENTO DE REFERÊNCIA ---\n' + agent.knowledge_content + '\n--- FIM DO CONHECIMENTO ---';
    }

    let conversation = null;
    let history: { role: string; content: string }[] = [];
    if (conversation_id) {
      const { data } = await db.from('agent_conversations').select('*').eq('id', conversation_id).maybeSingle();
      conversation = data;
      history = ((data?.messages || []) as { role: string; content: string }[])
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: agent.model || 'gpt-4o-mini',
        temperature: agent.temperature ?? 0.7,
        messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }]
      })
    });
    const completion = await res.json();
    if (!res.ok) return json({ error: completion.error?.message || 'Erro na OpenAI' }, 500);

    const assistantMessage = completion.choices[0].message.content;
    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: message, timestamp: now };
    const assistantMsg = { role: 'assistant', content: assistantMessage, timestamp: now };

    if (conversation) {
      await db.from('agent_conversations')
        .update({ messages: [...(conversation.messages || []), userMsg, assistantMsg] })
        .eq('id', conversation.id);
    } else {
      const { data: created } = await db.from('agent_conversations').insert({
        agent_id,
        agent_name: agent.name,
        title: message.substring(0, 50),
        messages: [userMsg, assistantMsg],
        created_by_id: user.id
      }).select().single();
      conversation = created;
    }

    return json({ reply: assistantMessage, conversation_id: conversation?.id });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});