import { json, preflight, currentUser, admin } from '../_shared/utils.ts';

// ============================================================================
// FERRAMENTAS GERAIS
// ============================================================================

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
    return 'Erro: não foi possível calcular';
  }
}

async function webSearch(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TheotokosAgent/1.0' } });
    const data = await res.json();
    const parts: string[] = [];
    if (data.AbstractText) parts.push(data.AbstractText);
    if (data.AbstractURL) parts.push(`Fonte: ${data.AbstractURL}`);
    if (data.RelatedTopics?.length > 0) {
      const topics = data.RelatedTopics.filter((t: any) => t.Text).slice(0, 5).map((t: any) => `- ${t.Text}`);
      parts.push(...topics);
    }
    return parts.length > 0 ? parts.join('\n') : 'Nenhum resultado encontrado.';
  } catch {
    return 'Erro ao realizar a pesquisa.';
  }
}

async function systemQuery(query: string, db: any): Promise<string> {
  const q = query.toLowerCase();
  const count = async (table: string, filter?: Record<string, unknown>) => {
    let req = db.from(table).select('*', { count: 'exact', head: true });
    if (filter) for (const [k, v] of Object.entries(filter)) req = req.eq(k, v);
    const { count: c } = await req;
    return c ?? 0;
  };
  if (q.includes('jornada') && q.includes('ativa')) return `Jornadas ativas: ${await count('collective_journeys', { status: 'ativa' })}`;
  if (q.includes('consagrad')) return `Consagrados: ${await count('profiles', { status: 'consagrado' })}`;
  if (q.includes('preparac')) return `Em preparação: ${await count('profiles', { status: 'preparacao' })}`;
  if (q.includes('interessad')) return `Interessados: ${await count('profiles', { status: 'interessado' })}`;
  if (q.includes('intenç') || q.includes('oraç')) return `Intenções ativas: ${await count('prayer_intentions', { status: 'ativo' })}`;
  if (q.includes('membro') || q.includes('cadastro') || q.includes('usuário')) return `Total de membros: ${await count('profiles')}`;
  if (q.includes('acamf') || q.includes('conteúdo')) return `Conteúdos publicados: ${await count('acamf_contents', { status: 'publicado' })}`;
  return 'Consulta não reconhecida. Pode perguntar sobre: total de membros, consagrados, em preparação, intenções, jornadas ativas, conteúdos ACAMF.';
}

// ============================================================================
// FERRAMENTAS DE INTEGRAÇÃO COM O SISTEMA (COPILOTO ESPIRITUAL)
// ============================================================================

async function getPreparationDay(dayNumber: number | null, db: any, userId: string): Promise<string> {
  if (!dayNumber) {
    const { data: progress } = await db.from('user_progress')
      .select('current_day').eq('created_by_id', userId).order('created_date', { ascending: false }).limit(1).maybeSingle();
    dayNumber = progress?.current_day || 1;
  }
  const { data: day } = await db.from('preparation_days')
    .select('*').eq('day_number', dayNumber).eq('is_published', true).maybeSingle();
  if (!day) return `Dia ${dayNumber} não encontrado ou não publicado.`;
  const parts = [`DIA ${day.day_number} — ${day.title}`];
  if (day.description) parts.push(`Tema: ${day.description}`);
  if (day.prayer) parts.push(`Oração do dia: ${day.prayer}`);
  if (day.practice) parts.push(`Prática espiritual: ${day.practice}`);
  if (day.reflection_prompt) parts.push(`Pergunta para reflexão: ${day.reflection_prompt}`);
  if (day.text) parts.push(`Conteúdo: ${day.text.substring(0, 600)}${day.text.length > 600 ? '...' : ''}`);
  return parts.join('\n');
}

