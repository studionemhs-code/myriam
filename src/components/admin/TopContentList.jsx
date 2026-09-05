import React from 'react';
import { MessageSquare, StickyNote, PlayCircle, PenLine } from 'lucide-react';
import { Badge } from '@/components/admin/ui';

const TYPE = {
  acamf: { label: 'ACAMF', tone: 'purple' },
  curso: { label: 'Curso', tone: 'blue' },
  dia: { label: 'Caminho', tone: 'gold' }
};

export default function TopContentList({ items }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma interação registrada neste mês.</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((c, i) => (
            <div key={c.key} className="flex items-center gap-3 p-4">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-gold text-deep' : i < 3 ? 'bg-gold/20 text-gold' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <Badge tone={TYPE[c.type].tone}>{TYPE[c.type].label}</Badge>
                  {c.comentarios > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{c.comentarios}</span>}
                  {c.anotacoes > 0 && <span className="inline-flex items-center gap-1"><StickyNote className="h-3 w-3" />{c.anotacoes}</span>}
                  {c.aulas > 0 && <span className="inline-flex items-center gap-1"><PlayCircle className="h-3 w-3" />{c.aulas}</span>}
                  {c.reflexoes > 0 && <span className="inline-flex items-center gap-1"><PenLine className="h-3 w-3" />{c.reflexoes}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-primary">{c.total}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">interações</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}