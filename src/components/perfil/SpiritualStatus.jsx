import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, BookOpen, ChevronRight, Users, Compass, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate, daysSince, nextRenewal, parseDate, daysBetween } from '@/lib/marianDates';

export default function SpiritualStatus({ user }) {
  const [journeys, setJourneys] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [parts, progressList] = await Promise.all([
          base44.entities.JourneyParticipant.filter({ created_by_id: user.id }),
          base44.entities.UserProgress.filter({ created_by_id: user.id })
        ]);
        setProgress(progressList[0] || null);
        if (parts.length > 0) {
          const allJourneys = await base44.entities.CollectiveJourney.list();
          const mine = allJourneys
            .filter((j) => parts.some((p) => p.journey_id === j.id))
            .map((j) => ({ ...j, participant: parts.find((p) => p.journey_id === j.id) }));
          setJourneys(mine);
        }
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, [user]);

  if (loading || !user) return null;

  const status = user.status;
  const consecrationYear = user.consecration_date ? new Date(user.consecration_date + 'T00:00:00').getFullYear() : null;
  const renewal = user.consecration_date ? nextRenewal(user.consecration_date, user.last_renewal_date) : null;
  const renewalCount = (user.renewals || []).length;

  let prepInfo = null;
  if (progress && progress.started_date) {
    const elapsed = daysBetween(parseDate(progress.started_date), new Date());
    const currentDay = Math.min(33, Math.max(1, elapsed + 1));
    const completed = (progress.completed_days || []).length;
    prepInfo = { currentDay, completed, target: user.target_consecration_date };
  }

  return (
    <section className="mt-4 space-y-3">
      {/* Status principal */}
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-5">
        {status === 'consagrado' && consecrationYear && (
          <>
            <div className="flex items-center gap-2 text-gold">
              <Flower2 className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Consagração</span>
            </div>
            <p className="mt-2 font-display text-xl text-primary">Consagrado desde {consecrationYear}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(user.consecration_date)} · {daysSince(user.consecration_date).toLocaleString('pt-BR')} dias de caminhada
            </p>
            {renewalCount > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {renewalCount} renovação(ões) realizada(s)
                {user.last_renewal_date && ` · última em ${formatDate(user.last_renewal_date)}`}
              </p>
            )}
            {renewal && (
              <p className="mt-1 text-xs text-muted-foreground">
                Próxima renovação: <span className="text-gold">{formatDate(renewal)}</span>
              </p>
            )}
          </>
        )}

        {status === 'preparacao' && (
          <>
            <div className="flex items-center gap-2 text-gold">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Preparação</span>
            </div>
            <p className="mt-2 font-display text-xl text-primary">Em preparação para a Consagração</p>
            {prepInfo ? (
              <p className="text-xs text-muted-foreground">
                Dia {prepInfo.currentDay} de 33 · {prepInfo.completed} dia(s) concluído(s)
                {prepInfo.target && ` · consagração prevista: ${formatDate(prepInfo.target)}`}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Preparação de 33 dias em andamento</p>
            )}
          </>
        )}

        {status === 'interessado' && (
          <>
            <div className="flex items-center gap-2 text-gold">
              <Compass className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Caminhando</span>
            </div>
            <p className="mt-2 font-display text-xl text-primary">Conhecendo a devoção</p>
            <p className="text-xs text-muted-foreground">
              Você está explorando o caminho da Total Consagração a Jesus por Maria
            </p>
            <Link to="/caminho" className="mt-3 inline-flex items-center gap-1 text-xs text-gold">
              Iniciar preparação <ChevronRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </div>

      {/* Jornadas coletivas ativas */}
      {journeys.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Jornadas Coletivas</span>
          </div>
          <div className="mt-3 space-y-2">
            {journeys.map((j) => (
              <Link key={j.id} to={`/jornadas/${j.id}`} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 hover:bg-muted">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{j.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.journey_type === 'renovacao' ? 'Renovação' : 'Consagração'}
                    {j.participant?.progress != null && ` · ${j.participant.progress}% concluído`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}