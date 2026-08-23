import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Award, FileDown, Loader2, PenLine, Upload, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader } from '@/components/ui/marian';
import { generateCertificatePdf } from '@/lib/generateCertificatePdf';
import { downloadPdf } from '@/lib/savePdf';

export default function Certificado() {
  const [params] = useSearchParams();
  const type = params.get('type') || 'preparacao';
  const journeyId = params.get('journeyId');
  const { user } = useCurrentUser();
  const [template, setTemplate] = useState(null);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', city: '', state: '' });
  const [agreed, setAgreed] = useState(false);
  const [sigType, setSigType] = useState('typed');
  const [sigTyped, setSigTyped] = useState('');
  const [sigUploaded, setSigUploaded] = useState('');
  const [uploadingSig, setUploadingSig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.display_name || user.full_name || '', email: user.email || '' }));
      setSigTyped(user.display_name || user.full_name || '');
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const templates = await base44.entities.CertificateTemplate.filter({ certificate_type: type, is_active: true });
        setTemplate(templates[0] || null);
        if (journeyId) {
          const j = await base44.entities.CollectiveJourney.filter({ id: journeyId });
          setJourney(j[0] || null);
        }
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, [type, journeyId]);

  const onSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSigUploaded(file_url);
    } catch { alert('Erro ao enviar assinatura.'); }
    finally { setUploadingSig(false); }
  };

  const generate = async () => {
    if (!template || !user) return;
    if (!agreed) { alert('É necessário concordar com o conteúdo para emitir o certificado.'); return; }
    if (!form.name.trim()) { alert('Preencha seu nome completo.'); return; }
    if (sigType === 'typed' && !sigTyped.trim()) { alert('Digite seu nome para a assinatura.'); return; }
    if (sigType === 'uploaded' && !sigUploaded) { alert('Envie sua assinatura digitalizada.'); return; }
    setGenerating(true);
    try {
      const issueDate = new Date().toISOString().slice(0, 10);
      const signature = sigType === 'typed' ? { type: 'typed', data: sigTyped } : { type: 'uploaded', data: sigUploaded };
      const doc = await generateCertificatePdf({
        template,
        userData: form,
        signature,
        issueDate,
        certificateType: type,
        journeyTitle: journey?.title
      });

      const fileName = `certificado-${form.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Certificate.create({
        user_id: user.id,
        user_name: form.name,
        user_email: form.email,
        template_id: template.id,
        template_snapshot: template,
        certificate_type: type,
        journey_id: journeyId || null,
        journey_title: journey?.title || null,
        issue_date: issueDate,
        agreement_accepted: true,
        agreement_text: template.agreement_text,
        signature_type: sigType,
        signature_data: sigType === 'typed' ? sigTyped : sigUploaded,
        personal_data: { city: form.city, state: form.state },
        pdf_url: file_url
      });

      downloadPdf(doc, fileName);
      setGenerated({ url: file_url, name: fileName });
    } catch (e) {
      alert('Erro ao gerar certificado.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (!template) {
    return (
      <div>
        <PageHeader title="Certificado" icon={Award} />
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Award className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum modelo de certificado disponível no momento.</p>
        </div>
      </div>
    );
  }

  if (generated) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificado Emitido" icon={Award} />
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
            <Check className="h-8 w-8 text-gold" />
          </div>
          <h2 className="mt-4 font-display text-2xl text-primary">Seu certificado está pronto!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O PDF unificado com o certificado e o termo de concordância foi gerado e salvo em sua conta.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={generated.url}
              download={generated.name}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep"
            >
              <FileDown className="h-5 w-5" /> Baixar PDF
            </a>
            <Link
              to="/minha-consagracao"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium"
            >
              Ver em Minha Consagração
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Certificado de Conclusão" icon={Award} />

      {/* Termo de concordância */}
      {template.agreement_text && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Conteúdo do certificado</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{template.agreement_text}</p>
          <label className="mt-4 flex items-start gap-3">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
            <span className="text-sm">Concordo com o conteúdo acima e afirmo que as informações fornecidas são verdadeiras.</span>
          </label>
        </section>
      )}

      {/* Dados pessoais */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Seus dados</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Cidade" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
          <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Estado" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        </div>
      </section>

      {/* Assinatura */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Assinatura</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setSigType('typed')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${sigType === 'typed' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
            <PenLine className="h-4 w-4" /> Digitar nome
          </button>
          <button onClick={() => setSigType('uploaded')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${sigType === 'uploaded' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
            <Upload className="h-4 w-4" /> Assinatura digitalizada
          </button>
        </div>
        <div className="mt-3">
          {sigType === 'typed' ? (
            <input value={sigTyped} onChange={(e) => setSigTyped(e.target.value)} placeholder="Digite seu nome completo" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg italic" style={{ fontFamily: 'cursive, serif' }} />
          ) : (
            <div>
              {sigUploaded ? (
                <div className="flex items-center gap-3">
                  <img src={sigUploaded} alt="Assinatura" className="max-h-24 rounded-lg border border-border bg-white p-2" />
                  <button onClick={() => setSigUploaded('')} className="text-sm text-destructive">Remover</button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-sm text-muted-foreground hover:border-gold/40">
                  {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingSig ? 'Enviando...' : 'Enviar imagem da assinatura'}
                  <input type="file" accept="image/*" className="hidden" onChange={onSigUpload} disabled={uploadingSig} />
                </label>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Gerar */}
      <button
        onClick={generate}
        disabled={generating || !agreed}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-medium text-deep disabled:opacity-40"
      >
        {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
        {generating ? 'Gerando certificado...' : 'Emitir e baixar certificado (PDF)'}
      </button>
    </div>
  );
}