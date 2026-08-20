import React from 'react';
import { Sparkles, Flower2, BookOpen, Calendar } from 'lucide-react';

export function GoldDivider() {
  return <div className="gold-line my-6 w-24 mx-auto opacity-60" />;
}

export function Ornament({ className = '' }) {
  return <div className={`ornament text-center ${className}`}>✦</div>;
}

export function SectionCard({ icon: Icon, title, action, children, accent }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        {Icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${accent ? 'bg-gold/15' : 'bg-primary/10'}`}>
            <Icon className={`h-4 w-4 ${accent ? 'text-gold' : 'text-primary'}`} />
          </div>
        )}
        <h2 className="font-display text-lg">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function StatPill({ value, label }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-muted/60 px-3 py-2">
      <span className="font-display text-xl text-primary">{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = BookOpen, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 font-display text-lg">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-6 w-6 text-gold" />}
        <div>
          <h1 className="font-display text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="gold-line mt-3 w-16 opacity-50" />
    </div>
  );
}