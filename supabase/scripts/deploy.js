// ============================================================================
// Deploy helper para Edge Functions do Supabase.
// Inline automaticamente todos os imports de ../_shared/ antes de deployar,
// evitando o erro "Failed to send a request to the Edge Function" causado por
// imports relativos não resolvidos no runtime single-file.
//
// Uso (via exec_tool):
//   const { deployFunction } = require('./supabase/scripts/deploy.js');
//   const result = await deployFunction('chat-with-agent', { verify_jwt: false });
// ============================================================================
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SHARED_DIR = path.join(ROOT, 'supabase/functions/_shared');

// Lê e cacheia arquivos shared
const sharedCache = {};
function readShared(filename) {
  if (!sharedCache[filename]) {
    const filePath = path.join(SHARED_DIR, filename);
    sharedCache[filename] = fs.readFileSync(filePath, 'utf8');
  }
  return sharedCache[filename];
}

// Remove "export " do início das declarações
function stripExport(code) {
  return code.replace(/^export\s+/gm, '');
}

// Remove imports de ./utils.ts ou ./agentConversation.ts etc. (referências intra-shared)
function stripInternalImports(code) {
  return code.replace(/import\s+.*?\s+from\s+['"]\.\/[^'"]+['"];?\n?/g, '');
}

// Inline um import: lê o arquivo shared, stripa exports, stripa imports internos
function inlineImport(importPath) {
  // importPath ex: '../_shared/utils.ts' → filename: 'utils.ts'
  const filename = path.basename(importPath);
  const code = readShared(filename);
  return stripExport(stripInternalImports(code));
}

// Processa o código da função: encontra imports de ../_shared/, inlineia, remove a linha de import
function inlineSharedImports(funcCode) {
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"](\.\.\/_shared\/[^'"]+)['"];?\n?/g;
  const inlinedBlocks = [];
  let match;

  // Coleta todos os imports de ../_shared/
  const imports = [];
  while ((match = importRegex.exec(funcCode)) !== null) {
    imports.push({ statement: match[0], path: match[2] });
  }

  // Inline cada import (deduplicado por filename)
  const seen = new Set();
  for (const imp of imports) {
    const filename = path.basename(imp.path);
    if (seen.has(filename)) continue;
    seen.add(filename);
    inlinedBlocks.push(inlineImport(imp.path));
  }

  // Remove as linhas de import do código original
  const cleanedCode = funcCode.replace(importRegex, '');

  // Monta: blocos inlined + código da função
  const combined = inlinedBlocks.join('\n\n') + '\n\n' + cleanedCode;

  // Safety net: converte qualquer import restante de esm.sh para npm: (esm.sh é instável no runtime do Supabase)
  return combined.replace(
    /import\s+(\{[^}]+\})\s+from\s+['"]https:\/\/esm\.sh\/([^'"]+)['"];?/g,
    "import $1 from 'npm:$2'"
  );
}

// Deploy (ou redeploy) uma Edge Function com imports inlineados.
// name: slug da função (ex: 'chat-with-agent', 'github-architect')
// options: { verify_jwt?: boolean, accessToken?: string }
async function deployFunction(name, options = {}) {
  const funcPath = path.join(ROOT, 'supabase/functions', name, 'index.ts');
  if (!fs.existsSync(funcPath)) {
    throw new Error(`Arquivo não encontrado: ${funcPath}`);
  }

  const rawCode = fs.readFileSync(funcPath, 'utf8');
  const inlinedCode = inlineSharedImports(rawCode);

  // Verificação: não deve restar nenhum import de ../_shared/
  if (inlinedCode.includes('../_shared/') || inlinedCode.includes('"../_shared/')) {
    throw new Error(`Falha ao inlinear imports de ${name} — reste import de ../_shared/`);
  }

  // Obtém access token do conector Supabase se não fornecido
  let accessToken = options.accessToken;
  if (!accessToken) {
    const conn = await base44.asServiceRole.connectors.getConnection('supabase');
    accessToken = conn.accessToken;
  }

  const ref = 'strrnkxrpyjyaewfpiwh';
  const apiBase = `https://api.supabase.com/v1/projects/${ref}`;
  const verifyJwt = options.verify_jwt ?? true;

  // Tenta PATCH (redeploy); se 404, faz POST (criar)
  const body = JSON.stringify({ name, slug: name, body: inlinedCode, verify_jwt: verifyJwt });
  const patchRes = await fetch(`${apiBase}/functions/${name}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body
  });

  if (patchRes.ok) {
    return { action: 'updated', ok: true, ...(await patchRes.json()) };
  }
  if (patchRes.status === 404) {
    const postRes = await fetch(`${apiBase}/functions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body
    });
    return { action: 'created', ok: postRes.ok, ...(await postRes.json()) };
  }
  throw new Error(`Deploy falhou (${patchRes.status}): ${await patchRes.text()}`);
}

module.exports = { deployFunction, inlineSharedImports };