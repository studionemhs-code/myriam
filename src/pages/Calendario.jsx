import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Star, Flower2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader } from '@/components/ui/marian';
import {
  monthMatrix, WEEKDAYS_PT, MONTHS_PT, formatDate, MARIAN_FIXED_DATES,
  parseDate, isToday, getNextMarianEvent, nextRenewal
} from '@/lib/marianDates';

const TYPE_COLORS = {
  solenidade: 'bg-gold text-deep',
  festa: 'bg-marian text-white',
  memoria: 'bg-marian-light/40 text-deep',
  jornada: 'bg-primary text-primary-foreground',
  pessoal: 'bg-primary/15 text-primary',
  evento: 'bg-accent text-accent-foreground'
};

export default function Calendario() {
  const { user } = useCurrentUser();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [allContent, setAllContent] = useState([]);
  const [allJourneys, setAllJourneys] = useState([]);

  const loadEvents = async () => {
    try {
      const [list, content, journeys] = await Promise.all([
        base44.entities.MarianCalendarEvent.list('-event_date', 200),
        base44.entities.ACAMFContent.filter({ status: 'publicado' }, '-published_date', 200),
        base44.entities.CollectiveJourney.filter({ status: 'ativa' }, '-start_date', 50)
      ]);
      setEvents(list);
      setAllContent(content);
      setAllJourneys(journeys);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { loadEvents(); }, []);

  const renewal = user?.consecration_date ? nextRenewal(user.consecration_date, user.last_renewal_date) : null;

  // Map: "MM-DD" -> events from fixed + db. And user consecration/renewal.
  const monthEvents = useMemo(() => {
    const map = {};
    MARIAN_FIXED_DATES.forEach((d) => {
      const key = `${d.month}-${d.day}`;
      (map[key] = map[key] || []).push({ title: d.title, type: d.type, featured: d.featured, isSystem: true });
    });
    events.forEach((e) => {
      const d = parseDate(e.event_date);
      if (!d) return;
      const key = `${d.getMonth()}-${d.getDate()}`;
      (map[key] = map[key] || []).push({ ...e, isSystem: false });
    });
    if (user?.consecration_date) {
      const d = parseDate(user.consecration_date);
      const key = `${d.getMonth()}-${d.getDate()}`;
      (map[key] = map[key] || []).push({ title: 'Minha Consagração', type: 'pessoal', isUser: true });
    }
    if (renewal) {
      const key = `${renewal.getMonth()}-${renewal.getDate()}`;
      (map[key] = map[key] || []).push({ title: 'Minha Renovação Anual', type: 'pessoal', isUser: true });
    }
    return map;
  }, [events, user, renewal]);

  const cells = monthMatrix(cursor.year, cursor.month);
  const nextEvent = getNextMarianEvent();

  const move = (delta) => {
    setCursor((c) => {
      const m = c.month + delta;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: m };
    });
  };

  return (
    <div>
      <PageHeader title="Calendário Mariano" subtitle="Datas, festas e solenidades de Nossa Senhora" icon={Calendar} />

      {/* Próxima destaque */}
      <section className="mb-5 rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-5">
        <p className="text-xs uppercase tracking-wider text-gold">Próxima data mariana</p>
        <p className="mt-1 font-display text-xl">{nextEvent.title}</p>
        <p className="text-sm text-muted-foreground capitalize">{formatDate(nextEvent.date, { day: 'numeric', month: 'long' })}</p>
      </section>

      {/* Navegação do mês */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded-lg p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
        <p className="font-display text-lg">{MONTHS_PT[cursor.month]} {cursor.year}</p>
        <button onClick={() => move(1)} className="rounded-lg p-2 hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS_PT.map((w, i) => (
          <div key={i} className="py-1 text-[10px] uppercase text-muted-foreground">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = `${d.getMonth()}-${d.getDate()}`;
          const dayEvents = monthEvents[key] || [];
          const isSel = selected && selected.date?.toDateString() === d.toDateString();
          const todayCell = isToday(d);
          return (
            <button
              key={i}
              onClick={() => setSelected({ date: d, events: dayEvents })}
              className={`flex flex-col items-center rounded-lg py-1.5 text-sm transition ${
                isSel ? 'bg-primary text-primary-foreground' : todayCell ? 'ring-1 ring-gold' : 'hover:bg-muted'
              }`}
            >
              {d.getDate()}
              {dayEvents.length > 0 && (
                <div className="mt-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <span key={j} className={`h-1.5 w-1.5 rounded-full ${TYPE_COLORS[e.type] || 'bg-muted-foreground'}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {Object.entries(TYPE_COLORS).filter(([k]) => ['solenidade','festa','memoria','pessoal'].includes(k)).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} /> {k}</span>
        ))}
      </div>

      {/* Detalhe do dia selecionado */}
      {selected && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gold" />
            <p className="font-display text-lg capitalize">{formatDate(selected.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          {selected.events.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhuma data mariana neste dia.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {selected.events.map((e, i) => (
                <div key={i} className="rounded-xl bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    {e.featured && <Star className="h-4 w-4 text-gold" />}
                    {e.isUser && <Flower2 className="h-4 w-4 text-marian" />}
                    <span className="font-medium">{e.title}</span>
                  </div>
                  {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
                  {e.related_content_ids?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {e.related_content_ids.map((cid) => {
                        const c = allContent.find((x) => x.id === cid);
                        if (!c) return null;
                        return <Link key={cid} to={`/acamf/${cid}`} className="block text-xs text-primary hover:underline">📖 {c.title}</Link>;
                      })}
                    </div>
                  )}
                  {e.related_journey_id && (() => {
                    const j = allJourneys.find((x) => x.id === e.related_journey_id);
                    return j ? <Link to={`/jornadas/${j.id}`} className="mt-1 block text-xs text-gold hover:underline">✦ {j.title}</Link> : null;
                  })()}
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase ${TYPE_COLORS[e.type] || 'bg-muted'}`}>{e.type}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}