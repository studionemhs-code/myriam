import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const formatDate = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function TrackingTimeline({ events = [] }) {
  if (!events.length) return <p className="py-6 text-center text-sm text-muted-foreground">Os Correios ainda não publicaram movimentações para este objeto.</p>;
  return (
    <div className="mt-5 space-y-0">
      {events.map((event, index) => (
        <div key={`${event.code}-${event.date}-${index}`} className="relative flex gap-3 pb-6 last:pb-0">
          {index < events.length - 1 && <span className="absolute left-2.5 top-6 h-[calc(100%-1rem)] w-px bg-border" />}
          {index === 0 ? <CheckCircle2 className="relative h-5 w-5 shrink-0 text-primary" /> : <Circle className="relative h-5 w-5 shrink-0 text-muted-foreground" />}
          <div>
            <p className="font-medium leading-tight">{event.description}</p>
            {event.detail && <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</p>
            {event.destination && <p className="mt-1 text-xs text-muted-foreground">Destino: {event.destination}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}