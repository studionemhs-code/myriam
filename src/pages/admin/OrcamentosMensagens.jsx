import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Field, inputCls } from '@/components/admin/ui';
import { Save, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function OrcamentosMensagens() {
  const [settings, setSettings] = useState(null);
  const [template, setTemplate] = useState('');
  const [labels, setLabels] = useState(['', '', '', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.StoreSettings.list().then((d) => {
      if (d[0]) {
        setSettings(d[0]);
        setTemplate(d[0].message_template || '');
        setLabels(d[0].step_labels || ['', '', '', '', '']);
      }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.StoreSettings.update(settings.id, { message_template: template, step_labels: labels });
      toast({ title: 'Salvo!', description: 'Mensagens salvas com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Mensagens e textos" subtitle="Personalize os textos do formulário e a mensagem enviada ao WhatsApp." />

      <div className="rounded-xl border border-border bg-card p-5">
        <Field label="Nomes das etapas (5)">
          <div className="mt-2 grid gap-2 sm:grid-cols-5">
            {labels.map((l, i) => (
              <input key={i} value={l} onChange={(e) => setLabels(labels.map((x, idx) => idx === i ? e.target.value : x))} className={inputCls} maxLength={40} />
            ))}
          </div>
        </Field>

        <div className="mt-6">
          <Field label="Cabeçalho da mensagem no WhatsApp" hint="Variáveis: {{name}}, {{whatsapp}}, {{address}}, {{items}}, {{notes}}" />
          <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={12} className={`${inputCls} font-mono text-xs`} />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}