import React from 'react';
import { Link } from 'react-router-dom';
import { LOGO_URL } from '@/lib/logoUrl';

export default function Logo({ size = 'md', to, variant = 'dark', subtitle = true, stacked = false }) {
  const dims = {
    sm: { box: 'h-10 w-10', title: 'text-sm', sub: 'text-[8px]' },
    md: { box: 'h-14 w-14', title: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 'h-20 w-20', title: 'text-2xl', sub: 'text-[11px]' }
  }[size];

  const titleColor = variant === 'dark' ? 'text-sidebar-foreground' : 'text-foreground';
  const subColor = variant === 'dark' ? 'text-sidebar-foreground/55' : 'text-muted-foreground';

  const content = (
    <div className={`flex ${stacked ? 'flex-col items-center text-center' : 'items-center'} gap-2.5`}>
      <img src={LOGO_URL} alt="Theotokos" className={`${dims.box} shrink-0 rounded-xl object-cover`} />
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