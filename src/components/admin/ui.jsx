import React from 'react';

export function AdminPageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export function Loading({ label = 'Carregando...' }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      {label}
    </div>
  );
}

export function Badge({ children, tone = 'muted' }) {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    gold: 'bg-gold/15 text-gold',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700'
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}