import React, { useEffect, useState } from 'react';
import { Loader2, Palette, Layers, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls, Loading } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';
import FileUpload from '@/components/admin/FileUpload';
import { resetPersonalizationCache } from '@/hooks/usePersonalizationSettings';

const LEVELS = [
  { key: 'interessado', label: 'Interessado', hint: 'Usuários que ainda não iniciaram a preparação' },
  { key: 'preparacao', label: 'Em Preparação', hint: 'Usuários na caminhada dos 33 dias' },
  { key: 'consagrado', label: 'Consagrado', hint: 'Usuários que já fizeram a Consagração' },
];

export default function PersonalizacaoAdmin() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.PersonalizationSettings.list('-created_date', 1);
      setS(list[0] || await base44.entities.PersonalizationSettings.create({}));
    })();
  }, []);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...data } = s;
      await base44.entities.PersonalizationSettings.update(id, data);
      resetPersonalizationCache();
      toast({ description: 'Personalização salva.' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!s) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl flex items-center gap-2"><Palette className="h-6 w-6 text-gold" /> Personalização</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize os níveis espirituais, o vídeo de abertura, o fundo da tela de login e o favicon do app.
          Deixe um campo vazio para manter o padrão.
        </p>
      </div>

      {/* Níveis espirituais */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-gold" />
          <h2 className="font-display text-lg">Níveis Espirituais</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Estes nomes e descrições aparecem no onboarding (escolha do caminho) e no perfil do usuário.
        </p>
        <div className="space-y-5">
          {LEVELS.map((lv) => (
            <div key={lv.key} className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-3 text-sm font-medium">{lv.label} <span className="text-xs font-normal text-muted-foreground">— {lv.hint}</span></p>
              <div className="space-y-3">
                <Field label="Nome do nível">
                  <input
                    className={inputCls}
                    value={s[`level_${lv.key}_name`] || ''}
                    onChange={(e) => set(`level_${lv.key}_name`, e.target.value)}
                    placeholder={`Padrão: ${lv.key === 'interessado' ? 'Quero Conhecer' : lv.key === 'preparacao' ? 'Quero Me Preparar' : 'Já Sou Consagrado'}`}
                  />
                </Field>
                <Field label="Descrição curta">
                  <input
                    className={inputCls}
                    value={s[`level_${lv.key}_desc`] || ''}
                    onChange={(e) => set(`level_${lv.key}_desc`, e.target.value)}
                    placeholder="Descrição exibida abaixo do nome"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vídeo de abertura */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <VideoIcon className="h-5 w-5 text-gold" />
          <h2 className="font-display text-lg">Vídeo de Abertura</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Vídeo exibido ao abrir o app (apenas mobile, uma vez por sessão).
        </p>
        <FileUpload
          value={s.splash_video_url || ''}
          onChange={(v) => set('splash_video_url', v)}
          accept="video/*"
          label="Vídeo de abertura"
          hint="Formato MP4. Recomendado: curto, em formato vertical (9:16) ou paisagem."
          contentType="video"
        />
      </section>

      {/* Tela de login */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-gold" />
          <h2 className="font-display text-lg">Fundo da Tela de Login</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Imagem exibida como fundo das telas de login e cadastro.
        </p>
        <div className="space-y-4">
          <FileUpload
            value={s.login_bg_mobile || ''}
            onChange={(v) => set('login_bg_mobile', v)}
            accept="image/*"
            label="Imagem de fundo (mobile)"
            hint="Exibida em telas estreitas (celular)."
            contentType="imagem"
          />
          <FileUpload
            value={s.login_bg_desktop || ''}
            onChange={(v) => set('login_bg_desktop', v)}
            accept="image/*"
            label="Imagem de fundo (desktop)"
            hint="Exibida em telas largas (computador)."
            contentType="imagem"
          />
        </div>
      </section>

      {/* Favicon */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-gold" />
          <h2 className="font-display text-lg">Favicon</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Ícone exibido na aba do navegador. Recomendado: PNG quadrado de 192px ou 512px.
        </p>
        <FileUpload
          value={s.favicon_url || ''}
          onChange={(v) => set('favicon_url', v)}
          accept="image/png,image/x-icon,image/*"
          label="Favicon do app"
          contentType="imagem"
        />
        {s.favicon_url && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <img src={s.favicon_url} alt="favicon" className="h-6 w-6 rounded" />
            Pré-visualização do favicon atual.
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar personalização
        </button>
      </div>
    </div>
  );
}