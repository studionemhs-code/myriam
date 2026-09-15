import { json, preflight, currentUser, admin } from '../_shared/utils.ts';
import { accessibleAgent, agentKey, requestAgentOpenAI } from '../_shared/agentAccess.ts';
import { loadAgentThread, appendAgentMessages } from '../_shared/agentConversation.ts';

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
// FERRAMENTAS DO MODO ARQUITETO (admin only — CRUD total no sistema)
// ============================================================================

async function architectCrud(
  table: string, operation: string, data: any, filter: any, id: string, db: any
): Promise<string> {
  if (!/^[a-z][a-z0-9_]*$/.test(table || '')) return 'Nome de tabela inválido.';
  try {
    if (operation === 'list') {
      const orderColumn = table === 'architect_audit_log' ? 'created_at' : 'created_date';
      let query = db.from(table).select('*').order(orderColumn, { ascending: false }).limit(30);
      if (filter && typeof filter === 'object') {
        for (const [k, v] of Object.entries(filter)) {
          query = query.eq(k, v);
        }
      }
      const { data: rows, error } = await query;
      if (error) return `Erro: ${error.message}`;
      return `${rows?.length || 0} registro(s) encontrado(s):\n${JSON.stringify(rows || [], null, 2)}`;
    }
    if (operation === 'create') {
      if (!data || typeof data !== 'object') return 'Erro: data é obrigatório para create';
      const { data: row, error } = await db.from(table).insert(data).select().single();
      if (error) return `Erro ao criar: ${error.message}`;
      return `Registro criado com sucesso:\n${JSON.stringify(row, null, 2)}`;
    }
    if (operation === 'update') {
      if (!id) return 'Erro: id é obrigatório para update';
      if (!data || typeof data !== 'object') return 'Erro: data é obrigatório para update';
      const { data: row, error } = await db.from(table).update(data).eq('id', id).select().single();
      if (error) return `Erro ao atualizar: ${error.message}`;
      return `Registro atualizado:\n${JSON.stringify(row, null, 2)}`;
    }
    if (operation === 'delete') {
      if (!id) return 'Erro: id é obrigatório para delete';
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) return `Erro ao excluir: ${error.message}`;
      return `Registro ${id} excluído com sucesso da tabela ${table}.`;
    }
    return `Operação '${operation}' inválida. Use: list, create, update ou delete.`;
  } catch (e) {
    return `Erro: ${(e as Error).message}`;
  }
}

async function architectInviteUser(
  email: string, role: string, displayName: string, db: any
): Promise<string> {
  try {
    const safeRole = role === 'admin' ? 'admin' : 'user';
    const { data: inviteData, error } = await db.auth.admin.inviteUserByEmail(email, {
      data: { role: safeRole, display_name: displayName || '' }
    });
    if (error) return `Erro ao convidar: ${error.message}`;
    const invitedUser = inviteData?.user;
    if (!invitedUser?.id) return 'Erro ao convidar: usuário não retornado pelo serviço de autenticação.';
    const { error: authRoleError } = await db.auth.admin.updateUserById(invitedUser.id, {
      app_metadata: { role: safeRole }, user_metadata: { role: safeRole, display_name: displayName || '' }
    });
    if (authRoleError) return `Erro ao aplicar papel no acesso: ${authRoleError.message}`;
    const { error: profileError } = await db.from('profiles').upsert({
      id: invitedUser.id, email, role: safeRole, display_name: displayName || null, full_name: displayName || null
    }, { onConflict: 'id' });
    if (profileError) return `Erro ao aplicar papel no perfil: ${profileError.message}`;
    return `Convite enviado para ${email} com papel '${safeRole}'. ID: ${invitedUser.id}.`;
  } catch (e) {
    return `Erro: ${(e as Error).message}`;
  }
}

