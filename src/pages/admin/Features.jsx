import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { clearFeatureFlagsCache } from '@/hooks/useFeatureFlags';
import { AdminPageTitle } from '@/components/admin/ui';
import BroadcastNews from '@/components/admin/BroadcastNews';
import { FEATURE_LIST as DEFAULT_FLAGS } from '@/lib/featureFlags';
import AccessTypeFields from '@/components/admin/AccessTypeFields';
import { clearAccessCache } from '@/hooks/useAccess';

export default function Features() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      let list = await base44.entities.FeatureFlag.list('feature');
      const existing = new Set(list.map((f) => f.feature));
      const missing = DEFAULT_FLAGS.filter((d) => !existing.has(d.feature));
      if (missing.length > 0) {
        await base44.entities.FeatureFlag.bulkCreate(missing.map((d) => ({ ...d, visible: true })));
        clearFeatureFlagsCache();
        list = await base44.entities.FeatureFlag.list('feature');
      }
      setFlags(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const [accessOpen, setAccessOpen] = useState(null);
  const saveAccess = async (flag, v) => {
    const patch = { access_type: v.access_type, product_id: v.access_type === 'pago' ? (v.product_id || null) : null };
    await base44.entities.FeatureFlag.update(flag.id, patch);
    clearFeatureFlagsCache();
    clearAccessCache();
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, ...patch } : f)));
  };

  const toggle = async (flag) => {
    setSaving(flag.id);
    try {
      await base44.entities.FeatureFlag.update(flag.id, { visible: !flag.visible });
      clearFeatureFlagsCache();
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, visible: !f.visible } : f)));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <AdminPageTitle
        title="Funcionalidades do App"
        subtitle="Ligue ou desligue as páginas e módulos visíveis para os usuários."
      />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {flags.map((f) => (
              <li key={f.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${f.visible ? 'bg-primary/10' : 'bg-muted'}`}>
                    {f.visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.visible ? 'Visível no app' : 'Oculta no app'}
                      {f.access_type === 'pago' && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-700">Pago</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                <button onClick={() => setAccessOpen(accessOpen === f.id ? null : f.id)} className="text-xs text-primary hover:underline">
                  {accessOpen === f.id ? 'Fechar' : 'Acesso'}
                </button>
                <button
                  onClick={() => toggle(f)}
                  disabled={saving === f.id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
                    f.visible ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  {saving === f.id ? (
                    <Loader2 className="absolute left-1/2 h-4 w-4 -translate-x-1/2 animate-spin text-white" />
                  ) : (
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${f.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  )}
                </button>
                </div>
              </div>
              {accessOpen === f.id && (
                <div className="mt-3 grid">
                  <AccessTypeFields value={{ access_type: f.access_type, product_id: f.product_id }} onChange={(v) => saveAccess(f, v)} />
                </div>
              )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Alterações entram em vigor imediatamente na navegação do app.
      </p>

      <div className="mt-8">
        <BroadcastNews />
      </div>
    </div>
  );
}