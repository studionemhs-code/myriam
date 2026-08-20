import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { base44 } from '@/api/base44Client';

const PHASES = [
  { key: 'desejo', name: 'Desejo', full: 'Espírito de Desejo', range: 'Dias 1–12', min: 1, max: 12 },
  { key: 'conhecimento', name: 'C. de Si', full: 'Conhecimento de Si', range: 'Dias 13–19', min: 13, max: 19 },
  { key: 'iluminacao', name: 'C. de Maria', full: 'Conhecimento de Maria', range: 'Dias 20–27', min: 20, max: 27 },
  { key: 'entrega', name: 'C. de Jesus', full: 'Conhecimento de Jesus', range: 'Dias 28–33', min: 28, max: 33 },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{p.full}</p>
      <p className="text-muted-foreground">{p.range}</p>
      <p className="mt-1 text-primary">{p.usuarios} {p.usuarios === 1 ? 'usuário ativo' : 'usuários ativos'}</p>
    </div>
  );
}

export default function PreparationStagesChart() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const progress = await base44.entities.UserProgress.filter({ status: 'ativa' }, '-created_date', 500);
        const counts = PHASES.map((p) => ({
          name: p.name,
          full: p.full,
          range: p.range,
          usuarios: progress.filter((r) => r.current_day >= p.min && r.current_day <= p.max).length,
        }));
        setData(counts);
      } catch (e) {
        setData(PHASES.map((p) => ({ name: p.name, full: p.full, range: p.range, usuarios: 0 })));
      }
    })();
  }, []);

  if (!data) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando gráfico...</div>;
  }

  const total = data.reduce((s, d) => s + d.usuarios, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-display text-lg">Usuários ativos por etapa</h2>
          <p className="text-xs text-muted-foreground">Distribuição na jornada de preparação de 33 dias</p>
        </div>
        <span className="text-sm text-muted-foreground">{total} no total</span>
      </div>
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Bar dataKey="usuarios" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}