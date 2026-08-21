import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

export default function ACAMF() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, cats, l, prog] = await Promise.all([
          base44.entities.Course.filter({ status: 'publicado' }, 'sort_order', 100),
          base44.entities.ACAMFCategory.list('sort_order', 50),
          base44.entities.ACAMFContent.filter({ status: 'publicado' }, '-published_date', 200),
          base44.entities.LessonProgress.list('-last_watched_date', 200).catch(() => [])
        ]);
        setCourses(c);
        setCategories(cats);
        setLessons(l);
        setProgress(prog);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const lessonsByCourse = (courseId) => lessons.filter((l) => l.course_id === courseId);
  const courseStats = (courseId) => {
    const total = lessonsByCourse(courseId).length;
    const completed = progress.filter((p) => p.course_id === courseId && p.completed).length;
    return { total, completed, pct: total > 0 ? (completed / total) * 100 : 0 };
  };

  const featured = courses.find((c) => c.featured) || courses[0];
  const inProgress = courses.filter((c) => {
    const stats = courseStats(c.id);
    return stats.completed > 0 && stats.completed < stats.total;
  });
  const notStarted = courses.filter((c) => courseStats(c.id).completed === 0);

  const byCategory = categories
    .map((cat) => ({ category: cat, courses: notStarted.filter((c) => c.category_id === cat.id) }))
    .filter((g) => g.courses.length > 0);
  const uncategorized = notStarted.filter((c) => !c.category_id);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 font-display text-xl">ACAMF em breve</p>
        <p className="mt-1 text-sm text-muted-foreground">A academia está sendo preparada.</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 lg:-mx-8">
      {/* Hero */}
      {featured && (
        <div className="relative h-[55vh] min-h-[380px] w-full overflow-hidden">
          {featured.cover_url ? (
            <img src={featured.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/40 via-deep to-deep" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
            <div className="mx-auto max-w-3xl lg:max-w-4xl">
              {featured.featured && (
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold">
                  <Sparkles className="h-3 w-3" /> Destaque
                </span>
              )}
              <h1 className="font-display text-3xl text-foreground lg:text-5xl">{featured.title}</h1>
              {featured.description && (
                <p className="mt-2 max-w-xl text-sm text-muted-foreground lg:text-base">{featured.description}</p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <Link
                  to={`/acamf/curso/${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-background" /> Assistir
                </Link>
                {courseStats(featured.id).total > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {courseStats(featured.id).completed}/{courseStats(featured.id).total} aulas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 px-4 py-8 lg:px-8">
        {/* Continue assistindo */}
        {inProgress.length > 0 && (
          <Section title="Continue assistindo">
            <Carousel>
              {inProgress.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} />
              ))}
            </Carousel>
          </Section>
        )}

        {/* Por categoria */}
        {byCategory.map((g) => (
          <Section key={g.category.id} title={g.category.name}>
            <Carousel>
              {g.courses.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} />
              ))}
            </Carousel>
          </Section>
        ))}

        {/* Sem categoria */}
        {uncategorized.length > 0 && (
          <Section title="Todos os cursos">
            <Carousel>
              {uncategorized.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} />
              ))}
            </Carousel>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Carousel({ children }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:-mx-8 lg:px-8">
      {children}
    </div>
  );
}

function CourseCard({ course, stats }) {
  return (
    <Link
      to={`/acamf/curso/${course.id}`}
      className="group block w-40 shrink-0 sm:w-44"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted">
        {(course.poster_url || course.cover_url) ? (
          <img
            src={course.poster_url || course.cover_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-deep">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="font-display text-sm leading-tight text-white">{course.title}</p>
          {course.level && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/60">{LEVEL_LABEL[course.level]}</p>
          )}
          {stats.total > 0 && (
            <div className="mt-2">
              <div className="h-1 w-full rounded-full bg-white/20">
                <div
                  className="h-1 rounded-full bg-gold transition-all"
                  style={{ width: `${stats.pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-white/60">{stats.completed}/{stats.total} aulas</p>
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="h-4 w-4 fill-white text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}