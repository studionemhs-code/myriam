import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Calendar, Users, BookOpen, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/marianDates';

export default function JourneyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [journey, setJourney] = useState(null);
  const [contents, setContents] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.CollectiveJourney.filter({ id });
        const j = list[0];
        setJourney(j);
        if (j?.content_ids?.length) {
          const all = await base44.entities.ACAMFContent.list();
          setContents(all.filter((c) => j.content_ids.includes(c.id)));
        }
        const parts = await base44.entities.JourneyParticipant.filter({ journey_id: id });
        setParticipantCount(parts.length);
      } catch (e) { /* ignore */ }
    })();
  }, [id]);

  if (!journey) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  return (
    <div>
      <button onClick={() => navigate('/jornadas')} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Jornadas</button>

      {journey.image_url && <img src={journey.image_url} alt="" className="h-48 w-full rounded-2xl object-cover" />}

      <h1 className="mt-4 font-display text-2xl">{journey.title}</h1>
      {journey.description && <p className="mt-1 text-sm text-muted-foreground">{journey.description}</p>}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(journey.start_date)} — {formatDate(journey.end_date)}</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {journey.participant_count || participantCount} participantes</span>
      </div>

      {journey.notices?.length > 0 && (
        <div className="mt-4">
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

      {contents.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg"><BookOpen className="h-4 w-4 text-gold" /> Conteúdos da jornada</h2>
          <div className="space-y-2">
            {contents.map((c) => (
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