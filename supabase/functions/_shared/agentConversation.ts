export async function loadAgentThread(db: any, agentId: string, userId: string) {
  const { data, error } = await db.rpc('ensure_agent_thread', { p_agent_id: agentId, p_user_id: userId });
  if (error || !data?.[0]) throw new Error('Não foi possível carregar a conversa.');
  return data[0];
}

export async function appendAgentMessages(db: any, conversationId: string, userId: string, messages: any[], pendingAction: any) {
  const { error } = await db.rpc('append_agent_messages', {
    p_conversation_id: conversationId, p_user_id: userId, p_messages: messages, p_pending_action: pendingAction
  });
  if (error) throw new Error('Não foi possível salvar a conversa. Tente novamente.');
}