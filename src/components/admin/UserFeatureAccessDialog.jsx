import React, { useEffect, useState } from 'react';
import { X, Loader2, Lock, Unlock, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { FEATURE_LIST } from '@/lib/featureFlags';
import { clearFeatureFlagsCache } from '@/hooks/useFeatureFlags';

export default function UserFeatureAccessDialog({ user, onClose }) {
  const [grants, setGrants] = useState([]);
  const [globalFlags, setGlobalFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [userGrants, flags] = await Promise.all([
        base44.entities.UserFeatureAccess.filter({ user_id: user.id }),
        base44.entities.FeatureFlag.list(),
      ]);
      setGrants(userGrants);
      const map = {};
      flags.forEach((f) => { map[f.feature] = f.visible !== false; });
      setGlobalFlags(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isGranted = (feature) => grants.some((g) => g.feature === feature && g.granted);

  const toggle = async (feature) => {
    setSaving(feature);
    try {
      const existing = grants.find((g) => g.feature === feature);
      if (existing) {
        if (existing.granted) {
          await base44.entities.UserFeatureAccess.delete(existing.id);
        } else {
          await base44.entities.UserFeatureAccess.update(existing.id, { granted: true });
        }
      } else {
        await base44.entities.UserFeatureAccess.create({
          user_id: user.id,
          user_email: user.email,
          feature,
          granted: true,
        });
      }
      clearFeatureFlagsCache();
      await load();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">Acessos de {user.full_name || user.email}</h2>
            <p className="text-xs text-muted-foreground">Conceda acesso a funcionalidades ocultas no app</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {FEATURE_LIST.map((f) => {
              const granted = isGranted(f.feature);
              const globallyVisible = globalFlags[f.feature] !== false;
              const isSaving = saving === f.feature;
              return (
                <li key={f.feature} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${granted ? 'bg-gold/15' : 'bg-muted'}`}>
                      {granted
                        ? <Unlock className="h-4 w-4 text-gold" />
                        : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {granted
                          ? 'Acesso concedido'
                          : globallyVisible
                            ? 'Disponível para todos'
                            : 'Sem acesso (oculto no app)'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(f.feature)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${
                      granted ? 'bg-gold' : 'bg-muted-foreground/30'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="absolute left-1/2 h-4 w-4 -translate-x-1/2 animate-spin text-white" />
                    ) : (
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${granted ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Funcionalidades visíveis para todos não precisam de concessão individual. Use este painel para liberar páginas que estão ocultas no app.
          </p>
        </div>
      </div>
    </div>
  );
}