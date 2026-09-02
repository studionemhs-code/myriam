import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Home, Flower2, BookOpen, Leaf, User, ShoppingBag, Heart,
  Bell, Calendar, Settings, LogOut, ChevronRight, ChevronLeft, ArrowLeft, Sparkles, Bot, Gift, Menu
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import GlobalSearch from '@/components/GlobalSearch';
import MyriamIcon from '@/components/MyriamIcon';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import FloatingAgentButton from '@/components/ai/FloatingAgentButton';
import NovidadePopup from '@/components/notifications/NovidadePopup';

const STORE_URL = 'https://www.lojatheotokos.com.br';

const navItems = [
  { to: '/', label: 'Hoje', icon: Home },
  { to: '/caminho', label: 'Caminho', icon: Flower2 },
  { to: '/acamf', label: 'ACAMF', icon: BookOpen, feature: 'acamf' },
  { to: '/oracoes', label: 'Orações', icon: Heart },
  { to: '/myriam', label: 'Myriam', icon: MyriamIcon, feature: 'myriam' },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('appbar_collapsed') === 'true');
  const { user, loading: loadingUser } = useCurrentUser();

  useEffect(() => {
    localStorage.setItem('appbar_collapsed', String(collapsed));
  }, [collapsed]);

  // Redireciona novos usuários ao onboarding imediatamente após o login
  useEffect(() => {
    if (!loadingUser && user && !user.onboarding_completed) {
      navigate('/onboarding', { replace: true });
    }
  }, [loadingUser, user, navigate]);

  const { isVisible } = useFeatureFlags();
  const { unreadCount, notifications, markRead } = useNotifications();

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const visibleNav = navItems.filter((item) => item.feature ? isVisible(item.feature) : true);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="relative flex shrink-0 items-center justify-center px-6 py-8">
        <Logo size="lg" variant="dark" subtitle stacked />
        <ThemeToggle className="absolute right-6 top-8 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
      </div>
      <div className="gold-line mx-6 shrink-0 opacity-40" />
      <nav className="sidebar-scroll mt-4 flex-1 overscroll-contain overflow-y-auto px-3">
        {visibleNav.map((item) => {
          const active = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-gold' : ''}`} />
              {item.label}
            </Link>
          );
        })}

        <div className="gold-line my-4 opacity-40" />

        <p className="px-4 pb-2 text-[10px] uppercase tracking-[0.25em] text-sidebar-foreground/40">Mais</p>
        <Link to="/notificacoes" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
          <span className="relative">
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold px-1 text-[8px] font-bold text-deep">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          Notificações
        </Link>
        {isVisible('calendario') && (
          <Link to="/calendario" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <Calendar className="h-[18px] w-[18px]" /> Calendário Mariano
          </Link>
        )}
        {isVisible('intencoes') && (
          <Link to="/intencoes" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <Leaf className="h-[18px] w-[18px]" /> Intenções de Oração
          </Link>
        )}
        {isVisible('jornadas') && (
          <Link to="/jornadas" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <Sparkles className="h-[18px] w-[18px]" /> Jornadas Coletivas
          </Link>
        )}
        {isVisible('agentes') && (
          <Link to="/agentes" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <Bot className="h-[18px] w-[18px]" /> Assistentes IA
          </Link>
        )}
        {isVisible('cadeiazinha') && (
          <Link to="/solicitar-cadeiazinha" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <Gift className="h-[18px] w-[18px]" /> Solicite sua cadeiazinha
          </Link>
        )}
        <Link to="/configuracoes" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
          <Settings className="h-[18px] w-[18px]" /> Configurações
        </Link>
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <ShoppingBag className="h-[18px] w-[18px]" /> Conheça os Produtos
          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
        </a>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sair
        </button>
      </nav>
      <div className="shrink-0 px-6 py-4 text-[10px] text-sidebar-foreground/40">
        <p className="ornament">✦</p>
        <p className="mt-2 font-display italic">Ad Iesum per Mariam</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 hidden bg-deep transition-all duration-300 lg:flex lg:flex-col ${collapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
        {SidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 bg-deep lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {location.pathname !== '/' && (
              <button
                onClick={() => navigate(-1)}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <Link to="/">
              <Logo size="sm" variant="dark" subtitle={false} />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-sidebar-foreground/70 hover:text-sidebar-foreground" />
            <Link to="/notificacoes" className="relative text-sidebar-foreground/70">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-deep">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            {isVisible('calendario') && <Link to="/calendario" className="text-sidebar-foreground/70"><Calendar className="h-5 w-5" /></Link>}
            <Link to="/perfil" className="text-sidebar-foreground/70"><User className="h-5 w-5" /></Link>
          </div>
        </div>
        <div className="px-4 pb-2">
          <GlobalSearch />
        </div>
        <div className="gold-line opacity-40" />
      </header>

      {/* Mobile drawer menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-deep flex flex-col" onClick={() => setMenuOpen(false)}>{SidebarContent}</div>
        </div>
      )}

      <main className={`transition-all duration-300 ${collapsed ? 'lg:pl-0' : 'lg:pl-64'}`}>
        <div className="sticky top-0 z-20 hidden items-center gap-3 border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur lg:flex">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted"
              title="Voltar"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          <div className="flex-1">
            <GlobalSearch />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-28 pt-6 lg:max-w-4xl lg:px-8 lg:pb-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/90 backdrop-blur lg:hidden">
        <div className="flex items-stretch justify-around">
          {visibleNav.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                  active ? 'text-gold' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* PWA install popup — mobile only, after login */}
      <div className="fixed inset-x-0 bottom-16 z-40 px-4 lg:hidden">
        <PwaInstallPrompt />
      </div>

      {/* Botão flutuante do assistente de IA */}
      <FloatingAgentButton />

      {/* Pop-up de novidade exibido no login */}
      <NovidadePopup notifications={notifications} markRead={markRead} />
    </div>
  );
}