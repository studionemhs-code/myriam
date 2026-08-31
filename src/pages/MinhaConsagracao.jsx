import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, Heart, Calendar, Check, Sparkles, Award, FileDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { PageHeader, GoldDivider, StatPill } from '@/components/ui/marian';
import CadeiazinhaSection from '@/components/cadeiazinha/CadeiazinhaSection';
import {
  daysSince, daysUntil, formatDate, formatDuration, nextRenewal, isToday, parseDate
} from '@/lib/marianDates';

const typeLabel = { preparacao: 'Preparação', jornada: 'Jornada', renovacao: 'Renovação' };

export default function MinhaConsagracao() {
  const { user, update } = useCurrentUser();
  const { isVisible } = useFeatureFlags();
  const [registering, setRegistering] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [formula, setFormula] = useState(null);
  const [completedJourneys, setCompletedJourneys] = useState([]);

  useEffect(() => {
    if (user) {
      base44.entities.Certificate.filter({ user_id: user.id }, '-issue_date', 20)
        .then(setCertificates)
        .catch(() => {});
      base44.entities.ConsecrationSettings.list('-created_date', 1)
        .then((list) => setFormula(list[0] || null))
        .catch(() => {});
      // Busca jornadas coletivas concluídas para a linha do tempo
      (async () => {
        try {
          const parts = await base44.entities.JourneyParticipant.filter({ created_by_id: user.id }, '-completed_date', 50);
          const completed = parts.filter((p) => p.completed_date);
          if (completed.length > 0) {
            const ids = completed.map((p) => p.journey_id).filter(Boolean);
            const journeys = await base44.entities.CollectiveJourney.filter({ id: { $in: ids } });
            const jMap = {};
            journeys.forEach((j) => { jMap[j.id] = j; });
            setCompletedJourneys(completed.map((p) => ({ ...p, journey: jMap[p.journey_id] })).filter((p) => p.journey));
          }
        } catch { /* ignore */ }
      })();
    }
  }, [user]);

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
        <p className="mt-3 font-display text-3xl">Você se consagrou há <span className="text-gold">{formatDuration(cDate)}</span>.</p>
        <p className="mt-1 text-sm text-primary-foreground/70">{since.toLocaleString('pt-BR')} dias desde a sua consagração.</p>
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
          {renewals.map((r, idx) => {
            // Verifica se há uma jornada concluída nesta data
            const matchingJourney = completedJourneys.find((cj) => cj.completed_date === r);
            return (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15"><Check className="h-4 w-4 text-gold" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{formatDate(r)}</p>
                  <p className="text-xs text-muted-foreground">{idx === 0 ? 'Consagração' : `Renovação ${idx}`}</p>
                  {matchingJourney && (
                    <p className="text-xs text-gold">Jornada: {matchingJourney.journey.title}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Jornadas Coletivas concluídas */}
      {completedJourneys.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Sparkles className="h-4 w-4 text-gold" /> Jornadas Coletivas Concluídas</h2>
          <div className="space-y-2">
            {completedJourneys.map((cj) => (
              <div key={cj.id} className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15"><Check className="h-4 w-4 text-gold" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{cj.journey.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {cj.intent === 'renovacao' ? 'Renovação' : 'Primeira Consagração'} · Concluída em {formatDate(cj.completed_date)}
                  </p>
                </div>
                <Link to={`/jornadas/${cj.journey_id}`} className="text-xs text-primary">Ver</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certificados emitidos */}
      {certificates.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Award className="h-4 w-4 text-gold" /> Certificados Emitidos</h2>
          <div className="space-y-2">
            {certificates.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15"><Award className="h-4 w-4 text-gold" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{typeLabel[c.certificate_type] || 'Certificado'}{c.journey_title ? ` · ${c.journey_title}` : ''}</p>
                  <p className="text-xs text-muted-foreground">Emitido em {formatDate(c.issue_date)}</p>
                </div>
                {c.pdf_url && (
                  <a href={c.pdf_url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-primary hover:bg-muted">
                    <FileDown className="h-4 w-4" /> Baixar
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fórmula da Consagração — download */}
      {formula?.formula_pdf_url && (
        <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
                <FileDown className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="font-display text-base">{formula.formula_pdf_label || 'Fórmula da Consagração'}</p>
                <p className="text-xs text-muted-foreground">Baixe e reze a fórmula oficial da Total Consagração.</p>
              </div>
            </div>
            <a
              href={formula.formula_pdf_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep transition hover:bg-gold/90"
            >
              <FileDown className="h-4 w-4" /> Baixar PDF
            </a>
          </div>
        </section>
      )}

      {/* Cadeiazinha Theotokos — Garantia Vitalícia */}
      {isVisible('garantia_cadeiazinha') && (
        <CadeiazinhaSection />
      )}

      <GoldDivider />
      <div className="text-center">
        <Sparkles className="mx-auto h-6 w-6 text-gold" />
        <p className="mt-2 font-display italic text-muted-foreground">Ad Iesum per Mariam — A Jesus por Maria</p>
      </div>
    </div>
  );
}