async function listAcamfContent(category: string | null, limit: number, db: any): Promise<string> {
  let query = db.from('acamf_contents').select('title,description,category_id,content_type').eq('status', 'publicado').order('created_date', { ascending: false }).limit(limit || 6);
  if (category) query = query.eq('category_id', category);
  const { data: contents } = await query;
  if (!contents?.length) return 'Nenhum conteúdo ACAMF encontrado.';
  const { data: cats } = await db.from('acamf_categories').select('id,name');
  const catMap: Record<string, string> = {};
  (cats || []).forEach((c: any) => { catMap[c.id] = c.name; });
  return contents.map((c: any) =>
    `- ${c.title} (${catMap[c.category_id] || 'Sem categoria'} · ${c.content_type})${c.description ? ': ' + c.description.substring(0, 120) : ''}`
  ).join('\n');
}

async function listPrayers(category: string | null, db: any): Promise<string> {
  let query = db.from('prayers').select('title,category_id').eq('is_published', true).order('sort_order', { ascending: true }).limit(12);
  if (category) query = query.eq('category_id', category);
  const { data: prayers } = await query;
  if (!prayers?.length) return 'Nenhuma oração encontrada.';
  const { data: cats } = await db.from('prayer_categories').select('id,name');
  const catMap: Record<string, string> = {};
  (cats || []).forEach((c: any) => { catMap[c.id] = c.name; });
  return prayers.map((p: any) => `- ${p.title} (${catMap[p.category_id] || 'Sem categoria'})`).join('\n');
}

async function getActiveJourneys(db: any, userId: string): Promise<string> {
  const { data: journeys } = await db.from('collective_journeys')
    .select('id,title,description,journey_type,start_date,end_date').eq('status', 'ativa').order('created_date', { ascending: false });
  if (!journeys?.length) return 'Nenhuma jornada coletiva ativa no momento.';
  const { data: parts } = await db.from('journey_participants').select('journey_id,progress,completed_steps').eq('created_by_id', userId);
  const inJourney = new Set((parts || []).map((p: any) => p.journey_id));
  return journeys.map((j: any) => {
    const participating = inJourney.has(j.id);
    const myPart = (parts || []).find((p: any) => p.journey_id === j.id);
    const progress = myPart ? ` — progresso: ${myPart.progress || 0}%` : '';
    return `- ${j.title}${participating ? ' (você participa' + progress + ')' : ''}: ${(j.description || '').substring(0, 120)}`;
  }).join('\n');
}

// ============================================================================
// DEFINIÇÕES DAS FERRAMENTAS (OpenAI function calling)
// ============================================================================

const TOOL_DEFS = [
  { type: 'function', function: {
    name: 'calculator',
    description: 'Realiza cálculos matemáticos. Use quando o usuário solicitar operações matemáticas.',
    parameters: { type: 'object', properties: { expression: { type: 'string', description: 'Expressão matemática, ex: 2+2, 15*3, 100*0.1' } }, required: ['expression'] }
  }},
  { type: 'function', function: {
    name: 'web_search',
    description: 'Pesquisa informações na internet usando DuckDuckGo. Use para buscar informações atuais ou fatos.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Termo de busca' } }, required: ['query'] }
  }},
  { type: 'function', function: {
    name: 'system_query',
    description: 'Consulta estatísticas gerais do sistema Theotokos: total de membros, consagrados, intenções, etc.',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'O que deseja saber' } }, required: ['query'] }
  }},
  { type: 'function', function: {
    name: 'get_preparation_day',
    description: 'Busca o conteúdo de um dia da caminhada de preparação (33 dias): tema, oração, prática espiritual e reflexão. Se não informar o dia, usa o dia atual do usuário. Use para lembrar o usuário dos exercícios do dia ou descrever o conteúdo.',
    parameters: { type: 'object', properties: { day_number: { type: 'integer', description: 'Número do dia (1-33). Omitir para usar o dia atual do usuário.' } }, required: [] }
  }},
  { type: 'function', function: {
    name: 'list_acamf_content',
    description: 'Lista conteúdos ACAMF publicados (artigos, vídeos, áudios, PDFs). Use para recomendar conteúdo ao usuário quando perguntar ou quando for relevante para a conversa.',
    parameters: { type: 'object', properties: { category: { type: 'string', description: 'ID da categoria (opcional)' }, limit: { type: 'integer', description: 'Quantidade máxima (padrão 6)' } }, required: [] }
  }},
  { type: 'function', function: {
    name: 'list_prayers',
    description: 'Lista orações disponíveis no app, opcionalmente filtradas por categoria. Use para sugerir orações ao usuário.',
    parameters: { type: 'object', properties: { category: { type: 'string', description: 'ID da categoria (opcional)' } }, required: [] }
  }},
  { type: 'function', function: {
    name: 'get_active_journeys',
    description: 'Lista jornadas coletivas ativas e indica se o usuário participa de alguma. Use para convidar o usuário a participar ou acompanhar seu progresso.',
    parameters: { type: 'object', properties: {}, required: [] }
  }}
];

