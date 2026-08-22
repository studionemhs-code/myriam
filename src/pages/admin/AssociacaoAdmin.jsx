import React, { useEffect, useState } from 'react';
import { Crown, FileDown, Check, X, Link2, Shield, Award, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';
import AssociationSettingsForm from '@/components/admin/AssociationSettingsForm';
import AssociationApproveDialog from '@/components/admin/AssociationApproveDialog';
import AssociationApprovalLinkDialog from '@/components/admin/AssociationApprovalLinkDialog';

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
    if (!id) { load(); return; }
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
              <RequestCard key={r.id} req={r} settings={settings} onUpdateStatus={updateStatus} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, settings, onUpdateStatus }) {
  const [note, setNote] = useState(req.admin_note || '');
  const [showApprove, setShowApprove] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const info = statusInfo[req.status] || statusInfo.pendente;

  const emitCertificate = async () => {
    setGeneratingCert(true);
    try {
      const { generateAssociationCertificatePdf } = await import('@/lib/generateAssociationCertificatePdf');
      const doc = await generateAssociationCertificatePdf({
        settings,
        userName: req.user_name,
        inscriptionNumber: req.inscription_number,
        approvedDate: req.approved_date,
      });
      const safeName = (req.user_name || 'documento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const fileName = `certificado-${safeName}.pdf`;
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.AssociationRequest.update(req.id, { certificate_pdf_url: file_url });
      try { (await import('@/lib/savePdf')).downloadPdf(doc, fileName); } catch {}
      window.location.reload();
    } catch (e) {
      alert('Erro ao emitir certificado: ' + (e?.message || String(e)));
    } finally {
      setGeneratingCert(false);
    }
  };
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
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowApprove(true)} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
              <Check className="h-4 w-4" /> Aprovar e emitir certificado
            </button>
            <button onClick={() => setShowLink(true)} className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold">
              <Link2 className="h-4 w-4" /> {req.approval_token ? 'Ver Link' : 'Gerar Link'} da Autoridade
            </button>
            <button onClick={() => onUpdateStatus(req.id, 'rejeitado', note)} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">
              <X className="h-4 w-4" /> Rejeitar
            </button>
          </div>
        </div>
      )}

      {req.status === 'aprovado' && !req.certificate_pdf_url && (
        <button onClick={emitCertificate} disabled={generatingCert} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-deep disabled:opacity-50">
          {generatingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
          {generatingCert ? 'Emitindo...' : 'Emitir Certificado A4'}
        </button>
      )}

      {req.authority_name && req.status !== 'pendente' && (
        <div className="mt-3 rounded-lg bg-gold/5 border border-gold/20 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gold">
            <Shield className="h-3.5 w-3.5" /> Decisão da Autoridade Certificadora
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {req.authority_name} · {req.authority_decision_date ? new Date(req.authority_decision_date).toLocaleString('pt-BR') : ''}
          </p>
          {req.authority_note && <p className="mt-1 text-xs">{req.authority_note}</p>}
        </div>
      )}

      {req.status === 'aprovado' && req.certificate_pdf_url && (
        <a href={req.certificate_pdf_url} download target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold">
          <FileDown className="h-4 w-4" /> Certificado A4
        </a>
      )}

      {showApprove && (
        <AssociationApproveDialog req={req} settings={settings || {}} onClose={() => setShowApprove(false)} onApproved={() => { setShowApprove(false); onUpdateStatus(); }} />
      )}

      {showLink && (
        <AssociationApprovalLinkDialog req={req} onClose={() => setShowLink(false)} onGenerated={() => onUpdateStatus()} />
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