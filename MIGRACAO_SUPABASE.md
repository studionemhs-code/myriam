# Migração para o Supabase — guia de deploy

Projeto Supabase: `strrnkxrpyjyaewfpiwh` · API: `https://strrnkxrpyjyaewfpiwh.supabase.co`

## O que já está pronto

**Banco de dados** — 39 tabelas, 28 enums, RLS em todas as tabelas, triggers
(`created_by_id`, `updated_date`, criação automática de perfil no cadastro),
índices de performance e Realtime ativo nas tabelas sociais/chat.
Os dados do Base44 já foram importados preservando os IDs originais.

**Storage** — buckets `uploads` (público) e `private` (privado), com políticas de acesso.

**Frontend** — toda a camada de dados vive agora em **`src/api/supabase/`**
(arquivos marcados com o comentário `[SUPABASE]`), e nada mais usa o SDK do Base44:

| Antes (Base44) | Agora (Supabase) |
|---|---|
| `base44Client.js` → `base44` | `src/api/supabase/index.js` → `supabaseApp` |
| `entityApi.js` / `entityTables.js` | `supabase/entities.js` (`supabaseEntities`) + `supabase/tables.js` (`SUPABASE_TABLES`, `SUPABASE_ARRAY_COLUMNS`) |
| `authApi.js` | `supabase/auth.js` (`supabaseAuth`) → Supabase Auth + tabela `profiles` |
| `integrationsApi.js` | `supabase/storageAndFunctions.js` (`supabaseIntegrations`, `invokeEdgeFunction`) |
| `base44.functions.invoke('notifyUser')` | Edge Function `notify-user` (camelCase → kebab-case) |
| entidades `MyriamPost`, `ChatMessage`… | tabelas `myriam_posts`, `chat_messages`… (ver `supabase/tables.js`) |
| `base44/functions/` | `supabase/functions/` |

`src/api/base44Client.js` ficou apenas como apelido de uma linha (`base44 = supabaseApp`),
para as ~90 páginas antigas não quebrarem — e porque `src/lib/AuthContext.jsx` é um
arquivo gerenciado pela plataforma e exige esse import. Ao editar uma página, troque para
`import { supabaseApp } from '@/api/supabase'`. Os dados legados seguem identificados de
propósito: coluna `profiles.legacy_id` e tabela `base44_users_import`.

**Backend** — as 13 funções foram portadas para `supabase/functions/`:
`test-webhook`, `dispatch-webhooks`, `notify-user`, `search-users`, `get-public-profile`,
`increment-content-view`, `chat-with-agent`, `generate-greeting`, `list-active-agents`,
`association-approval-link`, `broadcast-notification`, `cleanup-stories`, `daily-reminders`,
mais `integrations` (IA/e-mail) e `invite-user`.

## Passos para publicar fora do Base44

1. **Instalar a CLI e vincular o projeto**
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref strrnkxrpyjyaewfpiwh
   ```

2. **Definir os secrets das Edge Functions**
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set RESEND_API_KEY=re-...          # e-mails (opcional)
   supabase secrets set EMAIL_FROM="Theotokos <contato@seudominio.com>"
   supabase secrets set APP_URL=https://seudominio.com
   ```

3. **Publicar as funções**
   ```bash
   supabase functions deploy
   # a função pública da autoridade certificadora dispensa login:
   supabase functions deploy association-approval-link --no-verify-jwt
   ```

4. **Configurar a autenticação** (painel Supabase → Authentication)
   - URL Configuration → Site URL: `https://seudominio.com`
     e Redirect URLs: `https://seudominio.com/**`
   - Providers → Google: ativar e informar Client ID/Secret
   - Email → manter "Confirm email" ativo (o cadastro do app usa código OTP)

5. **Hospedar o frontend** (Vercel, Netlify, Cloudflare Pages…)
   - Build: `npm run build` · Output: `dist`
   - Variáveis: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ver `.env.example`)
   - Em `vite.config.js`, o plugin `@base44/vite-plugin` serve apenas ao preview do
     Base44 e pode ser removido depois que a hospedagem externa estiver ativa.

6. **Agendamentos** (substituem os workflows do Base44) — no SQL Editor:
   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   select cron.schedule('daily-reminders', '0 9 * * *', $$
     select net.http_post(
       url := 'https://strrnkxrpyjyaewfpiwh.supabase.co/functions/v1/daily-reminders',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb,
       body := '{}'::jsonb);
   $$);

   select cron.schedule('cleanup-stories', '0 * * * *', $$
     select net.http_post(
       url := 'https://strrnkxrpyjyaewfpiwh.supabase.co/functions/v1/cleanup-stories',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb,
       body := '{}'::jsonb);
   $$);
   ```

## Observação sobre usuários existentes

Os registros antigos guardam o ID do Base44. A tabela `profiles` tem a coluna
`legacy_id`: quando alguém se cadastra com o mesmo e-mail de antes, o perfil é
vinculado automaticamente ao histórico dele (papel, status, foto, datas de
consagração), e o app continua enxergando o mesmo ID de sempre.