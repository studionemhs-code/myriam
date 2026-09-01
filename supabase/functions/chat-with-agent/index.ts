import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

// ============================================================================
// FERRAMENTAS
// ============================================================================

/** Calculadora — avalia expressões matemáticas com segurança */
function calculate(expression: string): string {
  if (!expression) return 'Erro: expressão vazia';
  const cleaned = expression.replace(/[^0-9+\-*/().%\s^]/g, '');
  if (!cleaned.trim()) return 'Erro: expressão inválida';
  try {
    const jsExpr = cleaned.replace(/\^/g, '**');
    const result = Function(`"use strict"; return (${jsExpr})`)();
    if (typeof result !== 'number' || !isFinite(result)) return 'Erro: resultado inválido';
    return `Resultado: ${result}`;
  } catch {
    return 'Erro: não foi possível calcular a expressão';
  }
}

/** Pesquisa na internet via DuckDuckGo Instant Answer API */
async function webSearch(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TheotokosAgent/1.0' } });
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.AbstractURL) parts.push(`Fonte: ${data.AbstractURL}`);
    if (data.Definition) parts.push(`Definição: ${data.Definition}`);
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter((t: any) => t.Text)
        .slice(0, 5)
        .map((t: any) => `- ${t.Text}`);
      parts.push(...topics);
    }
    return parts.length > 0 ? parts.join('\n') : 'Nenhum resultado encontrado para esta busca.';
  } catch {
    return 'Erro ao realizar a pesquisa. Tente reformular a pergunta.';
  }
}

/** Copiloto do sistema — consultas seguras e predefinidas na base do app */
async function systemQuery(query: string, db: any): Promise<string> {
  const q = query.toLowerCase();
  const count = async (table: string, filter?: Record<string, unknown>) => {
    let req = db.from(table).select('*', { count: 'exact', head: true });
    if (filter) for (const [k, v] of Object.entries(filter)) req = req.eq(k, v);
    const { count: c } = await req;
    return c ?? 0;
  };

  if (q.includes('jornada') && q.includes('ativa')) {
    return `Jornadas coletivas ativas: ${await count('collective_journeys', { status: 'ativa' })}`;
  }
  if (q.includes('consagrad')) {
    return `Membros consagrados: ${await count('profiles', { status: 'consagrado' })}`;
  }
  if (q.includes('preparac') || q.includes('preparação')) {
    return `Membros em preparação: ${await count('profiles', { status: 'preparacao' })}`;
  }
  if (q.includes('interessad')) {
    return `Membros interessados: ${await count('profiles', { status: 'interessado' })}`;
  }
  if (q.includes('intenç') || q.includes('intenc') || q.includes('oraç')) {
    return `Intenções de oração ativas: ${await count('prayer_intentions', { status: 'ativo' })}`;
  }
  if (q.includes('usuário') || q.includes('usuario') || q.includes('membro') || q.includes('cadastro')) {
    return `Total de membros cadastrados: ${await count('profiles')}`;
  }
  if (q.includes('conteúdo') || q.includes('conteudo') || q.includes('acamf')) {
    return `Conteúdos ACAMF publicados: ${await count('acamf_contents', { status: 'publicado' })}`;
  }
  return 'Consulta não reconhecida. Você pode perguntar sobre: total de membros, membros consagrados, em preparação, interessados, intenções de oração, jornadas ativas, conteúdos ACAMF.';
}

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Realiza cálculos matemáticos (soma, subtração, multiplicação, divisão, porcentagem, potência). Use quando o usuário solicitar cálculos.',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string', description: 'Expressão matemática, ex: 2 + 2, 15 * 3, 100 * 0.1, 2^3' } },
        required: ['expression']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Pesquisa informações na internet usando DuckDuckGo. Use para buscar informações atuais, fatos ou dados que você não conhece.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Termo de busca' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'system_query',
      description: 'Consulta dados do sistema Theotokos (copiloto). Pode buscar: total de membros, consagrados, em preparação, interessados, intenções de oração, jornadas ativas, conteúdos ACAMF.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'O que deseja saber sobre o sistema' } },
        required: ['query']
      }
    }
  }
];

