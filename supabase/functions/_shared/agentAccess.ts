import { admin } from './utils.ts';

export async function accessibleAgent(agentId: unknown, user: any) {
  if (typeof agentId !== 'string' || !agentId) throw new Error('Agente inválido.');
  const { data, error } = await admin().from('ai_agents').select('*').eq('id', agentId).maybeSingle();
  if (error) throw new Error('Não foi possível carregar o agente.');
  if (!data?.is_active || (data.admin_only && user.role !== 'admin')) throw new Error('Agente não disponível.');
  return data;
}

export const agentKey = (agent?: any) => {
  const key = agent?.openai_api_key?.trim() || Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!key) throw new Error('Nenhuma chave de IA configurada.');
  return key;
};

export async function requestAgentOpenAI(path: string, body: any, key: string) {
  const form = body instanceof FormData;
  const send = (credential: string) => fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${credential}`, ...(form ? {} : { 'Content-Type': 'application/json' }) },
    body: form ? body : JSON.stringify(body)
  });
  let response = await send(key);
  const fallback = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (response.status === 401 && fallback && fallback !== key) { await response.body?.cancel(); response = await send(fallback); }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const message = response.status === 401 ? 'A credencial de IA não foi aceita. Peça ao administrador para atualizar a chave do agente.'
      : String(detail.error?.message || 'Não foi possível processar a solicitação de IA.').replace(/sk-[^\s"'<>]+/g, '[chave protegida]');
    const error = new Error(message); Object.assign(error, { status: response.status }); throw error;
  }
  return response;
}