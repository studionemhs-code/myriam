import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

const PROJECT_REF = 'strrnkxrpyjyaewfpiwh';
const REPOSITORY = 'studionemhs-code/myriam';

function decodeBase64(value) {
  const binary = atob(String(value || '').replaceAll('\n', ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value || '');
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Falha HTTP ${response.status}`);
  return body;
}

async function getSupabaseContext(base44, userToken) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
  const projects = await requestJson('https://api.supabase.com/v1/projects', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!projects.some((project) => project.ref === PROJECT_REF)) throw new Error('Projeto Supabase do app não encontrado.');

  const keys = await requestJson(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key;
  if (!serviceKey) throw new Error('Chave de serviço do Supabase não encontrada.');

  const authUser = await requestJson(`https://${PROJECT_REF}.supabase.co/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${userToken}` }
  });
  const profiles = await requestJson(`https://${PROJECT_REF}.supabase.co/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,role`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (profiles[0]?.role !== 'admin') throw new Error('Apenas administradores podem alterar o código-fonte.');
  return { user: authUser, serviceKey, supabaseToken: accessToken };
}

async function supabaseRows(path, serviceKey, options = {}) {
  return requestJson(`https://${PROJECT_REF}.supabase.co/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
}

async function githubFile(token, path, ref) {
  const file = await requestJson(`https://api.github.com/repos/${REPOSITORY}/contents/${encodeURIComponent(path).replaceAll('%2F', '/')}?ref=${encodeURIComponent(ref)}`, {
    headers: githubHeaders(token)
  });
  return { sha: file.sha, content: decodeBase64(file.content) };
}

async function planChanges(base44, githubToken, request, operation, baseBranch) {
  const branch = await requestJson(`https://api.github.com/repos/${REPOSITORY}/git/trees/${encodeURIComponent(baseBranch)}?recursive=1`, {
    headers: githubHeaders(githubToken)
  });
  const paths = (branch.tree || [])
    .filter((item) => item.type === 'blob' && !/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|mp[34]|zip)$/i.test(item.path))
    .map((item) => item.path)
    .slice(0, 5000);

  const selection = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Selecione até 8 arquivos essenciais para atender esta solicitação no repositório ${REPOSITORY}. Operação: ${operation}. Solicitação: ${request}\n\nArquivos disponíveis:\n${paths.join('\n')}`,
    response_json_schema: {
      type: 'object',
      properties: { paths: { type: 'array', items: { type: 'string' } } },
      required: ['paths']
    }
  });
  const selectedPaths = (selection.paths || []).filter((path) => paths.includes(path)).slice(0, 8);
  const files = [];
  for (const path of selectedPaths) {
    const file = await githubFile(githubToken, path, baseBranch);
    files.push({ path, content: file.content.slice(0, 50000) });
  }

  return base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Você está preparando uma alteração revisável no código do app MYRIAM. Atenda exatamente a solicitação, preserve tudo que não foi pedido e não inclua placeholders. Para editar ou criar, devolva o conteúdo COMPLETO de cada arquivo. Só marque delete=true quando a exclusão tiver sido explicitamente solicitada. Se a operação for suggest, não gere mudanças: produza apenas recomendações objetivas em reply.\n\nOperação: ${operation}\nSolicitação: ${request}\n\nArquivos analisados:\n${files.map((file) => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`,
    response_json_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        reply: { type: 'string' },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
              delete: { type: 'boolean' }
            },
            required: ['path', 'delete']
          }
        }
      },
      required: ['title', 'reply', 'changes']
    }
  });
}

async function buildArchitectContext(base44, githubToken, supabaseToken, repository) {
  const tree = await requestJson(`https://api.github.com/repos/${REPOSITORY}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`, {
    headers: githubHeaders(githubToken)
  });
  const paths = (tree.tree || []).filter((item) => item.type === 'blob').map((item) => item.path);
  const preferred = [
    'package.json', 'src/App.jsx', 'src/index.css', 'tailwind.config.js',
    'src/components/AppLayout.jsx', 'src/components/AdminLayout.jsx',
    'src/api/base44Client.js', 'src/api/supabase/tables.js',
    'src/api/supabase/entities.js', 'src/api/supabase/auth.js',
    'src/api/supabase/storageAndFunctions.js',
    'supabase/functions/chat-with-agent/index.ts',
    'supabase/functions/integrations/index.ts'
  ].filter((path) => paths.includes(path));
  const files = [];
  for (const path of preferred) {
    const file = await githubFile(githubToken, path, repository.default_branch);
    files.push({ path, content: file.content.slice(0, 12000) });
  }
  const schema = await requestJson(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query/read-only`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "select table_name, column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position" })
  });
  const summary = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Crie um contexto técnico operacional, compacto e preciso, para o Modo Arquiteto do app MYRIAM. Ele deve permitir compreender sem explicações do administrador: arquitetura geral, rotas e telas, componentes e fluxos principais, Design System (tokens, tipografia, cores, responsividade), frontend, autenticação, camada Supabase, entidades/tabelas, Edge Functions, integrações e regras obrigatórias de segurança. Não invente. Diga que arquivos específicos devem ser relidos do GitHub antes de uma alteração.\n\nÁRVORE DO REPOSITÓRIO:\n${paths.slice(0, 3000).join('\n')}\n\nSCHEMA SUPABASE:\n${JSON.stringify(schema).slice(0, 60000)}\n\nARQUIVOS-BASE:\n${files.map((file) => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`,
    response_json_schema: {
      type: 'object',
      properties: { context: { type: 'string' } },
      required: ['context']
    }
  });
  return {
    context: summary.context,
    diagnostics: {
      github: `Conectado a ${repository.full_name} (${repository.default_branch})`,
      supabase: `Conectado ao projeto ${PROJECT_REF} (${Array.isArray(schema) ? schema.length : 0} colunas mapeadas)`,
      commit: tree.sha || null
    }
  };
}

