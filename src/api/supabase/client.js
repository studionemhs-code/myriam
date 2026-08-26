// [SUPABASE] Cliente único do Supabase — substitui o antigo SDK do Base44.
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://strrnkxrpyjyaewfpiwh.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cnJua3hycHlqeWFld2ZwaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MjMwNTQsImV4cCI6MjEwMzE5OTA1NH0.vh38E06bwOog6BMwpaIam8CcMdYW_k7am6Egh24mtm4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});