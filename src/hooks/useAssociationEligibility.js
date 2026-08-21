import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function useAssociationEligibility() {
  const { user } = useCurrentUser();
  const [state, setState] = useState({ eligible: false, settings: null, loading: true });

  useEffect(() => {
    if (!user) { setState({ eligible: false, settings: null, loading: false }); return; }
    let cancelled = false;
    (async () => {
      try {
        const settingsList = await base44.entities.AssociationSettings.list();
        const s = settingsList[0];
        if (cancelled) return;
        if (!s || !s.is_active) {
          setState({ eligible: false, settings: s, loading: false });
          return;
        }

        let eligible = false;

        // 1. Já é consagrado
        if (user.status === 'consagrado' || user.consecration_date) {
          eligible = true;
        }

        // 2. Renovou a consagração
        if (!eligible && user.renewals && user.renewals.length > 0) {
          eligible = true;
        }

        // 3. Preparação de 33 dias concluída
        if (!eligible) {
          const prog = await base44.entities.UserProgress.filter({ created_by_id: user.id });
          if (prog[0]?.status === 'concluida' || (prog[0]?.completed_days || []).length >= 33) {
            eligible = true;
          }
        }

        // 4. Jornada coletiva concluída e encerrada
        if (!eligible) {
          const parts = await base44.entities.JourneyParticipant.filter({ created_by_id: user.id });
          const jids = parts.map((p) => p.journey_id).filter(Boolean);
          if (jids.length > 0) {
            const journeys = await base44.entities.CollectiveJourney.filter({ id: { $in: jids } });
            eligible = parts.some((p) => {
              const j = journeys.find((jj) => jj.id === p.journey_id);
              if (!j || j.status !== 'encerrada') return false;
              const total = (j.steps || []).length;
              return total === 0 ? p.progress >= 100 : (p.completed_steps || []).length >= total;
            });
          }
        }

        if (!cancelled) setState({ eligible, settings: s, loading: false });
      } catch (e) {
        if (!cancelled) setState({ eligible: false, settings: null, loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return state;
}