async function architectBroadcastNotification(
  category: string, title: string, body: string, link: string, target: any, db: any
): Promise<string> {
  try {
    let profiles: any[] = [];
    if (target === 'all') {
      const { data: users, error } = await db.from('profiles').select('id,notification_prefs');
      if (error) return `Erro ao buscar destinatários: ${error.message}`;
      profiles = users || [];
    } else {
      const requestedIds = Array.isArray(target) ? target.map(String) : [String(target)];
      const { data: users, error } = await db.from('profiles').select('id,notification_prefs').in('id', requestedIds);
      if (error) return `Erro ao buscar destinatários: ${error.message}`;
      profiles = users || [];
    }
    if (!profiles.length) return 'Nenhum usuário encontrado para enviar a notificação.';
    const allowedProfiles = profiles.filter((profile: any) => profile.notification_prefs?.[category] !== false);
    const skipped = profiles.length - allowedProfiles.length;
    if (!allowedProfiles.length) return `Nenhuma notificação enviada: ${skipped} usuário(s) desativaram esta categoria.`;
    const notifications = allowedProfiles.map((profile: any) => ({
      user_id: profile.id, category, title, body: body || null, link: link || null, read: false
    }));
    const { error } = await db.from('notifications').insert(notifications);
    if (error) return `Erro ao enviar: ${error.message}`;
    return `Notificação '${title}' enviada para ${allowedProfiles.length} usuário(s). ${skipped} ignorado(s) por preferência.`;
  } catch (e) {
    return `Erro: ${(e as Error).message}`;
  }
}

type ArchitectAction = {
  tool: 'architect_crud' | 'architect_invite_user' | 'architect_broadcast_notification' | 'architect_github';
  args: Record<string, any>;
  summary: string;
  requested_at: string;
  confirmed_at?: string;
};

