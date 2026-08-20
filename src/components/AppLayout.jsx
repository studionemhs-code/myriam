import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Home, Flower2, BookOpen, Leaf, User, ShoppingBag,
  Bell, Calendar, Settings, LogOut, ChevronRight, Sparkles, MessageCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useNotifications } from '@/hooks/useNotifications';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';

const STORE_URL = 'https://www.lojatheotokos.com.br';

const navItems = [
  { to: '/', label: 'Hoje', icon: Home },
  { to: '/caminho', label: 'Caminho', icon: Flower2 },
  { to: '/acamf', label: 'ACAMF', icon: BookOpen, feature: 'acamf' },
  { to: '/myriam', label: 'Myriam', icon: Leaf, feature: 'myriam' },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isVisible } = useFeatureFlags();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const visibleNav = navItems.filter((item) => item.feature ? isVisible(item.feature) : true);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between px-6 py-8">
        <div>
          <Logo size="md" variant="dark" subtitle={false} />
          <p className="mt-1 pl-1 text-[10px] uppercase tracking-[0.3em] text-sidebar-foreground/55">Mãe de Deus</p>
        </div>
        <ThemeToggle className="text-sidebar-foreground/70 hover:text-sidebar-foreground" />
      </div>
      <div className="gold-line mx-6 opacity-40" />
      <nav className="mt-4 flex-1 px-3">
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
        {isVisible('chat') && (
          <Link to="/chat" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
            <MessageCircle className="h-[18px] w-[18px]" /> Conversas
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
      <div className="px-6 py-4 text-[10px] text-sidebar-foreground/40">
        <p className="ornament">✦</p>
        <p className="mt-2 font-display italic">Ad Iesum per Mariam</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-deep lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/">
          <Logo size="sm" variant="light" subtitle={false} />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/notificacoes" className="relative text-muted-foreground">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-deep">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          {isVisible('calendario') && <Link to="/calendario" className="text-muted-foreground"><Calendar className="h-5 w-5" /></Link>}
          <Link to="/perfil" className="text-muted-foreground"><User className="h-5 w-5" /></Link>
        </div>
      </header>

      {/* Mobile drawer menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-deep">{SidebarContent}</div>
        </div>
      )}

      <main className="lg:pl-64">
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
    </div>
  );
}