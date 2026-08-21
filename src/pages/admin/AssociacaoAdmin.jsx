import React, { useEffect, useState } from 'react';
import { Crown, FileDown, Check, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';
import AssociationSettingsForm from '@/components/admin/AssociationSettingsForm';

const statusInfo = {
  pendente: { label: 'Pendente', tone: 'gold' },
  aprovado: { label: 'Aprovado', tone: 'green' },
  rejeitado: { label: 'Rejeitado', tone: 'red' },
};

export default function AssociacaoAdmin() {
  const [settings, setSettings] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('settings');

  const load = async () => {
    try {
      const [settingsList, reqs] = await Promise.all([
        base44.entities.AssociationSettings.list(),
        base44.entities.AssociationRequest.list('-request_date', 50)
      ]);
      setSettings(settingsList[0] || null);
      setRequests(reqs);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status, note) => {
    try {
      await base44.entities.AssociationRequest.update(id, { status, admin_note: note || '' });
      load();
    } catch (e) { alert('Erro ao atualizar solicitação.'); }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Associação Maria Rainha dos Corações" subtitle="Automação de ingresso na associação" />

      <div className="mb-5 flex gap-2 border-b border-border">
        <button onClick={() => setTab('settings')} className={`px-4 py-2 text-sm font-medium ${tab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>Configurações</button>
        <button onClick={() => setTab('requests')} className={`px-4 py-2 text-sm font-medium ${tab === 'requests' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>Solicitações ({requests.length})</button>
      </div>

      {tab === 'settings' && (
        <AssociationSettingsForm settings={settings || {}} onSaved={load} />
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Crown className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma solicitação de ingresso recebida.</p>
            </div>
          ) : (
            requests.map((r) => (
              <RequestCard key={r.id} req={r} onUpdateStatus={updateStatus} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, onUpdateStatus }) {
  const [note, setNote] = useState(req.admin_note || '');
  const info = statusInfo[req.status] || statusInfo.pendente;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{req.user_name}</p>
            <Badge tone={info.tone}>{info.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{req.user_email} · Solicitado em {new Date(req.request_date).toLocaleDateString('pt-BR')}</p>
        </div>
        {req.pdf_url && (
          <a href={req.pdf_url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-primary hover:bg-muted">
            <FileDown className="h-4 w-4" /> Ver PDF
          </a>
        )}
      </div>

      {req.personal_data && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          {req.personal_data.city && <span>Cidade: {req.personal_data.city}</span>}
          {req.personal_data.state && <span>Estado: {req.personal_data.state}</span>}
          {req.personal_data.phone && <span>Telefone: {req.personal_data.phone}</span>}
        </div>
      )}

      {req.status === 'pendente' && (
        <div className="mt-4 space-y-3">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (opcional)..." rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => onUpdateStatus(req.id, 'aprovado', note)} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
              <Check className="h-4 w-4" /> Aprovar
            </button>
            <button onClick={() => onUpdateStatus(req.id, 'rejeitado', note)} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">
              <X className="h-4 w-4" /> Rejeitar
            </button>
          </div>
        </div>
      )}

      {req.status !== 'pendente' && req.admin_note && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observação</p>
          <p className="mt-1">{req.admin_note}</p>
        </div>
      )}
    </div>
  );
}