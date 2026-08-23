import React, { useEffect, useState } from 'react';
import { BookOpen, FileText, Crown, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const fmtDate = (d) => d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

export default function JourneyTimeline() {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [assocRequest, setAssocRequest] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [progList, reqList] = await Promise.all([
          base44.entities.UserProgress.filter({ created_by_id: user.id }, '-created_date', 1),
          base44.entities.AssociationRequest.filter({ user_id: user.id }, '-request_date', 1),
        ]);
        setProgress(progList[0] || null);
        setAssocRequest(reqList[0] || null);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const startDate = progress?.started_date;
  const docDate = assocRequest?.document_read_date || assocRequest?.request_date;
  const consecrationDate = user?.consecration_date || progress?.completed_date;

  const steps = [
    {
      icon: BookOpen,
      label: 'Início da Jornada',
      date: startDate,
      done: !!startDate,
      color: 'text-marian',
      bg: 'bg-marian/15',
    },
    {
      icon: FileText,
      label: 'Entrega de Documentos',
      date: docDate,
      done: !!docDate,
      color: 'text-gold',
      bg: 'bg-gold/15',
    },
    {
      icon: Crown,
      label: 'Consagração Final',
      date: consecrationDate,
      done: !!consecrationDate,
      color: 'text-gold',
      bg: 'bg-gold/20',
    },
  ];

  const hasAny = steps.some((s) => s.date);

  if (!hasAny) {
    return (
      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gold" />
          <h2 className="font-display text-base">Linha do Tempo</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sua linha do tempo aparecerá aqui quando você iniciar sua jornada de consagração.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-gold" />
        <h2 className="font-display text-base">Linha do Tempo</h2>
      </div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
        <div className="space-y-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative flex items-start gap-4">
                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step.done ? step.bg : 'bg-muted'}`}>
                  {step.done ? (
                    <Icon className={`h-5 w-5 ${step.color}`} />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="pt-1.5">
                  <p className={`text-sm font-medium ${step.done ? '' : 'text-muted-foreground/60'}`}>
                    {step.label}
                  </p>
                  {step.date ? (
                    <p className="mt-0.5 text-xs text-gold">{fmtDate(step.date)}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground/50">Pendente</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}