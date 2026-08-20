import React, { useState, useEffect } from 'react';
import { Settings, Bell, ShoppingBag, ChevronRight, Shield, Heart } from 'lucide-react';
import { PageHeader, GoldDivider, Ornament } from '@/components/ui/marian';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const STORE_URL = 'https://www.lojatheotokos.com.br';

const PREFS = [
  { key: 'caminho', label: 'Lembretes do Caminho' },
  { key: 'renovacao', label: 'Avisos de renovação' },
  { key: 'myriam', label: 'Atividade no Myriam' },
  { key: 'intencoes', label: 'Intenções de oração' },
  { key: 'acamf', label: 'Novos conteúdos ACAMF' },
  { key: 'jornadas', label: 'Avisos de jornadas' }
];

export default function Configuracoes() {
  const { user, update } = useCurrentUser();
  const [prefs, setPrefs] = useState(Object.fromEntries(PREFS.map((p) => [p.key, true])));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.notification_prefs) {
      setPrefs({ ...Object.fromEntries(PREFS.map((p) => [p.key, true])), ...user.notification_prefs });
    }
  }, [user]);

  const toggle = async (k) => {
    const newPrefs = { ...prefs, [k]: !prefs[k] };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await update({ notification_prefs: newPrefs });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Configurações" icon={Settings} />

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 font-display text-lg"><Bell className="h-4 w-4 text-gold" /> Preferências de notificação</p>
        <div className="space-y-1">
          {PREFS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-2">
              <span className="text-sm">{p.label}</span>
              <button
                onClick={() => toggle(p.key)}
                className={`relative h-6 w-11 rounded-full transition ${prefs[p.key] ? 'bg-gold' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${prefs[p.key] ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        {saving && <p className="mt-2 text-xs text-muted-foreground">Salvando...</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 font-display text-lg"><Shield className="h-4 w-4 text-gold" /> Privacidade</p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-marian" /> Suas reflexões pessoais são privadas por padrão.</div>
          <p>Seu histórico de consagração só é visível para você, salvo se escolher compartilhar.</p>
        </div>
      </section>

      <section className="mt-4">
        <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-gold/40">
          <ShoppingBag className="h-5 w-5 text-gold" />
          <div className="flex-1">
            <p className="text-sm font-medium">Conheça os Produtos Theotokos</p>
            <p className="text-xs text-muted-foreground">Visite nossa loja externa</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </a>
      </section>

      <GoldDivider />
      <Ornament className="text-gold" />
      <p className="text-center font-display italic text-muted-foreground">Theotokos · Hub da Total Consagração</p>
    </div>
  );
}