import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoadingAuth(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }

    try {
      const currentUser = await base44.auth.me();
      // Admins sempre têm acesso; usuários comuns precisam estar aprovados
      if (currentUser.role !== 'admin' && currentUser.is_approved === false) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError({ type: 'pending_approval', message: 'Cadastro aguardando aprovação' });
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return currentUser;
      }
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: error.message });
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return null;
    }
  }, []);

  useEffect(() => {
    checkUserAuth();

    // A renovação automática do token não deve reiniciar o app: só recarregamos
    // o perfil quando a identidade realmente muda (entrar, sair, atualizar).
    const unsubscribe = base44.auth.onAuthStateChange((session, event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      checkUserAuth({ silent: !!session });
    });
    return unsubscribe;
  }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? '/login' : undefined);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname + window.location.search);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};