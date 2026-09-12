import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

let cache = null;

export function useSupportSettings() {
  const [settings, setSettings] = useState(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await base44.entities.SupportSettings.list();
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