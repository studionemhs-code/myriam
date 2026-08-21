import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Hook que carrega catálogo de produtos + configurações da loja
export function useCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [products, settingsList] = await Promise.all([
        base44.entities.CatalogProduct.filter({ active: true }),
        base44.entities.StoreSettings.list()
      ]);
      const byCat = (c) => products.filter((p) => p.category === c).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setCatalog({
        chains: byCat('chain'),
        marian: byCat('marian'),
        inox: byCat('inox'),
        saint: byCat('saint'),
        pendants: byCat('pendant'),
        medallions: byCat('medallion'),
        scapulars: byCat('scapular')
      });
      setSettings(settingsList[0] || null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { catalog, settings, loading, error, reload: load };
}