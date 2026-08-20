import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, FileDown, Flower2, BookOpen, Check, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, GoldDivider, EmptyState } from '@/components/ui/marian';
import { formatDate } from '@/lib/marianDates';

const typeLabel = { preparacao: 'Preparação (33 dias)', jornada: 'Jornada Coletiva', renovacao: 'Renovação' };
const typeIcon = { preparacao: Flower2, jornada: BookOpen, renovacao: Sparkles };

export default function Historico() {
  const { user, loading } = useCurrentUser();
  const [progress, setProgress] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [progList, parts, certs] = await Promise.all([
          base44.entities.UserProgress.filter({ created_by_id: user.id }),
          base44.entities.JourneyParticipant.filter({ created_by_id: user.id }, '-joined_date', 50),
          base44.entities.Certificate.filter({ user_id: user.id }, '-issue_date', 50)
        ]);
        setProgress(progList[0] || null);
        setCertificates(certs);

        const journeyIds = parts.map((p) => p.journey_id).filter(Boolean);
        let journeyList = [];
        if (journeyIds.length > 0) {
          journeyList = await base44.entities.CollectiveJourney.filter({ id: { $in: journeyIds } });
        }
        setJourneys(journeyList);
        setParticipants(parts);
      } catch (e) { /* ignore */ }
      setLoadingData(false);
    })();
  }, [user]);

  if (loading || loadingData || !user) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const completedDays = progress?.completed_days || [];
  const prepCompleted = progress?.status === 'concluida' || completedDays.length >= 33;

  const journeyMap = {};
  journeys.forEach((j) => { journeyMap[j.id] = j; });

  const completedJourneys = participants.filter((p) => {
    const j = journeyMap[p.journey_id];
    if (!j) return false;
    const totalSteps = (j.steps || []).length;
    if (totalSteps === 0) return p.progress >= 100;
    return (p.completed_steps || []).length >= totalSteps;
  });
  const inProgressJourneys = participants.filter((p) => !completedJourneys.includes(p));

  const totalCompleted = (prepCompleted ? 1 : 0) + completedJourneys.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" subtitle="Suas jornadas e certificados em um só lugar" icon={Award} />

      {/* Resumo */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Check className="mx-auto h-6 w-6 text-gold" />
          <p className="mt-2 font-display text-2xl text-primary">{totalCompleted}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Jornadas concluídas</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Award className="mx-auto h-6 w-6 text-gold" />
          <p className="mt-2 font-display text-2xl text-primary">{certificates.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Certificados emitidos</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card p-4 text-center sm:col-span-1">
          <BookOpen className="mx-auto h-6 w-6 text-gold" />
          <p className="mt-2 font-display text-2xl text-primary">{inProgressJourneys.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Em andamento</p>
        </div>
      </section>

      {/* Preparação 33 dias */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Flower2 className="h-4 w-4 text-gold" /> Preparação de 33 Dias</h2>
        {prepCompleted ? (
          <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15"><Check className="h-5 w-5 text-gold" /></div>
            <div className="flex-1">
              <p className="font-medium">Preparação concluída</p>
              <p className="text-xs text-muted-foreground">
                {`${progress?.completed_date ? `Concluída em ${formatDate(progress.completed_date)}` : `Iniciada em ${formatDate(progress?.started_date)}`} · ${completedDays.length}/33 dias completos`}
              </p>
            </div>
            <Link to="/caminho" className="flex items-center gap-1 text-xs text-primary">Ver caminho <ChevronRight className="h-3 w-3" /></Link>
          </div>
        ) : progress ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Flower2 className="h-5 w-5 text-muted-foreground" /></div>
            <div className="flex-1">
              <p className="font-medium">Em andamento — Dia {progress.current_day}</p>
              <p className="text-xs text-muted-foreground">{completedDays.length}/33 dias completos</p>
            </div>
            <Link to="/caminho" className="flex items-center gap-1 text-xs text-primary">Continuar <ChevronRight className="h-3 w-3" /></Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Você ainda não iniciou a preparação de 33 dias.</p>
            <Link to="/caminho" className="mt-2 inline-block text-xs text-gold">Começar agora →</Link>
          </div>
        )}
      </section>

      {/* Jornadas coletivas concluídas */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><BookOpen className="h-4 w-4 text-gold" /> Jornadas Coletivas Concluídas</h2>
        {completedJourneys.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Nenhuma jornada coletiva concluída ainda.</p>
        ) : (
          <div className="space-y-2">
            {completedJourneys.map((p) => {
              const j = journeyMap[p.journey_id];
              if (!j) return null;
              const totalSteps = (j.steps || []).length;
              const doneSteps = (p.completed_steps || []).length;
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
                  {j.image_url ? (
                    <img src={j.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15"><Check className="h-5 w-5 text-gold" /></div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{j.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${j.journey_type === 'renovacao' ? 'Renovação' : 'Consagração'} · ${doneSteps}/${totalSteps || doneSteps} etapas${p.joined_date ? ` · Ingressou em ${formatDate(p.joined_date)}` : ''}`}
                    </p>
                  </div>
                  <Link to={`/jornadas/${j.id}`} className="flex items-center gap-1 text-xs text-primary">Detalhes <ChevronRight className="h-3 w-3" /></Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Jornadas em andamento */}
      {inProgressJourneys.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Calendar className="h-4 w-4 text-gold" /> Em Andamento</h2>
          <div className="space-y-2">
            {inProgressJourneys.map((p) => {
              const j = journeyMap[p.journey_id];
              if (!j) return null;
              const totalSteps = (j.steps || []).length;
              const doneSteps = (p.completed_steps || []).length;
              const pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : p.progress || 0;
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {j.image_url ? (
                      <img src={j.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{j.title}</p>
                      <p className="text-xs text-muted-foreground">{`${doneSteps}/${totalSteps || '?'} etapas · ${pct}%`}</p>
                    </div>
                    <Link to={`/jornadas/${j.id}`} className="flex items-center gap-1 text-xs text-primary">Continuar <ChevronRight className="h-3 w-3" /></Link>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <GoldDivider />

      {/* Certificados emitidos */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Award className="h-4 w-4 text-gold" /> Certificados Emitidos</h2>
        {certificates.length === 0 ? (
          <EmptyState icon={Award} title="Nenhum certificado emitido" subtitle="Conclua uma jornada para emitir seu certificado." />
        ) : (
          <div className="space-y-2">
            {certificates.map((c) => {
              const Icon = typeIcon[c.certificate_type] || Award;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15"><Icon className="h-5 w-5 text-gold" /></div>
                  <div className="flex-1">
                    <p className="font-medium">{typeLabel[c.certificate_type] || 'Certificado'}{c.journey_title ? ` · ${c.journey_title}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{`Emitido em ${formatDate(c.issue_date)}${c.user_name ? ` · ${c.user_name}` : ''}`}</p>
                  </div>
                  {c.pdf_url && (
                    <a href={c.pdf_url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-primary hover:bg-muted">
                      <FileDown className="h-4 w-4" /> Baixar PDF
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}