import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, PackageCheck } from 'lucide-react';
import TrackingTimeline from '@/components/tracking/TrackingTimeline';

export default function ShipmentCard({ shipment, registered }) {
  const expected = shipment.expected_date && new Date(shipment.expected_date).toLocaleDateString('pt-BR');
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2.5"><PackageCheck className="h-5 w-5 text-primary" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Objeto</p>
          <h2 className="font-display text-lg">{shipment.code}</h2>
          {shipment.service && <p className="text-sm text-muted-foreground">{shipment.service}</p>}
        </div>
      </div>
      {expected && <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm"><CalendarClock className="h-4 w-4 text-primary" /> Previsão de entrega: <strong>{expected}</strong></p>}
      <TrackingTimeline events={shipment.events} />
      <div className="mt-6 border-t border-border pt-4 text-center">
        {registered ? <Link to="/" className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Acompanhar no meu painel</Link> : <Link to="/register" className="inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Criar conta e acompanhar</Link>}
      </div>
    </section>
  );
}