// ============================================================================
// MEMÓRIA — extrai fatos simples do contexto da conversa
// ============================================================================
function extractFacts(message: string): string[] {
  const facts: string[] = [];
  const nameMatch = message.match(/(?:meu nome é|me chamo|eu sou o|eu sou a)\s+([A-Za-zÀ-ÿ]{2,})/i);
  if (nameMatch) facts.push(`O usuário se chama ${nameMatch[1]}`);
  const lower = message.toLowerCase();
  if (lower.includes('já me consagrei') || lower.includes('sou consagrado') || lower.includes('sou consagrada') || lower.includes('fui consagrado')) {
    facts.push('O usuário já é consagrado');
  }
  if (lower.includes('estou em preparação') || lower.includes('estou me preparando') || lower.includes('ainda não me consagrei')) {
    facts.push('O usuário está em preparação para a consagração');
  }
  if (lower.includes('minha consagração') && lower.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/)) {
    facts.push('O usuário mencionou uma data de consagração');
  }
  return facts;
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
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
    if (!apiKey) return json({ error: 'Nenhuma chave API da OpenAI configurada.' }, 500);

    // Ferramentas ativas
    const enabledTools = (agent.tools_enabled || []) as string[];
    const activeTools = TOOL_DEFS.filter((t) => enabledTools.includes(t.function.name));

    // Histórico da conversa
    let conversation: any = null;
    let history: { role: string; content: string }[] = [];
    if (conversation_id) {
      const { data } = await db.from('agent_conversations').select('*').eq('id', conversation_id).maybeSingle();
      conversation = data;
      history = ((data?.messages || []) as any[])
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
    }

    // Memória de longo prazo deste usuário com este agente
    const { data: memoryRow } = await db.from('agent_memories')
      .select('*')
      .eq('agent_id', agent_id)
      .eq('user_id', user.id)
      .maybeSingle();
    const memoryFacts: any[] = memoryRow?.facts || [];

    // System prompt
    let systemPrompt = agent.instructions || 'Você é um assistente útil.';
    if (agent.knowledge_content) {
      systemPrompt += '\n\n--- CONHECIMENTO DE REFERÊNCIA ---\n' + agent.knowledge_content + '\n--- FIM ---';
    }
    if (memoryFacts.length > 0) {
      systemPrompt += '\n\n--- O QUE VOCÊ LEMBRA SOBRE ESTE USUÁRIO ---\n' +
        memoryFacts.map((f) => `- ${f.fact}`).join('\n') +
        '\nUse essas informações para personalizar suas respostas.';
    }
    if (agent.reasoning_enabled) {
      systemPrompt += '\n\nMODO RACIOCÍNIO: Pense passo a passo antes de responder. Analise com profundidade.';
    }

    // Modelo: raciocínio usa gpt-4o; caso contrário o modelo selecionado
    const model = agent.reasoning_enabled ? 'gpt-4o' : (agent.model || 'gpt-4o-mini');

    // Loop de tool-use
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ];
    let assistantMessage = '';
    let usedTools = false;

    for (let iter = 0; iter < 5; iter++) {
      const body: any = {
        model,
        temperature: agent.temperature ?? 0.7,
        messages
      };
      if (activeTools.length > 0) {
        body.tools = activeTools;
        body.tool_choice = 'auto';
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const completion = await res.json();
      if (!res.ok) return json({ error: completion.error?.message || 'Erro na OpenAI' }, 500);

      const choice = completion.choices[0];
      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg);
        usedTools = true;
        for (const tc of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignore */ }
          let result = '';
          try {
            if (tc.function.name === 'calculator') result = calculate(args.expression);
            else if (tc.function.name === 'web_search') result = await webSearch(args.query);
            else if (tc.function.name === 'system_query') result = await systemQuery(args.query, db);
            else result = 'Ferramenta desconhecida.';
          } catch (e) {
            result = `Erro ao executar ferramenta: ${(e as Error).message}`;
          }
          messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
        continue;
      } else {
        assistantMessage = msg.content || '';
        break;
      }
    }

    if (!assistantMessage) assistantMessage = 'Não consegui processar sua solicitação agora. Tente reformular.';

    // Persistir memória extraída
    const newFacts = extractFacts(message);
    if (newFacts.length > 0) {
      const updatedFacts = [...memoryFacts, ...newFacts.map((f) => ({ fact: f, date: new Date().toISOString() }))];
      if (memoryRow) {
        await db.from('agent_memories').update({ facts: updatedFacts }).eq('id', memoryRow.id);
      } else {
        await db.from('agent_memories').insert({
          agent_id, user_id: user.id, facts: updatedFacts, created_by_id: user.id
        });
      }
    }

    // Salvar conversa
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

    return json({ reply: assistantMessage, conversation_id: conversation?.id, used_tools: usedTools });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});