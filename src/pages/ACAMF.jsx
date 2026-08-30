import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ChevronRight, BookOpen, Sparkles, Info, Lock, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { StandaloneContentSection } from '@/components/acamf/StandaloneContentSection';

const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

// Matriz de acesso: qual nível do usuário libera quais níveis de curso
const ACCESS = {
  interessado: ['iniciante'],
  preparacao: ['iniciante', 'intermediario'],
  consagrado: ['iniciante', 'intermediario', 'aprofundamento']
};

const LOCK_MESSAGE = {
  intermediario: 'Este curso é destinado a membros em preparação ou já consagrados. Continue sua caminhada para liberá-lo.',
  aprofundamento: 'Este curso está disponível apenas para usuários já consagrados. Conclua sua Consagração Total para acessar conteúdos de aprofundamento.'
};

export default function ACAMF() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [lockedCourse, setLockedCourse] = useState(null);
  const { user } = useCurrentUser();

  const userAccess = (user?.role === 'admin' || user?.exclusive_access)
    ? ['iniciante', 'intermediario', 'aprofundamento']
    : (ACCESS[user?.status] || ACCESS.interessado);
  const isLocked = (course) => !userAccess.includes(course.level);

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
  const completedCourses = courses.filter((c) => {
    const stats = courseStats(c.id);
    return stats.total > 0 && stats.completed === stats.total;
  });

  const byCategory = categories
    .map((cat) => ({ category: cat, courses: notStarted.filter((c) => c.category_id === cat.id) }))
    .filter((g) => g.courses.length > 0);
  const uncategorized = notStarted.filter((c) => !c.category_id);

  // Conteúdos avulsos (sem course_id) — agrupados por categoria
  const standaloneLessons = lessons.filter((l) => !l.course_id);
  const standaloneByCategory = categories
    .map((cat) => ({ category: cat, items: standaloneLessons.filter((l) => l.category_id === cat.id) }))
    .filter((g) => g.items.length > 0);
  const standaloneUncategorized = standaloneLessons.filter((l) => !l.category_id);

  // Tags únicas extraídas das aulas
  const allTags = [...new Set(lessons.flatMap((l) => l.tags || []))].sort();

  // Cursos filtrados quando há filtro ativo
  const filteredCourses = activeFilter
    ? courses.filter((c) => c.level === activeFilter.value)
    : null;

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
      {/* Hero cinematográfico */}
      {featured && (
        <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
          {featured.cover_url ? (
            <img src={featured.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/40 via-deep to-deep" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
            <div className="mx-auto max-w-3xl lg:max-w-5xl">
              {featured.featured && (
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
                  <Sparkles className="h-3 w-3" /> Curso em destaque
                </span>
              )}
              <h1 className="font-display text-4xl text-foreground drop-shadow-lg lg:text-6xl">{featured.title}</h1>
              {featured.description && (
                <p className="mt-3 max-w-xl text-sm text-muted-foreground line-clamp-2 lg:text-lg">{featured.description}</p>
              )}
              <div className="mt-5 flex items-center gap-3">
                <Link
                  to={`/acamf/curso/${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg transition hover:scale-105"
                >
                  <Play className="h-4 w-4 fill-background" /> Assistir agora
                </Link>
                <Link
                  to={`/acamf/curso/${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-5 py-3 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-card/70"
                >
                  <Info className="h-4 w-4" /> Detalhes
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

      <div className="space-y-10 px-4 py-8 lg:px-8 lg:py-10">
        {/* Barra de filtros */}
        <FilterBar
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
        />

        {/* Resultados filtrados */}
        {filteredCourses ? (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-7 w-1 rounded-full bg-primary" />
              <h2 className="font-display text-xl text-foreground lg:text-2xl">
                {filteredCourses.length} {filteredCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}
              </h2>
            </div>
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {filteredCourses.map((c) => (
                  <CourseCard key={c.id} course={c} stats={courseStats(c.id)} locked={isLocked(c)} onLockedClick={() => setLockedCourse(c)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum curso com este filtro.</p>
                <button onClick={() => setActiveFilter(null)} className="mt-2 text-sm font-medium text-primary hover:underline">
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Continue assistindo */}
        {inProgress.length > 0 && (
          <Section title="Continue assistindo" accent="#663399">
            <Carousel>
              {inProgress.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} locked={isLocked(c)} onLockedClick={() => setLockedCourse(c)} />
              ))}
            </Carousel>
          </Section>
        )}

        {/* Por categoria */}
        {byCategory.map((g) => (
          <Section key={g.category.id} title={g.category.name} accent={g.category.color || '#663399'}>
            <Carousel>
              {g.courses.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} locked={isLocked(c)} onLockedClick={() => setLockedCourse(c)} />
              ))}
            </Carousel>
          </Section>
        ))}

        {/* Cursos concluídos */}
        {completedCourses.length > 0 && (
          <Section title="Concluídos por você" accent="#10b981">
            <Carousel>
              {completedCourses.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} locked={isLocked(c)} onLockedClick={() => setLockedCourse(c)} />
              ))}
            </Carousel>
          </Section>
        )}

        {/* Sem categoria */}
        {uncategorized.length > 0 && (
          <Section title="Todos os cursos" accent="#663399">
            <Carousel>
              {uncategorized.map((c) => (
                <CourseCard key={c.id} course={c} stats={courseStats(c.id)} locked={isLocked(c)} onLockedClick={() => setLockedCourse(c)} />
              ))}
            </Carousel>
          </Section>
        )}

        {/* Conteúdos avulsos por categoria */}
        {standaloneByCategory.map((g) => (
          <StandaloneContentSection
            key={`sa-${g.category.id}`}
            title={g.category.name}
            accent={g.category.color || '#663399'}
            items={g.items}
            userAccess={userAccess}
            onLockedClick={setLockedCourse}
          />
        ))}

        {/* Conteúdos avulsos sem categoria */}
        {standaloneUncategorized.length > 0 && (
          <StandaloneContentSection
            title="Outros conteúdos"
            accent="#663399"
            items={standaloneUncategorized}
            userAccess={userAccess}
            onLockedClick={setLockedCourse}
          />
        )}
          </>
        )}
      </div>

      {/* Pop-up de curso bloqueado */}
      {lockedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setLockedCourse(null)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLockedCourse(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-lg">{lockedCourse.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {LOCK_MESSAGE[lockedCourse.level] || 'Este curso ainda não está disponível para o seu nível na caminhada.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link to="/caminho" className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                Continuar minha caminhada
              </Link>
              <button onClick={() => setLockedCourse(null)} className="w-full rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBar({ activeFilter, onFilter }) {
  const levels = [
    { value: 'iniciante', label: 'Iniciante' },
    { value: 'intermediario', label: 'Intermediário' },
    { value: 'aprofundamento', label: 'Aprofundamento' }
  ];

  const isActive = (value) => activeFilter?.value === value;
  const toggle = (value) => onFilter(isActive(value) ? null : { type: 'level', value });

  const chipCls = (active) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtrar por nível</span>
        {activeFilter && (
          <button
            onClick={() => onFilter(null)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button className={chipCls(!activeFilter)} onClick={() => onFilter(null)}>Todos</button>
        {levels.map((l) => (
          <button key={l.value} className={chipCls(isActive(l.value))} onClick={() => toggle(l.value)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, accent = '#663399', children }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-7 w-1 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="font-display text-xl text-foreground lg:text-2xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Carousel({ children }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 lg:-mx-8 lg:px-8">
      {children}
    </div>
  );
}

function CourseCard({ course, stats, locked, onLockedClick }) {
  const cardInner = (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-xl bg-muted shadow-md transition duration-300 group-hover:scale-[1.08] group-hover:shadow-2xl ${locked ? 'grayscale' : ''}`}>
      {(course.poster_url || course.cover_url) ? (
        <img
          src={course.poster_url || course.cover_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-deep">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}
      {/* Gradiente inferior sempre visível */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {/* Info na base */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-display text-sm font-semibold leading-tight text-white drop-shadow line-clamp-2">{course.title}</p>
        <div className="mt-1 flex items-center gap-2">
          {course.level && (
            <span className="text-[10px] uppercase tracking-wider text-white/70">{LEVEL_LABEL[course.level]}</span>
          )}
          {stats.total > 0 && (
            <span className="text-[10px] text-white/50">• {stats.total} aulas</span>
          )}
        </div>
        {stats.total > 0 && stats.completed > 0 && (
          <div className="mt-2">
            <div className="h-1 w-full rounded-full bg-white/20">
              <div
                className="h-1 rounded-full bg-gold transition-all"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-white/60">{stats.completed}/{stats.total} concluídas</p>
          </div>
        )}
      </div>

      {/* Overlay com play OU cadeado */}
      {locked ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white/25 backdrop-blur-md transition duration-300 group-hover:scale-100">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Badge de conclusão */}
      {stats.total > 0 && stats.completed === stats.total && (
        <div className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          ✓ Concluído
        </div>
      )}
    </div>
  );

  if (locked) {
    return (
      <button
        onClick={onLockedClick}
        className="group relative z-0 block w-44 shrink-0 text-left transition-all duration-300 hover:z-20 sm:w-48 lg:w-52"
      >
        {cardInner}
      </button>
    );
  }

  return (
    <Link
      to={`/acamf/curso/${course.id}`}
      className="group relative z-0 block w-44 shrink-0 transition-all duration-300 hover:z-20 sm:w-48 lg:w-52"
    >
      {cardInner}
    </Link>
  );
}