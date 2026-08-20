import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flower2, ChevronRight, Calendar, Sparkles, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, GoldDivider } from '@/components/ui/marian';
import { formatDate, daysUntil, getNextMarianEvent, parseDate, daysBetween } from '@/lib/marianDates';

const PHASES = {
  desejo: { name: 'Espírito de Desejo', range: 'Dias 1–12' },
  conhecimento: { name: 'Conhecimento de Si', range: 'Dias 13–19' },
  iluminacao: { name: 'Conhecimento de Maria', range: 'Dias 20–27' },
  entrega: { name: 'Conhecimento de Jesus', range: 'Dias 28–33' }
};

function phaseForDay(day) {
  if (day <= 12) return 'desejo';
  if (day <= 19) return 'conhecimento';
  if (day <= 27) return 'iluminacao';
  return 'entrega';
}

export default function Caminho() {
  const { user, update, loading } = useCurrentUser();
  const [progress, setProgress] = useState(null);
  const [days, setDays] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [toggling, setToggling] = useState(new Set());

  const loadProgress = async () => {
    if (!user) return;
    try {
      const list = await base44.entities.UserProgress.filter({ created_by_id: user.id });
      setProgress(list[0] || null);
      const allDays = await base44.entities.PreparationDay.list('day_number', 33);
      setDays(allDays);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { if (user) loadProgress(); }, [user]);

  const toggleDay = async (dayNumber) => {
    if (!progress) return;
    const current = progress.completed_days || [];
    const isDone = current.includes(dayNumber);
    const newCompleted = isDone
      ? current.filter((n) => n !== dayNumber)
      : [...current, dayNumber].sort((a, b) => a - b);
    setToggling((s) => new Set(s).add(dayNumber));
    try {
      await base44.entities.UserProgress.update(progress.id, { completed_days: newCompleted });
      setProgress((p) => (p ? { ...p, completed_days: newCompleted } : p));
    } catch (e) {
      /* ignore */
    } finally {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(dayNumber);
        return n;
      });
    }
  };

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
            Durante 33 dias você percorrerá quatro etapas — desejo, conhecimento de si, conhecimento de Maria e conhecimento de Jesus — culminando na sua Consagração.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-left">
            {Object.entries(PHASES).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-card p-3 border border-border/60">
                <p className="font-display text-sm">{v.name}</p>
                <p className="text-[11px] text-muted-foreground">{v.range}</p>
              </div>
            ))}
          </div>
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

  // Journey active
  const current = progress?.current_day || 1;
  const completedDays = progress?.completed_days || [];
  const completed = completedDays.length;
  const pct = Math.round((completed / 33) * 100);
  const allReady = days.length === 33;
  const daysLeft = user.target_consecration_date
    ? Math.max(0, daysUntil(user.target_consecration_date))
    : Math.max(0, 33 - current + 1);

  return (
    <div>
      <PageHeader title="Caminho" subtitle={`Dia ${current} de 33`} icon={Flower2} />

      {/* Progresso */}
      <section className="rounded-2xl bg-deep p-6 text-primary-foreground">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl">{pct}% concluído</p>
          <p className="text-sm text-primary-foreground/60">{completed}/33 dias</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-primary-foreground/15">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
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
        {progress?.status !== 'concluida' && current <= 33 && allReady && (
          <Link
            to={`/caminho/dia/${current}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep"
          >
            <Play className="h-4 w-4" /> Continuar pelo Dia {current}
          </Link>
        )}
        {progress?.status === 'concluida' && (
          <Link to="/consagracao" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">
            <Flower2 className="h-4 w-4" /> Registrar minha Consagração
          </Link>
        )}
      </section>

      <GoldDivider />

      {/* Lista de dias */}
      <p className="mb-3 text-xs text-muted-foreground">Toque no círculo para marcar um dia como concluído.</p>
      <div className="space-y-2">
        {days.length === 0 && <p className="text-sm text-muted-foreground">Os 33 dias serão carregados pelo administrador. Aguarde.</p>}
        {days.map((d) => {
          const done = completedDays.includes(d.day_number);
          const isCurrent = d.day_number === current && progress?.status !== 'concluida';
          const busy = toggling.has(d.day_number);
          return (
            <div
              key={d.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                isCurrent ? 'border-gold bg-gold/5' : done ? 'border-gold/30 bg-card' : 'border-border bg-card hover:border-gold/40'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleDay(d.day_number)}
                disabled={!progress || busy}
                aria-label={done ? `Desmarcar dia ${d.day_number}` : `Concluir dia ${d.day_number}`}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium transition ${
                  done ? 'bg-gold/15 text-gold' : isCurrent ? 'bg-marian text-white' : 'border border-border text-muted-foreground hover:border-gold/50 hover:text-foreground'
                } ${!progress || busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : done ? <Flower2 className="h-5 w-5" /> : d.day_number}
              </button>
              <Link to={`/caminho/dia/${d.day_number}`} className="flex flex-1 items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium leading-tight">{d.title || `Dia ${d.day_number}`}</p>
                  <p className="text-xs text-muted-foreground">{PHASES[phaseForDay(d.day_number)].name}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SetupPreparation({ user, update, onDone, onCancel }) {
  const [mode, setMode] = useState('target'); // 'target' or 'soon'
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  const computeStart = () => {
    if (mode === 'soon') {
      const today = new Date();
      return today;
    }
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