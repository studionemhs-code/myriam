import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';

export default function AssociationCertificateEditor({ form, set }) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);

  const onLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('cert_logo_url', file_url);
    } catch { alert('Erro ao enviar logotipo.'); }
    finally { setUploadingLogo(false); }
  };

  const onSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('cert_signature_url', file_url);
    } catch { alert('Erro ao enviar assinatura.'); }
    finally { setUploadingSig(false); }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 font-display text-base">Certificado de Ingresso (A4)</h3>
      <div className="grid gap-4">
        <Field label="Título do certificado"><input className={inputCls} value={form.cert_title || ''} onChange={(e) => set('cert_title', e.target.value)} /></Field>
        <Field label="Subtítulo"><input className={inputCls} value={form.cert_subtitle || ''} onChange={(e) => set('cert_subtitle', e.target.value)} /></Field>
        <Field label="Texto do certificado — use {nome}, {numero}, {data}">
          <textarea rows={4} className={inputCls} value={form.cert_body_text || ''} onChange={(e) => set('cert_body_text', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cor primária do certificado">
            <div className="flex gap-2">
              <input type="color" value={form.cert_primary_color || '#673ab7'} onChange={(e) => set('cert_primary_color', e.target.value)} className="h-10 w-14 rounded border border-input" />
              <input className={inputCls} value={form.cert_primary_color || ''} onChange={(e) => set('cert_primary_color', e.target.value)} />
            </div>
          </Field>
          <Field label="Cor de destaque (dourado)">
            <div className="flex gap-2">
              <input type="color" value={form.cert_accent_color || '#c9a14a'} onChange={(e) => set('cert_accent_color', e.target.value)} className="h-10 w-14 rounded border border-input" />
              <input className={inputCls} value={form.cert_accent_color || ''} onChange={(e) => set('cert_accent_color', e.target.value)} />
            </div>
          </Field>
          <Field label="Estilo da borda">
            <select className={inputCls} value={form.cert_border_style || 'classic'} onChange={(e) => set('cert_border_style', e.target.value)}>
              <option value="classic">Clássico (borda dupla)</option>
              <option value="modern">Moderno (borda grossa)</option>
              <option value="minimal">Minimalista (borda fina)</option>
            </select>
          </Field>
          <Field label="Nome do emissor"><input className={inputCls} value={form.cert_issuer_name || ''} onChange={(e) => set('cert_issuer_name', e.target.value)} /></Field>
        </div>
        <Field label="Logotipo do certificado (topo)">
          <div className="flex gap-2">
            <input className={`${inputCls} flex-1`} value={form.cert_logo_url || ''} onChange={(e) => set('cert_logo_url', e.target.value)} placeholder="URL do logotipo" />
            <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} disabled={uploadingLogo} />
            </label>
          </div>
          {form.cert_logo_url && <img src={form.cert_logo_url} alt="Logo" className="mt-2 h-16 rounded border border-border bg-white p-1" />}
        </Field>
        <Field label="Assinatura do emissor">
          <div className="flex gap-2">
            <input className={`${inputCls} flex-1`} value={form.cert_signature_url || ''} onChange={(e) => set('cert_signature_url', e.target.value)} placeholder="URL da assinatura" />
            <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
              {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              <input type="file" accept="image/*" className="hidden" onChange={onSigUpload} disabled={uploadingSig} />
            </label>
          </div>
          {form.cert_signature_url && <img src={form.cert_signature_url} alt="Assinatura" className="mt-2 h-16 rounded border border-border bg-white p-1" />}
        </Field>
        <Field label="Rodapé do certificado"><input className={inputCls} value={form.cert_footer_text || ''} onChange={(e) => set('cert_footer_text', e.target.value)} /></Field>
      </div>
    </section>
  );
}