// [SUPABASE] Ponto de entrada da camada de dados do app.
// Substitui integralmente o antigo SDK do Base44: entidades, auth, storage,
// integrações e funções agora são Postgres, Supabase Auth, Storage e Edge Functions.
import { supabase } from './client';
import { supabaseEntities } from './entities';
import { supabaseAuth } from './auth';
import { supabaseIntegrations, invokeEdgeFunction } from './storageAndFunctions';

const supabaseFunctions = { invoke: invokeEdgeFunction };

const supabaseUsers = {
  async inviteUser(email, role = 'user') {
    const { data } = await invokeEdgeFunction('inviteUser', { email, role });
    return data;
  }
};

const supabaseAnalytics = {
  track() { /* sem provedor de analytics configurado */ }
};

export const supabaseApp = {
  supabase,
  entities: supabaseEntities,
  auth: supabaseAuth,
  integrations: supabaseIntegrations,
  functions: supabaseFunctions,
  users: supabaseUsers,
  analytics: supabaseAnalytics
};

export { supabase, supabaseEntities, supabaseAuth, supabaseIntegrations, invokeEdgeFunction };
export default supabaseApp;