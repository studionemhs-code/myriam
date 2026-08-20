import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, ChevronRight, Calendar, Sparkles, Play, Lock, Check, Clock, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, GoldDivider } from '@/components/ui/marian';
import MedalGrid from '@/components/caminho/MedalGrid';
import ExportJourneyPdf from '@/components/ExportJourneyPdf';
import { formatDate, daysUntil, parseDate, daysBetween } from '@/lib/marianDates';

const DEFAULT_PHASES = {
  desejo: 'Espírito de Desejo',
  conhecimento: 'Conhecimento de Si',
  iluminacao: 'Conhecimento de Maria',
  entrega: 'Conhecimento de Jesus'
};

export default function Caminho() {
  const { user, update, loading } = useCurrentUser();
  const [progress, setProgress] = useState(null);
  const [days, setDays] = useState([]);
  const [phases, setPhases] = useState([]);
  const [showSetup, setShowSetup] = useState(false);

  const loadProgress = async () => {
    if (!user) return;
    try {
      const list = await base44.entities.UserProgress.filter({ created_by_id: user.id });
      const p = list[0] || null;
      const [allDays, phaseList] = await Promise.all([
        base44.entities.PreparationDay.list('day_number', 33),
        base44.entities.PreparationPhase.list('sort_order', 50)
      ]);
      setDays(allDays);
      setPhases(phaseList);
      // Sincroniza current_day com o valor baseado em tempo
      if (p && p.started_date) {
        const elapsed = daysBetween(parseDate(p.started_date), new Date());
        const unlocked = Math.min(33, Math.max(1, elapsed + 1));
        if (p.current_day !== unlocked) {
          const updated = await base44.entities.UserProgress.update(p.id, { current_day: unlocked });
          setProgress(updated);
        } else {
          setProgress(p);
        }
      } else {
        setProgress(p);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { if (user) loadProgress(); }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const isPreparing = user.status === 'preparacao' || !!progress;

  if (!isPreparing && !showSetup) {
    return (
      <div>
        <PageHeader title="Caminho" subtitle="A jornada de 33 dias para a Total Consagração" icon={Flower2} />
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-6 text-center">
          <div className="ornament text-gold">✦</div>
          <h2 className="mt-3 font-display text-2xl">A preparação de 33 dias</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Durante 33 dias você percorrerá as etapas da preparação, culminando na sua Consagração.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="mt-6 rounded-xl bg-gold px-6 py-3 font-medium text-deep transition hover:bg-gold/90"
          >
            Quero começar minha preparação
          </button>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return <SetupPreparation user={user} update={update} onDone={loadProgress} onCancel={() => setShowSetup(false)} />;
  }

  // Desbloqueio baseado em tempo: cada dia abre à meia-noite
  const startedDate = progress?.started_date ? parseDate(progress.started_date) : null;
  const now = new Date();
  const daysElapsed = startedDate ? daysBetween(startedDate, now) : 0;
  const currentUnlocked = Math.min(33, Math.max(1, daysElapsed + 1));
  const completedDays = progress?.completed_days || [];
  const completed = completedDays.length;
  const pct = Math.round((completed / 33) * 100);
  const allReady = days.length === 33;
  const daysLeft = user.target_consecration_date
    ? Math.max(0, daysUntil(user.target_consecration_date))
    : Math.max(0, 33 - currentUnlocked + 1);
  const journeyEnded = daysElapsed >= 33;

  const phaseName = (phase) => {
    if (!phase) return 'Sem fase';
    const found = phases.find((p) => p.name === phase);
    return found?.name || DEFAULT_PHASES[phase] || phase;
  };

  // Fase atual e mensagem de incentivo
  const phasesWithDays = phases.map((phase) => {
    const phaseDays = days.filter((d) => d.phase === phase.name).map((d) => d.day_number).sort((a, b) => a - b);
    return { ...phase, dayRange: phaseDays.length > 0 ? [phaseDays[0], phaseDays[phaseDays.length - 1]] : null, dayCount: phaseDays.length };
  });
  const currentPhase = phasesWithDays.find((p) => p.dayRange && currentUnlocked >= p.dayRange[0] && currentUnlocked <= p.dayRange[1]);
  const phaseProgress = currentPhase && currentPhase.dayCount > 0
    ? (currentUnlocked - currentPhase.dayRange[0] + 1) / currentPhase.dayCount
    : 0;
  let incentiveMessage = null;
  if (currentPhase) {
    if (phaseProgress <= 0.4 && currentPhase.start_message) incentiveMessage = currentPhase.start_message;
    else if (phaseProgress > 0.4 && phaseProgress <= 0.8 && currentPhase.midway_message) incentiveMessage = currentPhase.midway_message;
    else if (phaseProgress > 0.8 && currentPhase.completion_message) incentiveMessage = currentPhase.completion_message;
  }

  // Medalhas de gamificação
  const medals = [
    { label: '1ª Semana', earned: completed >= 7 },
    { label: 'Metade', earned: completed >= 17 },
    { label: 'Quase Lá', earned: completed >= 25 },
    { label: 'Consagrado', earned: completed >= 33 }
  ];

  const getDayStatus = (dayNum) => {
    if (!startedDate) return 'locked';
    if (dayNum > currentUnlocked) return 'locked'; // ainda não chegou o dia
    const isExpired = daysElapsed >= dayNum; // janela de 24h passou
    const openedEntry = (progress?.day_opened_at || []).find((d) => d.day === dayNum);
    const wasOpenedInTime = openedEntry && daysBetween(startedDate, new Date(openedEntry.opened_at)) < dayNum;
    if (isExpired && !wasOpenedInTime) return 'missed'; // perdeu o prazo
    if (completedDays.includes(dayNum)) return 'completed';
    if (dayNum === currentUnlocked) return 'current';
    return 'available';
  };

  return (
    <div>
      <PageHeader title="Caminho" subtitle={`Dia ${currentUnlocked} de 33`} icon={Flower2} />

      {/* Progresso */}
      <section className="rounded-2xl bg-deep p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">{pct}% concluído</p>
          <p className="text-sm text-primary-foreground/60">{completed}/33 dias</p>
        </div>
        <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/15">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
          <div className="absolute top-0 h-full w-px bg-primary-foreground/25" style={{ left: '25%' }} />
          <div className="absolute top-0 h-full w-px bg-primary-foreground/25" style={{ left: '50%' }} />
          <div className="absolute top-0 h-full w-px bg-primary-foreground/25" style={{ left: '75%' }} />
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl bg-primary-foreground/5 p-4">
          <div className="flex flex-col items-center">
            <span className="font-display text-4xl text-gold leading-none">{daysLeft}</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground/55">{daysLeft === 1 ? 'dia' : 'dias'}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-primary-foreground">
              {progress?.status === 'concluida'
                ? 'Preparação concluída!'
                : daysLeft === 0
                ? 'Hoje é o dia da sua Consagração'
                : 'Faltam para sua Consagração'}
            </p>
            {user.target_consecration_date && (
              <p className="mt-0.5 text-xs text-primary-foreground/60">
                Consagração prevista: <span className="text-gold">{formatDate(user.target_consecration_date)}</span>
              </p>
            )}
          </div>
        </div>
        {progress?.status !== 'concluida' && currentUnlocked <= 33 && allReady && getDayStatus(currentUnlocked) !== 'missed' && (
          <Link
            to={`/caminho/dia/${currentUnlocked}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep"
          >
            <Play className="h-4 w-4" /> Continuar pelo Dia {currentUnlocked}
          </Link>
        )}
        {(progress?.status === 'concluida' || journeyEnded) && (
          <Link to="/consagracao" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">
            <Flower2 className="h-4 w-4" /> Registrar minha Consagração
          </Link>
        )}
      </section>

      {incentiveMessage && (
        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gold">Mensagem da fase</p>
          <p className="mt-1 text-sm italic text-foreground">{incentiveMessage}</p>
        </div>
      )}

      <div className="mt-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg"><Award className="h-4 w-4 text-gold" /> Medalhas</h2>
        <MedalGrid medals={medals} />
      </div>

      <GoldDivider />

      {/* Lista de dias */}
      <p className="mb-3 text-xs text-muted-foreground">
        Cada dia desbloqueia à meia-noite. Abra o dia dentro do prazo de 24h para não perder o conteúdo.
      </p>
      <div className="space-y-2">
        {days.length === 0 && <p className="text-sm text-muted-foreground">Os 33 dias serão carregados pelo administrador. Aguarde.</p>}
        {days.map((d) => {
          const status = getDayStatus(d.day_number);
          const canView = status !== 'locked' && status !== 'missed';
          const inner = (
            <>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium transition ${
                status === 'completed' ? 'bg-gold/15 text-gold' :
                status === 'current' ? 'bg-marian text-white' :
                status === 'missed' ? 'bg-muted text-muted-foreground' :
                status === 'locked' ? 'bg-muted/50 text-muted-foreground/50' :
                'border border-border text-muted-foreground'
              }`}>
                {status === 'completed' ? <Check className="h-5 w-5" /> :
                 status === 'locked' ? <Lock className="h-4 w-4" /> :
                 status === 'missed' ? <Clock className="h-4 w-4" /> :
                 d.day_number}
              </div>
              <div className="flex-1">
                <p className={`font-medium leading-tight ${status === 'locked' || status === 'missed' ? 'text-muted-foreground' : ''}`}>
                  {d.title || `Dia ${d.day_number}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {phaseName(d.phase)}
                  {status === 'missed' && ' · Dia perdido'}
                  {status === 'locked' && ' · Bloqueado'}
                </p>
              </div>
              {canView && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </>
          );
          return canView ? (
            <Link key={d.id} to={`/caminho/dia/${d.day_number}`} className={`flex items-center gap-3 rounded-xl border p-3 transition ${
              status === 'current' ? 'border-gold bg-gold/5' : 'border-border bg-card hover:border-gold/40'
            }`}>
              {inner}
            </Link>
          ) : (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
              {inner}
            </div>
          );
        })}
      </div>

      <GoldDivider />
      <div className="flex justify-center">
        <ExportJourneyPdf />
      </div>
    </div>
  );
}

function SetupPreparation({ user, update, onDone, onCancel }) {
  const [mode, setMode] = useState('target');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const computeStart = () => {
    if (mode === 'soon') return new Date();
    const target = parseDate(targetDate);
    if (!target) return null;
    const start = new Date(target);
    start.setDate(start.getDate() - 33);
    return start;
  };

  const start = computeStart();
  const target = mode === 'soon' ? (start ? addDays(start, 33) : null) : parseDate(targetDate);

  const begin = async () => {
    if (!start) return;
    setSaving(true);
    try {
      const startStr = start.toISOString().slice(0, 10);
      const targetStr = target ? target.toISOString().slice(0, 10) : null;
      await update({
        status: 'preparacao',
        preparation_start_date: startStr,
        target_consecration_date: targetStr
      });
      await base44.entities.UserProgress.create({
        current_day: 1,
        completed_days: [],
        started_date: startStr,
        last_access_date: new Date().toISOString(),
        status: 'ativa'
      });
      await onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Começar preparação" subtitle="Configure sua jornada de 33 dias" icon={Calendar} />
      <p className="mb-4 text-sm text-muted-foreground">Quando você deseja realizar sua Consagração?</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setMode('target')} className={`rounded-xl border p-4 text-left ${mode === 'target' ? 'border-gold bg-gold/5' : 'border-border bg-card'}`}>
          <Calendar className="h-5 w-5 text-gold" />
          <p className="mt-2 font-medium">Escolher uma data</p>
          <p className="text-xs text-muted-foreground">Para a consagração</p>
        </button>
        <button onClick={() => setMode('soon')} className={`rounded-xl border p-4 text-left ${mode === 'soon' ? 'border-gold bg-gold/5' : 'border-border bg-card'}`}>
          <Sparkles className="h-5 w-5 text-gold" />
          <p className="mt-2 font-medium">O quanto antes</p>
          <p className="text-xs text-muted-foreground">Começar hoje</p>
        </button>
      </div>

      {mode === 'target' && (
        <div className="mt-4">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Data da Consagração</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date(Date.now() + 34 * 86400000).toISOString().slice(0, 10)}
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
          />
        </div>
      )}

      {start && (
        <div className="mt-5 rounded-2xl border border-gold/30 bg-card p-5">
          <div className="ornament text-gold text-sm">✦</div>
          <div className="mt-2 space-y-1 text-center">
            <p className="text-sm text-muted-foreground">Sua preparação começa em</p>
            <p className="font-display text-xl text-primary">{formatDate(start)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Sua Consagração está prevista para</p>
            <p className="font-display text-xl text-gold">{target ? formatDate(target) : '—'}</p>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={onCancel} className="rounded-xl border border-border px-5 py-3 text-sm">Voltar</button>
        <button
          onClick={begin}
          disabled={!start || saving}
          className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {saving ? 'Iniciando...' : 'Iniciar minha caminhada'}
        </button>
      </div>
    </div>
  );
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}