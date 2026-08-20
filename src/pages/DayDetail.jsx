import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Flower2, Check, ChevronLeft, ChevronRight, Play, BookOpen, Heart, FileText, PenLine } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Ornament } from '@/components/ui/marian';
import ReactMarkdown from 'react-markdown';

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const all = await base44.entities.PreparationDay.filter({ day_number: dayNum });
      setDayData(all[0] || null);
      const prog = await base44.entities.UserProgress.filter({ created_by_id: user.id });
      const p = prog[0];
      setProgress(p);
      const refl = await base44.entities.Reflection.filter({ created_by_id: user.id, day_number: dayNum });
      if (refl[0]) setReflection(refl[0].content);
      if (all[0]?.related_content_ids?.length) {
        const contents = await base44.entities.ACAMFContent.list();
        setRelated(contents.filter((c) => all[0].related_content_ids.includes(c.id)));
      }
    })();
  }, [user, dayNum]);

  if (dayData === null && progress === null) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const isCompleted = progress?.completed_days?.includes(dayNum);
  const isCurrent = progress?.current_day === dayNum;

  const completeDay = async () => {
    setSaving(true);
    try {
      const completed = Array.from(new Set([...(progress?.completed_days || []), dayNum]));
      const nextDay = dayNum < 33 ? dayNum + 1 : 33;
      const status = completed.length >= 33 ? 'concluida' : 'ativa';
      const updated = await base44.entities.UserProgress.update(progress.id, {
        completed_days: completed,
        current_day: Math.max(progress.current_day, nextDay),
        last_access_date: new Date().toISOString(),
        status
      });
      setProgress(updated);
      if (status === 'concluida') {
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
        {dayData?.audio_url && (
          <audio controls src={dayData.audio_url} className="w-full" />
        )}
        {dayData?.pdf_url && (
          <a href={dayData.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-gold/40">
            <FileText className="h-5 w-5 text-gold" /> <span className="text-sm">Material em PDF</span>
          </a>
        )}
      </div>

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
        ) : isCurrent ? (
          <button
            onClick={completeDay}
            disabled={saving}
            className="w-full rounded-xl bg-gold py-3 font-medium text-deep disabled:opacity-40"
          >
            {saving ? 'Concluindo...' : `Concluir Dia ${dayNum}`}
          </button>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">Conclua os dias anteriores para desbloquear.</p>
        )}
      </div>
    </div>
  );
}