import { useEffect, useState } from 'react';
import { supabaseEntities } from '@/api/supabase/entities';

let cache = null;

export function useSupportSettings() {
  const [settings, setSettings] = useState(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await supabaseEntities.SupportSettings.list();
        if (!alive) return;
        cache = list[0] || null;
        setSettings(cache);
      } catch (e) {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { settings, loading };
}