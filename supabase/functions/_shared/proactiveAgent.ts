import { notifyUser } from './utils.ts';
import { loadAgentThread, appendAgentMessages } from './agentConversation.ts';

const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_PROACTIVE_PER_DAY = 3;

// --- Helpers de data (espelhados de daily-reminders para evitar dependência circular) ---

function computeEaster(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getIndulgenceDays(year: number, inscriptionDate: string | null) {
  const days = [
    { label: 'Anunciação do Senhor', date: new Date(year, 2, 25) },
    { label: 'São Luís Maria Grignion de Montfort', date: new Date(year, 3, 28) },
    { label: 'Imaculada Conceição', date: new Date(year, 11, 8) },
    { label: 'Natal do Senhor', date: new Date(year, 11, 25) }
  ];
  const easter = computeEaster(year);
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  days.push({ label: 'Quinta-feira Santa', date: holyThursday });
  if (inscriptionDate) {
    const insc = new Date(inscriptionDate + 'T00:00:00');
    if (!isNaN(insc.getTime())) {
      days.push({ label: 'Aniversário de Ingresso na Associação', date: new Date(year, insc.getMonth(), insc.getDate()) });
    }
  }
  return days;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// --- Agente flutuante principal ---

export async function getFloatingMainAgent(db: any) {
  const { data } = await db.from('ai_agents')
    .select('id,name,instructions,welcome_message,openai_api_key')
    .eq('is_active', true)
    .eq('is_floating_main', true)
    .maybeSingle();
  return data;
}

// --- Geração da mensagem proativa via LLM ---

async function generateProactiveMessage(apiKey: string, agent: any, profile: any, context: string): Promise<string> {
  const name = profile?.display_name?.trim() || profile?.full_name?.trim() || '';
  const systemPrompt = `Você é ${agent.name || 'o assistente espiritual'}, um copiloto espiritual mariano no app Theotokos (Total Consagração a Jesus por Maria). Você está iniciando uma conversa PROATIVAMENTE com o usuário — um follow-up — para lembrá-lo de algo do seu itinerário espiritual.

Diretrizes:
- Seja acolhedor, conciso (máximo 3 frases), tom mariano e caloroso.
- Use o nome do usuário se disponível.
- Inclua sempre um convite à ação claro (ex.: "Reze o Dia X", "Abra a jornada", "Conheça a indulgência").
- Não soe invasivo; seja como um companheiro que cuida, não como um robô.
- Não use prefixos como "Assistente:" ou "Bot:"; escreva diretamente.
${agent.instructions ? `\nInstruções do agente: ${agent.instructions}` : ''}`;

  const userPrompt = `Nome do usuário: ${name || 'não informado'}\nStatus espiritual: ${profile?.status || 'interessado'}\n\nContexto do follow-up de hoje:\n${context}\n\nEscreva a mensagem proativa agora.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7,
      max_tokens: 250
    })
  });
  if (!res.ok) throw new Error('Falha ao gerar mensagem proativa via LLM');
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

// --- Anti-spam: conta mensagens proativas enviadas hoje ---

export async function countProactiveToday(db: any, userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count } = await db.from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('category', 'agente_proativo')
    .gte('created_date', todayStart.toISOString());
  return count || 0;
}

// --- Envio completo: chat do agente + sino + push (via notificação) ---

export async function sendProactiveAgentMessage(
  db: any, userId: string, context: string,
  notificationTitle: string, notificationBody: string, notificationLink: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: profile } = await db.from('profiles')
      .select('agent_proactive_enabled,notification_prefs,display_name,full_name,status')
      .eq('id', userId).maybeSingle();
    if (!profile) return { ok: false, error: 'Perfil não encontrado' };
    if (profile.agent_proactive_enabled === false) return { ok: false, error: 'opt-out' };
    if (profile.notification_prefs?.agente_proativo === false) return { ok: false, error: 'categoria desativada' };

    // Anti-spam
    const sentToday = await countProactiveToday(db, userId);
    if (sentToday >= MAX_PROACTIVE_PER_DAY) return { ok: false, error: 'limite diário atingido' };

    const agent = await getFloatingMainAgent(db);
    if (!agent) return { ok: false, error: 'Sem agente flutuante configurado' };

    const apiKey = agent.openai_api_key?.trim() || Deno.env.get('OPENAI_API_KEY')?.trim();
    if (!apiKey) return { ok: false, error: 'Sem chave de IA configurada' };

    const message = await generateProactiveMessage(apiKey, agent, profile, context);
    if (!message) return { ok: false, error: 'Mensagem vazia do LLM' };

    // Anexa à conversa do agente flutuante como mensagem assistant
    const conversation = await loadAgentThread(db, agent.id, userId);
    const now = new Date().toISOString();
    await appendAgentMessages(db, conversation.id, userId, [
      { id: crypto.randomUUID(), role: 'assistant', content: message, timestamp: now }
    ], null);

    // Notificação no sino (a notificação no sino já é recebida pelo app mobile e
    // disparada como push nativo quando o build mobile tem push configurado).
    await notifyUser(userId, 'agente_proativo', notificationTitle, notificationBody, notificationLink);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// --- Construção do itinerário espiritual para o resumo matinal ---

export async function buildDailyItinerary(
  db: any, profile: any, progress: any
): Promise<{ context: string; title: string; body: string; link: string } | null> {
  const parts: string[] = [];
  let title = 'Seu resumo espiritual de hoje';
  let body = 'O assistente preparou um resumo do seu itinerário.';
  let link = '/';

  const uid = profile.id;

  // Caminho de preparação
  if (profile.status === 'preparacao' && progress) {
    const currentDay = progress.current_day || 1;
    const completed = (progress.completed_days || []).includes(currentDay);
    if (completed) {
      parts.push(`Caminho: Dia ${currentDay} de 33 já concluído — parabéns!`);
    } else {
      parts.push(`Caminho: Dia ${currentDay} de 33 ainda não concluído. A oração de hoje aguarda.`);
      title = 'Não esqueça sua oração de hoje';
      body = `Você está no Dia ${currentDay} da preparação. Reserve um momento para rezar.`;
      link = '/caminho';
    }
  }

  // Jornadas ativas
  const { data: participations } = await db.from('journey_participants')
    .select('journey_id,progress,completed_steps').eq('created_by_id', uid);
  if (participations?.length) {
    const journeyIds = participations.map((p: any) => p.journey_id);
    const { data: journeys } = await db.from('collective_journeys')
      .select('id,title,status,end_date').in('id', journeyIds).eq('status', 'ativa');
    const now = new Date();
    const active = (journeys || []).filter((j: any) => !j.end_date || new Date(j.end_date) >= now);
    if (active.length) {
      const summary = active.map((j: any) => {
        const part = participations.find((p: any) => p.journey_id === j.id);
        return `"${j.title}" (${part?.progress || 0}%)`;
      }).join(', ');
      parts.push(`Jornadas ativas: ${summary}.`);
      if (!body || body === 'O assistente preparou um resumo do seu itinerário.') {
        title = 'Suas jornadas aguardam';
        body = `Você participa de ${active.length} jornada(s) ativa(s). Continue sua caminhada.`;
        link = '/jornadas';
      }
    }
  }

  // Associação — indulgências
  const { data: approvedReq } = await db.from('association_requests')
    .select('approved_date').eq('user_id', uid).eq('status', 'aprovado').maybeSingle();
  if (approvedReq?.approved_date) {
    const today = new Date();
    const year = today.getFullYear();
    const todayMidnight = new Date(year, today.getMonth(), today.getDate());
    const matching = getIndulgenceDays(year, approvedReq.approved_date).find((d) => isSameDay(d.date, todayMidnight));
    if (matching) {
      parts.push(`Dia de indulgência: ${matching.label}. Como membro da Associação, você pode lucrar a indulgência plenária.`);
      title = `Dia de Indulgência — ${matching.label}`;
      body = `Hoje é ${matching.label}. Como membro da Associação Maria Rainha dos Corações, você pode lucrar a indulgência plenária.`;
      link = '/associacao';
    }
  }

  if (parts.length === 0) return null;
  return { context: parts.join('\n'), title, body, link };
}