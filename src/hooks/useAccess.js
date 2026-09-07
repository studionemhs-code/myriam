import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { resolveAccess, trialEligibility } from '@/lib/access';

// Cache compartilhado entre componentes (uma carga por sessão).
let cache = null;
let inflight = null;
const listeners = new Set();

async function loadAll() {
  const me = await base44.auth.me().catch(() => null);
  const email = me?.email ? String(me.email).toLowerCase() : null;
  const [settingsList, products, productResources, grants, trials] = await Promise.all([
    base44.entities.MonetizationSettings.list('-created_date', 1),
    base44.entities.Product.filter({ is_active: true }),
    base44.entities.ProductResource.list('created_date', 1000),
    me ? base44.entities.AccessGrant.filter(email ? { $or: [{ user_id: me.id }, { user_email: email }] } : { user_id: me.id }) : [],
    me ? base44.entities.UserTrial.filter({ user_id: me.id }) : []
  ]);
  cache = { user: me, settings: settingsList[0] || null, products, productResources, grants, trial: trials[0] || null };
  listeners.forEach((fn) => fn(cache));
  return cache;
}

export function refreshAccess() {
  if (!inflight) inflight = loadAll().finally(() => { inflight = null; });
  return inflight;
}

export function clearAccessCache() { cache = null; }

export function useAccess() {
  const [state, setState] = useState(cache);

  useEffect(() => {
    listeners.add(setState);
    if (!cache) refreshAccess();
    return () => listeners.delete(setState);
  }, []);

  const check = useCallback((resource) => {
    if (!state) return { allowed: false, loading: true };
    return resolveAccess({ ...state, resource });
  }, [state]);

  const canStartTrial = state ? trialEligibility(state) : false;

  const startTrial = useCallback(async () => {
    if (!state?.user || !state.settings) return null;
    const days = state.settings.trial_days || 7;
    const ends = new Date(Date.now() + days * 86400000).toISOString();
    if (state.trial) await base44.entities.UserTrial.delete(state.trial.id);
    const trial = await base44.entities.UserTrial.create({
      user_id: state.user.id, started_at: new Date().toISOString(), ends_at: ends, status: 'ativo',
      product_ids: state.settings.trial_scope === 'produtos' ? (state.settings.trial_product_ids || []) : []
    });
    await base44.entities.MonetizationEvent.create({
      event_type: 'teste_gratuito_iniciado', user_id: state.user.id, user_email: state.user.email,
      source: 'teste_gratuito', actor: 'usuario', details: { ends_at: ends, days }
    }).catch(() => {});
    await refreshAccess();
    return trial;
  }, [state]);

  return {
    loading: !state,
    user: state?.user || null,
    settings: state?.settings || null,
    products: state?.products || [],
    productResources: state?.productResources || [],
    grants: state?.grants || [],
    trial: state?.trial || null,
    check,
    canStartTrial,
    startTrial,
    refresh: refreshAccess
  };
}