import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, BookOpen, ChevronDown, ChevronUp, Eye, Compass, Flower2, TrendingUp, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';

const STATUS_CONFIG = {
  interessado: { label: 'Interessado', tone: 'blue', icon: Compass },
  preparacao: { label: 'Em Preparação', tone: 'gold', icon: BookOpen },
  consagrado: { label: 'Consagrado', tone: 'green', icon: Flower2 }
};

const DEFAULT_PHASES = [
  { name: 'Espírito de Desejo', min: 1, max: 12 },
  { name: 'Conhecimento de Si', min: 13, max: 19 },
  { name: 'Conhecimento de Maria', min: 20, max: 27 },
  { name: 'Conhecimento de Jesus', min: 28, max: 33 }
];

export default function Stats() {
  const [data, setData] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [users, progressList, phases, days, content, categories] = await Promise.all([
          base44.entities.User.list('-created_date', 500),
          base44.entities.UserProgress.filter({ status: 'ativa' }, '-created_date', 500),
          base44.entities.PreparationPhase.list('sort_order', 50),
          base44.entities.PreparationDay.list('day_number', 33),
          base44.entities.ACAMFContent.list('-created_date', 200),
          base44.entities.ACAMFCategory.list('sort_order', 50)
        ]);

        const statusDist = {
          interessado: users.filter((u) => u.status === 'interessado'),
          preparacao: users.filter((u) => u.status === 'preparacao'),
          consagrado: users.filter((u) => u.status === 'consagrado')
        };

        const dayToPhase = {};
        days.forEach((d) => { if (d.phase) dayToPhase[d.day_number] = d.phase; });

        let phaseDefs = [];
        if (phases.length > 0) {
          phaseDefs = phases.map((p) => {
            const phaseDays = days.filter((d) => d.phase === p.name).map((d) => d.day_number).sort((a, b) => a - b);
            return {
              name: p.name,
              min: phaseDays[0] || 1,
              max: phaseDays[phaseDays.length - 1] || 33,
              color: p.color,
              members: []
            };
          });
        } else {
          phaseDefs = DEFAULT_PHASES.map((p) => ({ ...p, members: [] }));
        }

        const userMap = {};
        users.forEach((u) => { userMap[u.id] = u; });

        progressList.forEach((prog) => {
          const u = userMap[prog.created_by_id];
          if (!u || u.status !== 'preparacao') return;
          const day = prog.current_day || 1;
          const phase = phaseDefs.find((p) => day >= p.min && day <= p.max);
          if (phase) phase.members.push({ ...u, current_day: day });
        });

        const catMap = {};
        categories.forEach((c) => { catMap[c.id] = c.name; });

        const topContent = content
          .filter((c) => c.status === 'publicado')
          .map((c) => ({ ...c, category_name: catMap[c.category_id] || 'Sem categoria' }))
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 10);

        setData({ statusDist, phaseDefs, topContent, totalUsers: users.length });
      } catch (e) { /* ignore */ }
    })();
  }, []);

  if (!data) return <Loading label="Carregando estatísticas..." />;

  const { statusDist, phaseDefs, topContent, totalUsers } = data;
  const chartData = phaseDefs.map((p) => ({ name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name, full: p.name, usuarios: p.members.length, range: `Dias ${p.min}–${p.max}` }));

  return (
    <div>
      <AdminPageTitle title="Estatísticas" subtitle="Membros por fase e conteúdos mais acessados" />

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <OverviewCard icon={Users} value={totalUsers} label="Total de Membros" />
        <OverviewCard icon={Compass} value={statusDist.interessado.length} label="Interessados" tone="blue" />
        <OverviewCard icon={BookOpen} value={statusDist.preparacao.length} label="Em Preparação" tone="gold" />
        <OverviewCard icon={Flower2} value={statusDist.consagrado.length} label="Consagrados" tone="green" />
      </div>

      {/* Phase distribution chart */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-lg">Membros por fase da jornada</h2>
            <p className="text-xs text-muted-foreground">Distribuição dos membros em preparação ativa</p>
          </div>
        </div>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip content={<PhaseTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="usuarios" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Phase member lists */}
      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg">Membros em cada fase</h2>
        <div className="space-y-2">
          {phaseDefs.map((phase, i) => {
            const open = expandedPhase === i;
            return (
              <div key={i} className="rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setExpandedPhase(open ? null : i)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: (phase.color || 'hsl(var(--primary))') + '22' }}>
                    <BookOpen className="h-4 w-4" style={{ color: phase.color || 'hsl(var(--primary))' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{phase.name}</p>
                    <p className="text-xs text-muted-foreground">Dias {phase.min}–{phase.max}</p>
                  </div>
                  <Badge tone="muted">{phase.members.length} {phase.members.length === 1 ? 'membro' : 'membros'}</Badge>
                  {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {open && (
                  <div className="border-t border-border px-4 py-3">
                    {phase.members.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">Nenhum membro nesta fase.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {phase.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{(m.full_name || 'A')[0]}</div>
                            )}
                            <p className="flex-1 text-sm">{m.full_name || 'Sem nome'}</p>
                            <span className="text-xs text-muted-foreground">Dia {m.current_day}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Most accessed content */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><TrendingUp className="h-4 w-4 text-gold" /> Conteúdos ACAMF mais acessados</h2>
        <div className="rounded-2xl border border-border bg-card">
          {topContent.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nenhum conteúdo publicado ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {topContent.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3 p-4">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-gold text-deep' : i < 3 ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.category_name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="font-medium">{c.view_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, value, label, tone }) {
  const toneCls = {
    blue: 'bg-blue-100 text-blue-600',
    gold: 'bg-gold/15 text-gold',
    green: 'bg-emerald-100 text-emerald-600',
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

function PhaseTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.full}</p>
      <p className="text-muted-foreground">{p.range}</p>
      <p className="mt-1 text-primary">{p.usuarios} {p.usuarios === 1 ? 'membro' : 'membros'}</p>
    </div>
  );
}