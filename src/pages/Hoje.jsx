import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, BookOpen, Calendar, Heart, ChevronRight, Sparkles, Leaf, Play, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { SectionCard, GoldDivider, Ornament } from '@/components/ui/marian';
import JourneySummaryCard from '@/components/jornadas/JourneySummaryCard';
import HomeShipmentWidget from '@/components/tracking/HomeShipmentWidget';
import {
  getGreeting, daysSince, daysUntil, formatDate, formatDuration, nextRenewal,
  getNextMarianEvent, isToday } from
'@/lib/marianDates';
import { isIndulgenceDay } from '@/lib/indulgenceDates';
import { getCurrentUnlockedDay, getProgressPercent, getDaysLeft, isDayUnlocked, syncCurrentDay, TOTAL_DAYS } from '@/lib/preparationProgress';

export default function Hoje() {
  const { user, loading } = useCurrentUser();
  const { isVisible } = useFeatureFlags();
  const [progress, setProgress] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [intentions, setIntentions] = useState([]);
  const [dayContent, setDayContent] = useState([]);
  const [aiGreeting, setAiGreeting] = useState(null);
  const [indulgenceToday, setIndulgenceToday] = useState(null);
  const [days, setDays] = useState([]);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [activeJourney, setActiveJourney] = useState(null);
  const [activeParticipant, setActiveParticipant] = useState(null);

  const status = user?.status || 'interessado';

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        let dayNum = null;
        if (status === 'preparacao') {
          const list = await base44.entities.UserProgress.filter({ created_by_id: user.id });
          let p = list[0];
          if (p) {
            const unlocked = getCurrentUnlockedDay(p.started_date);
            p = await syncCurrentDay(p, unlocked, base44.entities.UserProgress.update);
            setProgress(p);
            dayNum = unlocked;
          }
        }
        const [rec, allDays] = await Promise.all([
          base44.entities.ACAMFContent.filter({ status: 'publicado', recommended: true }, '-published_date', 3),
          base44.entities.PreparationDay.list('day_number', 33)
        ]);
        setRecommended(rec);
        setDays(allDays);
        setContentLoaded(true);
        if (dayNum) {
          const dayCont = await base44.entities.ACAMFContent.filter({ status: 'publicado', related_day_number: dayNum }, '-published_date', 3);
          setDayContent(dayCont);
        }
        const intents = await base44.entities.PrayerIntention.filter({ status: 'ativo' }, '-created_date', 3);
        setIntentions(intents);
        // Busca jornada coletiva ativa do usuário (distinta da Caminhada de 33 dias)
        try {
          const myParts = await base44.entities.JourneyParticipant.filter({ created_by_id: user.id }, '-created_date', 50);
          if (myParts.length > 0) {
            const journeyIds = myParts.map((p) => p.journey_id).filter(Boolean);
            const journeys = await base44.entities.CollectiveJourney.filter({ id: { $in: journeyIds } });
            const journeyMap = {};
            journeys.forEach((j) => { journeyMap[j.id] = j; });
            // Encontra a participação mais recente sem completed_date
            const active = myParts.find((p) => journeyMap[p.journey_id] && !p.completed_date);
            if (active) {
              setActiveJourney(journeyMap[active.journey_id]);
              setActiveParticipant(active);
            }
          }
        } catch { /* ignore */ }
        try {
          const res = await base44.functions.invoke('generateGreeting', {});
          if (res.data?.greeting) setAiGreeting(res.data.greeting);
        } catch (e) { /* use default */ }
        try {
          const reqs = await base44.entities.AssociationRequest.filter({ user_id: user.id, status: 'aprovado' }, '-approved_date', 1);
          const approvedReq = reqs[0];
          if (approvedReq?.approved_date) {
            const today = isIndulgenceDay(approvedReq.approved_date);
            if (today) setIndulgenceToday(today);
          }
        } catch { /* ignore */ }
      } catch (e) {/* ignore */}
    })();
  }, [user, status]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>);

  }

  const firstName = (user.display_name || user.full_name || user.email || 'alma').split(' ')[0];
  const greeting = getGreeting();
  const nextEvent = getNextMarianEvent();

  const quote = aiGreeting || 'Para que venha vosso reino Jesus, venha o reino de Maria';

  return (
    <div>
      {/* Saudação */}
      <header className="rounded-2xl bg-deep p-6 text-primary-foreground">
        <p className="text-sm text-primary-foreground/70">{greeting},</p>
        <h1 className="mt-1 font-display text-2xl capitalize text-[hsl(var(--primary-foreground))]">{firstName}</h1>
        <p className="mt-2 font-display italic text-primary-foreground/70">{quote}</p>
      </header>

      {/* Lembrete de indulgência */}
      {indulgenceToday && (
        <Link to="/associacao" className="mt-4 block">
          <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 to-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/20">
                <Award className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm text-gold">Dia de Indulgência</p>
                <p className="text-xs text-muted-foreground">Hoje: {indulgenceToday.label}. Lembre-se de lucrar a indulgência plenária da Associação.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      )}

      {/* Bloco de status */}
      {status === 'consagrado' && <ConsecratedBlock user={user} />}
      {status === 'preparacao' && <PreparationBlock user={user} progress={progress} dayContent={dayContent} days={days} contentLoaded={contentLoaded} />}
      {status === 'interessado' && <DiscoverBlock />}

      <HomeShipmentWidget />

      {/* Resumo de Jornada Coletiva ativa (distinto da Caminhada de 33 dias) */}
      {activeJourney && activeParticipant && (
        <JourneySummaryCard journey={activeJourney} participant={activeParticipant} />
      )}

      <GoldDivider />

      {/* ACAMF recomenda */}
      {isVisible('acamf') &&
      <SectionCard
        title="ACAMF recomenda"
        icon={BookOpen}
        action={<Link to="/acamf" className="text-xs text-gold">Ver tudo</Link>}>
        
          {recommended.length === 0 ?
        <p className="py-3 text-sm text-muted-foreground">Conteúdos em breve na Academia Mariana.</p> :

        <div className="space-y-2">
              {recommended.map((c) =>
          <Link key={c.id} to={`/acamf/${c.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50">
                  {c.cover_url ?
            <img src={c.cover_url} alt="" className="h-12 w-12 rounded-lg object-cover" /> :

            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
            }
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.subtitle || c.author || 'ACAMF'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
          )}
            </div>
        }
        </SectionCard>
      }

      {/* Intenções */}
      <div className="mt-4">
        <SectionCard
          title="Intenções de Oração"
          icon={Heart}
          action={<Link to="/intencoes" className="text-xs text-gold">Ver todas</Link>}>
          
          {intentions.length === 0 ?
          <p className="py-3 text-sm text-muted-foreground">Ainda não há intenções publicadas. Seja o primeiro a pedir oração.</p> :

          <div className="space-y-2">
              {intentions.map((i) =>
            <Link key={i.id} to="/intencoes" className="block rounded-xl p-2 transition hover:bg-muted/50">
                  <p className="line-clamp-2 text-sm">{i.text}</p>
                  <p className="mt-1 text-xs text-gold">{i.prayer_count || 0} {i.prayer_count === 1 ? 'pessoa rezou' : 'pessoas rezaram'}</p>
                </Link>
            )}
            </div>
          }
        </SectionCard>
      </div>

      {/* Próxima data mariana */}
      <div className="mt-4">
        <SectionCard title="Próxima data mariana" icon={Calendar} accent>
          <Link to="/calendario" className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gold/15 text-gold">
              <span className="font-display text-lg leading-none">{nextEvent.date.getDate()}</span>
              <span className="text-[9px] uppercase">{formatDate(nextEvent.date, { month: 'short' })}</span>
            </div>
            <div className="flex-1">
              <p className="font-medium leading-tight">{nextEvent.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(nextEvent.date, { day: 'numeric', month: 'long' })}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </SectionCard>
      </div>

      {/* Myriam */}
      {isVisible('myriam') &&
      <div className="mt-4">
          <Link to="/myriam">
            <SectionCard title="Myriam" icon={Leaf} action={<span className="text-xs text-gold">Entrar</span>}>
              <p className="text-sm text-muted-foreground">A comunidade dos consagrados partilha suas vivências.</p>
            </SectionCard>
          </Link>
        </div>
      }

      <GoldDivider />
      <Ornament className="mb-2" />
      <p className="text-center font-display italic text-sm text-muted-foreground">Ad Iesum per Mariam</p>
    </div>);

}

function PreparationBlock({ user, progress, dayContent, days, contentLoaded }) {
  const current = getCurrentUnlockedDay(progress?.started_date);
  const completedDays = progress?.completed_days || [];
  const pct = getProgressPercent(completedDays);
  const remaining = getDaysLeft(user, current);
  const hasContent = days.length > 0;

  return (
    <div className="mt-4">
      <SectionCard title="Sua preparação" icon={Flower2} accent>
        {contentLoaded && !hasContent ? (
          <div className="py-6 text-center">
            <div className="ornament text-gold">✦</div>
            <p className="mt-3 font-display text-lg">Aguarde! Carregando conteúdo</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Os 33 dias de preparação ainda não foram publicados. Em breve sua jornada estará disponível.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-2xl">Dia {current}<span className="text-base text-muted-foreground"> / {TOTAL_DAYS}</span></p>
                <p className="text-xs text-muted-foreground">{remaining > 0 ? `faltam ${remaining} ${remaining === 1 ? 'dia' : 'dias'}` : 'conclua hoje'}</p>
              </div>
              <p className="font-display text-2xl text-gold">{pct}%</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
            </div>
            {user.target_consecration_date &&
            <p className="mt-2 text-xs text-muted-foreground">Consagração prevista: <span className="text-gold">{formatDate(user.target_consecration_date)}</span></p>
            }
            {hasContent && isDayUnlocked(current, progress, progress?.started_date) && (
              <Link to={`/caminho/dia/${current}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">
                <Play className="h-4 w-4" /> Continuar pelo Dia {current}
              </Link>
            )}
            {hasContent && !isDayUnlocked(current, progress, progress?.started_date) && (
              <p className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground text-center">
                {progress?.completed_days?.includes(current - 1) || current === 1
                  ? 'Aguarde a meia-noite para desbloquear o próximo dia.'
                  : `Conclua o Dia ${current - 1} para liberar o Dia ${current}.`}
              </p>
            )}
            {dayContent?.length > 0 &&
            <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Para o seu dia de hoje</p>
                <div className="space-y-2">
                  {dayContent.map((c) =>
                <Link key={c.id} to={`/caminho/dia/${current}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50">
                     {c.cover_url ? <img src={c.cover_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <BookOpen className="h-5 w-5 text-primary" />}
                     <p className="flex-1 text-sm leading-tight">{c.title}</p>
                     <ChevronRight className="h-4 w-4 text-muted-foreground" />
                   </Link>
                )}
                </div>
              </div>
            }
          </>
        )}
      </SectionCard>
    </div>);

}

function ConsecratedBlock({ user }) {
  const cDate = user.consecration_date;
  const since = daysSince(cDate);
  const renewal = nextRenewal(cDate, user.last_renewal_date);
  const daysToRenewal = daysUntil(renewal);
  const todayIsRenewal = isToday(renewal);

  return (
    <div className="mt-4">
      <SectionCard title="Sua Consagração" icon={Flower2} accent>
        <p className="font-display text-2xl">{since.toLocaleString('pt-BR')} <span className="text-base text-muted-foreground">dias consagrado</span></p>
        <p className="text-xs text-muted-foreground">Desde {formatDate(cDate)} · {formatDuration(cDate)}</p>
        <div className="mt-3 rounded-xl bg-gold/10 p-3">
          <p className="text-sm font-medium text-gold">{todayIsRenewal ? 'Hoje é o dia da sua renovação' : `Próxima renovação em ${daysToRenewal} dias`}</p>
          <p className="text-xs text-muted-foreground">{formatDate(renewal)}</p>
        </div>
        <Link to="/minha-consagracao" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">
          <Flower2 className="h-4 w-4" /> {todayIsRenewal ? 'Realizar renovação' : 'Ver minha caminhada'}
        </Link>
      </SectionCard>
    </div>);

}

function DiscoverBlock() {
  return (
    <div className="mt-4">
      <SectionCard title="Comece sua caminhada" icon={Sparkles} accent>
        <p className="text-sm text-muted-foreground">Conheça a Total Consagração e inicie sua preparação de 33 dias.</p>
        <div className="mt-4 flex gap-2">
          <Link to="/acamf" className="rounded-xl border border-primary px-4 py-2.5 text-sm font-medium text-primary">Conhecer</Link>
          <Link to="/caminho" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-deep">Começar preparação</Link>
        </div>
      </SectionCard>
    </div>);

}