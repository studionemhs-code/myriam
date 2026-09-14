import React, { useEffect, useState } from 'react';
import { Flame, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';
import { formatDate } from '@/lib/marianDates';

function fmtDuration(totalSeconds) {
  if (!totalSeconds) return '0 min';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + 'min' : ''}`.trim();
  return `${m} min`;
}

function calcStreak(sessions) {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map((s) => {
    const d = new Date(s.completed_at || s.created_at);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function PrayerHistorySection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await supabaseEntities.PrayerSession.list('-completed_at', 200);
        setSessions(list);
      } catch (e) { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
  const completed = sessions.length;
  const streak = calcStreak(sessions);
  const recent = sessions.slice(0, 12);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-deep to-primary/15 p-5 text-primary-foreground">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-5 w-5 text-gold" />
        <h2 className="font-display text-lg">Minha Vida de Oração</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary-foreground/60" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
              <p className="font-display text-2xl text-gold">{completed}</p>
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Orações</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
              <p className="font-display text-2xl text-gold">{fmtDuration(totalSeconds)}</p>
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Em oração</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur">
              <p className="font-display text-2xl text-gold">{streak}</p>
              <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">Dias seguidos</p>
            </div>
          </div>

          {recent.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-primary-foreground/50">Conclusões recentes</p>
              <div className="space-y-1.5">
                {recent.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{s.prayer_title || 'Oração'}</p>
                      <p className="text-[10px] text-primary-foreground/50">{formatDate(s.completed_at || s.created_at)}</p>
                    </div>
                    <span className="shrink-0 text-xs text-primary-foreground/60">{fmtDuration(s.duration_seconds || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed === 0 && (
            <p className="mt-2 text-center text-sm text-primary-foreground/60">
              Conclua sua primeira oração no Modo Oração para iniciar sua jornada de constância.
            </p>
          )}
        </>
      )}
    </section>
  );
}