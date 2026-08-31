import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, PackageSearch } from 'lucide-react';
import { supabase } from '@/api/supabase';
import TrackingSearch from '@/components/tracking/TrackingSearch';
import ShipmentCard from '@/components/tracking/ShipmentCard';

export default function Rastreio() {
  const { codigo = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: false, shipment: null, registered: false, error: '' });
  const search = async (code) => {
    navigate(`/rastreio/${code}`, { replace: true });
    setState((value) => ({ ...value, loading: true, error: '' }));
    const { data, error } = await supabase.functions.invoke('track-correios', { body: { code } });
    setState({ loading: false, shipment: data?.shipment || null, registered: Boolean(data?.registered), error: data?.error || error?.message || (!data?.shipment ? 'Objeto não encontrado.' : '') });
  };
  useEffect(() => { if (codigo) search(codigo); }, []);
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <header className="mb-5 text-center"><PackageSearch className="mx-auto h-9 w-9 text-primary" /><h1 className="mt-2 font-display text-2xl">Rastreie seu pedido</h1><p className="mt-1 text-sm text-muted-foreground">Consulte as atualizações oficiais dos Correios.</p></header>
        <TrackingSearch initialCode={codigo} loading={state.loading} onSearch={search} />
        {state.loading && <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
        {!state.loading && state.error && <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{state.error}</p>}
        {!state.loading && state.shipment && <ShipmentCard shipment={state.shipment} registered={state.registered} />}
      </div>
    </main>
  );
}