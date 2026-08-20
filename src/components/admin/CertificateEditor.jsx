import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Field, inputCls } from '@/components/admin/ui';

const DEFAULTS = {
  name: '',
  title: 'Certificado de Conclusão',
  subtitle: 'A Jesus por Maria',
  body_text: 'Concluiu com dedicação a preparação de 33 dias para a Total Consagração a Jesus por Maria, percorrendo todas as etapas da caminhada formativa.',
  agreement_text: '',
  footer_text: 'Theotokos · Ad Iesum per Mariam',
  primary_color: '#673ab7',
  accent_color: '#c9a14a',
  border_style: 'classic',
  issuer_name: 'Theotokos',
  issuer_signature_url: '',
  certificate_type: 'preparacao',
  is_active: true
};

export default function CertificateEditor({ template, onClose, onSaved }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...template });
  const [saving, setSaving] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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
    if (!form.name?.trim() || !form.title?.trim() || !form.body_text?.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id;
      delete payload.created_date;
      delete payload.updated_date;
      delete payload.created_by_id;
      if (form.id) await base44.entities.CertificateTemplate.update(form.id, payload);
      else await base44.entities.CertificateTemplate.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      alert('Erro ao salvar o modelo. Verifique os campos e tente novamente.');
      console.error(e);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{form.id ? 'Editar modelo' : 'Novo modelo'}</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome (interno)"><input className={inputCls} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Certificado Preparação" /></Field>
          <Field label="Tipo do certificado">
            <select className={inputCls} value={form.certificate_type} onChange={(e) => set('certificate_type', e.target.value)}>
              <option value="preparacao">Preparação (Caminho 33 dias)</option>
              <option value="jornada">Jornada Coletiva</option>
              <option value="renovacao">Renovação</option>
            </select>
          </Field>
          <div className="col-span-2"><Field label="Título do certificado"><input className={inputCls} value={form.title || ''} onChange={(e) => set('title', e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Subtítulo"><input className={inputCls} value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></Field></div>
          <div className="col-span-2">
            <Field label="Texto principal — use {nome}, {data}, {tipo}, {jornada}">
              <ReactQuill theme="snow" value={form.body_text || ''} onChange={(v) => set('body_text', v)} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Termo de concordância (exibido para o usuário antes de assinar)">
              <textarea className={inputCls} rows={4} value={form.agreement_text || ''} onChange={(e) => set('agreement_text', e.target.value)} placeholder="Texto que o usuário deverá concordar para emitir o certificado..." />
            </Field>
          </div>
          <div className="col-span-2"><Field label="Rodapé"><input className={inputCls} value={form.footer_text || ''} onChange={(e) => set('footer_text', e.target.value)} /></Field></div>
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
          <Field label="Ativo">
            <select className={inputCls} value={form.is_active ? 'sim' : 'nao'} onChange={(e) => set('is_active', e.target.value === 'sim')}>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </Field>
          <Field label="Nome do emissor"><input className={inputCls} value={form.issuer_name || ''} onChange={(e) => set('issuer_name', e.target.value)} /></Field>
          <div className="col-span-2">
            <Field label="Assinatura do emissor (opcional)">
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} value={form.issuer_signature_url || ''} onChange={(e) => set('issuer_signature_url', e.target.value)} placeholder="URL da imagem da assinatura" />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
                  {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                  <input type="file" accept="image/*" className="hidden" onChange={onSigUpload} disabled={uploadingSig} />
                </label>
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar modelo'}
          </button>
        </div>
      </div>
    </div>
  );
}