async function createPullRequest(githubToken, plan, baseBranch) {
  const baseRef = await requestJson(`https://api.github.com/repos/${REPOSITORY}/git/ref/heads/${encodeURIComponent(baseBranch)}`, {
    headers: githubHeaders(githubToken)
  });
  const branchName = `architect/${Date.now()}-${String(plan.title || 'alteracao').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;
  await requestJson(`https://api.github.com/repos/${REPOSITORY}/git/refs`, {
    method: 'POST', headers: githubHeaders(githubToken),
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseRef.object.sha })
  });

  for (const change of plan.changes || []) {
    if (!change.path || change.path.includes('..')) throw new Error('Caminho de arquivo inválido.');
    let existing = null;
    try { existing = await githubFile(githubToken, change.path, branchName); } catch (error) {
      if (change.delete) throw error;
    }
    const url = `https://api.github.com/repos/${REPOSITORY}/contents/${encodeURIComponent(change.path).replaceAll('%2F', '/')}`;
    const payload = { message: `${change.delete ? 'Remove' : existing ? 'Update' : 'Create'} ${change.path}`, branch: branchName };
    if (existing?.sha) payload.sha = existing.sha;
    if (!change.delete) payload.content = encodeBase64(change.content);
    await requestJson(url, {
      method: change.delete ? 'DELETE' : 'PUT', headers: githubHeaders(githubToken), body: JSON.stringify(payload)
    });
  }

  const pullRequest = await requestJson(`https://api.github.com/repos/${REPOSITORY}/pulls`, {
    method: 'POST', headers: githubHeaders(githubToken),
    body: JSON.stringify({ title: plan.title, head: branchName, base: baseBranch, body: `${plan.reply}\n\nCriado pelo Modo Arquiteto após confirmação do administrador.` })
  });
  return { url: pullRequest.html_url, number: pullRequest.number, branchName };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    if (!payload.access_token) return Response.json({ error: 'Sessão administrativa ausente.' }, { status: 400 });

    const { user, serviceKey, supabaseToken } = await getSupabaseContext(base44, payload.access_token);
    const { accessToken: githubToken } = await base44.asServiceRole.connectors.getConnection('github');
    const repository = await requestJson(`https://api.github.com/repos/${REPOSITORY}`, { headers: githubHeaders(githubToken) });
    if (payload.bootstrap === true) {
      return Response.json(await buildArchitectContext(base44, githubToken, supabaseToken, repository));
    }
    if (!payload.conversation_id) return Response.json({ error: 'Conversa obrigatória ausente.' }, { status: 400 });

    const conversations = await supabaseRows(`agent_conversations?id=eq.${encodeURIComponent(payload.conversation_id)}&created_by_id=eq.${encodeURIComponent(user.id)}&select=*`, serviceKey);
    const conversation = conversations[0];
    const action = conversation?.pending_action;
    if (!action || action.tool !== 'architect_github' || !action.confirmed_at) {
      return Response.json({ error: 'Nenhuma ação GitHub confirmada está pendente.' }, { status: 409 });
    }

    const plan = await planChanges(base44, githubToken, action.args.request, action.args.operation, repository.default_branch);

    let reply = plan.reply;
    let resultDetail = plan.reply;
    let recordId = null;
    if (action.args.operation !== 'suggest') {
      if (!plan.changes?.length) throw new Error('A análise não produziu alterações de código.');
      const pullRequest = await createPullRequest(githubToken, plan, repository.default_branch);
      recordId = String(pullRequest.number);
      reply = `Alteração preparada para revisão no pull request #${pullRequest.number}: ${pullRequest.url}`;
      resultDetail = `${reply}\nBranch: ${pullRequest.branchName}\n${plan.reply}`;
    }

    const now = new Date().toISOString();
    const messages = [...(conversation.messages || []), { role: 'assistant', content: reply, timestamp: now }];
    await supabaseRows(`agent_conversations?id=eq.${encodeURIComponent(conversation.id)}`, serviceKey, {
      method: 'PATCH', body: JSON.stringify({ pending_action: null, messages })
    });
    await supabaseRows('architect_audit_log', serviceKey, {
      method: 'POST', body: JSON.stringify({
        admin_id: user.id, agent_id: payload.agent_id || conversation.agent_id, conversation_id: conversation.id,
        table_name: `github:${REPOSITORY}`, operation: action.args.operation === 'suggest' ? 'github_suggest' : 'github_pull_request',
        record_id: recordId, action_summary: action.summary, result_status: 'success', result_detail: resultDetail
      })
    });

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}