import { useEffect, useState } from 'react';
import { supabaseEntities } from '@/api/supabase/entities';

let cache = null;

export function usePersonalizationSettings() {
  const [settings, setSettings] = useState(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    if (cache) { setSettings(cache); setLoading(false); return; }
    (async () => {
      try {
        const list = await supabaseEntities.PersonalizationSettings.list('-created_date', 1);
        cache = list[0] || null;
      } catch {
        cache = null;
      }
      if (active) { setSettings(cache); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  return { settings, loading };
}

export function getLevelInfo(settings, statusKey) {
  const map = {
    interessado: { nameKey: 'level_interessado_name', descKey: 'level_interessado_desc', defaultName: 'Quero Conhecer', defaultDesc: 'Descubra o que é a Total Consagração' },
    preparacao: { nameKey: 'level_preparacao_name', descKey: 'level_preparacao_desc', defaultName: 'Quero Me Preparar', defaultDesc: 'Iniciar a jornada de 33 dias' },
    consagrado: { nameKey: 'level_consagrado_name', descKey: 'level_consagrado_desc', defaultName: 'Já Sou Consagrado', defaultDesc: 'Registrar a data da sua consagração' },
  };
  const m = map[statusKey];
  if (!m) return { name: statusKey, desc: '' };
  return {
    name: (settings && settings[m.nameKey]) || m.defaultName,
    desc: (settings && settings[m.descKey]) || m.defaultDesc,
  };
}

export function resetPersonalizationCache() {
  cache = null;
}