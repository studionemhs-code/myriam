import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Hook compartilhado para obter/atualizar o usuário atual.
export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      return me;
    } catch (e) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (data) => {
    const updated = await base44.auth.updateMe(data);
    setUser((prev) => ({ ...prev, ...updated }));
    return updated;
  }, []);

  return { user, loading, refresh: load, update };
}