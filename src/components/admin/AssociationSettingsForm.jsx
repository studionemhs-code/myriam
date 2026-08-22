import React, { useState } from 'react';
import { Upload, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Field, inputCls } from '@/components/admin/ui';
import AssociationCertificateEditor from '@/components/admin/AssociationCertificateEditor';

const DEFAULTS = {
  reading_document_url: '',
  reading_document_label: 'Estatuto da Associação',
  request_title: 'Solicitação de Ingresso',
  request_subtitle: 'Associação Maria Rainha dos Corações',
  request_body_text: 'Eu, {nome}, consagrado(a) a Jesus por Maria desde {consagracao_data}, venho por meio deste documento solicitar meu ingresso na Associação Maria Rainha dos Corações, comprometendo-me a viver os ideais de devoção e serviço segundo o caráter próprio da associação.',
  declaration_text: 'Declaro que todas as informações fornecidas neste documento são verdadeiras. Li e compreendi integralmente o estatuto da Associação Maria Rainha dos Corações, e comprometo-me a observar suas normas e diretrizes caso meu ingresso seja aprovado.',
  footer_text: 'Theotokos · Associação Maria Rainha dos Corações',
  primary_color: '#673ab7',
  accent_color: '#c9a14a',
  border_style: 'classic',
  issuer_name: 'Associação Maria Rainha dos Corações',
  issuer_signature_url: '',
  is_active: false,
  cert_title: 'Certificado de Ingresso',
  cert_subtitle: 'Associação Maria Rainha dos Corações',
  cert_body_text: 'Certificamos que {nome}, após cumprir os requisitos necessários, foi admitido(a) como membro da Associação Maria Rainha dos Corações, sob o número de inscrição {numero}, a partir de {data}, comprometendo-se a viver os ideais montfortinos de devoção e serviço.',
  cert_logo_url: '',
  cert_signature_url: '',
  cert_issuer_name: 'Associação Maria Rainha dos Corações',
  cert_border_style: 'classic',
  cert_primary_color: '#673ab7',
  cert_accent_color: '#c9a14a',
  cert_footer_text: 'Theotokos · Associação Maria Rainha dos Corações',
  montfortian_instagram: '@missionariosmonforinosbrasil',
  montfortian_whatsapp: '5531985161127',
  montfortian_email: 'espiritualidademonfortina@hotmail.com'
};

export default function AssociationSettingsForm({ settings, onSaved }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...settings });
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('reading_document_url', file_url);
    } catch { alert('Erro ao enviar documento.'); }
    finally { setUploadingDoc(false); }
  };

  const onSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('issuer_signature_url', file_url);
    } catch { alert('Erro ao enviar assinatura.'); }
    finally { setUploadingSig(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
      if (form.id) await base44.entities.AssociationSettings.update(form.id, payload);
      else await base44.entities.AssociationSettings.create(payload);
      onSaved();
    } catch (e) {
      alert('Erro ao salvar configurações.');
      console.error(e);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-5 w-5 rounded border-border accent-primary" />
          <span className="text-sm font-medium">Automação ativa — exibir o botão de solicitação para os consagrados elegíveis</span>
        </label>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-base">Documento de Leitura Obrigatória</h3>
        <div className="grid gap-4">
          <Field label="Nome do documento (ex: Estatuto da Associação)">
            <input className={inputCls} value={form.reading_document_label || ''} onChange={(e) => set('reading_document_label', e.target.value)} />
          </Field>
          <Field label="Arquivo do documento (PDF)">
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} value={form.reading_document_url || ''} onChange={(e) => set('reading_document_url', e.target.value)} placeholder="URL do documento" />
              <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload PDF
                <input type="file" accept="application/pdf" className="hidden" onChange={onDocUpload} disabled={uploadingDoc} />
              </label>
            </div>
          </Field>
          {form.reading_document_url && (
            <a href={form.reading_document_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">Ver documento atual →</a>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-base">Textos do PDF de Solicitação</h3>
        <div className="grid gap-4">
          <Field label="Título da solicitação"><input className={inputCls} value={form.request_title || ''} onChange={(e) => set('request_title', e.target.value)} /></Field>
          <Field label="Subtítulo"><input className={inputCls} value={form.request_subtitle || ''} onChange={(e) => set('request_subtitle', e.target.value)} /></Field>
          <Field label="Texto da solicitação — use {nome}, {email}, {data}, {cidade}, {estado}, {telefone}, {consagracao_data}">
            <ReactQuill theme="snow" value={form.request_body_text || ''} onChange={(v) => set('request_body_text', v)} />
          </Field>
          <Field label="Termo declaratório — use os mesmos placeholders">
            <ReactQuill theme="snow" value={form.declaration_text || ''} onChange={(v) => set('declaration_text', v)} />
          </Field>
          <Field label="Rodapé"><input className={inputCls} value={form.footer_text || ''} onChange={(e) => set('footer_text', e.target.value)} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-base">Design do PDF</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cor primária">
            <div className="flex gap-2">
              <input type="color" value={form.primary_color || '#673ab7'} onChange={(e) => set('primary_color', e.target.value)} className="h-10 w-14 rounded border border-input" />
              <input className={inputCls} value={form.primary_color || ''} onChange={(e) => set('primary_color', e.target.value)} />
            </div>
          </Field>
          <Field label="Cor de destaque (dourado)">
            <div className="flex gap-2">
              <input type="color" value={form.accent_color || '#c9a14a'} onChange={(e) => set('accent_color', e.target.value)} className="h-10 w-14 rounded border border-input" />
              <input className={inputCls} value={form.accent_color || ''} onChange={(e) => set('accent_color', e.target.value)} />
            </div>
          </Field>
          <Field label="Estilo da borda">
            <select className={inputCls} value={form.border_style || 'classic'} onChange={(e) => set('border_style', e.target.value)}>
              <option value="classic">Clássico (borda dupla)</option>
              <option value="modern">Moderno (borda grossa)</option>
              <option value="minimal">Minimalista (borda fina)</option>
            </select>
          </Field>
          <Field label="Nome do emissor"><input className={inputCls} value={form.issuer_name || ''} onChange={(e) => set('issuer_name', e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Assinatura do emissor (opcional)">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={form.issuer_signature_url || ''} onChange={(e) => set('issuer_signature_url', e.target.value)} placeholder="URL da imagem" />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
                  {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                  <input type="file" accept="image/*" className="hidden" onChange={onSigUpload} disabled={uploadingSig} />
                </label>
              </div>
            </Field>
          </div>
        </div>
      </section>

      <AssociationCertificateEditor form={form} set={set} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-base">Contato dos Missionários Monfortinos</h3>
        <div className="grid gap-4">
          <Field label="Instagram"><input className={inputCls} value={form.montfortian_instagram || ''} onChange={(e) => set('montfortian_instagram', e.target.value)} /></Field>
          <Field label="WhatsApp (DDI+DDD+número, só dígitos)"><input className={inputCls} value={form.montfortian_whatsapp || ''} onChange={(e) => set('montfortian_whatsapp', e.target.value)} /></Field>
          <Field label="E-mail"><input className={inputCls} value={form.montfortian_email || ''} onChange={(e) => set('montfortian_email', e.target.value)} /></Field>
        </div>
      </section>

      <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações
      </button>
    </div>
  );
}