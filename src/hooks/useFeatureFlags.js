import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

let cache = null;

export async function loadFeatureFlags() {
  const list = await base44.entities.FeatureFlag.list();
  const map = {};
  list.forEach((f) => { map[f.feature] = f.visible !== false; });
  cache = map;
  return map;
}

export function clearFeatureFlagsCache() {
  cache = null;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState(cache || {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) { setFlags(cache); return; }
    let active = true;
    loadFeatureFlags()
      .then((map) => { if (active) { setFlags(map); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const isVisible = (feature) => flags[feature] !== false;
  return { flags, loading, isVisible };
}