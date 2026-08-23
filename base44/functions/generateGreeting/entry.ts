import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import OpenAI from 'npm:openai';
import { secrets } from 'base44:runtime';

const DEFAULT_GREETING = 'Para que venha vosso reino Jesus, venha o reino de Maria';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const agents = await base44.entities.AIAgent.filter({ is_active: true });
    if (!agents || agents.length === 0) {
      return Response.json({ greeting: DEFAULT_GREETING });
    }

    const agent = agents[0];

    let systemPrompt = agent.instructions || 'Você é um assistente da comunidade Theotokos dedicado à Total Consagração a Jesus por Maria.';
    if (agent.knowledge_content) {
      systemPrompt += '\n\n--- CONHECIMENTO DE REFERÊNCIA ---\n' + agent.knowledge_content;
    }

    const firstName = (user.display_name || user.full_name || user.email || 'alma').split(' ')[0];
    const status = user.status || 'interessado';

    const messages = [
      {
        role: 'system',
        content: systemPrompt + '\n\nGere uma única frase curta de saudação espiritual e personalizada para o usuário. Máximo 15 palavras. Seja inspirador, mariano e acolhedor. Responda apenas com a frase, sem aspas, sem explicações.'
      },
      {
        role: 'user',
        content: `Gere uma saudação para ${firstName}, cujo estado espiritual é: ${status}.`
      }
    ];

    const openai = new OpenAI({ apiKey: secrets.get('OPENAI_API_KEY') });
    const response = await openai.chat.completions.create({
      model: agent.model || 'gpt-4o-mini',
      messages,
      temperature: 0.8,
      max_tokens: 60
    });

    const greeting = response.choices[0].message.content.trim();
    return Response.json({ greeting: greeting || DEFAULT_GREETING });
  } catch (error) {
    return Response.json({ greeting: DEFAULT_GREETING });
  }
}