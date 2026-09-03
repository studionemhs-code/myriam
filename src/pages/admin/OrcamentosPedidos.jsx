import React, { useState, useMemo } from 'react';
import { supabase } from '@/api/supabase';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';
import { STATUS_LABEL, STATUS_TONE, ORDER_STATUSES, exportOrdersCsv } from '@/lib/quoteUtils';
import { Download, Eye, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useConfirm } from '@/hooks/useConfirm.jsx';
import ResponsiveSelect from '@/components/ui/responsive-select';

export default function OrcamentosPedidos() {
  const [orders, setOrders] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('quote_requests')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data || [];
  };

  React.useEffect(() => {
    loadOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const reload = async () => setOrders(await loadOrders());

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        return o.customer_name?.toLowerCase().includes(s) || o.whatsapp?.includes(s) || o.city?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [orders, statusFilter, q]);

  const [pendingStatus, setPendingStatus] = useState(null);
  const [trackingCode, setTrackingCode] = useState('');

  const dispatchOrcamentoWebhook = async (id, status) => {
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-webhooks', {
        body: { trigger_type: 'orcamento', entity_id: id, status, app_url: window.location.origin }
      });
      if (error) throw error;
      if (!data?.dispatched) {
        toast({ title: 'Nenhum webhook disparado', description: 'Nenhuma automação ativa atende ao gatilho "orçamento" para este status.', variant: 'destructive' });
      } else if (data.results?.some((r) => !r.ok)) {
        toast({ title: 'Webhook com falha', description: data.results.filter((r) => !r.ok).map((r) => `${r.webhook_name}: ${r.error || `HTTP ${r.status}`}`).join(' · '), variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Falha ao disparar webhook', description: e?.message || 'Erro desconhecido.', variant: 'destructive' });
    }
  };

  const updateStatus = async (id, status, extra = {}) => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .update({ status, ...extra })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      setSelected(data);
      await reload();
      toast({ title: 'Status atualizado', description: `Pedido marcado como ${STATUS_LABEL[status]}.` });
      void dispatchOrcamentoWebhook(id, status);
    } catch (error) {
      toast({ title: 'Não foi possível atualizar o status', description: error.message, variant: 'destructive' });
    }
  };

  const onStatusSelect = (newStatus) => {
    if (newStatus === 'enviado') {
      setPendingStatus('enviado');
      setTrackingCode(selected.tracking_code || '');
    } else {
      void updateStatus(selected.id, newStatus);
    }
  };

  const confirmEnviado = async () => {
    await updateStatus(selected.id, 'enviado', { tracking_code: trackingCode.trim() });
    setPendingStatus(null);
  };

  const deleteOrder = async (id) => {
    if (!await confirm({ title: 'Remover pedido?', description: 'Esta ação não pode ser desfeita.', confirmLabel: 'Remover', destructive: true })) return;
    const { error } = await supabase.from('quote_requests').delete().eq('id', id);
    if (error) {
      toast({ title: 'Não foi possível remover o pedido', description: error.message, variant: 'destructive' });
      return;
    }
    setSelected(null);
    await reload();
    toast({ title: 'Pedido removido', description: 'O pedido foi excluído com sucesso.' });
  };

  if (!orders) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Pedidos" subtitle={`${filtered.length} pedido(s)`} action={
        <button onClick={() => exportOrdersCsv(filtered)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      } />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <input
          placeholder="Buscar por nome, whatsapp ou cidade…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <ResponsiveSelect
          value={statusFilter}
          onChange={setStatusFilter}
          title="Filtrar por status"
          options={[{ value: 'all', label: 'Todos os status' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">WhatsApp</th>
                <th className="p-3">Cidade</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{new Date(o.created_date).toLocaleString('pt-BR')}</td>
                  <td className="p-3 font-medium">{o.customer_name}</td>
                  <td className="p-3">{o.whatsapp}</td>
                  <td className="p-3">{o.city ? `${o.city}/${o.state}` : '—'}</td>
                  <td className="p-3"><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status] || o.status}</Badge></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelected(o); setPendingStatus(null); }} className="rounded-lg p-2 hover:bg-muted"><Eye className="h-4 w-4" /></button>
                      <a href={`https://wa.me/${o.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 hover:bg-muted"><ExternalLink className="h-4 w-4" /></a>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">Pedido de {selected.customer_name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <ResponsiveSelect
                value={selected.status}
                onChange={onStatusSelect}
                title="Status do pedido"
                options={ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">{new Date(selected.created_date).toLocaleString('pt-BR')}</span>
            </div>

            {pendingStatus === 'enviado' && (
              <div className="mb-4 rounded-lg border border-gold/30 bg-gold/5 p-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Código de rastreio</label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: OP123456789BR"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setPendingStatus(null)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
                  <button onClick={confirmEnviado} className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-deep">Confirmar envio</button>
                </div>
              </div>
            )}

            {selected.tracking_code && pendingStatus !== 'enviado' && (
              <div className="mb-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Código de rastreio</p>
                <p className="mt-0.5">{selected.tracking_code}</p>
              </div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="WhatsApp" value={selected.whatsapp} />
              <Info label="CEP" value={selected.cep} />
              <Info label="Endereço" value={`${selected.street || ''}, ${selected.number || ''}${selected.complement ? ' - ' + selected.complement : ''}`} />
              <Info label="Bairro / Cidade" value={`${selected.neighborhood || '—'} · ${selected.city || '—'}/${selected.state || '—'}`} />
            </div>

            <details className="mb-4 rounded-lg border border-border p-3">
              <summary className="cursor-pointer font-medium">Itens do pedido</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify({ chains: selected.chains, medallions: selected.medallions, scapulars: selected.scapulars }, null, 2)}</pre>
            </details>

            {selected.notes && (
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observações</p>
                <p className="mt-1 text-sm">{selected.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <a href={`https://wa.me/${selected.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                <ExternalLink className="h-4 w-4" /> WhatsApp
              </a>
              <button onClick={() => deleteOrder(selected.id)} className="flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Remover
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}