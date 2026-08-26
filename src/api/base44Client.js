// ⚠️ ARQUIVO DE COMPATIBILIDADE — não há mais nada do Base44 aqui.
// As páginas antigas importam `base44`, que hoje é apenas um apelido de
// `supabaseApp` (src/api/supabase/index.js). Ao editar uma página, prefira:
//   import { supabaseApp } from '@/api/supabase';
import { supabaseApp } from './supabase';

export const base44 = supabaseApp;
export { supabaseApp };
export default supabaseApp;