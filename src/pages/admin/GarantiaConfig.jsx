import React, { useEffect, useState } from 'react';
import { Upload, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { AdminPageTitle, Field, inputCls } from '@/components/admin/ui';
import { useToast } from '@/components/ui/use-toast';

const DEFAULTS = {
  term_text: '',
  cert_title: 'Certificado de Garantia Vitalícia',
  cert_body_text: 'Certificamos que {nome} é detentor(a) da cadeiazinha Theotokos de código {codigo}, adquirida com {vendedor} em {data_compra} e recebida em {data_recebimento}, coberta pela Garantia Vitalícia Theotokos.',
  logo_url: '',
  signature_url: '',
  issuer_name: 'Theotokos',
  primary_color: '#673ab7',
  accent_color: '#c9a14a',
  border_style: 'classic',
  footer_text: 'Theotokos · Garantia Vitalícia'
};

export default function GarantiaConfig() {
  const { toast } = useToast();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.WarrantySettings.list('-created_date', 1);
      if (list[0]) setForm({ ...DEFAULTS, ...list[0] });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('logo_url', file_url);
    } catch { alert('Erro ao enviar logo.'); }
    finally { setUploadingLogo(false); }
  };

  const onSigUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSig(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set('signature_url', file_url);
    } catch { alert('Erro ao enviar assinatura.'); }
    finally { setUploadingSig(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
      if (form.id) await base44.entities.WarrantySettings.update(form.id, payload);
      else { const created = await base44.entities.WarrantySettings.create(payload); setForm((p) => ({ ...p, id: created.id })); }
      toast({ description: 'Configurações salvas.' });
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao salvar.' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div>
      <AdminPageTitle title="Garantia Vitalícia — Configurações" subtitle="Edite o Termo e o Certificado de Garantia Vitalícia exibidos para os consagrados." />

      <div className="space-y-5">
        {/* Termo */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-1 font-display text-base">Termo de Garantia Vitalícia</h3>
          <p className="mb-3 text-xs text-muted-foreground">Deixe em branco se não quiser exibir o termo. Placeholders disponíveis: {'{nome}, {codigo}, {vendedor}, {data_compra}, {data_recebimento}, {data}'}</p>
          <ReactQuill theme="snow" value={form.term_text || ''} onChange={(v) => set('term_text', v)} />
        </section>

        {/* Certificado */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 font-display text-base">Certificado de Garantia Vitalícia</h3>
          <div className="grid gap-4">
            <Field label="Título do certificado">
              <input className={inputCls} value={form.cert_title || ''} onChange={(e) => set('cert_title', e.target.value)} />
            </Field>
            <Field label="Texto do certificado — use {nome}, {codigo}, {vendedor}, {data_compra}, {data_recebimento}, {data}">
              <ReactQuill theme="snow" value={form.cert_body_text || ''} onChange={(v) => set('cert_body_text', v)} />
            </Field>
          </div>
        </section>

        {/* Design */}
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
              <Field label="Logotipo (topo do certificado)">
                <div className="flex gap-2">
                  <input className={`${inputCls} flex-1`} value={form.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} placeholder="URL da imagem" />
                  <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} disabled={uploadingLogo} />
                  </label>
                </div>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Assinatura do emissor">
                <div className="flex gap-2">
                  <input className={`${inputCls} flex-1`} value={form.signature_url || ''} onChange={(e) => set('signature_url', e.target.value)} placeholder="URL da imagem" />
                  <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-input bg-muted px-3 text-sm hover:bg-accent">
                    {uploadingSig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={onSigUpload} disabled={uploadingSig} />
                  </label>
                </div>
              </Field>
            </div>
            <Field label="Rodapé"><input className={inputCls} value={form.footer_text || ''} onChange={(e) => set('footer_text', e.target.value)} /></Field>
          </div>
        </section>

        <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar configurações
        </button>
      </div>
    </div>
  );
}