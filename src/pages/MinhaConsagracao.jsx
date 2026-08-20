import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, Heart, Calendar, Check, Sparkles } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, GoldDivider, StatPill } from '@/components/ui/marian';
import {
  daysSince, daysUntil, formatDate, formatDuration, nextRenewal, isToday, parseDate
} from '@/lib/marianDates';

export default function MinhaConsagracao() {
  const { user, update } = useCurrentUser();
  const [registering, setRegistering] = useState(false);

  if (!user?.consecration_date) {
    return (
      <div>
        <PageHeader title="Minha Consagração" icon={Flower2} />
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Você ainda não registrou sua consagração.</p>
          <Link to="/consagracao" className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">Registrar agora</Link>
        </div>
      </div>
    );
  }

  const cDate = user.consecration_date;
  const since = daysSince(cDate);
  const renewal = nextRenewal(cDate, user.last_renewal_date);
  const daysToRenewal = daysUntil(renewal);
  const todayIsRenewal = isToday(renewal);
  const renewals = user.renewals || [];
  const yearsCount = Math.floor(since / 365);

  const registerRenewal = async () => {
    setRegistering(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await update({
        last_renewal_date: today,
        renewals: [...renewals, today]
      });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Consagração" icon={Flower2} />

      {/* Bloco principal */}
      <section className="relative overflow-hidden rounded-2xl bg-deep p-6 text-primary-foreground">
        <div className="absolute -right-8 -top-8 opacity-10"><Heart className="h-40 w-40" /></div>
        <div className="flex items-center gap-2 text-gold">
          <Flower2 className="h-5 w-5" /><span className="text-xs uppercase tracking-[0.2em]">Sua Consagração</span>
        </div>
        <p className="mt-3 font-display text-3xl">Você se consagrou há <span className="text-gold">{since.toLocaleString('pt-BR')}</span> dias.</p>
        <p className="mt-1 text-sm text-primary-foreground/70">Consagrado há {formatDuration(cDate)}.</p>
        <div className="gold-line my-4 w-16 opacity-40" />
        <p className="text-sm">Data da Consagração: <span className="text-gold">{formatDate(cDate)}</span></p>
      </section>

      {/* Renovação */}
      <section className={`rounded-2xl border p-6 ${todayIsRenewal ? 'border-gold bg-gold/10' : 'border-border bg-card'}`}>
        <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-gold" /><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Renovação Anual Solene</span></div>
        {todayIsRenewal ? (
          <div className="mt-3">
            <p className="font-display text-2xl text-gold">🌹 Hoje é o dia da sua renovação anual.</p>
            <p className="mt-1 text-sm text-muted-foreground">Renove com o coração cheio de gratidão o seu sim a Jesus por Maria.</p>
            <button onClick={registerRenewal} disabled={registering} className="mt-4 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep disabled:opacity-40">
              {registering ? 'Registrando...' : 'Realizei minha renovação'}
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="font-display text-2xl">Faltam <span className="text-gold">{daysToRenewal}</span> dias</p>
            <p className="text-sm text-muted-foreground">para a renovação anual solene da sua consagração.</p>
            <p className="mt-3 text-xs text-muted-foreground">Sua próxima renovação: <span className="text-gold">{formatDate(renewal)}</span></p>
          </div>
        )}
      </section>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill value={yearsCount} label="anos" />
        <StatPill value={since} label="dias" />
        <StatPill value={daysToRenewal} label="até renovar" />
      </div>

      {/* Histórico de renovações */}
      <section>
        <h2 className="mb-3 font-display text-lg">Histórico de Renovações</h2>
        <div className="space-y-2">
          {renewals.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma renovação registrada ainda.</p>}
          {renewals.map((r, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15"><Check className="h-4 w-4 text-gold" /></div>
              <div>
                <p className="text-sm font-medium">{formatDate(r)}</p>
                <p className="text-xs text-muted-foreground">{idx === 0 ? 'Consagração' : `Renovação ${idx}`}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <GoldDivider />
      <div className="text-center">
        <Sparkles className="mx-auto h-6 w-6 text-gold" />
        <p className="mt-2 font-display italic text-muted-foreground">Ad Iesum per Mariam — A Jesus por Maria</p>
      </div>
    </div>
  );
}