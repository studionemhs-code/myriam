import React from 'react';
import { Award, Lock } from 'lucide-react';

export default function MedalGrid({ medals }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {medals.map((m, i) => (
        <div key={i} className={`flex flex-col items-center rounded-xl p-3 ${m.earned ? 'bg-gold/10' : 'bg-muted/30'}`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${m.earned ? 'bg-gold/20' : 'bg-muted'}`}>
            {m.earned ? <Award className="h-6 w-6 text-gold" /> : <Lock className="h-5 w-5 text-muted-foreground/40" />}
          </div>
          <p className={`mt-2 text-center text-[10px] leading-tight ${m.earned ? 'font-medium text-gold' : 'text-muted-foreground'}`}>{m.label}</p>
        </div>
      ))}
    </div>
  );
}