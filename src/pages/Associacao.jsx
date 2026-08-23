import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, FileDown, Loader2, PenLine, Upload, Check, FileText, ArrowLeft, PenTool, Award, Phone, Mail, Instagram, Calendar, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader } from '@/components/ui/marian';
import { generateAssociationPdf } from '@/lib/generateAssociationPdf';
import { downloadPdf } from '@/lib/savePdf';
import { getIndulgenceDays, getNextIndulgenceDay } from '@/lib/indulgenceDates';
import SignaturePad from '@/components/associacao/SignaturePad';
import PdfViewer from '@/components/PdfViewer';

const statusInfo = {
  pendente: { label: 'Em Análise', icon: Crown, color: 'text-gold', bg: 'bg-gold/10' },
  aprovado: { label: 'Aprovado', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejeitado: { label: 'Não Aprovado', icon: Crown, color: 'text-red-600', bg: 'bg-red-50' },
};

export default function Associacao() {
  const { user } = useCurrentUser();
  const [settings, setSettings] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('read');
  const [docRead, setDocRead] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', city: '', state: '', phone: '' });
  const [sigType, setSigType] = useState('typed');
  const [sigTyped, setSigTyped] = useState('');
  const [sigDrawn, setSigDrawn] = useState(null);
  const [sigUploaded, setSigUploaded] = useState('');
  const [uploadingSig, setUploadingSig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [docOpen, setDocOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, name: user.display_name || user.full_name || '', email: user.email || '' }));
      setSigTyped(user.display_name || user.full_name || '');
    }
  }, [user]);

  const [journeyData, setJourneyData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [settingsList, reqs] = await Promise.all([
          base44.entities.AssociationSettings.list(),
          user ? base44.entities.AssociationRequest.filter({ user_id: user.id }, '-request_date', 1) : []
        ]);
        setSettings(settingsList[0] || null);
        setExisting(reqs[0] || null);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [progressList, participants] = await Promise.all([
          base44.entities.UserProgress.filter({ created_by_id: user.id }, '-created_date', 1),
          base44.entities.JourneyParticipant.filter({ created_by_id: user.id }, '-joined_date', 10),
        ]);
        const progress = progressList[0] || null;
        let journeys = [];
        if (participants.length > 0) {
          const journeyIds = participants.map((p) => p.journey_id);
          const allJourneys = await base44.entities.CollectiveJourney.list();
          journeys = participants.map((p) => {
            const jrn = allJourneys.find((j) => j.id === p.journey_id);
            return jrn ? { title: jrn.title, joined_date: p.joined_date, progress: p.progress } : null;
          }).filter(Boolean);
        }
        if (progress || journeys.length > 0) {
          setJourneyData({ progress, journeys });
        }
      } catch { /* ignore */ }
    })();
  }, [user]);

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
    if (!settings || !user) return;
    if (!form.name.trim()) { alert('Preencha seu nome completo.'); return; }
    if (sigType === 'typed' && !sigTyped.trim()) { alert('Digite seu nome para a assinatura.'); return; }
    if (sigType === 'drawn' && !sigDrawn) { alert('Desenhe sua assinatura.'); return; }
    if (sigType === 'uploaded' && !sigUploaded) { alert('Envie sua assinatura.'); return; }
    setGenerating(true);
    try {
      const requestDate = new Date().toISOString().slice(0, 10);
      const userData = { ...form, consecration_date: user.consecration_date };
      const signature = sigType === 'typed'
        ? { type: 'typed', data: sigTyped }
        : sigType === 'drawn'
        ? { type: 'drawn', data: sigDrawn }
        : { type: 'uploaded', data: sigUploaded };

      const doc = await generateAssociationPdf({ settings, userData, signature, requestDate, journeyData });
      const safeName = form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const fileName = `solicitacao-${safeName || 'documento'}.pdf`;
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.AssociationRequest.create({
        user_id: user.id,
        user_name: form.name,
        user_email: form.email,
        user_data: { consecration_date: user.consecration_date, status: user.status },
        settings_snapshot: settings,
        document_read: true,
        document_read_date: new Date().toISOString(),
        personal_data: { city: form.city, state: form.state, phone: form.phone },
        signature_type: sigType,
        signature_data: sigType === 'typed' ? sigTyped : sigType === 'drawn' ? sigDrawn : sigUploaded,
        pdf_url: file_url,
        status: 'pendente',
        request_date: requestDate,
      });

      setGenerated({ url: file_url, name: fileName });
      try { downloadPdf(doc, fileName); } catch (e) { console.error(e); }
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar solicitação: ' + (e?.message || String(e)));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (!settings || !settings.is_active) {
    return (
      <div>
        <PageHeader title="Associação Maria Rainha dos Corações" icon={Crown} />
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Crown className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">As inscrições para a associação não estão disponíveis no momento.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-gold">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  if (existing && !generated) {
    const info = statusInfo[existing.status] || statusInfo.pendente;
    const Icon = info.icon;
    const isApproved = existing.status === 'aprovado';
    const indulgenceDays = isApproved ? getIndulgenceDays(new Date().getFullYear(), existing.approved_date) : [];
    const nextIndulgence = isApproved ? getNextIndulgenceDay(existing.approved_date) : null;
    const montfortIg = settings?.montfortian_instagram || '@missionariosmonforinosbrasil';
    const montfortWa = settings?.montfortian_whatsapp || '5531985161127';
    const montfortEmail = settings?.montfortian_email || 'espiritualidademonfortina@hotmail.com';
    const waLink = `https://wa.me/${montfortWa}`;
    const igLink = `https://instagram.com/${montfortIg.replace('@', '')}`;
    return (
      <div className="space-y-6">
        <PageHeader title="Associação Maria Rainha dos Corações" icon={Crown} />

        <section className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${info.bg}`}>
            <Icon className={`h-8 w-8 ${info.color}`} />
          </div>
          <h2 className="mt-4 font-display text-xl">Solicitação {info.label}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua solicitação foi enviada em {new Date(existing.request_date).toLocaleDateString('pt-BR')}.
          </p>
          {existing.admin_note && (
            <div className="mt-4 rounded-xl bg-muted/50 p-3 text-left text-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observação da administração</p>
              <p className="mt-1">{existing.admin_note}</p>
            </div>
          )}
          {existing.pdf_url && (
            <a href={existing.pdf_url} download target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep">
              <FileDown className="h-5 w-5" /> Baixar PDF da Solicitação
            </a>
          )}
        </section>

        {isApproved && (
          <>
            <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
                  <Award className="h-6 w-6 text-gold" />
                </div>
                <div>
                  <h3 className="font-display text-lg">Inscrição Confirmada</h3>
                  <p className="text-xs text-muted-foreground">Associação Maria Rainha dos Corações</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Nº de Inscrição</p>
                  <p className="mt-1 font-display text-lg text-gold">{existing.inscription_number || '—'}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Data de Ingresso</p>
                  <p className="mt-1 font-display text-lg">{existing.approved_date ? new Date(existing.approved_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                </div>
              </div>
              {existing.certificate_pdf_url && (
                <a href={existing.certificate_pdf_url} download target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep">
                  <FileDown className="h-5 w-5" /> Baixar Certificado (A4)
                </a>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gold" />
                <h3 className="font-display text-base">Dias para Lucrar Indulgências</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Como membro da Associação, você pode lucrar indulgências nos seguintes dias:
              </p>
              {nextIndulgence && (
                <div className="mt-3 rounded-xl bg-gold/10 p-3 text-sm">
                  <p className="font-medium text-gold">Próximo: {nextIndulgence.label}</p>
                  <p className="text-xs text-muted-foreground">{nextIndulgence.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
              )}
              <ul className="mt-3 space-y-2">
                {indulgenceDays.map((d, i) => (
                  <li key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5">
                    <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg bg-gold/10 text-gold">
                      <span className="font-display text-sm leading-none">{d.date.getDate()}</span>
                      <span className="text-[8px] uppercase">{d.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                    </div>
                    <span className="flex-1 text-sm">{d.label}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gold" />
                <h3 className="font-display text-base">Contato dos Missionários Monfortinos</h3>
              </div>
              <div className="mt-3 space-y-2">
                <a href={igLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                  <Instagram className="h-5 w-5 text-primary" />
                  <span className="text-sm">{montfortIg}</span>
                </a>
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                  <Phone className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">WhatsApp: +{montfortWa.replace(/^55/, '55 ')}</span>
                </a>
                <a href={`mailto:${montfortEmail}`} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                  <Mail className="h-5 w-5 text-primary" />
                  <span className="text-sm">{montfortEmail}</span>
                </a>
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  if (generated) {
    return (
      <div className="space-y-6">
        <PageHeader title="Solicitação Enviada" icon={Crown} />
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
            <Check className="h-8 w-8 text-gold" />
          </div>
          <h2 className="mt-4 font-display text-2xl text-primary">Sua solicitação foi enviada!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O PDF com sua solicitação e termo declaratório foi gerado e enviado para análise.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={generated.url} download={generated.name} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep">
              <FileDown className="h-5 w-5" /> Baixar PDF
            </a>
            <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium">
              Voltar ao início
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Associação Maria Rainha dos Corações" subtitle="Solicitação de Ingresso" icon={Crown} />

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-1.5 ${step === 'read' ? 'text-gold' : 'text-muted-foreground'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step === 'read' ? 'bg-gold text-deep' : 'bg-muted'}`}>1</span>
          Leitura
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-1.5 ${step === 'form' ? 'text-gold' : 'text-muted-foreground'}`}>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step === 'form' ? 'bg-gold text-deep' : 'bg-muted'}`}>2</span>
          Preenchimento
        </div>
      </div>

      {step === 'read' && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold" />
              <h2 className="font-display text-lg">{settings.reading_document_label || 'Documento de Leitura Obrigatória'}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Leia atentamente o documento abaixo. Após a leitura, marque a opção "Documento lido" para prosseguir.
            </p>
            {settings.reading_document_url ? (
              <>
                <button onClick={() => setDocOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 py-4 text-sm font-medium hover:bg-muted">
                  <FileText className="h-5 w-5 text-gold" /> Abrir documento de leitura
                </button>
                <a href={settings.reading_document_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary">
                  <FileText className="h-4 w-4" /> Abrir em nova aba
                </a>
                <PdfViewer url={settings.reading_document_url} open={docOpen} onClose={() => setDocOpen(false)} fileName={settings.reading_document_label || 'Documento'} />
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">Documento não disponível.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={docRead} onChange={(e) => setDocRead(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-border accent-primary" />
              <span className="text-sm font-medium">Documento lido. Declaro que li e compreendi o conteúdo do documento apresentado.</span>
            </label>
            <button
              onClick={() => setStep('form')}
              disabled={!docRead}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 font-medium text-deep disabled:opacity-40"
            >
              Continuar para preenchimento
            </button>
          </section>
        </>
      )}

      {step === 'form' && (
        <>
          <button onClick={() => setStep('read')} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para leitura
          </button>

          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Seus dados</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Cidade" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Estado" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefone" className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm sm:col-span-2" />
            </div>
            {user?.consecration_date && (
              <p className="mt-3 text-xs text-muted-foreground">Data da Consagração: <span className="text-gold">{new Date(user.consecration_date).toLocaleDateString('pt-BR')}</span></p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Assinatura</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setSigType('typed')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${sigType === 'typed' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                <PenLine className="h-4 w-4" /> Digitar nome
              </button>
              <button onClick={() => setSigType('drawn')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${sigType === 'drawn' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                <PenTool className="h-4 w-4" /> Desenhar
              </button>
              <button onClick={() => setSigType('uploaded')} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm ${sigType === 'uploaded' ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>
                <Upload className="h-4 w-4" /> Enviar imagem
              </button>
            </div>
            <div className="mt-3">
              {sigType === 'typed' && (
                <input value={sigTyped} onChange={(e) => setSigTyped(e.target.value)} placeholder="Digite seu nome completo" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg italic" style={{ fontFamily: 'cursive, serif' }} />
              )}
              {sigType === 'drawn' && <SignaturePad onChange={setSigDrawn} />}
              {sigType === 'uploaded' && (
                sigUploaded ? (
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
                )
              )}
            </div>
          </section>

          <button onClick={generate} disabled={generating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 font-medium text-deep disabled:opacity-40">
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
            {generating ? 'Gerando solicitação...' : 'Gerar e enviar solicitação (PDF)'}
          </button>
        </>
      )}
    </div>
  );
}