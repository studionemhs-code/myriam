// [SUPABASE] Autenticação: Supabase Auth + tabela `profiles`.
import { supabase } from './client';

// Mensagens do Supabase traduzidas para o usuário final.
const MESSAGES = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
  'User already registered': 'Este e-mail já está cadastrado. Faça login.',
  'Token has expired or is invalid': 'Código inválido ou expirado.',
  'Password should be at least 6 characters': 'A senha deve ter ao menos 6 caracteres.',
  'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
};

const authError = (message, status = 401) => {
  const e = new Error(MESSAGES[message] || message);
  e.status = status;
  return e;
};

// getSession() lê a sessão local (já renovada automaticamente), evitando
// derrubar o usuário por uma falha momentânea de rede.
async function sessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// Garante que existe uma linha em `profiles` para o usuário autenticado.
async function ensureProfile(authUser) {
  const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || ''
    })
    .select()
    .single();
  if (error) throw authError(error.message, 400);
  return created;
}

// O app compara `user.id` com created_by_id/participants — que guardam o ID
// histórico dos dados migrados. Por isso expomos legacy_id como `id`.
const toAppUser = (profile, authUser) => ({
  ...profile,
  id: profile.legacy_id || profile.id,
  profile_id: profile.id,
  auth_id: authUser.id,
  email: profile.email || authUser.email
});

export const supabaseAuth = {
  async me() {
    const user = await sessionUser();
    if (!user) throw authError('Not authenticated');
    const profile = await ensureProfile(user);
    return toAppUser(profile, user);
  },

  async updateMe(data) {
    const user = await sessionUser();
    if (!user) throw authError('Not authenticated');
    const { id, profile_id, auth_id, legacy_id, email, created_date, ...rest } = data;
    const { data: updated, error } = await supabase
      .from('profiles').update(rest).eq('id', user.id).select().single();
    if (error) throw authError(error.message, 400);
    return toAppUser(updated, user);
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw authError(error.message, 400);
    return { access_token: data.session?.access_token };
  },

  async register({ email, password, full_name } = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: full_name ? { full_name } : undefined }
    });
    if (error) throw authError(error.message, 400);
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw authError(error.message, 400);
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw authError(error.message, 400);
    return { success: true };
  },

  async resetPasswordRequest(email) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { success: true };
  },

  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw authError(error.message, 400);
    // Encerra a sessão temporária do link para o usuário entrar com a nova senha.
    await supabase.auth.signOut();
    return { success: true };
  },

  async loginWithProvider(provider, fromUrl) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${fromUrl && fromUrl.startsWith('/') ? fromUrl : '/'}` }
    });
    if (error) throw authError(error.message, 400);
  },

  // Compatibilidade: a sessão do Supabase já é persistida automaticamente.
  setToken() {},

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
    else window.location.reload();
  },

  redirectToLogin(nextUrl) {
    const next = nextUrl || window.location.pathname + window.location.search;
    window.location.href = `/login?returnTo=${encodeURIComponent(next)}`;
  },

  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(session, event));
    return () => data.subscription.unsubscribe();
  }
};