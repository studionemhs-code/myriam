import React, { useEffect, useState } from 'react';
import { Loader2, Github, Check, X, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls, Loading } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';

export default function GithubAdmin() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await base44.entities.GithubSettings.list('-created_date', 1);
      setS(list[0] || await base44.entities.GithubSettings.create({}));
    })();
  }, []);

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...data } = s;
      await base44.entities.GithubSettings.update(id, data);
      toast({ description: 'Configurações do GitHub salvas.' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const testConnection = async () => {
    if (!s.token) {
      toast({ title: 'Informe o token primeiro', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${s.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({ ok: true, user: data.login, name: data.name });
      } else {
        const err = await res.json().catch(() => ({}));
        setTestResult({ ok: false, error: err.message || `HTTP ${res.status}` });
      }
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    } finally { setTesting(false); }
  };

  if (!s) return <Loading label="Carregando configurações do GitHub..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl flex items-center gap-2">
          <Github className="h-6 w-6" /> Conexão GitHub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure a conexão com a API do GitHub via Token de Acesso Pessoal (PAT).
          Apenas administradores têm acesso a esta configuração e à funcionalidade.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">Credenciais</h2>
            <p className="text-xs text-muted-foreground">
              Crie um token em github.com/settings/tokens com permissão <code className="rounded bg-muted px-1">repo</code>.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-sm font-medium">Ativo</span>
            <button
              type="button"
              onClick={() => set('enabled', !s.enabled)}
              className={`relative h-6 w-11 rounded-full transition ${s.enabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${s.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
        </div>

        <div className="space-y-4">
          <Field label="Token de Acesso Pessoal (PAT)" hint="O token é armazenado de forma segura e visível apenas para administradores.">
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className={`${inputCls} pr-10 font-mono`}
                value={s.token || ''}
                onChange={(e) => set('token', e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <button
            onClick={testConnection}
            disabled={testing || !s.token}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
            Testar conexão
          </button>

          {testResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.ok ? (
                <>
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Conectado como <strong>{testResult.user}</strong>{testResult.name ? ` (${testResult.name})` : ''}</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 shrink-0" />
                  <span>Falha: {testResult.error}</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-display text-lg">Repositório Padrão</h2>
          <p className="text-xs text-muted-foreground">
            Define o repositório e branch usados por padrão nas operações do agente.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dono / Organização" hint="Usuário ou organização dona do repositório.">
            <input
              className={inputCls}
              value={s.owner || ''}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="ex: theotokos"
            />
          </Field>
          <Field label="Repositório">
            <input
              className={inputCls}
              value={s.repo || ''}
              onChange={(e) => set('repo', e.target.value)}
              placeholder="ex: myriam-app"
            />
          </Field>
          <Field label="Branch padrão">
            <input
              className={inputCls}
              value={s.branch || 'main'}
              onChange={(e) => set('branch', e.target.value)}
              placeholder="main"
            />
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar configurações
        </button>
      </div>
    </div>
  );
}