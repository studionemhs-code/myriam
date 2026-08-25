import React, { useState, useEffect, useCallback } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Loader2, Power, Zap, ChevronDown, ChevronUp, Cloud } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ENTITY_LABELS = {
  ACAMFContent: 'Conteúdo ACAMF',
  Course: 'Cursos',
  PreparationDay: 'Dias de Preparação',
  MarianCalendarEvent: 'Calendário Mariano',
  CollectiveJourney: 'Jornadas Coletivas',
  CertificateTemplate: 'Templates de Certificado',
  AssociationSettings: 'Configurações da Associação',
  FeatureFlag: 'Funcionalidades',
  AIAgent: 'Agentes IA',
  NotificationSettings: 'Configurações de Notificação',
  WebhookAutomation: 'Automações de Webhook',
  CatalogProduct: 'Catálogo de Produtos',
  StoreSettings: 'Configurações da Loja',
  ShareLink: 'Links Compartilháveis',
  User: 'Usuários'
};

export default function SupabaseMigration() {
  const [connected, setConnected] = useState(null);
  const [projectRef, setProjectRef] = useState('');
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(null);
  const [migratingAll, setMigratingAll] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const load = useCallback(async () => {
    try {
      const statusRes = await base44.functions.invoke('getSupabaseStatus', {});
      setConnected(statusRes.data?.connected ?? false);
      setProjectRef(statusRes.data?.projectRef || '');
    } catch (e) {
      setConnected(false);
    }
    try {
      const list = await base44.entities.SupabaseSyncConfig.list('-created_date', 100);
      setConfigs(list);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const getConfig = (entityName) => configs.find(c => c.entity_name === entityName);

  const toggleEnabled = async (entityName) => {
    const config = getConfig(entityName);
    try {
      if (config) {
        await base44.entities.SupabaseSyncConfig.update(config.id, { enabled: !config.enabled });
      } else {
        await base44.entities.SupabaseSyncConfig.create({ entity_name: entityName, enabled: true, status: 'pendente' });
      }
      load();
    } catch (e) { alert('Erro ao alterar status.'); }
  };

  const migrateEntity = async (entityName) => {
    setMigrating(entityName);
    setGlobalError('');
    try {
      const res = await base44.functions.invoke('bulkMigrateEntity', { entity_name: entityName });
      if (res.data?.error) setGlobalError(`${entityName}: ${res.data.error}`);
    } catch (e) {
      setGlobalError(`${entityName}: ${e.message}`);
    }
    await load();
    setMigrating(null);
  };

  const migrateAll = async () => {
    setMigratingAll(true);
    setGlobalError('');
    for (const entityName of Object.keys(ENTITY_LABELS)) {
      await migrateEntity(entityName);
    }
    setMigratingAll(false);
  };

  const statusBadge = (status) => {
    const map = {
      pendente: { label: 'Pendente', class: 'bg-muted text-muted-foreground' },
      migrando: { label: 'Migrando', class: 'bg-blue-500/15 text-blue-600' },
      sincronizado: { label: 'Sincronizado', class: 'bg-green-500/15 text-green-600' },
      erro: { label: 'Erro', class: 'bg-destructive/15 text-destructive' }
    };
    const s = map[status] || map.pendente;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.class}`}>
        {status === 'migrando' && <Loader2 className="h-3 w-3 animate-spin" />}
        {status === 'sincronizado' && <CheckCircle2 className="h-3 w-3" />}
        {status === 'erro' && <AlertCircle className="h-3 w-3" />}
        {s.label}
      </span>
    );
  };

  const entityEntries = Object.entries(ENTITY_LABELS);
  const hasErrors = configs.some(c => c.errors);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Migração Supabase</h1>
          <p className="text-sm text-muted-foreground">Sincronização em tempo real dos dados administrativos para o Supabase.</p>
        </div>
        <button
          onClick={migrateAll}
          disabled={migratingAll || !connected}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {migratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {migratingAll ? 'Migrando...' : 'Migrar Tudo'}
        </button>
      </div>

      {/* Connection status */}
      <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${connected ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
        {connected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />}
        <div className="flex-1 text-sm">
          <p className="font-medium text-foreground">
            {connected ? 'Supabase Conectado' : 'Supabase Desconectado'}
          </p>
          {connected && projectRef && (
            <p className="mt-0.5 text-xs text-muted-foreground">Projeto: <code className="rounded bg-muted px-1.5 py-0.5">{projectRef}</code></p>
          )}
          {!connected && (
            <p className="mt-0.5 text-xs text-muted-foreground">Autorize a conexão Supabase nas configurações de conectores do app.</p>
          )}
        </div>
        <Cloud className="h-8 w-8 text-muted-foreground/30" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2.5">
          {entityEntries.map(([entityName, label]) => {
            const config = getConfig(entityName);
            const enabled = config?.enabled ?? false;
            const isMigrating = migrating === entityName || (migratingAll && true);
            return (
              <div key={entityName} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleEnabled(entityName)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display text-sm">{label}</h3>
                      {statusBadge(config?.status)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span><code className="rounded bg-muted px-1.5 py-0.5">{entityName}</code></span>
                      {config?.total_records != null && <span>{config.total_records} registros</span>}
                      {config?.last_sync && <span>Último sync: {new Date(config.last_sync).toLocaleString('pt-BR')}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => migrateEntity(entityName)}
                    disabled={isMigrating || !connected}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    {isMigrating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {isMigrating ? 'Migrando...' : 'Migrar Agora'}
                  </button>
                </div>

                {config?.errors && (
                  <div className="mt-2 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <pre className="whitespace-pre-wrap font-mono">{config.errors}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Global error log */}
      {globalError && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">Erro na migração</p>
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{globalError}</pre>
        </div>
      )}

      {/* Error log section */}
      {hasErrors && (
        <div className="mt-6">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
          >
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" /> Log de Erros</span>
            {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showErrors && (
            <div className="mt-2 space-y-2">
              {configs.filter(c => c.errors).map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground">{ENTITY_LABELS[c.entity_name] || c.entity_name}</p>
                  <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{c.errors}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}