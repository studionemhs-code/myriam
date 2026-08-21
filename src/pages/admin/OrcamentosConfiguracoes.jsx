import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Field, inputCls } from '@/components/admin/ui';
import { Save, Loader2, Upload, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function OrcamentosConfiguracoes() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.StoreSettings.list().then((d) => {
      if (d[0]) { setSettings(d[0]); setForm(d[0]); }
    });
  }, []);

  const onLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast({ title: 'Imagem muito grande', description: 'Tamanho máximo: 500 KB.', variant: 'destructive' }); return; }
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, logo_url: file_url });
    } catch { toast({ title: 'Erro', description: 'Falha ao enviar logo.', variant: 'destructive' }); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.StoreSettings.update(settings.id, {
        whatsapp: form.whatsapp,
        brand_name: form.brand_name,
        hero_title: form.hero_title,
        hero_subtitle: form.hero_subtitle,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        logo_url: form.logo_url || null
      });
      toast({ title: 'Salvo!', description: 'Configurações salvas com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Configurações" subtitle="Marca, cores, títulos e número de WhatsApp." />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da marca">
            <input className={inputCls} value={form.brand_name || ''} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
          </Field>
          <Field label="WhatsApp da loja (somente dígitos)">
            <input className={inputCls} value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, '') })} placeholder="5511999999999" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Título principal (hero)">
              <input className={inputCls} value={form.hero_title || ''} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Subtítulo">
              <input className={inputCls} value={form.hero_subtitle || ''} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} />
            </Field>
          </div>
          <Field label="Cor primária">
            <div className="flex gap-2">
              <input type="color" value={form.primary_color || '#663399'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-16 rounded border border-input p-1" />
              <input className={inputCls} value={form.primary_color || ''} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
          </Field>
          <Field label="Cor de destaque">
            <div className="flex gap-2">
              <input type="color" value={form.accent_color || '#9b59b6'} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="h-10 w-16 rounded border border-input p-1" />
              <input className={inputCls} value={form.accent_color || ''} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Logo da loja">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                    <Upload className="h-4 w-4" /> {form.logo_url ? 'Trocar logo' : 'Enviar logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
                  </label>
                  {form.logo_url && (
                    <button onClick={() => setForm({ ...form, logo_url: null })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" /> Remover
                    </button>
                  )}
                </div>
                {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-16 w-auto rounded border bg-muted/30 p-2 object-contain" />}
              </div>
            </Field>
          </div>
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