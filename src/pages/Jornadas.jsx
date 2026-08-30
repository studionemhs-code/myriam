import React, { useEffect, useState } from 'react';
import { Users, Calendar, Check, Sparkles, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import AssociationRequestButton from '@/components/associacao/AssociationRequestButton';
import IntentPopup from '@/components/jornadas/IntentPopup';
import { formatDate, parseDate } from '@/lib/marianDates';

const DEFAULT_PRESENTATION = 'As Jornadas Coletivas são caminhadas em comunidade, guiadas pela equipe Theotokos, com etapas, conteúdos e acompanhamento próprio — diferentes da sua Caminhada individual de 33 dias. Participe da que ressoa em seu coração.';

export default function Jornadas() {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [joiningId, setJoiningId] = useState(null);
  const [pendingJourney, setPendingJourney] = useState(null);
  const [presentationText, setPresentationText] = useState(DEFAULT_PRESENTATION);

  const load = async () => {
    try {
      const list = await base44.entities.CollectiveJourney.filter({ status: 'ativa' }, '-start_date', 50);
      setJourneys(list);
      // Usa o presentation_text da primeira jornada ativa que o tiver definido
      const withText = list.find((j) => j.presentation_text && j.presentation_text.trim());
      if (withText) setPresentationText(withText.presentation_text);
      if (user) {
        const allParts = await base44.entities.JourneyParticipant.list('-created_date', 500);
        const myParts = allParts.filter((p) =>
          p.created_by_id === user.id || p.created_by_id === user.legacy_id
        );
        setParticipations(myParts);
      }
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, [user]);

  const isParticipating = (jid) => participations.some((p) => p.journey_id === jid);

  const joinWithIntent = async (intent) => {
    if (!pendingJourney) return;
    const journey = pendingJourney;
    setJoiningId(journey.id);
    setPendingJourney(null);
    try {
      const created = await base44.entities.JourneyParticipant.create({
        journey_id: journey.id,
        joined_date: new Date().toISOString().slice(0, 10),
        progress: 0,
        completed_steps: [],
        intent
      });
      setJourneys((prev) => prev.map((j) =>
        j.id === journey.id ? { ...j, participant_count: (j.participant_count || 0) + 1 } : j
      ));
      if (created) {
        setParticipations((prev) => [...prev, created]);
      }
      navigate(`/jornadas/${journey.id}`);
    } catch (e) {
      if (e.message && e.message.includes('duplicate key')) {
        setParticipations((prev) => [...prev, { journey_id: journey.id, created_by_id: user?.id }]);
        navigate(`/jornadas/${journey.id}`);
      } else {
        alert(e.message || 'Não foi possível participar da jornada.');
      }
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Jornadas Coletivas" subtitle="Caminhe em comunidade rumo à Consagração" icon={Sparkles} />

      {/* Banner fixo de apresentação */}
      <div className="mb-4 flex gap-3 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-card p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15">
          <Info className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gold">O que são as Jornadas Coletivas?</p>
          <p className="mt-1 text-sm text-muted-foreground">{presentationText}</p>
        </div>
      </div>

      <div className="mb-4">
        <AssociationRequestButton />
      </div>

      {journeys.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nenhuma jornada ativa" subtitle="Em breve novas jornadas coletivas serão abertas." />
      ) : (
        <div className="space-y-4">
          {journeys.map((j) => (
            <div key={j.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              {j.image_url && <img src={j.image_url} alt="" className="h-40 w-full object-cover" />}
              <div className="p-5">
                <h2 className="font-display text-xl">{j.title}</h2>
                {j.description && <p className="mt-1 text-sm text-muted-foreground">{j.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(j.start_date)} — {formatDate(j.end_date)}</span>
                  {j.participant_count > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {j.participant_count} participantes</span>}
                </div>
                {j.notices?.length > 0 && (
                  <div className="mt-3 rounded-xl bg-gold/10 p-3">
                    <p className="text-xs font-medium text-gold">Aviso da jornada</p>
                    <p className="mt-1 text-sm">{j.notices[j.notices.length - 1].text}</p>
                  </div>
                )}
                {isParticipating(j.id) ? (
                  <Link to={`/jornadas/${j.id}`} className="mt-4 flex items-center gap-2 rounded-xl bg-gold/15 px-4 py-2.5 text-sm font-medium text-gold">
                    <Check className="h-4 w-4" /> Você está participando · Ver detalhes
                  </Link>
                ) : (
                  <button
                    onClick={() => setPendingJourney(j)}
                    disabled={joiningId === j.id}
                    className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {joiningId === j.id ? 'Entrando...' : 'Participar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingJourney && (
        <IntentPopup
          journeyTitle={pendingJourney.title}
          onClose={() => setPendingJourney(null)}
          onSelect={joinWithIntent}
        />
      )}
    </div>
  );
}