const normalizeReply = (value: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const isArchitectConfirmation = (value: string) => /^(sim\b|confirmo\b|confirmado\b|autorizo\b|autorizado\b|ok\b|pode\s+(criar|alterar|atualizar|editar|excluir|deletar|convidar|enviar|fazer|executar|prosseguir)\b|prossiga\b|execute\b)/.test(normalizeReply(value));
const isArchitectCancellation = (value: string) => /^(nao\b|cancelar\b|cancele\b|cancela\b|desistir\b|deixa pra la\b|deixe para la\b)/.test(normalizeReply(value));

function describeArchitectAction(tool: string, args: any): string {
  if (tool === 'architect_crud') return `${args.operation} em ${args.table}${args.id ? ` (ID ${args.id})` : ''} com ${JSON.stringify(args.data || args.filter || {})}`;
  if (tool === 'architect_invite_user') return `convidar ${args.email} com papel ${args.role || 'user'}`;
  if (tool === 'architect_github') return `${args.operation} no código-fonte de studionemhs-code/myriam: ${args.request}`;
  return `enviar notificação "${args.title}" para ${Array.isArray(args.target) ? args.target.length + ' usuários' : args.target}`;
}

async function executeArchitectAction(action: ArchitectAction, db: any): Promise<string> {
  const args = action.args || {};
  if (action.tool === 'architect_crud') return architectCrud(args.table, args.operation, args.data, args.filter, args.id, db);
  if (action.tool === 'architect_invite_user') return architectInviteUser(args.email, args.role, args.display_name, db);
  return architectBroadcastNotification(args.category, args.title, args.body, args.link, args.target, db);
}

function resultRecordId(action: ArchitectAction, result: string): string | null {
  if (action.args?.id) return String(action.args.id);
  const invitedId = result.match(/ID:\s*([0-9a-f-]{36})/i)?.[1];
  if (invitedId) return invitedId;
  if (action.tool === 'architect_crud' && action.args?.operation === 'create') {
    try { return String(JSON.parse(result.slice(result.indexOf('{')))?.id || '') || null; } catch { return null; }
  }
  return null;
}

async function auditArchitectAction(action: ArchitectAction, result: string, user: any, agentId: string, conversationId: string | null, db: any) {
  const failed = /^Erro/i.test(result);
  const { error } = await db.from('architect_audit_log').insert({
    admin_id: user.id, agent_id: agentId, conversation_id: conversationId,
    table_name: action.tool === 'architect_crud' ? action.args.table : action.tool === 'architect_invite_user' ? 'auth.users/profiles' : 'notifications',
    operation: action.tool === 'architect_crud' ? action.args.operation : action.tool === 'architect_invite_user' ? 'invite' : 'broadcast',
    record_id: resultRecordId(action, result), action_summary: action.summary,
    result_status: failed ? 'error' : 'success', result_detail: result
  });
  if (error) throw new Error(`Falha ao registrar auditoria: ${error.message}`);
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
// FERRAMENTAS DO MODO ARQUITETO (adicionadas dinamicamente para admins)
// ============================================================================

const ARCHITECT_TOOL_DEFS = [
  { type: 'function', function: {
    name: 'architect_github',
    description: 'MODO ARQUITETO: prepara sugestões, edições ou exclusões no código-fonte do repositório studionemhs-code/myriam. Edições e exclusões são aplicadas somente em uma nova branch e entregues como pull request para revisão. Nunca altera diretamente a branch principal.',
    parameters: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['edit', 'delete', 'suggest'], description: 'Tipo de trabalho no código-fonte' },
        request: { type: 'string', description: 'Descrição completa e específica do que deve ser analisado ou alterado' }
      },
      required: ['operation', 'request']
    }
  }},
  { type: 'function', function: {
    name: 'architect_crud',
    description: 'MODO ARQUITETO: cria, lista, atualiza ou exclui registros em qualquer tabela do sistema. Use para gerenciar conteúdos da caminhada (preparation_days), orações (prayers), notificações (notifications), conteúdos ACAMF (acamf_contents), jornadas (collective_journeys), configurações, etc. Operação "list" retorna registros; "create" insere; "update" altera (precisa id); "delete" remove (precisa id).',
    parameters: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Nome da tabela (ex: preparation_days, prayers, notifications, acamf_contents, collective_journeys, marian_calendar_events)' },
        operation: { type: 'string', enum: ['list', 'create', 'update', 'delete'], description: 'Operação a realizar' },
        data: { type: 'object', description: 'Campos do registro para create/update (ex: {title: "Dia 1", day_number: 1, text: "..."})' },
        filter: { type: 'object', description: 'Filtros para list (opcional). Ex: {status: "ativa"}' },
        id: { type: 'string', description: 'ID do registro para update/delete' }
      },
      required: ['table', 'operation']
    }
  }},
  { type: 'function', function: {
    name: 'architect_invite_user',
    description: 'MODO ARQUITETO: convida um novo usuário para o sistema por e-mail. O usuário receberá um convite para definir sua senha.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'E-mail do novo usuário' },
        role: { type: 'string', enum: ['admin', 'user'], description: 'Papel do usuário (padrão: user)' },
        display_name: { type: 'string', description: 'Nome de exibição (opcional)' }
      },
      required: ['email']
    }
  }},
  { type: 'function', function: {
    name: 'architect_broadcast_notification',
    description: 'MODO ARQUITETO: envia uma notificação/novidade para usuários. Pode enviar para todos ("all") ou para usuários específicos (ID ou array de IDs).',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['caminho', 'renovacao', 'myriam', 'intencoes', 'acamf', 'jornadas', 'novidades', 'associacao', 'assistente_ia'], description: 'Categoria da notificação' },
        title: { type: 'string', description: 'Título da notificação' },
        body: { type: 'string', description: 'Corpo da mensagem (opcional)' },
        link: { type: 'string', description: 'Link interno (ex: /caminho) (opcional)' },
        target: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], description: '"all" para todos, um ID de usuário ou uma lista de IDs' }
      },
      required: ['category', 'title', 'target']
    }
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

    const payload = await req.json();
    const { agent_id, conversation_id, file_context, attachment, approve_pending_action = false, reject_pending_action = false, revise_pending_action = null } = payload;
    const message = String(payload.message || '').trim();
    if (!agent_id || (!message && !approve_pending_action && !reject_pending_action)) return json({ error: 'agent_id e message são obrigatórios' }, 400);

    const db = admin();
    const agent = await accessibleAgent(agent_id, user);
    const apiKey = agentKey(agent);

    const enabledTools = (agent.tools_enabled || []) as string[];
    let activeTools = TOOL_DEFS.filter((t) => enabledTools.includes(t.function.name));

    // Modo Arquiteto: ferramentas de CRUD total — apenas para contas admin
    const isArchitect = agent.architect_mode_enabled && user.role === 'admin';
    if (isArchitect) activeTools = [...activeTools, ...ARCHITECT_TOOL_DEFS];

    // Resolve o mesmo histórico em todos os dispositivos, sem confiar em IDs locais antigos.
    const conversation = await loadAgentThread(db, agent_id, user.id);
    const history = (conversation.messages || []).filter((m: any) => m.role !== 'system' && typeof m.content === 'string').map((m: any) => ({ role: m.role, content: m.content }));

    let pendingAction: ArchitectAction | null = isArchitect ? conversation?.pending_action || null : null;
    let pendingRevisionContext = '';
    if (pendingAction && revise_pending_action && message) {
      const modeLabel = revise_pending_action === 'edit' ? 'texto editado da proposta' : 'contraproposta do administrador';
      pendingRevisionContext = `\n\n--- REVISÃO DA PROPOSTA PENDENTE ---\nProposta anterior: ${pendingAction.summary}\n${modeLabel}: ${message}\nSubstitua a proposta anterior por uma nova ação pendente que reflita exatamente esta revisão.`;
      pendingAction = null;
    }
    if (pendingAction && approve_pending_action === true) {
      if (pendingAction.tool === 'architect_github') {
        const now = new Date().toISOString();
        const reply = 'Confirmação recebida. Estou preparando a análise do código e o pull request para revisão.';
        const confirmedAction = { ...pendingAction, confirmed_at: now };
        await appendAgentMessages(db, conversation.id, user.id, [
          { id: crypto.randomUUID(), role: 'user', content: message, timestamp: now },
          { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: now }
        ], confirmedAction);
        return json({ reply, conversation_id: conversation.id, agent_id, github_action: true, used_tools: true });
      }
      const result = await executeArchitectAction(pendingAction, db);
      await auditArchitectAction(pendingAction, result, user, agent_id, conversation.id, db);
      const now = new Date().toISOString();
      const reply = /^Erro/i.test(result) ? `A ação autorizada falhou. ${result}` : `Ação autorizada e concluída. ${result}`;
      await appendAgentMessages(db, conversation.id, user.id, [
        { id: crypto.randomUUID(), role: 'user', content: message, timestamp: now },
        { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: now }
      ], null);
      return json({ reply, conversation_id: conversation.id, used_tools: true });
    }
    if (pendingAction && (reject_pending_action === true || isArchitectCancellation(message))) {
      const now = new Date().toISOString();
      const reply = `Proposta recusada: ${pendingAction.summary}. Nenhuma alteração foi realizada.`;
      await appendAgentMessages(db, conversation.id, user.id, [
        { id: crypto.randomUUID(), role: 'user', content: message, timestamp: now },
        { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: now }
      ], null);
      return json({ reply, conversation_id: conversation.id, used_tools: false });
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
    if (agent.reasoning_enabled) systemPrompt += '\n\nMODO RACIOCÍNIO: Analise cuidadosamente antes de responder.';
    if (file_context) systemPrompt += `\n\n--- ARQUIVO ANEXADO PELO USUÁRIO ---\n${String(file_context).slice(0, 100000)}`;

    if (isArchitect) {
      systemPrompt += pendingRevisionContext;
      systemPrompt += '\n\n--- MODO ARQUITETO ATIVO ---\nVocê tem permissões de administrador total. Pode criar, editar, listar e excluir registros em qualquer tabela do sistema usando a ferramenta architect_crud. Tabelas principais: preparation_days (dias da caminhada), prayers (orações), prayer_categories, notifications (notificações/novidades), acamf_contents (conteúdos ACAMF), collective_journeys (jornadas), marian_calendar_events (calendário mariano), courses, journey_contents, certificate_templates, feature_flags, store_settings, webhook_automations, consecration_settings, registration_settings, notification_settings, warranty_settings, association_settings, catalog_products, quote_requests e architect_audit_log (histórico das ações do modo Arquiteto).\n\nVocê também pode convidar usuários (architect_invite_user), enviar notificações/novidades (architect_broadcast_notification) e trabalhar no código-fonte do repositório studionemhs-code/myriam (architect_github). Para código, use suggest para recomendações e edit/delete para mudanças; toda mudança será criada em branch separada e entregue como pull request, nunca diretamente na branch principal.\n\nDiretrizes:\n- Toda ação que altera dados (criar, editar, excluir, convidar ou enviar notificações) exige aprovação pelo botão "Aprovar Mudança". A ferramenta armazenará a ação pendente sem executá-la; descreva exatamente a ação e oriente o admin a tocar no botão. Confirmações digitadas no chat não autorizam a execução. Nunca afirme que ela foi executada antes da aprovação pelo botão.\n- Operações apenas de leitura/listagem podem ser executadas imediatamente, sem confirmação.\n- Ao criar conteúdo, use os campos corretos de cada tabela. Se não souber os campos, faça um "list" primeiro para ver a estrutura.\n- Seja proativo: ajude o admin a gerenciar todo o sistema — criar dias de preparação, orações, notificações, jornadas, conteúdos, etc.\n- Para criar um dia da caminhada: architect_crud com table="preparation_days", operation="create", data={day_number, title, description, phase, text, prayer, practice, gender, is_published}.\n- Para criar uma oração: architect_crud com table="prayers", operation="create", data={title, category_id, content, is_published}.\n- Para enviar novidade: architect_broadcast_notification com category="novidades", title, body, target="all".';
    }

    const modelMap: Record<string, string> = {
      automatic: 'gpt-4o-mini', gpt_5_mini: 'gpt-5-mini', gpt_5_4: 'gpt-5',
      gpt_5_6_sol: 'gpt-5', gpt_5_6_luna: 'gpt-5', 'gpt-4o': 'gpt-4o', 'gpt-4o-mini': 'gpt-4o-mini'
    };
    const model = modelMap[agent.model] || 'gpt-4o-mini';

    // Loop de tool-use
    const messages: any[] = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }];
    let assistantMessage = '';
    let usedTools = false;

    for (let iter = 0; iter < 6; iter++) {
      const body: any = { model, messages };
      if (!model.startsWith('gpt-5')) body.temperature = agent.temperature ?? 0.7;
      if (activeTools.length > 0) { body.tools = activeTools; body.tool_choice = 'auto'; }

      const res = await requestAgentOpenAI('chat/completions', body, apiKey);
      const completion = await res.json();

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
            else if (tc.function.name === 'architect_crud' && args.operation === 'list') result = await architectCrud(args.table, args.operation, args.data, args.filter, args.id, db);
            else if (['architect_crud', 'architect_invite_user', 'architect_broadcast_notification', 'architect_github'].includes(tc.function.name)) {
              if (pendingAction) {
                result = `Já existe uma ação aguardando confirmação: ${pendingAction.summary}. Peça ao admin para confirmar ou cancelar.`;
              } else {
                pendingAction = { tool: tc.function.name as ArchitectAction['tool'], args, summary: describeArchitectAction(tc.function.name, args), requested_at: new Date().toISOString() };
                result = `AÇÃO PENDENTE DE CONSENTIMENTO: ${pendingAction.summary}. Nenhuma alteração foi executada. Oriente o admin a tocar no botão \"Aprovar Mudança\".`;
              }
            }
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
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: message, timestamp: now,
      ...(attachment && agent.files_enabled !== false ? { file_name: String(attachment.file_name || '').slice(0, 255), file_uri: String(attachment.file_uri || '').slice(0, 2048), mime_type: String(attachment.mime_type || '').slice(0, 100) } : {}) };
    const assistantMsg = { id: crypto.randomUUID(), role: 'assistant', content: assistantMessage, timestamp: now };
    await appendAgentMessages(db, conversation.id, user.id, [userMsg, assistantMsg], pendingAction);

    return json({
      reply: assistantMessage,
      assistant_message_id: assistantMsg.id,
      conversation_id: conversation.id,
      used_tools: usedTools,
      pending_action: pendingAction ? { summary: pendingAction.summary, requested_at: pendingAction.requested_at } : null
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});