import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Users, BookOpen, Bell, Check, Play, Lock, Flower2, Award, FileText, Music, Video, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatDate } from '@/lib/marianDates';
import confetti from 'canvas-confetti';
import MedalGrid from '@/components/caminho/MedalGrid';

const typeIcons = { texto: FileText, pdf: FileText, audio: Music, video: Video, imagem: ImageIcon };

export default function JourneyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, update: updateUser } = useCurrentUser();
  const [journey, setJourney] = useState(null);
  const [acamfContents, setAcamfContents] = useState([]);
  const [journeyLibraryContents, setJourneyLibraryContents] = useState([]);
  const [participant, setParticipant] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(new Set());
  const [celebrated, setCelebrated] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [openStep, setOpenStep] = useState(null);

  const load = async () => {
    try {
      const list = await base44.entities.CollectiveJourney.filter({ id });
      const j = list[0];
      setJourney(j);

      // Coleta IDs de conteúdos ACAMF referenciados nas etapas + content_ids legado
      const acamfIds = new Set(j?.content_ids || []);
      (j?.steps || []).forEach((s) => { if (s.content_source === 'acamf' && s.content_id) acamfIds.add(s.content_id); });
      if (acamfIds.size > 0) {
        const all = await base44.entities.ACAMFContent.list();
        setAcamfContents(all.filter((c) => acamfIds.has(c.id)));
      }

      // Carrega conteúdos da biblioteca de jornada referenciados nas etapas
      const libIds = new Set((j?.steps || []).filter((s) => s.content_source === 'journey_library' && s.journey_content_id).map((s) => s.journey_content_id));
      if (libIds.size > 0) {
        const allLib = await base44.entities.JourneyContent.list('-created_date', 200);
        setJourneyLibraryContents(allLib.filter((c) => libIds.has(c.id)));
      }

      const parts = await base44.entities.JourneyParticipant.filter({ journey_id: id });
      setParticipantCount(parts.length);
      if (user) {
        const mine = parts.find((p) => p.created_by_id === user.id || p.created_by_id === user.legacy_id);
        setParticipant(mine || null);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user]);

  const join = async () => {
    if (!user) return;
    try {
      await base44.entities.JourneyParticipant.create({
        journey_id: id,
        joined_date: new Date().toISOString().slice(0, 10),
        progress: 0,
        completed_steps: [],
        intent: journey.journey_type === 'renovacao' ? 'renovacao' : 'primeira_consagracao'
      });
      setParticipantCount((c) => c + 1);
    } catch (e) {
      if (!e.message?.includes('duplicate key')) throw e;
    }
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
      if (!isDone && totalSteps > 0 && newCompleted.length === totalSteps && !celebrated) {
        setCelebrated(true);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } finally {
      setToggling((s) => { const n = new Set(s); n.delete(stepIndex); return n; });
    }
  };

  const registerCompletion = async () => {
    if (!participant || !user) return;
    setRegistering(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      // Marca a jornada como concluída
      await base44.entities.JourneyParticipant.update(participant.id, { completed_date: today });

      // Atualiza o perfil do usuário conforme a intenção
      if (participant.intent === 'renovacao') {
        const renewals = user.renewals || [];
        await updateUser({ last_renewal_date: today, renewals: [...renewals, today] });
      } else {
        // Primeira consagração
        await updateUser({ consecration_date: today, status: 'consagrado' });
      }

      await load();
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
    } catch (e) {
      alert(e.message || 'Não foi possível registrar.');
    } finally {
      setRegistering(false);
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
  const intentLabel = participant?.intent === 'renovacao' ? 'Renovação' : participant?.intent === 'primeira_consagracao' ? 'Primeira Consagração' : null;

  // Resolvedor de conteúdo por etapa
  const resolveStepContent = (step) => {
    if (step.content_source === 'acamf' && step.content_id) {
      return { type: 'acamf', data: acamfContents.find((c) => c.id === step.content_id) };
    }
    if (step.content_source === 'journey_library' && step.journey_content_id) {
      return { type: 'journey_library', data: journeyLibraryContents.find((c) => c.id === step.journey_content_id) };
    }
    if (step.content_source === 'inline' && step.content_data) {
      return { type: 'inline', data: step.content_data };
    }
    return null;
  };

  const renderStepContent = (step, stepIndex) => {
    const content = resolveStepContent(step);
    if (!content || !content.data) return null;

    const { type, data } = content;

    if (type === 'acamf') {
      return (
        <Link to={`/acamf/${data.id}`} className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:border-gold/40">
          {data.cover_url ? <img src={data.cover_url} className="h-10 w-10 rounded-lg object-cover" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
          <div className="flex-1">
            <p className="text-sm font-medium">{data.title}</p>
            <p className="text-xs text-muted-foreground">Conteúdo ACAMF · Toque para abrir</p>
          </div>
          <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
        </Link>
      );
    }

    // journey_library ou inline → renderiza inline
    const ct = data.content_type || 'texto';
    const Icon = typeIcons[ct] || FileText;
    return (
      <div className="mt-2 rounded-xl border border-border bg-muted/20 p-4">
        {data.cover_url && <img src={data.cover_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-4 w-4 text-gold" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{type === 'inline' ? 'Conteúdo da etapa' : 'Biblioteca de jornada'}</p>
        </div>
        {data.content && <div className="rich-text text-sm" dangerouslySetInnerHTML={{ __html: data.content }} />}
        {ct === 'audio' && data.audio_url && <audio controls src={data.audio_url} className="mt-3 w-full" />}
        {ct === 'video' && data.youtube_id && (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg">
            <iframe src={`https://youtube.com/embed/${data.youtube_id}`} className="h-full w-full" allowFullScreen title={data.title} />
          </div>
        )}
        {(ct === 'pdf' || ct === 'imagem') && data.file_url && (
          <a href={data.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold/40">
            <FileText className="h-4 w-4 text-gold" /> Abrir {ct === 'pdf' ? 'PDF' : 'imagem'}
          </a>
        )}
      </div>
    );
  };

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
        {intentLabel && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{intentLabel}</span>}
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
              {participant.completed_date ? (
                <p className="mt-3 text-xs text-muted-foreground">Registrado em {formatDate(participant.completed_date)}</p>
              ) : (
                <button
                  onClick={registerCompletion}
                  disabled={registering}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep disabled:opacity-50"
                >
                  <Flower2 className="h-4 w-4" />
                  {registering ? 'Registrando...' : `Registrar minha ${isRenewal ? 'renovação' : 'consagração'}`}
                </button>
              )}
              <Link to={`/certificado?type=jornada&journeyId=${journey.id}`} className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gold/40 px-5 py-2.5 text-sm font-medium text-gold">
                <Award className="h-4 w-4" /> Emitir Certificado
              </Link>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((s, i) => {
              const done = completedSteps.includes(i);
              const busy = toggling.has(i);
              const prevDone = i === 0 || completedSteps.includes(i - 1);
              const canToggle = prevDone || done;
              const isOpen = openStep === i;
              return (
                <div key={i} className={`rounded-xl border transition ${
                  done ? 'border-gold/40 bg-gold/5' : canToggle ? 'border-border bg-card hover:border-gold/40' : 'border-border/50 bg-muted/20'
                }`}>
                  <div className="flex gap-3 p-4">
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
                      <button
                        onClick={() => resolveStepContent(s) && setOpenStep(isOpen ? null : i)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <p className={`font-medium ${done ? 'text-gold' : canToggle ? '' : 'text-muted-foreground'}`}>{s.title}</p>
                        {resolveStepContent(s) && (
                          <ChevronLeft className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? '-rotate-90' : ''}`} />
                        )}
                      </button>
                      {s.description && <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>}
                    </div>
                  </div>
                  {isOpen && renderStepContent(s, i)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conteúdos legados (content_ids) */}
      {acamfContents.length > 0 && (journey.content_ids?.length > 0) && (
        <div className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><BookOpen className="h-4 w-4 text-gold" /> Conteúdos da jornada</h2>
          <div className="space-y-2">
            {acamfContents.filter((c) => journey.content_ids.includes(c.id)).map((c) => (
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