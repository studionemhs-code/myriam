import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Flag, Users, Sparkles, CalendarDays, Heart, Leaf } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle } from '@/components/admin/ui';
import PreparationStagesChart from '@/components/admin/PreparationStagesChart';
import useDashboardStats from '@/components/admin/useDashboardStats';

export default function AdminDashboard() {
  const { data: stats, error } = useDashboardStats();

  return (
    <div>
      <AdminPageTitle title="Dashboard" subtitle="Visão geral do ecossistema Theotokos" />
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error.message}</p>}
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