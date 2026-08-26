import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

const DEFAULT_GREETING = 'Para que venha vosso reino Jesus, venha o reino de Maria';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: agents } = await admin().from('ai_agents').select('*').eq('is_active', true).limit(1);
    const agent = agents?.[0];
    const apiKey = agent?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    if (!agent || !apiKey) return json({ greeting: DEFAULT_GREETING });

    let systemPrompt = agent.instructions
      || 'Você é um assistente da comunidade Theotokos dedicado à Total Consagração a Jesus por Maria.';
    if (agent.knowledge_content) {
      systemPrompt += '\n\n--- CONHECIMENTO DE REFERÊNCIA ---\n' + agent.knowledge_content;
    }

    const firstName = (user.display_name || user.full_name || user.email || 'alma').split(' ')[0];
    const status = user.status || 'interessado';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: agent.model || 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 60,
        messages: [
          {
            role: 'system',
            content: systemPrompt + '\n\nGere uma única frase curta de saudação espiritual e personalizada para o usuário. Máximo 15 palavras. Seja inspirador, mariano e acolhedor. Responda apenas com a frase, sem aspas, sem explicações.'
          },
          { role: 'user', content: `Gere uma saudação para ${firstName}, cujo estado espiritual é: ${status}.` }
        ]
      })
    });
    const completion = await res.json();
    const greeting = completion.choices?.[0]?.message?.content?.trim();
    return json({ greeting: greeting || DEFAULT_GREETING });
  } catch {
    return json({ greeting: DEFAULT_GREETING });
  }
});