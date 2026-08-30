import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight, BookOpen } from 'lucide-react';
import { SectionCard } from '@/components/ui/marian';

export default function JourneySummaryCard({ journey, participant }) {
  if (!journey || !participant) return null;

  const steps = journey.steps || [];
  const completed = participant.completed_steps || [];
  const totalSteps = steps.length;
  const progress = participant.progress || 0;
  const isDone = totalSteps > 0 && completed.length === totalSteps;
  const intentLabel = participant.intent === 'renovacao' ? 'Renovação' : 'Primeira Consagração';

  // Próxima etapa não concluída
  const nextStepIndex = steps.findIndex((_, i) => !completed.includes(i));
  const nextStep = nextStepIndex >= 0 ? steps[nextStepIndex] : null;

  return (
    <div className="mt-4">
      <Link to={`/jornadas/${journey.id}`} className="block">
        <SectionCard
          title="Minha Jornada Coletiva"
          icon={Users}
          accent
          action={<span className="flex items-center gap-1 text-xs text-gold">Continuar <ChevronRight className="h-3 w-3" /></span>}
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-medium text-gold">
              {journey.journey_type === 'renovacao' ? 'Renovação' : 'Consagração'}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              {intentLabel}
            </span>
          </div>
          <p className="mt-2 font-display text-base">{journey.title}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{completed.length}/{totalSteps || '—'} etapas</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          {isDone ? (
            <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs font-medium text-gold">
              ✓ Jornada concluída! Registre sua {journey.journey_type === 'renovacao' ? 'renovação' : 'consagração'}.
            </p>
          ) : nextStep ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Próxima etapa: <span className="font-medium text-foreground">{nextStep.title}</span></p>
            </div>
          ) : null}
        </SectionCard>
      </Link>
    </div>
  );
}