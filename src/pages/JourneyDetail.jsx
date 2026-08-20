import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Users, BookOpen, Bell, Check, Play, Lock, Sparkles, Flower2, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDate } from '@/lib/marianDates';
import confetti from 'canvas-confetti';
import MedalGrid from '@/components/caminho/MedalGrid';

export default function JourneyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [journey, setJourney] = useState(null);
  const [contents, setContents] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(new Set());
  const [celebrated, setCelebrated] = useState(false);

  const load = async () => {
    try {
      const list = await base44.entities.CollectiveJourney.filter({ id });
      const j = list[0];
      setJourney(j);
      if (j?.content_ids?.length) {
        const all = await base44.entities.ACAMFContent.list();
        setContents(all.filter((c) => j.content_ids.includes(c.id)));
      }
      const parts = await base44.entities.JourneyParticipant.filter({ journey_id: id });
      setParticipantCount(parts.length);
      if (user) {
        const mine = parts.find((p) => p.created_by_id === user.id);
        setParticipant(mine || null);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user]);

  const join = async () => {
    if (!user) return;
    await base44.entities.JourneyParticipant.create({
      journey_id: id,
      joined_date: new Date().toISOString().slice(0, 10),
      progress: 0,
      completed_steps: []
    });
    await base44.entities.CollectiveJourney.update(id, { participant_count: (journey.participant_count || 0) + 1 });
    await load();
  };

  const toggleStep = async (stepIndex) => {
    if (!participant) return;
    setToggling((s) => new Set(s).add(stepIndex));
    try {
      const completed = participant.completed_steps || [];
      const isDone = completed.includes(stepIndex);
      const newCompleted = isDone
        ? completed.filter((i) => i !== stepIndex)
        : [...completed, stepIndex].sort((a, b) => a - b);
      const totalSteps = (journey.steps || []).length;
      const progress = totalSteps > 0 ? Math.round((newCompleted.length / totalSteps) * 100) : 0;
      const updated = await base44.entities.JourneyParticipant.update(participant.id, {
        completed_steps: newCompleted,
        progress
      });
      setParticipant(updated);
      // Celebração ao concluir todas as etapas
      if (!isDone && totalSteps > 0 && newCompleted.length === totalSteps && !celebrated) {
        setCelebrated(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } finally {
      setToggling((s) => { const n = new Set(s); n.delete(stepIndex); return n; });
    }
  };

  if (loading || !journey) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const steps = journey.steps || [];
  const completedSteps = participant?.completed_steps || [];
  const allDone = steps.length > 0 && completedSteps.length === steps.length;
  const isRenewal = journey.journey_type === 'renovacao';
  const typeLabel = isRenewal ? 'Renovação' : 'Consagração';

  return (
    <div>
      <button onClick={() => navigate('/jornadas')} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> Jornadas
      </button>

      {journey.image_url && <img src={journey.image_url} alt="" className="h-48 w-full rounded-2xl object-cover" />}

      <div className="mt-4 flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${isRenewal ? 'bg-gold/15 text-gold' : 'bg-primary/10 text-primary'}`}>
          {typeLabel}
        </span>
        {participant && <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">Participando</span>}
      </div>

      <h1 className="mt-2 font-display text-2xl">{journey.title}</h1>
      {journey.description && <p className="mt-1 text-sm text-muted-foreground">{journey.description}</p>}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {journey.start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(journey.start_date)} — {formatDate(journey.end_date)}</span>}
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {journey.participant_count || participantCount} participantes</span>
      </div>

      {/* Não participando → CTA para iniciar */}
      {!participant && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-6 text-center">
          <div className="ornament text-gold">✦</div>
          {journey.welcome_message ? (
            <p className="mt-2 text-sm text-muted-foreground">{journey.welcome_message}</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Inicie sua jornada de {typeLabel.toLowerCase()} e percorra as etapas em comunidade.</p>
          )}
          <button onClick={join} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-medium text-deep">
            <Play className="h-4 w-4" /> Iniciar jornada
          </button>
        </div>
      )}

      {/* Avisos */}
      {journey.notices?.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><Bell className="h-4 w-4 text-gold" /> Avisos</h2>
          <div className="space-y-2">
            {journey.notices.map((n, i) => (
              <div key={i} className="rounded-xl bg-gold/10 p-3">
                <p className="text-sm">{n.text}</p>
                {n.date && <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.date)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gamificação — trilha de etapas */}
      {participant && steps.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 rounded-2xl bg-deep p-5 text-primary-foreground">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg">Sua jornada</p>
              <p className="text-sm text-primary-foreground/60">{completedSteps.length}/{steps.length} etapas</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/15">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${participant.progress || 0}%` }} />
            </div>
          </div>

          <div className="mb-4">
            <MedalGrid medals={[
              { label: 'Primeiro Passo', earned: completedSteps.length >= 1 },
              { label: 'Em Caminho', earned: completedSteps.length >= Math.ceil(steps.length / 2) },
              { label: 'Dedicado', earned: completedSteps.length >= Math.max(1, steps.length - 1) },
              { label: 'Concluído', earned: allDone }
            ]} />
          </div>

          {allDone && (
            <div className="mb-4 rounded-2xl border border-gold/40 bg-gold/10 p-5 text-center">
              <Flower2 className="mx-auto h-8 w-8 text-gold" />
              <p className="mt-2 font-display text-lg text-gold">Jornada concluída!</p>
              <p className="mt-1 text-sm text-muted-foreground">Você completou todas as etapas. Que sua {typeLabel.toLowerCase()} seja abençoada.</p>
              <Link to={isRenewal ? '/minha-consagracao' : '/consagracao'} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">
                <Flower2 className="h-4 w-4" /> {isRenewal ? 'Realizar renovação' : 'Registrar consagração'}
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((s, i) => {
              const done = completedSteps.includes(i);
              const busy = toggling.has(i);
              const prevDone = i === 0 || completedSteps.includes(i - 1);
              const canToggle = prevDone || done; // só pode concluir se a anterior está feita
              return (
                <div key={i} className={`flex gap-3 rounded-xl border p-4 transition ${
                  done ? 'border-gold/40 bg-gold/5' : canToggle ? 'border-border bg-card hover:border-gold/40' : 'border-border/50 bg-muted/20'
                }`}>
                  <button
                    onClick={() => canToggle && toggleStep(i)}
                    disabled={!canToggle || busy}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium transition ${
                      done ? 'bg-gold text-deep' :
                      canToggle ? 'border-2 border-gold/50 text-gold hover:bg-gold/10' :
                      'border border-border text-muted-foreground/40'
                    }`}
                  >
                    {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> :
                     done ? <Check className="h-5 w-5" /> :
                     !canToggle ? <Lock className="h-4 w-4" /> :
                     i + 1}
                  </button>
                  <div className="flex-1 pt-0.5">
                    <p className={`font-medium ${done ? 'text-gold' : canToggle ? '' : 'text-muted-foreground'}`}>{s.title}</p>
                    {s.description && <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdos */}
      {contents.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><BookOpen className="h-4 w-4 text-gold" /> Conteúdos da jornada</h2>
          <div className="space-y-2">
            {contents.map((c) => (
              <Link key={c.id} to={`/acamf/${c.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-gold/40">
                {c.cover_url ? <img src={c.cover_url} className="h-10 w-10 rounded-lg object-cover" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
                <p className="flex-1 text-sm">{c.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}