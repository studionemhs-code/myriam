import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, CalendarDays, Sparkles,
  Flag, Users, ArrowLeft, Menu, X, ToggleLeft, MessageCircle, BarChart3, Award
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Logo from '@/components/Logo';

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { to: '/admin/acamf', label: 'ACAMF', icon: BookOpen },
  { to: '/admin/categorias', label: 'Categorias ACAMF', icon: BookOpen },
  { to: '/admin/myriam', label: 'Myriam', icon: MessageCircle },
  { to: '/admin/dias', label: 'Dias de Preparação', icon: Sparkles },
  { to: '/admin/calendario', label: 'Calendário Mariano', icon: CalendarDays },
  { to: '/admin/jornadas', label: 'Jornadas Coletivas', icon: Sparkles },
  { to: '/admin/certificados', label: 'Certificados', icon: Award },
  { to: '/admin/relatorios', label: 'Moderação', icon: Flag },
  { to: '/admin/funcionalidades', label: 'Funcionalidades', icon: ToggleLeft },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users }
];

export default function AdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const Nav = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo size="sm" variant="dark" subtitle={false} />
        <p className="mt-1 pl-0.5 text-[10px] uppercase tracking-[0.25em] text-sidebar-foreground/50">Painel Admin</p>
      </div>
      <div className="gold-line mx-5 opacity-40" />
      <nav className="mt-3 flex-1 px-2">
        {items.map((it) => {
          const active = it.end ? location.pathname === it.to : location.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setOpen(false)}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active ? 'bg-sidebar-accent text-sidebar-foreground font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-gold' : ''}`} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60">
          <ArrowLeft className="h-[18px] w-[18px]" /> Voltar ao App
        </Link>
        <button
          onClick={() => base44.auth.logout()}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
        >
          <X className="h-[18px] w-[18px]" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-deep lg:block">{Nav}</aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="text-muted-foreground"><Menu className="h-5 w-5" /></button>
        <Logo size="sm" variant="light" subtitle={false} />
        <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-deep">{Nav}</div>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}