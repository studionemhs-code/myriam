const REPOSITORY = 'studionemhs-code/myriam';

const githubHeaders = () => ({
  Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN') || ''}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28'
});

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Falha HTTP ${response.status}`);
  return body;
}

async function github(path: string, options: RequestInit = {}) {
  if (!Deno.env.get('GITHUB_TOKEN')) throw new Error('GITHUB_TOKEN não configurado no Supabase.');
  return requestJson(`https://api.github.com/repos/${REPOSITORY}/${path}`, {
    ...options, headers: { ...githubHeaders(), ...(options.headers || {}) }
  });
}

function decodeBase64(value: string) {
  const binary = atob(String(value || '').replaceAll('\n', ''));
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value || '');
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(binary);
}

async function openAIJson(prompt: string, name: string, schema: Record<string, unknown>) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no Supabase.');
  const response = await requestJson('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } }
    })
  });
  return JSON.parse(response.choices?.[0]?.message?.content || '{}');
}

async function repositoryFile(path: string, ref: string) {
  const file = await github(`contents/${encodeURIComponent(path).replaceAll('%2F', '/')}?ref=${encodeURIComponent(ref)}`);
  return { sha: file.sha, content: decodeBase64(file.content) };
}

async function repositoryState() {
  const repository = await requestJson(`https://api.github.com/repos/${REPOSITORY}`, { headers: githubHeaders() });
  const tree = await github(`git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`);
  return { repository, tree, paths: (tree.tree || []).filter((item: any) => item.type === 'blob').map((item: any) => item.path) };
}

