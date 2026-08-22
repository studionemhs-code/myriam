import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

let cache = null;
let grantsCache = null;

export async function loadFeatureFlags() {
  const list = await base44.entities.FeatureFlag.list();
  const map = {};
  list.forEach((f) => { map[f.feature] = f.visible !== false; });
  cache = map;
  return map;
}

export async function loadUserGrants(userId) {
  if (!userId) return {};
  const list = await base44.entities.UserFeatureAccess.filter({ user_id: userId, granted: true });
  const map = {};
  list.forEach((g) => { map[g.feature] = true; });
  grantsCache = map;
  return map;
}

export function clearFeatureFlagsCache() {
  cache = null;
  grantsCache = null;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState(cache || {});
  const [grants, setGrants] = useState(grantsCache || {});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [map, me] = await Promise.all([
          cache ? Promise.resolve(cache) : loadFeatureFlags(),
          base44.auth.me().catch(() => null),
        ]);
        if (!active) return;
        setFlags(map);
        setIsAdmin(me?.role === 'admin');
        if (me && me.role !== 'admin') {
          const g = grantsCache || await loadUserGrants(me.id);
          if (active) setGrants(g);
        }
      } catch { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const isVisible = (feature) => {
    if (isAdmin) return true;
    if (grants[feature]) return true;
    return flags[feature] !== false;
  };
  return { flags, loading, isVisible };
}