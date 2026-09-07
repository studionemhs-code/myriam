import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAccess } from '@/hooks/useAccess';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import Paywall from '@/components/access/Paywall';

// Rota → chave de funcionalidade (mesmas chaves de FEATURE_LIST).
const ROUTE_FEATURES = [
  ['/acamf', 'acamf'], ['/myriam', 'myriam'], ['/chat', 'chat'], ['/intencoes', 'intencoes'],
  ['/jornadas', 'jornadas'], ['/calendario', 'calendario'], ['/agentes', 'agentes'],
  ['/certificado', 'certificados'], ['/associacao', 'associacao'], ['/historico', 'historico']
];

// Bloqueio por funcionalidade paga e por app pago (modelo "pago").
export default function FeatureAccessGate({ children }) {
  const { pathname } = useLocation();
  const { loading, check } = useAccess();
  const { flagRecords, loading: loadingFlags } = useFeatureFlags();

  if (loading || loadingFlags) return children;

  const app = check({ type: 'app', id: 'app' });
  if (!app.allowed) return <Paywall result={app} title="Acesso ao aplicativo" />;

  const match = ROUTE_FEATURES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (!match) return children;
  const record = flagRecords.find((f) => f.feature === match[1]);
  if (!record || record.access_type !== 'pago') return children;

  const result = check({ type: 'feature', id: record.feature, access_type: record.access_type, product_id: record.product_id });
  if (!result.allowed) return <Paywall result={result} title={record.label} />;
  return children;
}