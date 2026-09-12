import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'theotokos_reading_prefs';

const DEFAULTS = {
  theme: 'sepia',
  fontScale: 1,
  lineHeight: 1.8,
  timerEnabled: false,
  timerMinutes: 10,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { ...DEFAULTS };
}

export function useReadingPrefs() {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }, [prefs]);

  const update = useCallback((patch) => {
    setPrefs((p) => ({ ...p, ...patch }));
  }, []);

  const reset = useCallback(() => setPrefs({ ...DEFAULTS }), []);

  return { prefs, update, reset };
}