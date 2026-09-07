import React, { useEffect, useState } from 'react';
import { Plus, Ban } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Loading, Badge, inputCls } from '@/components/admin/ui';
import { GRANT_SOURCE_LABELS, GRANT_STATUS_LABELS, isGrantActive } from '@/lib/access';
import { fmtDate, logMonetizationEvent } from '@/lib/monetizationAdmin';
import ManualGrantDialog from '@/components/admin/monetizacao/ManualGrantDialog';

const TONE = { ativo: 'green', pendente: 'gold', expirado: 'muted', cancelado: 'muted', revogado: 'red' };

export default function GrantsTab() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [g, p] = await Promise.all([
      base44.entities.AccessGrant.list('-created_date', 500),
      base44.entities.Product.list('name', 200)
    ]);
    setItems(g); setProducts(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (g) => {
    if (!confirm('Revogar esta permissão? O usuário perderá o acesso imediatamente.')) return;
    await base44.entities.AccessGrant.update(g.id, { status: 'revogado' });
    await logMonetizationEvent('acesso_revogado', { user_id: g.user_id, user_email: g.user_email, product_id: g.product_id, grant_id: g.id });
    await load();
  };

  if (loading) return <Loading />;
  const pname = (id) => products.find((p) => p.id === id)?.name || '—';
  const effective = (g) => (g.status === 'ativo' && !isGrantActive(g) ? 'expirado' : g.status);
  const list = items.filter((g) => (!filter || effective(g) === filter) && (!q || (g.user_email || '').toLowerCase().includes(q.toLowerCase()) || pname(g.product_id).toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className={`${inputCls} max-w-xs`} placeholder="Buscar por e-mail ou produto…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} max-w-[180px]`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(GRANT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => setOpen(true)} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Liberar acesso manualmente
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Produto / Recurso</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Status</th><th className="hidden px-4 py-3 md:table-cell">Início</th><th className="hidden px-4 py-3 md:table-cell">Expira</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((g) => {
              const st = effective(g);
              return (
                <tr key={g.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3"><p className="truncate">{g.user_email || g.user_id}</p></td>
                  <td className="px-4 py-3">{g.product_id ? pname(g.product_id) : `${g.resource_type}: ${g.resource_id}`}{g.note && <p className="text-xs text-muted-foreground">{g.note}</p>}</td>
                  <td className="px-4 py-3">{GRANT_SOURCE_LABELS[g.source] || g.source}{g.platform && <span className="text-xs text-muted-foreground"> · {g.platform}</span>}</td>
                  <td className="px-4 py-3"><Badge tone={TONE[st]}>{GRANT_STATUS_LABELS[st]}</Badge></td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{fmtDate(g.starts_at)}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{g.expires_at ? fmtDate(g.expires_at) : 'Permanente'}</td>
                  <td className="px-2 py-3">{st === 'ativo' && <button onClick={() => revoke(g)} title="Revogar" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"><Ban className="h-4 w-4" /></button>}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma permissão encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && <ManualGrantDialog products={products} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}