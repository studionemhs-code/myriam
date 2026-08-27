import React, { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Badge, Loading, inputCls } from '@/components/admin/ui';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABEL = { aberta: 'Aberta', em_analise: 'Em Análise', resolvida: 'Resolvida' };
const STATUS_TONE = { aberta: 'red', em_analise: 'blue', resolvida: 'green' };

export default function GarantiaAdmin() {
  const { toast } = useToast();
  const [claims, setClaims] = useState([]);
  const [cadeiazinhas, setCadeiazinhas] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  const [noteDraft, setNoteDraft] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [claimList, cadList, userList] = await Promise.all([
        base44.entities.WarrantyClaim.list('-created_date', 200),
        base44.entities.Cadeiazinha.list('-created_date', 200),
        base44.entities.User.list('-created_date', 200)
      ]);
      setClaims(claimList);
      setCadeiazinhas(cadList);
      setUsers(userList);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const cadById = {};
  cadeiazinhas.forEach((c) => { cadById[c.id] = c; });
  const userById = {};
  users.forEach((u) => { userById[u.id] = u; });

  const filtered = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  const updateStatus = async (claim, status) => {
    setUpdating(claim.id);
    try {
      await base44.entities.WarrantyClaim.update(claim.id, { status });
      // Notifica o usuário sobre a mudança
      try {
        const userName = userById[claim.user_id]?.display_name || userById[claim.user_id]?.full_name || 'Usuário';
        await base44.entities.Notification.create({
          user_id: claim.user_id,
          category: 'novidades',
          title: `Chamado de Garantia: ${STATUS_LABEL[status]}`,
          body: `Seu chamado de garantia vitalícia foi atualizado para "${STATUS_LABEL[status]}".`,
          link: '/minha-consagracao',
          related_id: claim.id
        });
      } catch { /* best-effort */ }
      toast({ description: `Chamado atualizado para ${STATUS_LABEL[status]}.` });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao atualizar.' });
    } finally { setUpdating(null); }
  };

  const saveNote = async (claim) => {
    const note = noteDraft[claim.id] ?? claim.admin_note ?? '';
    setUpdating(claim.id);
    try {
      await base44.entities.WarrantyClaim.update(claim.id, { admin_note: note });
      toast({ description: 'Observação salva.' });
      setNoteDraft((p) => { const n = { ...p }; delete n[claim.id]; return n; });
      await load();
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar.' });
    } finally { setUpdating(null); }
  };

  return (
    <div>
      <AdminPageTitle title="Garantia Vitalícia" subtitle="Chamados de garantia das cadeiazinhas Theotokos" />

      {/* Filtros */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {['all', 'aberta', 'em_analise', 'resolvida'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          Nenhum chamado encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => {
            const cad = cadById[claim.cadeiazinha_id];
            const u = userById[claim.user_id];
            return (
              <div key={claim.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[claim.status]}>{STATUS_LABEL[claim.status]}</Badge>
                      <span className="text-sm font-medium">{u?.display_name || u?.full_name || 'Usuário'}</span>
                      {u?.email && <span className="text-xs text-muted-foreground">· {u.email}</span>}
                    </div>
                    <div className="mt-2 grid gap-2 text-sm">
                      {cad && (
                        <p className="text-xs text-muted-foreground">
                          Cadeiazinha: <span className="font-medium text-foreground">{cad.unique_code || '—'}</span>
                          {cad.seller_name ? ` · Vendedor: ${cad.seller_name}` : ''}
                        </p>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Problema</p>
                        <p className="text-sm">{claim.problem_description}</p>
                      </div>
                      {claim.observations && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações do usuário</p>
                          <p className="text-sm">{claim.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações do admin */}
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Alterar status:</span>
                    {['aberta', 'em_analise', 'resolvida'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(claim, s)}
                        disabled={updating === claim.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                          claim.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    {updating === claim.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Observação do admin</span>
                    <textarea
                      value={noteDraft[claim.id] ?? claim.admin_note ?? ''}
                      onChange={(e) => setNoteDraft((p) => ({ ...p, [claim.id]: e.target.value }))}
                      rows={2}
                      placeholder="Adicione uma observação interna..."
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    onClick={() => saveNote(claim)}
                    disabled={updating === claim.id}
                    className="mt-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                  >
                    Salvar observação
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}