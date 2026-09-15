import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabase/client';
import { base44Source } from '@/api/base44SourceClient';

export async function approveArchitectAction({ agentId, conversationId }) {
  const response = await base44.functions.invoke('chatWithAgent', {
    agent_id: agentId,
    conversation_id: conversationId,
    message: 'Mudança aprovada pelo botão.',
    approve_pending_action: true
  });
  const reply = await completeGithubArchitectAction(response.data);
  return { ...response.data, reply };
}

export async function completeGithubArchitectAction(responseData) {
  if (!responseData?.github_action) return responseData?.reply || '';

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Sessão administrativa não encontrada.');

  const response = await base44Source.functions.invoke('githubArchitect', {
    access_token: accessToken,
    conversation_id: responseData.conversation_id,
    agent_id: responseData.agent_id
  });

  return response.data.reply;
}