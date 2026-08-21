import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Check, ChevronLeft, Clock, BookOpen, FileText, Headphones, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Ornament, GoldDivider } from '@/components/ui/marian';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };
const TYPE_ICON = { texto: FileText, pdf: FileText, ebook: BookOpen, audio: Headphones, video: Play, imagem: BookOpen };

const ACCESS = {
  interessado: ['iniciante'],
  preparacao: ['iniciante', 'intermediario'],
  consagrado: ['iniciante', 'intermediario', 'aprofundamento']
};

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useCurrentUser();

  useEffect(() => {
    (async () => {
      try {
        const [c, l, prog] = await Promise.all([
          base44.entities.Course.get(id),
          base44.entities.ACAMFContent.filter({ course_id: id, status: 'publicado' }),
          base44.entities.LessonProgress.filter({ course_id: id }).catch(() => [])
        ]);
        setCourse(c);
        setLessons(l.sort((a, b) => (a.lesson_order || 0) - (b.lesson_order || 0)));
        setProgress(prog);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  if (!course) {
    return <div className="py-20 text-center text-muted-foreground">Curso não encontrado.</div>;
  }

  const userAccess = (user?.role === 'admin' || user?.exclusive_access)
    ? ['iniciante', 'intermediario', 'aprofundamento']
    : (ACCESS[user?.status] || ACCESS.interessado);

  if (!userAccess.includes(course.level)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mt-5 font-display text-2xl">{course.title}</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {course.level === 'aprofundamento'
            ? 'Este curso está disponível apenas para usuários já consagrados. Conclua sua Consagração Total para acessar conteúdos de aprofundamento.'
            : 'Este curso é destinado a membros em preparação ou já consagrados. Continue sua caminhada para liberá-lo.'}
        </p>
        <Link to="/caminho" className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
          Continuar minha caminhada
        </Link>
        <button onClick={() => navigate('/acamf')} className="mt-3 text-sm text-muted-foreground hover:text-foreground">
          Voltar para ACAMF
        </button>
      </div>
    );
  }

  const completedCount = progress.filter((p) => p.completed).length;
  const totalCount = lessons.length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const nextLesson = lessons.find((l) => !progress.some((p) => p.lesson_id === l.id && p.completed)) || lessons[0];

  return (
    <div className="-mx-4 lg:-mx-8">
      {/* Hero */}
      <div className="relative h-[45vh] min-h-[300px] w-full overflow-hidden">
        {course.cover_url ? (
          <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/40 via-deep to-deep" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <button
          onClick={() => navigate('/acamf')}
          className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition hover:bg-black/60 lg:left-8 lg:top-6"
        >
          <ChevronLeft className="h-4 w-4" /> ACAMF
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
          <div className="mx-auto max-w-3xl lg:max-w-4xl">
            {course.level && (
              <span className="mb-2 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold">
                {LEVEL_LABEL[course.level]}
              </span>
            )}
            <h1 className="font-display text-3xl text-foreground lg:text-4xl">{course.title}</h1>
            {course.description && <p className="mt-2 max-w-xl text-sm text-muted-foreground lg:text-base">{course.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {nextLesson && (
                <Link
                  to={`/acamf/${nextLesson.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-background" />
                  {completedCount > 0 ? 'Continuar' : 'Começar'}
                </Link>
              )}
              <span className="text-sm text-muted-foreground">{totalCount} aulas</span>
              {completedCount > 0 && (
                <span className="text-sm text-gold">{completedCount} concluídas</span>
              )}
            </div>
            {totalCount > 0 && (
              <div className="mt-3 h-1.5 w-full max-w-xs rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson list */}
      <div className="px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-2 lg:max-w-4xl">
          <h2 className="mb-4 font-display text-xl">Aulas</h2>
          {lessons.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">As aulas deste curso serão disponibilizadas em breve.</p>
            </div>
          )}
          {lessons.map((lesson, i) => {
            const prog = progress.find((p) => p.lesson_id === lesson.id);
            const isCompleted = prog?.completed;
            const Icon = TYPE_ICON[lesson.content_type] || BookOpen;
            return (
              <Link
                key={lesson.id}
                to={`/acamf/${lesson.id}`}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 transition hover:border-gold/40 hover:bg-muted/30"
              >
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {lesson.cover_url ? (
                    <img src={lesson.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-deep/30">
                      <Icon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                    <Play className="h-6 w-6 fill-white text-white opacity-0 transition group-hover:opacity-100" />
                  </div>
                  {isCompleted && (
                    <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Aula {i + 1}</span>
                    {isCompleted && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Concluído</span>}
                  </div>
                  <p className="mt-0.5 truncate font-medium">{lesson.title}</p>
                  {lesson.duration && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {lesson.duration}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}

          <GoldDivider />
          <Ornament className="text-gold" />
        </div>
      </div>
    </div>
  );
}