import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Heart, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading } from '@/components/admin/ui';

export default function CommunityReports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [users, intentions] = await Promise.all([
          base44.entities.User.list('-created_date', 1000),
          base44.entities.PrayerIntention.list('-created_date', 1000)
        ]);

        // Build last 12 months buckets
        const months = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          months.push({ key, label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`, users: 0, intentions: 0 });
        }
        const monthMap = {};
        months.forEach((m) => { monthMap[m.key] = m; });

        (users || []).forEach((u) => {
          if (!u.created_date) return;
          const key = String(u.created_date).slice(0, 7);
          if (monthMap[key]) monthMap[key].users++;
        });

        (intentions || []).forEach((i) => {
          if (!i.created_date) return;
          const key = String(i.created_date).slice(0, 7);
          if (monthMap[key]) monthMap[key].intentions++;
        });

        // Cumulative member count
        let cumulative = 0;
        const chartData = months.map((m) => {
          cumulative += m.users;
          return { ...m, totalMembros: cumulative };
        });

        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const thisMonth = monthMap[thisMonthKey] || { users: 0, intentions: 0 };
        const prevMonth = months[months.length - 2] || { users: 0, intentions: 0 };
        const growthPct = prevMonth.users > 0 ? Math.round(((thisMonth.users - prevMonth.users) / prevMonth.users) * 100) : 0;

        setData({
          chartData,
          totalUsers: users.length,
          totalIntentions: intentions.length,
          thisMonthUsers: thisMonth.users,
          thisMonthIntentions: thisMonth.intentions,
          growthPct
        });
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  if (!data) return <Loading label="Carregando relatórios..." />;

  const { chartData, totalUsers, totalIntentions, thisMonthUsers, thisMonthIntentions, growthPct } = data;

  return (
    <div>
      <AdminPageTitle title="Crescimento da Comunidade" subtitle="Novos membros e intenções de oração por mês" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard icon={Users} value={totalUsers} label="Total de Membros" />
        <SummaryCard
          icon={growthPct >= 0 ? TrendingUp : TrendingDown}
          value={thisMonthUsers}
          label={`Este mês (${growthPct >= 0 ? '+' : ''}${growthPct}%)`}
          tone={growthPct >= 0 ? 'green' : 'red'}
        />
        <SummaryCard icon={Heart} value={totalIntentions} label="Total de Intenções" />
        <SummaryCard icon={Calendar} value={thisMonthIntentions} label="Intenções este mês" tone="gold" />
      </div>

      {/* Community growth chart */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="font-display text-lg">Crescimento de membros</h2>
          <p className="text-xs text-muted-foreground">Novos cadastros e total acumulado nos últimos 12 meses</p>
        </div>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip content={<GrowthTooltip />} cursor={{ stroke: 'hsl(var(--muted))' }} />
              <Line type="monotone" dataKey="users" name="Novos membros" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="totalMembros" name="Total acumulado" stroke="hsl(var(--gold))" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Prayer intentions chart */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="font-display text-lg">Intenções de oração por mês</h2>
          <p className="text-xs text-muted-foreground">Volume de intenções registradas nos últimos 12 meses</p>
        </div>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip content={<IntentionsTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="intentions" name="Intenções" fill="hsl(var(--marian))" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, value, label, tone }) {
  const toneCls = {
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
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

function GrowthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.label}</p>
      <p className="text-primary">{p.users} novos membros</p>
      <p className="text-gold">{p.totalMembros} total acumulado</p>
    </div>
  );
}

function IntentionsTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.label}</p>
      <p className="text-marian">{p.intentions} intenções</p>
    </div>
  );
}