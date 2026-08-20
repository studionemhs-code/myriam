import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Flag, Check } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';

export default function Reports() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendente');
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.Report.filter({ status: filter }, '-created_date', 100);
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const resolve = async (id, status) => {
    setResolving(null);
    await base44.entities.Report.update(id, { status, resolution_note: note });
    setNote('');
    await load();
  };

  const tone = { pendente: 'gold', analisando: 'blue', resolvido: 'green' };

  return (
    <div>
      <AdminPageTitle title="Moderação" subtitle="Relatórios de conteúdo e conduta" />

      <div className="mb-4 flex gap-2">
        {['pendente', 'analisando', 'resolvido'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-4 py-1.5 text-sm capitalize ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhum relatório {filter}.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50"><Flag className="h-4 w-4 text-red-500" /></div>
                  <div>
                    <p className="text-sm font-medium">Tipo: <span className="text-muted-foreground">{r.target_type}</span></p>
                    <p className="text-xs text-muted-foreground">Alvo: {r.target_id}</p>
                  </div>
                </div>
                <Badge tone={tone[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-3 text-sm">{r.reason}</p>
              {r.resolution_note && <p className="mt-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Resolução: {r.resolution_note}</p>}

              {r.status !== 'resolvido' && (
                <div className="mt-4 border-t border-border pt-3">
                  {resolving === r.id ? (
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder="Nota de resolução" value={note} onChange={(e) => setNote(e.target.value)} />
                      <button onClick={() => resolve(r.id, 'resolvido')} className="rounded-lg bg-emerald-600 px-3 text-sm text-white"><Check className="h-4 w-4" /></button>
                      <button onClick={() => { setResolving(null); setNote(''); }} className="rounded-lg border border-border px-3 text-sm">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => { setResolving(r.id); setNote(''); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Resolver</button>
                      {r.status === 'pendente' && (
                        <button onClick={() => resolve(r.id, 'analisando')} className="rounded-lg border border-border px-3 py-1.5 text-xs">Marcar em análise</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}