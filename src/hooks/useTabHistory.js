import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const KEY = 'tab_history';
// Rotas que pertencem a uma aba mesmo sem compartilhar o prefixo.
const ALIASES = { '/chat': '/myriam', '/oracao': '/caminho', '/configuracoes': '/perfil', '/minha-consagracao': '/perfil', '/historico': '/perfil' };

const read = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; }
};

export function tabRootFor(pathname, tabs) {
  if (pathname === '/') return '/';
  const seg = '/' + pathname.split('/')[1];
  const root = ALIASES[seg] || seg;
  return tabs.includes(root) ? root : null;
}

// Lembra a última rota visitada dentro de cada aba inferior, para restaurá-la ao voltar à aba.
export function useTabHistory(tabs) {
  const location = useLocation();
  const currentRoot = tabRootFor(location.pathname, tabs);

  useEffect(() => {
    if (!currentRoot) return;
    const map = read();
    map[currentRoot] = location.pathname + location.search;
    try { sessionStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
  }, [location.pathname, location.search, currentRoot]);

  // Tocar na aba ativa volta à raiz; tocar em outra aba restaura onde o usuário parou.
  const targetFor = useCallback((tab) => {
    if (tab === currentRoot) return tab;
    return read()[tab] || tab;
  }, [currentRoot]);

  return { targetFor, currentRoot };
}