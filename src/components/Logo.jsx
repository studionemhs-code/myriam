import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', to, variant = 'dark', subtitle = true }) {
  const dims = {
    sm: { box: 'h-8 w-8', icon: 'h-4 w-4', title: 'text-sm', sub: 'text-[8px]' },
    md: { box: 'h-10 w-10', icon: 'h-5 w-5', title: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'h-14 w-14', icon: 'h-7 w-7', title: 'text-2xl', sub: 'text-[11px]' }
  }[size];

  const titleColor = variant === 'dark' ? 'text-sidebar-foreground' : 'text-foreground';
  const subColor = variant === 'dark' ? 'text-sidebar-foreground/55' : 'text-muted-foreground';

  const content = (
    <div className="flex items-center gap-2.5">
      <div className={`relative flex ${dims.box} items-center justify-center rounded-full bg-gradient-to-br from-primary to-[hsl(272_60%_24%)] ring-1 ring-gold/40`}>
        <span className={`font-display font-bold ${dims.icon} text-primary-foreground`} style={{ letterSpacing: '0.02em' }}>M</span>
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
      </div>
      <div className="leading-none">
        <p className={`font-display font-bold uppercase ${dims.title} ${titleColor}`} style={{ letterSpacing: '0.08em' }}>
          MYRIAM
        </p>
        {subtitle && (
          <p className={`mt-0.5 uppercase ${dims.sub} ${subColor}`} style={{ letterSpacing: '0.3em' }}>
            Mãe de Deus
          </p>
        )}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="inline-flex">{content}</Link>;
  }
  return content;
}