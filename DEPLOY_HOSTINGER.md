# Publicar o Myriam na Hostinger (ou qualquer hospedagem web)

O app é um SPA React + Vite que fala direto com o Supabase. Não precisa de Node
no servidor: basta hospedagem de arquivos estáticos (Hostinger Web Hosting,
cPanel, Vercel, Netlify...).

## 1. Gerar o build

```bash
cp .env.example .env      # confira VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npx vite build --config vite.config.hostinger.js
```

Use **sempre** `vite.config.hostinger.js`. A `vite.config.js` padrão carrega o
plugin `@base44/vite-plugin`, que existe apenas para o editor/preview da
plataforma (HMR notifier, visual edit, analytics) e não deve ir para produção.

Se quiser um projeto totalmente independente, remova do `package.json` as
dependências `@base44/sdk` e `@base44/vite-plugin`, apague `vite.config.js` e
renomeie `vite.config.hostinger.js` para `vite.config.js`. Nada do código do app
importa o SDK do Base44 hoje (o arquivo `src/api/base44Client.js` é só um apelido
de `supabaseApp`, e `src/lib/app-params.js` é legado sem uso).

## 2. Enviar os arquivos

Envie **o conteúdo** da pasta `dist/` para `public_html/` (via Gerenciador de
Arquivos ou FTP). O `dist/.htaccess` já vai junto — ele é essencial:

- reescreve todas as rotas para `index.html` (sem ele, abrir `/caminho` ou
  recarregar `/myriam` dá **404**, o erro mais comum em SPA na Hostinger);
- força HTTPS;
- cache longo para assets, cache zero para `index.html`, `sw.js` e `manifest.json`
  (evita usuários presos numa versão antiga por causa do service worker).

Se o Gerenciador de Arquivos esconder arquivos que começam com ponto, ative
"mostrar arquivos ocultos" para confirmar que o `.htaccess` subiu.

## 3. Configurar o Supabase para o novo domínio

No painel do Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://seudominio.com`
- **Redirect URLs**: `https://seudominio.com/**` (inclui `/reset-password` e o
  retorno do login com Google)

Sem isso, os links de confirmação de e-mail e de redefinição de senha continuam
apontando para o domínio antigo. Em **Authentication → Providers**, habilite
Google (com o mesmo domínio nas URLs autorizadas do Google Cloud) se for usar
login social.

As Edge Functions precisam estar publicadas (`supabase functions deploy`) e o
agendamento das rotinas diárias configurado via `pg_cron` — detalhes em
`MIGRACAO_SUPABASE.md`.

## 4. Checklist depois de publicar

- [ ] Abrir `https://seudominio.com/caminho` direto na barra de endereços (testa o `.htaccess`)
- [ ] Login com e-mail/senha e login com Google
- [ ] "Esqueci minha senha" → link chega e abre `/reset-password`
- [ ] Enviar mensagem no chat e recarregar a página (tempo real + persistência)
- [ ] Upload de foto no perfil (Storage) e abertura de um PDF do ACAMF
- [ ] Instalar o app no celular (PWA) e conferir se atualiza após novo build

## Observações

- Ícones, imagens e alguns PDFs antigos ainda são servidos por
  `media.base44.com`. Eles continuam funcionando, mas para independência total
  vale rebaixá-los para o Storage do Supabase.
- Hospedagem Windows/IIS não lê `.htaccess`; nesse caso é preciso um `web.config`
  com a mesma regra de fallback para `index.html`.