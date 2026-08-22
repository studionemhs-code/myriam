import React, { useState } from 'react';
import { Check, Loader2, FileDown, X, Crown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateAssociationCertificatePdf } from '@/lib/generateAssociationCertificatePdf';
import { downloadPdf } from '@/lib/savePdf';

export default function AssociationApproveDialog({ req, settings, onClose, onApproved }) {
  const [approving, setApproving] = useState(false);
  const [result, setResult] = useState(null);

  const approve = async () => {
    setApproving(true);
    try {
      const approvedReqs = await base44.entities.AssociationRequest.filter({ status: 'aprovado' });
      const seq = String(approvedReqs.length + 1).padStart(4, '0');
      const year = new Date().getFullYear();
      const inscriptionNumber = `AMRC-${year}-${seq}`;
      const approvedDate = new Date().toISOString().slice(0, 10);

      const doc = await generateAssociationCertificatePdf({
        settings,
        userName: req.user_name,
        inscriptionNumber,
        approvedDate,
      });
      const safeName = (req.user_name || 'documento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const fileName = `certificado-${safeName}.pdf`;
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.AssociationRequest.update(req.id, {
        status: 'aprovado',
        approved_date: approvedDate,
        inscription_number: inscriptionNumber,
        certificate_pdf_url: file_url,
      });

      try {
        await base44.functions.invoke('notifyUser', {
          user_id: req.user_id,
          category: 'associacao',
          title: 'Inscrição Aprovada!',
          body: `Sua inscrição na Associação Maria Rainha dos Corações foi aprovada. Nº ${inscriptionNumber}.`,
          link: '/associacao',
        });
      } catch { /* ignore */ }

      setResult({ url: file_url, name: fileName, inscriptionNumber, approvedDate });
      try { downloadPdf(doc, fileName); } catch {}
      onApproved();
    } catch (e) {
      alert('Erro ao aprovar: ' + (e?.message || String(e)));
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {!result ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Crown className="h-6 w-6 text-gold" />
              <h3 className="font-display text-lg">Aprovar Inscrição</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Confirma a aprovação da inscrição de <span className="font-medium text-foreground">{req.user_name}</span>?
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Um número de inscrição e um certificado A4 serão gerados automaticamente e enviados ao usuário.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={approve} disabled={approving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {approving ? 'Aprovando...' : 'Confirmar Aprovação'}
              </button>
              <button onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm">Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-display text-lg">Inscrição Aprovada!</h3>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <p>Nº de inscrição: <span className="font-medium text-gold">{result.inscriptionNumber}</span></p>
              <p>Data de ingresso: {new Date(result.approvedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
            <a href={result.url} download={result.name} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-deep">
              <FileDown className="h-4 w-4" /> Baixar Certificado (A4)
            </a>
            <button onClick={onClose} className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm">Fechar</button>
          </>
        )}
      </div>
    </div>
  );
}