export async function buildArchitectContext(db: any) {
  const { repository, tree, paths } = await repositoryState();
  const preferred = ['package.json', 'src/App.jsx', 'src/index.css', 'tailwind.config.js', 'src/components/AppLayout.jsx', 'src/components/AdminLayout.jsx', 'src/api/supabase/tables.js', 'src/api/supabase/entities.js', 'src/api/supabase/auth.js', 'src/api/supabase/storageAndFunctions.js', 'supabase/functions/chat-with-agent/index.ts', 'supabase/functions/integrations/index.ts'].filter(path => paths.includes(path));
  const files = await Promise.all(preferred.map(async path => ({ path, content: (await repositoryFile(path, repository.default_branch)).content.slice(0, 12000) })));
  const { count, error } = await db.from('profiles').select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Supabase: ${error.message}`);
  const summary = await openAIJson(`Crie um contexto técnico operacional compacto e preciso para o Modo Arquiteto do MYRIAM. Cubra arquitetura, rotas, Design System, autenticação, Supabase, Edge Functions, integrações e segurança. Não invente e recomende reler arquivos antes de alterar.\n\nÁRVORE:\n${paths.slice(0, 3000).join('\n')}\n\nARQUIVOS:\n${files.map(file => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`, 'architect_context', {
    type: 'object', additionalProperties: false, properties: { context: { type: 'string' } }, required: ['context']
  });
  return { context: summary.context, diagnostics: { github: `Conectado a ${repository.full_name} (${repository.default_branch})`, supabase: `Conectado diretamente ao Supabase (${count || 0} perfis acessíveis)`, openai: 'Chave OpenAI ativa no Supabase', commit: tree.sha || null } };
}

async function planChanges(request: string, operation: string, baseBranch: string) {
  const { paths } = await repositoryState();
  const textPaths = paths.filter((path: string) => !/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|mp[34]|zip)$/i.test(path)).slice(0, 5000);
  const selection = await openAIJson(`Selecione até 8 arquivos essenciais para esta solicitação. Operação: ${operation}. Solicitação: ${request}\n\nArquivos:\n${textPaths.join('\n')}`, 'architect_files', {
    type: 'object', additionalProperties: false, properties: { paths: { type: 'array', items: { type: 'string' } } }, required: ['paths']
  });
  const selected = (selection.paths || []).filter((path: string) => textPaths.includes(path)).slice(0, 8);
  const files = await Promise.all(selected.map(async (path: string) => ({ path, content: (await repositoryFile(path, baseBranch)).content.slice(0, 50000) })));
  return openAIJson(`Você é o Modo Arquiteto do MYRIAM. Prepare uma alteração revisável no código.\n\nREGRA CRÍTICA DO CAMPO "reply":\n- O campo "reply" deve conter O RELATÓRIO COMPLETO, não uma introdução.\n- NUNCA escreva frases como "A seguir está um relatório" ou "As informações estão organizadas em seções". Comece DIRETAMENTE com o conteúdo do relatório.\n- Para "suggest": coloque TODA a análise, recomendações e justificativas em "reply". Deixe "changes" como array vazio [].\n- Para "edit" ou "delete": coloque um resumo claro das alterações em "reply" e o código completo de cada arquivo em "changes".\n\nPreserve tudo que não foi pedido. Para editar ou criar, devolva o conteúdo COMPLETO de cada arquivo. Só marque delete=true quando a exclusão foi explicitamente solicitada.\n\nOperação: ${operation}\nSolicitação: ${request}\n\n${files.map(file => `--- ${file.path} ---\n${file.content}`).join('\n\n')}`, 'architect_plan', {
    type: 'object', additionalProperties: false,
    properties: { title: { type: 'string' }, reply: { type: 'string' }, changes: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { path: { type: 'string' }, content: { type: 'string' }, delete: { type: 'boolean' } }, required: ['path', 'content', 'delete'] } } },
    required: ['title', 'reply', 'changes']
  });
}

async function createPullRequest(plan: any, baseBranch: string) {
  const baseRef = await github(`git/ref/heads/${encodeURIComponent(baseBranch)}`);
  const slug = String(plan.title || 'alteracao').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const branchName = `architect/${Date.now()}-${slug}`;
  await github('git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseRef.object.sha }) });
  for (const change of plan.changes || []) {
    if (!change.path || change.path.includes('..')) throw new Error('Caminho de arquivo inválido.');
    let existing = null;
    try { existing = await repositoryFile(change.path, branchName); } catch (error) { if (change.delete) throw error; }
    const payload: any = { message: `${change.delete ? 'Remove' : existing ? 'Update' : 'Create'} ${change.path}`, branch: branchName };
    if (existing?.sha) payload.sha = existing.sha;
    if (!change.delete) payload.content = encodeBase64(change.content);
    await github(`contents/${encodeURIComponent(change.path).replaceAll('%2F', '/')}`, { method: change.delete ? 'DELETE' : 'PUT', body: JSON.stringify(payload) });
  }
  const pull = await github('pulls', { method: 'POST', body: JSON.stringify({ title: plan.title, head: branchName, base: baseBranch, body: `${plan.reply}\n\nCriado pelo Modo Arquiteto após confirmação do administrador.` }) });
  return { url: pull.html_url, number: pull.number, branchName };
}

export async function completeArchitectGithub(db: any, user: any, payload: any) {
  const { repository } = await repositoryState();
  const { data: conversation, error } = await db.from('agent_conversations').select('*').eq('id', payload.conversation_id).eq('created_by_id', user.id).maybeSingle();
  if (error) throw error;
  const action = conversation?.pending_action;
  if (!action || action.tool !== 'architect_github' || !action.confirmed_at) throw new Error('Nenhuma ação GitHub confirmada está pendente.');
  const plan = await planChanges(action.args.request, action.args.operation, repository.default_branch);
  let reply = plan.reply, recordId = null, resultDetail = plan.reply;
  if (action.args.operation !== 'suggest') {
    if (!plan.changes?.length) throw new Error('A análise não produziu alterações de código.');
    const pull = await createPullRequest(plan, repository.default_branch);
    recordId = String(pull.number); reply = `Alteração preparada para revisão no pull request #${pull.number}: ${pull.url}`; resultDetail = `${reply}\nBranch: ${pull.branchName}\n${plan.reply}`;
  }
  const messages = [...(conversation.messages || []), { id: crypto.randomUUID(), role: 'assistant', content: reply, timestamp: new Date().toISOString() }];
  const { error: updateError } = await db.from('agent_conversations').update({ pending_action: null, messages }).eq('id', conversation.id);
  if (updateError) throw updateError;
  const { error: auditError } = await db.from('architect_audit_log').insert({ admin_id: user.id, agent_id: payload.agent_id || conversation.agent_id, conversation_id: conversation.id, table_name: `github:${REPOSITORY}`, operation: action.args.operation === 'suggest' ? 'github_suggest' : 'github_pull_request', record_id: recordId, action_summary: action.summary, result_status: 'success', result_detail: resultDetail });
  if (auditError) throw auditError;
  return { reply };
}