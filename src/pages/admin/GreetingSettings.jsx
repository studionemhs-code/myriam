import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';
import { Field, inputCls, Loading } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';

const STATUSES = [
  { key: 'interessado', label: 'Interessado', desc: 'Usuários que ainda não iniciaram a preparação' },
  { key: 'preparacao', label: 'Em Preparação', desc: 'Usuários na caminhada dos 33 dias' },
  { key: 'consagrado', label: 'Consagrado', desc: 'Usuários que já fizeram a Consagração' }
];

export default function GreetingSettingsAdmin() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await supabaseEntities.GreetingSettings.list('-created_date', 1);
      setS(list[0] || await supabaseEntities.GreetingSettings.create({}));
    })();
  }, []);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...data } = s;
      await supabaseEntities.GreetingSettings.update(id, data);
      toast({ description: 'Saudações salvas.' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (!s) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl flex items-center gap-2"><Sparkles className="h-6 w-6 text-gold" /> Saudações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize as mensagens exibidas na tela inicial de cada usuário conforme seu status espiritual.
          Deixe um campo vazio para manter o padrão automático.
        </p>
      </div>

      {STATUSES.map((st) => (
        <section key={st.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-display text-lg">{st.label}</h2>
            <p className="text-xs text-muted-foreground">{st.desc}</p>
          </div>
          <div className="space-y-4">
            <Field label="Saudação (linha acima do nome)" hint="Ex: 'Bom dia', 'A paz de Cristo'. Vazio = usa Bom dia/Boa tarde/Boa noite automático.">
              <input
                className={inputCls}
                value={s[`greeting_${st.key}`] || ''}
                onChange={(e) => set(`greeting_${st.key}`, e.target.value)}
                placeholder="Deixe vazio para usar o padrão"
              />
            </Field>
            <Field label="Frase espiritual (linha abaixo do nome)" hint="Ex: 'Para que venha vosso reino Jesus, venha o reino de Maria'. Vazio = usa a frase gerada por IA.">
              <textarea
                rows={2}
                className={inputCls}
                value={s[`quote_${st.key}`] || ''}
                onChange={(e) => set(`quote_${st.key}`, e.target.value)}
                placeholder="Deixe vazio para usar a frase de IA"
              />
            </Field>
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar saudações
        </button>
      </div>
    </div>
  );
}