import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Flag, Users, Sparkles, CalendarDays, Heart, Leaf } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle } from '@/components/admin/ui';
import PreparationStagesChart from '@/components/admin/PreparationStagesChart';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const safeList = (entity, ...args) => {
          try { return entity ? entity.list(...args).catch(() => []) : Promise.resolve([]); }
          catch { return []; }
        };
        const safeFilter = (entity, ...args) => {
          try { return entity ? entity.filter(...args).catch(() => []) : Promise.resolve([]); }
          catch { return []; }
        };
        const [content, days, users, reports, intentions, events, journeys] = await Promise.all([
          safeList(base44.entities.ACAMFContent, '-created_date', 1),
          safeList(base44.entities.PreparationDay, '-created_date', 1),
          safeList(base44.entities.User, '-created_date', 1),
          safeFilter(base44.entities.Report, { status: 'pendente' }, '-created_date', 1),
          safeFilter(base44.entities.PrayerIntention, { status: 'ativo' }, '-created_date', 1),
          safeList(base44.entities.MarianCalendarEvent, '-created_date', 1),
          safeList(base44.entities.CollectiveJourney, '-created_date', 1)
        ]);
        setStats({
          'ACAMF Conteúdos': { count: content.length, icon: BookOpen, to: '/admin/acamf' },
          'Dias de Preparação': { count: days.length, icon: Sparkles, to: '/admin/dias' },
          'Usuários': { count: users.length, icon: Users, to: '/admin/usuarios' },
          'Relatórios Pendentes': { count: reports.length, icon: Flag, to: '/admin/relatorios' },
          'Intenções Ativas': { count: intentions.length, icon: Heart, to: '/intencoes' },
          'Eventos do Calendário': { count: events.length, icon: CalendarDays, to: '/admin/calendario' },
          'Jornadas Coletivas': { count: journeys.length, icon: Leaf, to: '/admin/jornadas' }
        });
      } catch {
        setStats({});
      }
    })();
  }, []);

  return (
    <div>
      <AdminPageTitle title="Dashboard" subtitle="Visão geral do ecossistema Theotokos" />
      {!stats ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Object.entries(stats).map(([label, s]) => {
            const Icon = s.icon;
            return (
              <Link key={label} to={s.to} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-gold/50 hover:shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 font-display text-3xl">{s.count}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-6">
        <PreparationStagesChart />
      </div>
    </div>
  );
}