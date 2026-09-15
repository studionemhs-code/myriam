import { supabase } from '@/api/supabase/client';
import { base44Source } from '@/api/base44SourceClient';

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