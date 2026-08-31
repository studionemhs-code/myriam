import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { supabase } from '@/api/supabase';
import { SectionCard } from '@/components/ui/marian';

export default function HomeShipmentWidget() {
  const [shipment, setShipment] = useState(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.functions.invoke('track-correios', { body: { mode: 'mine' } });
      if (active) setShipment(data?.shipment || null);
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  if (!shipment) return null;
  const latest = shipment.events?.[0];
  return (
    <div className="mt-4">
      <Link to={`/rastreio/${shipment.code}`}>
        <SectionCard title="Acompanhe seu pedido" icon={Package} accent>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="font-medium">{shipment.code}</p><p className="truncate text-sm text-muted-foreground">{latest?.description || 'Aguardando atualização dos Correios'}</p></div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </SectionCard>
      </Link>
    </div>
  );
}