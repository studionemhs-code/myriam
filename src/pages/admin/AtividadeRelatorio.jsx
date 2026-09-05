import React, { useEffect, useState } from 'react';
import { Activity, Users, CalendarDays, Flame } from 'lucide-react';
import { AdminPageTitle, Loading } from '@/components/admin/ui';
import ActiveUsersChart from '@/components/admin/ActiveUsersChart';
import TopContentList from '@/components/admin/TopContentList';
import OnlineUsersPanel from '@/components/admin/OnlineUsersPanel';
import { loadDailyActiveUsers, loadTopContentThisMonth } from '@/lib/activityReport';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export default function AtividadeRelatorio() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([loadDailyActiveUsers(30), loadTopContentThisMonth(10)])
      .then(([dau, top]) => setData({ dau, top }));
  }, []);

  if (!data) return <Loading label="Carregando relatório de atividade..." />;

  const { dau, top } = data;
  const monthName = MONTHS[new Date().getMonth()];

  return (
    <div>
      <AdminPageTitle title="Atividade" subtitle="Quem está online, usuários ativos diariamente e conteúdos mais vivos na formação" />

      <div className="mb-6">
        <OnlineUsersPanel />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card icon={Activity} value={dau.today} label="Ativos hoje" tone="green" />
        <Card icon={Users} value={dau.avg} label="Média diária (30 dias)" />
        <Card icon={CalendarDays} value={dau.uniqueMonth} label={`Únicos em ${monthName}`} tone="gold" />
      </div>

      <div className="mt-6">
        <ActiveUsersChart series={dau.series} />
      </div>

      <div className="mt-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg"><Flame className="h-4 w-4 text-gold" /> Conteúdos com mais interações em {monthName}</h2>
        <p className="mb-3 text-xs text-muted-foreground">Comentários e anotações em conteúdos ACAMF, aulas assistidas em cursos e reflexões nos dias do Caminho</p>
        <TopContentList items={top} />
      </div>
    </div>
  );
}

function Card({ icon: Icon, value, label, tone }) {
  const toneCls = {
    green: 'bg-emerald-100 text-emerald-600',
    gold: 'bg-gold/15 text-gold',
    primary: 'bg-primary/10 text-primary'
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${toneCls[tone] || toneCls.primary}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 font-display text-3xl">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}