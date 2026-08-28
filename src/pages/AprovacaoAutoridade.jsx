import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Crown, FileDown, Loader2, Check, X, Shield, User, MapPin, Phone, Mail, Calendar, PenTool, Award, Sparkles, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateAssociationCertificatePdf } from '@/lib/generateAssociationCertificatePdf';
import { downloadPdf } from '@/lib/savePdf';

const replacePlaceholders = (text, data) => {
  if (!text) return '';
  return text
    .replace(/{nome}/g, data.nome || '')
    .replace(/{email}/g, data.email || '')
    .replace(/{data}/g, data.data || '')
    .replace(/{cidade}/g, data.cidade || '')
    .replace(/{estado}/g, data.estado || '')
    .replace(/{telefone}/g, data.telefone || '')
    .replace(/{consagracao_data}/g, data.consagracao_data || '');
};

export default function AprovacaoAutoridade() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authorityName, setAuthorityName] = useState('');
  const [authorityNote, setAuthorityNote] = useState('');
  const [submitting, setSubmitting] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('associationApprovalLink', { action: 'get', token });
        setData(res.data);
      } catch (e) {
        setError(e.message || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const decide = async (action) => {
    if (!authorityName.trim()) {
      alert('Informe seu nome como autoridade certificadora.');
      return;
    }
    setSubmitting(action);
    try {
      const res = await base44.functions.invoke('associationApprovalLink', {
        action,
        token,
        authority_name: authorityName,
        authority_note: authorityNote,
      });
      const result = res.data;
      if (action === 'approve' && result?.ok) {
        // Gerar certificado A4 no cliente e enviar para o backend anexar
        try {
          const doc = await generateAssociationCertificatePdf({
            settings: data.settings,
            userName: data.request.user_name,
            inscriptionNumber: result.inscriptionNumber,
            approvedDate: result.approvedDate,
          });
          const safeName = (data.request.user_name || 'documento').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const fileName = `certificado-${safeName}.pdf`;
          const blob = doc.output('blob');
          const file = new File([blob], fileName, { type: 'application/pdf' });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          await base44.functions.invoke('associationApprovalLink', {
            action: 'attach_certificate',
            token,
            certificate_pdf_url: file_url,
          });
          setResult({ action, inscriptionNumber: result.inscriptionNumber, approvedDate: result.approvedDate, certificateUrl: file_url });
        } catch (certErr) {
          // Mesmo se o certificado falhar, a aprovação já foi registrada
          setResult({ action, inscriptionNumber: result.inscriptionNumber, approvedDate: result.approvedDate, certError: true });
        }
      } else {
        setResult({ action });
      }
    } catch (e) {
      alert(e.message || 'Erro ao processar decisão.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-amber-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-amber-50 p-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <X className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-3 font-display text-xl">Link inválido</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 py-8 px-4">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-gold/30 bg-card p-8 text-center shadow-lg">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.action === 'approve' ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {result.action === 'approve' ? <Check className="h-8 w-8 text-emerald-600" /> : <X className="h-8 w-8 text-red-500" />}
            </div>
            <h1 className="mt-4 font-display text-2xl">
              {result.action === 'approve' ? 'Ingresso Aprovado' : 'Ingresso Não Aprovado'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.action === 'approve'
                ? `A inscrição foi aprovada com sucesso. Nº ${result.inscriptionNumber}.`
                : 'A solicitação foi rejeitada.'}
            </p>
            {result.action === 'approve' && result.certificateUrl && (
              <a href={result.certificateUrl} download target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep">
                <FileDown className="h-5 w-5" /> Baixar Certificado (A4)
              </a>
            )}
            {result.action === 'approve' && result.certError && (
              <p className="mt-4 text-xs text-muted-foreground">
                A aprovação foi registrada, mas houve um problema ao gerar o certificado. A administração irá emiti-lo.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { request: req, settings } = data;
  const isDecided = req.status !== 'pendente';
  const placeholderData = {
    nome: req.user_name || '',
    email: req.user_email || '',
    data: req.request_date ? new Date(req.request_date + 'T00:00:00').toLocaleDateString('pt-BR') : '',
    cidade: req.personal_data?.city || '',
    estado: req.personal_data?.state || '',
    telefone: req.personal_data?.phone || '',
    consagracao_data: req.user_data?.consecration_date ? new Date(req.user_data.consecration_date + 'T00:00:00').toLocaleDateString('pt-BR') : '',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50">
      {/* Header */}
      <header className="border-b border-gold/20 bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
              <Crown className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h1 className="font-display text-lg">Associação Maria Rainha dos Corações</h1>
              <p className="text-xs text-muted-foreground">Portal da Autoridade Certificadora</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Status banner */}
        {isDecided && (
          <div className={`rounded-2xl border p-4 ${req.status === 'aprovado' ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-center gap-2">
              {req.status === 'aprovado' ? <Check className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-red-500" />}
              <p className="font-medium text-sm">
                {req.status === 'aprovado' ? `Solicitação já aprovada — Nº ${req.inscription_number || ''}` : 'Solicitação já rejeitada'}
              </p>
            </div>
            {req.authority_name && (
              <p className="mt-1 text-xs text-muted-foreground">
                Decidido por {req.authority_name} em {req.authority_decision_date ? new Date(req.authority_decision_date).toLocaleString('pt-BR') : ''}
              </p>
            )}
          </div>
        )}

        {/* Solicitante */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-gold" />
            <h2 className="font-display text-base">Dados do Requerente</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">{req.user_name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</p>
              <p className="text-sm">{req.user_email}</p>
            </div>
            {req.personal_data?.city && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Cidade</p>
                <p className="text-sm">{req.personal_data.city}</p>
              </div>
            )}
            {req.personal_data?.state && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Estado</p>
                <p className="text-sm">{req.personal_data.state}</p>
              </div>
            )}
            {req.personal_data?.phone && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</p>
                <p className="text-sm">{req.personal_data.phone}</p>
              </div>
            )}
            {req.user_data?.consecration_date && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Data da Consagração</p>
                <p className="text-sm text-gold">{new Date(req.user_data.consecration_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </div>
        </section>

        {/* PDF Download */}
        {req.pdf_url && (
          <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-amber-50/50 p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold" />
              <h2 className="font-display text-base">Documentos do Requerente</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Baixe o PDF com a solicitação completa, termo declaratório e assinatura do requerente.
            </p>
            <a href={req.pdf_url} download target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep">
              <FileDown className="h-5 w-5" /> Baixar PDF da Solicitação
            </a>
          </section>
        )}

        {/* Termos e Declarações */}
        {settings && (
          <>
            {settings.request_body_text && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gold" />
                  <h2 className="font-display text-base">{settings.request_title || 'Solicitação de Ingresso'}</h2>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {replacePlaceholders(settings.request_body_text, placeholderData)}
                </p>
              </section>
            )}

            {settings.declaration_text && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gold" />
                  <h2 className="font-display text-base">Termo Declaratório</h2>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {replacePlaceholders(settings.declaration_text, placeholderData)}
                </p>
              </section>
            )}
          </>
        )}

        {/* Assinatura */}
        {req.signature_data && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <PenTool className="h-5 w-5 text-gold" />
              <h2 className="font-display text-base">Assinatura do Requerente</h2>
            </div>
            <div className="flex items-center justify-center rounded-xl border border-border bg-white p-4 min-h-[100px]">
              {req.signature_type === 'typed' ? (
                <span className="text-2xl italic" style={{ fontFamily: 'cursive, serif' }}>{req.signature_data}</span>
              ) : (
                <img src={req.signature_data} alt="Assinatura" className="max-h-24" />
              )}
            </div>
          </section>
        )}

        {/* Formulário de Decisão */}
        {!isDecided && (
          <section className="rounded-2xl border-2 border-gold/40 bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-gold" />
              <h2 className="font-display text-base">Decisão da Autoridade Certificadora</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome da autoridade *</label>
                <input
                  value={authorityName}
                  onChange={(e) => setAuthorityName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observação (opcional)</label>
                <textarea
                  value={authorityNote}
                  onChange={(e) => setAuthorityNote(e.target.value)}
                  rows={2}
                  placeholder="Observação sobre a decisão..."
                  className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => decide('approve')}
                  disabled={submitting !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {submitting === 'approve' ? 'Aprovando...' : 'Aprovar Ingresso'}
                </button>
                <button
                  onClick={() => decide('reject')}
                  disabled={submitting !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {submitting === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  {submitting === 'reject' ? 'Rejeitando...' : 'Rejeitar'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="pb-8 pt-4 text-center">
          <div className="gold-line mx-auto mb-3 w-16 opacity-40" />
          <p className="text-xs text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-gold" />
            Theotokos · Associação Maria Rainha dos Corações
          </p>
        </footer>
      </main>
    </div>
  );
}