// ============================================================================
// MEMÓRIA
// ============================================================================
function extractFacts(message: string): string[] {
  const facts: string[] = [];
  const nameMatch = message.match(/(?:meu nome é|me chamo|eu sou o|eu sou a)\s+([A-Za-zÀ-ÿ]{2,})/i);
  if (nameMatch) facts.push(`O usuário se chama ${nameMatch[1]}`);
  const lower = message.toLowerCase();
  if (lower.includes('já me consagrei') || lower.includes('sou consagrad')) facts.push('O usuário já é consagrado');
  if (lower.includes('estou em preparação') || lower.includes('estou me preparando')) facts.push('O usuário está em preparação');
  if (lower.match(/minha consagração.*\d{1,2}\/\d{1,2}/)) facts.push('O usuário mencionou uma data de consagração');
  return facts;
}

// ============================================================================
// HANDLER
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
    if (!apiKey) return json({ error: 'Nenhuma chave API configurada.' }, 500);

    const enabledTools = (agent.tools_enabled || []) as string[];
    const activeTools = TOOL_DEFS.filter((t) => enabledTools.includes(t.function.name));

    // Histórico
    let conversation: any = null;
    let history: { role: string; content: string }[] = [];
    if (conversation_id) {
      const { data } = await db.from('agent_conversations').select('*').eq('id', conversation_id).maybeSingle();
      conversation = data;
      history = ((data?.messages || []) as any[]).filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
    }

    // Memória
    const { data: memoryRow } = await db.from('agent_memories').select('*').eq('agent_id', agent_id).eq('user_id', user.id).maybeSingle();
    const memoryFacts: any[] = memoryRow?.facts || [];

    // === CONTEXTO DO USUÁRIO (injetado no prompt) ===
    const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const { data: progress } = await db.from('user_progress').select('current_day,completed_days,status').eq('created_by_id', user.id).order('created_date', { ascending: false }).limit(1).maybeSingle();
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 86400000);
    const { data: events } = await db.from('marian_calendar_events').select('title,event_date,type').gte('event_date', today.toISOString().slice(0, 10)).lte('event_date', future.toISOString().slice(0, 10)).order('event_date', { ascending: true }).limit(5);

    const statusLabels: Record<string, string> = { interessado: 'Interessado', preparacao: 'Em Preparação', consagrado: 'Consagrado', usuario_escolhe: 'A definir' };
    let userContext = '\n\n--- CONTEXTO DO USUÁRIO ---\n';
    userContext += `Nome: ${profile?.full_name || profile?.display_name || 'Não informado'}\n`;
    userContext += `Status espiritual: ${statusLabels[profile?.status] || 'Interessado'}\n`;
    if (profile?.consecration_date) userContext += `Data de consagração: ${profile.consecration_date}\n`;
    if (progress && profile?.status === 'preparacao') {
      userContext += `Dia atual da preparação: ${progress.current_day || 1} de 33\n`;
      userContext += `Dias concluídos: ${(progress.completed_days || []).length}\n`;
    }
    if (events?.length) {
      userContext += `Próximos eventos marianos:\n`;
      events.forEach((e: any) => { userContext += `- ${e.event_date}: ${e.title} (${e.type})\n`; });
    }
    userContext += '\nVocê é um copiloto espiritual ativo. Use este contexto para personalizar respostas. Quando oportuno, incentive o usuário a fazer os exercícios do dia atual, participar de orações e continuar sua jornada.';

    // System prompt
    let systemPrompt = agent.instructions || 'Você é um assistente espiritual útil.';
    if (agent.knowledge_content) systemPrompt += '\n\n--- CONHECIMENTO ---\n' + agent.knowledge_content;
    if (memoryFacts.length > 0) {
      systemPrompt += '\n\n--- O QUE VOCÊ LEMBRA DO USUÁRIO ---\n' + memoryFacts.map((f) => `- ${f.fact}`).join('\n');
    }
    systemPrompt += userContext;
    if (agent.reasoning_enabled) systemPrompt += '\n\nMODO RACIOCÍNIO: Pense passo a passo antes de responder.';

    const model = agent.reasoning_enabled ? 'gpt-4o' : (agent.model || 'gpt-4o-mini');

    // Loop de tool-use
    const messages: any[] = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }];
    let assistantMessage = '';
    let usedTools = false;

    for (let iter = 0; iter < 6; iter++) {
      const body: any = { model, temperature: agent.temperature ?? 0.7, messages };
      if (activeTools.length > 0) { body.tools = activeTools; body.tool_choice = 'auto'; }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const completion = await res.json();
      if (!res.ok) return json({ error: completion.error?.message || 'Erro na OpenAI' }, 500);

      const msg = completion.choices[0].message;
      if (msg.tool_calls?.length > 0) {
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
            else if (tc.function.name === 'get_preparation_day') result = await getPreparationDay(args.day_number ?? null, db, user.id);
            else if (tc.function.name === 'list_acamf_content') result = await listAcamfContent(args.category ?? null, args.limit ?? 6, db);
            else if (tc.function.name === 'list_prayers') result = await listPrayers(args.category ?? null, db);
            else if (tc.function.name === 'get_active_journeys') result = await getActiveJourneys(db, user.id);
            else result = 'Ferramenta desconhecida.';
          } catch (e) { result = `Erro: ${(e as Error).message}`; }
          messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
        continue;
      } else {
        assistantMessage = msg.content || '';
        break;
      }
    }

    if (!assistantMessage) assistantMessage = 'Não consegui processar sua solicitação agora. Tente reformular.';

    // Persistir memória
    const newFacts = extractFacts(message);
    if (newFacts.length > 0) {
      const updatedFacts = [...memoryFacts, ...newFacts.map((f) => ({ fact: f, date: new Date().toISOString() }))];
      if (memoryRow) {
        await db.from('agent_memories').update({ facts: updatedFacts }).eq('id', memoryRow.id);
      } else {
        await db.from('agent_memories').insert({ agent_id, user_id: user.id, facts: updatedFacts, created_by_id: user.id });
      }
    }

    // Salvar conversa
    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: message, timestamp: now };
    const assistantMsg = { role: 'assistant', content: assistantMessage, timestamp: now };
    if (conversation) {
      await db.from('agent_conversations').update({ messages: [...(conversation.messages || []), userMsg, assistantMsg] }).eq('id', conversation.id);
    } else {
      const { data: created } = await db.from('agent_conversations').insert({
        agent_id, agent_name: agent.name, title: message.substring(0, 50), messages: [userMsg, assistantMsg], created_by_id: user.id
      }).select().single();
      conversation = created;
    }

    return json({ reply: assistantMessage, conversation_id: conversation?.id, used_tools: usedTools });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});