import React, { useEffect, useState } from 'react';
import { FileDown, Upload, Loader2, Save, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function FormulaSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [label, setLabel] = useState('Fórmula da Consagração');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ConsecrationSettings.list('-created_date', 1);
      const s = list[0] || null;
      setSettings(s);
      setLabel(s?.formula_pdf_label || 'Fórmula da Consagração');
      setPdfUrl(s?.formula_pdf_url || '');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast({ variant: 'destructive', description: 'Selecione um arquivo PDF.' }); return; }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(file_url);
      toast({ description: 'PDF enviado. Clique em Salvar para publicar.' });
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao enviar PDF.' });
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!pdfUrl) { toast({ variant: 'destructive', description: 'Envie um PDF antes de salvar.' }); return; }
    setSaving(true);
    try {
      const payload = { formula_pdf_url: pdfUrl, formula_pdf_label: label || 'Fórmula da Consagração' };
      if (settings?.id) await base44.entities.ConsecrationSettings.update(settings.id, payload);
      else { const created = await base44.entities.ConsecrationSettings.create(payload); setSettings(created); }
      toast({ description: 'Fórmula da Consagração publicada.' });
      await load();
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar.' });
    } finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <FileDown className="h-5 w-5 text-gold" />
        <h2 className="font-display text-lg">Fórmula da Consagração</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Faça upload do PDF da Fórmula da Consagração. Ele ficará disponível para download na página "Minha Consagração" dos usuários.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Rótulo do botão</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
            placeholder="Fórmula da Consagração"
          />
        </label>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">PDF</span>
          <div className="mt-1 flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm hover:bg-muted">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Enviando...' : 'Enviar PDF'}
              <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} disabled={uploading} />
            </label>
            {pdfUrl && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3.5 w-3.5" /> PDF carregado
              </span>
            )}
          </div>
        </div>
      </div>

      {pdfUrl && (
        <div className="mt-3">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Visualizar PDF atual</a>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || uploading || !pdfUrl}
        className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Salvando...' : 'Salvar e publicar'}
      </button>
    </section>
  );
}