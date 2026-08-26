// Camada de compatibilidade: mantém a interface `base44` usada em todo o app,
// mas todas as operações rodam no Supabase.
import { supabase } from './supabaseClient';
import { entities } from './entityApi';
import { auth } from './authApi';
import { integrations, invokeFunction } from './integrationsApi';

const functions = {
  invoke: invokeFunction
};

const users = {
  async inviteUser(email, role = 'user') {
    const { data } = await invokeFunction('inviteUser', { email, role });
    return data;
  }
};

const analytics = {
  track() { /* sem provedor de analytics configurado */ }
};

export const base44 = {
  supabase,
  entities,
  auth,
  integrations,
  functions,
  users,
  analytics
};

export default base44;