import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Flower2, Check, ChevronLeft, ChevronRight, BookOpen, FileText, PenLine, Link2, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ReactMarkdown from 'react-markdown';
import { getCurrentUnlockedDay, isDayUnlocked, TOTAL_DAYS } from '@/lib/preparationProgress';

export default function DayDetail() {
  const { day } = useParams();
  const dayNum = parseInt(day, 10);
  const navigate = useNavigate();
  const { user, refresh } = useCurrentUser();
  const [dayData, setDayData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [related, setRelated] = useState([]);
  const [reflection, setReflection] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const all = await base44.entities.PreparationDay.filter({ day_number: dayNum });
      const dayRecord = all[0] || null;
      setDayData(dayRecord);
      const prog = await base44.entities.UserProgress.filter({ created_by_id: user.id });
      setProgress(prog[0] || null);
      const refl = await base44.entities.Reflection.filter({ created_by_id: user.id, day_number: dayNum });
      if (refl[0]) setReflection(refl[0].content);
      // Conteúdos ACAMF: prioriza related_content_ids do PreparationDay; se não houver, busca por related_day_number
      if (dayRecord?.related_content_ids?.length) {
        const contents = await base44.entities.ACAMFContent.list();
        setRelated(contents.filter((c) => dayRecord.related_content_ids.includes(c.id)));
      } else {
        const dayContents = await base44.entities.ACAMFContent.filter({ status: 'publicado', related_day_number: dayNum }, '-published_date', 10);
        setRelated(dayContents);
      }
      setLoaded(true);
    })();
  }, [user, dayNum]);

  // Registra quando o dia foi aberto pela primeira vez
  useEffect(() => {
    if (!user || !progress || !dayData || !loaded) return;
    const openedAt = progress.day_opened_at || [];
    if (!openedAt.find((d) => d.day === dayNum)) {
      const updated = [...openedAt, { day: dayNum, opened_at: new Date().toISOString() }];
      base44.entities.UserProgress.update(progress.id, { day_opened_at: updated }).catch(() => {});
      setProgress((p) => ({ ...p, day_opened_at: updated }));
    }
  }, [user, dayData, dayNum, progress, loaded]);

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (!progress) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/caminho')} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Caminho
        </button>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Você ainda não iniciou sua preparação.</p>
          <Link to="/caminho" className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">Ir para o Caminho</Link>
        </div>
      </div>
    );
  }

  // Verifica acessibilidade: meia-noite chegou E todos os dias anteriores concluídos
  const currentUnlocked = getCurrentUnlockedDay(progress.started_date);
  const canView = isDayUnlocked(dayNum, progress, progress.started_date);

  if (!canView) {
    const timeReady = dayNum <= currentUnlocked;
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/caminho')} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Caminho
        </button>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-display text-xl">Dia {dayNum} indisponível</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {timeReady
              ? 'Conclua o dia anterior para desbloquear este dia.'
              : 'Aguarde a meia-noite para desbloquear o próximo dia.'}
          </p>
          <Link to="/caminho" className="mt-4 inline-block rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep">Voltar ao Caminho</Link>
        </div>
      </div>
    );
  }

  const isCompleted = progress.completed_days?.includes(dayNum);

  const completeDay = async () => {
    setSaving(true);
    try {
      const completed = Array.from(new Set([...(progress?.completed_days || []), dayNum]));
      const allDone = completed.length >= TOTAL_DAYS;
      const updated = await base44.entities.UserProgress.update(progress.id, {
        completed_days: completed,
        current_day: currentUnlocked,
        last_access_date: new Date().toISOString(),
        status: allDone ? 'concluida' : 'ativa'
      });
      setProgress(updated);
      if (allDone) {
        await refresh();
        navigate('/consagracao');
      } else {
        navigate('/caminho');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveReflection = async () => {
    if (!reflection.trim()) return;
    setSaving(true);
    try {
      const existing = await base44.entities.Reflection.filter({ created_by_id: user.id, day_number: dayNum });
      if (existing[0]) {
        await base44.entities.Reflection.update(existing[0].id, { content: reflection });
      } else {
        await base44.entities.Reflection.create({
          day_number: dayNum,
          title: dayData?.title || `Dia ${dayNum}`,
          content: reflection,
          is_private: true
        });
      }
      setShowReflection(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/caminho')} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> Caminho
      </button>

      <header className="rounded-2xl bg-deep p-6 text-primary-foreground">
        <p className="text-xs uppercase tracking-[0.25em] text-gold">Dia {dayNum} de 33</p>
        <h1 className="mt-2 font-display text-3xl">{dayData?.title || `Dia ${dayNum}`}</h1>
        {dayData?.description && <p className="mt-2 font-display italic text-primary-foreground/70">{dayData.description}</p>}
      </header>

      {dayData?.image_url && (
        <img src={dayData.image_url} alt="" className="h-44 w-full rounded-2xl object-cover" />
      )}

      {dayData?.text && (
        <article className="prose prose-sm max-w-none">
          <ReactMarkdown>{dayData.text}</ReactMarkdown>
        </article>
      )}

      {dayData?.prayer && (
        <section className="rounded-2xl border border-gold/30 bg-accent/40 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gold"><Flower2 className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Oração</span></div>
            <Link to={`/oracao/${dayNum}`} className="flex items-center gap-1 text-xs text-gold hover:underline">
              Modo oração <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mt-2 whitespace-pre-line font-display italic leading-relaxed">{dayData.prayer}</p>
        </section>
      )}

      {dayData?.practice && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Prática de hoje</p>
          <p className="mt-2 text-sm leading-relaxed">{dayData.practice}</p>
        </section>
      )}

      {/* Mídia */}
      <div className="grid gap-3">
        {dayData?.youtube_id && (
          <div className="aspect-video overflow-hidden rounded-2xl">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${dayData.youtube_id}`}
              title={dayData.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {dayData?.video_url && (
          <video controls src={dayData.video_url} className="w-full rounded-2xl" />
        )}
        {dayData?.audio_url && (
          <audio controls src={dayData.audio_url} className="w-full" />
        )}
        {dayData?.pdf_url && (
          <a href={dayData.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-gold/40">
            <FileText className="h-5 w-5 text-gold" /> <span className="text-sm">Material em PDF</span>
          </a>
        )}
      </div>

      {/* Links externos */}
      {dayData?.links?.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-gold" /> Links</p>
          <div className="space-y-2">
            {dayData.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-gold/40">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="flex-1 text-sm">{l.label || l.url}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </section>
      )}

      {dayData?.reflection_prompt && (
        <section className="rounded-2xl bg-muted/40 p-5">
          <div className="flex items-center gap-2"><PenLine className="h-4 w-4 text-primary" /><span className="text-xs uppercase tracking-wider text-muted-foreground">Reflexão</span></div>
          <p className="mt-2 font-display text-lg">{dayData.reflection_prompt}</p>
          {reflection && !showReflection && (
            <p className="mt-2 text-sm text-muted-foreground italic">Você já registrou uma reflexão neste dia. <button onClick={() => setShowReflection(true)} className="text-gold underline">Ver/editar</button></p>
          )}
        </section>
      )}

      {showReflection && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Sua reflexão (privada)</p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={5}
            placeholder="Escreva o que o Senhor e a Mãe te inspiram hoje..."
            className="w-full rounded-xl border border-input bg-background p-3 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => setShowReflection(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={saveReflection} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Salvar reflexão</button>
          </div>
        </section>
      )}

      {/* Conteúdos relacionados */}
      {related.length > 0 && (
        <section>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium"><BookOpen className="h-4 w-4 text-gold" /> Conteúdos da ACAMF</p>
          <div className="space-y-2">
            {related.map((c) => (
              <Link key={c.id} to={`/acamf/${c.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-gold/40">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-4 w-4 text-primary" /></div>
                <p className="flex-1 text-sm">{c.title}</p>
                <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ações */}
      <div className="sticky bottom-20 lg:bottom-6 z-10 rounded-2xl bg-card/90 p-3 backdrop-blur shadow-lg border border-border">
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 py-2 text-gold">
            <Check className="h-5 w-5" /> <span className="font-medium">Dia concluído</span>
          </div>
        ) : (
          <button
            onClick={completeDay}
            disabled={saving}
            className="w-full rounded-xl bg-gold py-3 font-medium text-deep disabled:opacity-40"
          >
            {saving ? 'Concluindo...' : `Concluir Dia ${dayNum}`}
          </button>
        )}
      </div>
    </div>
  );
}