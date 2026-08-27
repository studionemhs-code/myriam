import React, { useEffect, useState } from 'react';
import { Gift, Plus, Eye, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import CadeiazinhaForm from './CadeiazinhaForm';
import CadeiazinhaViewer from './CadeiazinhaViewer';

export default function CadeiazinhaSection() {
  const { user } = useCurrentUser();
  const [cadeiazinhas, setCadeiazinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list'); // 'list' | 'form' | 'view'
  const [selected, setSelected] = useState(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await base44.entities.Cadeiazinha.filter({ user_id: user.id }, '-created_date', 50);
      setCadeiazinhas(list);
    } catch { setCadeiazinhas([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  // Modo formulário
  if (mode === 'form') {
    return (
      <CadeiazinhaForm
        user={user}
        onSaved={() => { setMode('list'); load(); }}
        onCancel={() => setMode('list')}
      />
    );
  }

  // Modo visualização
  if (mode === 'view' && selected) {
    return (
      <CadeiazinhaViewer
        cadeiazinha={selected}
        user={user}
        onBack={() => { setMode('list'); setSelected(null); }}
      />
    );
  }

  // Modo lista
  const hasCadeiazinhas = cadeiazinhas.length > 0;

  return (
    <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Gift className="h-5 w-5 text-gold" />
        <h2 className="font-display text-lg">Cadeiazinha Theotokos</h2>
      </div>

      {!hasCadeiazinhas ? (
        <div className="text-center">
          <p className="mb-1 text-sm text-muted-foreground">Cadastre sua cadeiazinha Theotokos para obter seu</p>
          <p className="mb-4 font-display text-base text-gold">Termo e Certificado de Garantia Vitalícia</p>
          <button onClick={() => setMode('form')} className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-medium text-deep transition hover:bg-gold/90">
            <Plus className="h-4 w-4" /> Cadastrar minha cadeiazinha Theotokos
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setMode('form')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted">
              <Plus className="h-4 w-4" /> Adicionar nova cadeiazinha
            </button>
          </div>

          <div className="space-y-2">
            {cadeiazinhas.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelected(c); setMode('view'); }}
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-gold/50 hover:shadow-sm"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {c.photos?.[0] ? (
                    <img src={c.photos[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Gift className="h-full w-full p-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.unique_code || 'Sem código'}</p>
                  <p className="text-xs text-muted-foreground">{c.seller_name || 'Vendedor não informado'}</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}