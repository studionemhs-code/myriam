import { json, preflight, currentUser, admin, findProfile } from '../_shared/utils.ts';

const OPENAI_KEY = () => Deno.env.get('OPENAI_API_KEY');
const RESEND_KEY = () => Deno.env.get('RESEND_API_KEY');
const GEMINI_KEY = () => Deno.env.get('GEMINI_API_KEY');
const FCM_KEY = () => Deno.env.get('FCM_SERVER_KEY');

// Vozes do app mapeadas para as vozes da OpenAI.
const VOICES: Record<string, string> = {
  river: 'alloy', honey: 'shimmer', sunny: 'nova', storm: 'onyx', spark: 'fable',
  marin_br: 'coral'
};

// Instruções de pronúncia/sotaque por idioma (gpt-4o-mini-tts suporta "instructions").
const VOICE_LANG_INSTRUCTIONS: Record<string, string> = {
  'pt-BR': 'Speak naturally in Brazilian Portuguese with a warm, clear Brazilian accent.',
  'pt-PT': 'Speak naturally in European Portuguese with a Portuguese accent.',
  'en': 'Speak naturally in English.',
  'es': 'Speak naturally in Spanish.'
};
const FROM_EMAIL = () => Deno.env.get('EMAIL_FROM') || 'Theotokos <onboarding@resend.dev>';

const openai = async (path: string, body: unknown) => {
  const res = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro na OpenAI');
  return data;
};

async function invokeLLM(p: any) {
  const content: any[] = [{ type: 'text', text: p.prompt }];
  for (const url of [].concat(p.file_urls || [])) {
    content.push({ type: 'image_url', image_url: { url } });
  }
  const modelMap: Record<string, string> = {
    automatic: 'gpt-4o-mini', gpt_5_mini: 'gpt-5-mini', gpt_5_4: 'gpt-5',
    gpt_5_6_sol: 'gpt-5', gpt_5_6_luna: 'gpt-5', 'gpt-4o': 'gpt-4o', 'gpt-4o-mini': 'gpt-4o-mini'
  };
  const data = await openai('chat/completions', {
    model: modelMap[p.model] || 'gpt-4o-mini',
    messages: [{ role: 'user', content: p.file_urls?.length ? content : p.prompt }],
    ...(p.response_json_schema
      ? { response_format: { type: 'json_schema', json_schema: { name: 'resposta', schema: p.response_json_schema, strict: false } } }
      : {})
  });
  const text = data.choices[0].message.content;
  return p.response_json_schema ? JSON.parse(text) : text;
}

async function generateImage(p: any) {
  const data = await openai('images/generations', {
    model: 'gpt-image-1', prompt: p.prompt, size: '1024x1024'
  });
  const b64 = data.data[0].b64_json;
  return { url: b64 ? `data:image/png;base64,${b64}` : data.data[0].url };
}

// Validação básica de formato de e-mail.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sanitiza HTML de e-mail removendo tags/atributos perigosos (defense-in-depth).
// O controle principal é a trava de admin (SEC-03); esta camada impede que
// HTML malformado por um admin comprometido injete scripts no destinatário.
function sanitizeEmailHtml(html: string): string {
  let out = String(html || '');
  // Remove blocos inteiros de script/style/iframe
  out = out.replace(/<\s*(script|style|iframe|object|embed|applet)\b[\s\S]*?<\/\s*\1\s*>/gi, '');
  // Remove tags perigosas (abertura ou fechamento)
  out = out.replace(/<\/?\s*(script|style|iframe|object|embed|link|meta|form|input|button|textarea|select|option|applet|base|body|head|html|title)\b[^>]*>/gi, '');
  // Remove atributos on* (event handlers inline)
  out = out.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Neutraliza URLs javascript: em href/src
  out = out.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s"'>]+)/gi, '$1="#"');
  return out;
}

async function sendEmail(p: any) {
  if (!RESEND_KEY()) {
    return {
      ok: false,
      error: 'Serviço de e-mail não configurado.',
      hint: 'Defina a secret RESEND_API_KEY (e opcionalmente EMAIL_FROM) nas Edge Functions do Supabase.'
    };
  }
  if (!p.to || !EMAIL_RE.test(String(p.to))) {
    throw new Error('Destinatário (to) inválido. Forneça um e-mail válido.');
  }
  if (!p.subject || !String(p.subject).trim()) {
    throw new Error('Assunto (subject) é obrigatório.');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: p.from_name ? `${p.from_name} <${FROM_EMAIL().replace(/.*</, '').replace('>', '')}>` : FROM_EMAIL(),
      to: [String(p.to).trim()], subject: String(p.subject), html: sanitizeEmailHtml(p.body)
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao enviar e-mail');
  return { ok: true, id: data.id };
}

async function resolveVoiceKey(agentId: unknown, overrideKey?: unknown) {
  if (typeof overrideKey === 'string' && overrideKey.trim()) return overrideKey.trim();
  if (!agentId) return OPENAI_KEY();
  if (typeof agentId !== 'string') throw new Error('Agente inválido.');
  const { data: agent, error } = await admin().from('ai_agents')
    .select('openai_api_key,is_active,voice_enabled').eq('id', agentId).maybeSingle();
  if (error) throw new Error('Não foi possível carregar a configuração de voz.');
  if (!agent?.is_active || agent.voice_enabled === false) throw new Error('Voz indisponível para este agente.');
  const key = agent.openai_api_key || OPENAI_KEY();
  if (!key) throw new Error('Nenhuma chave API configurada para voz.');
  return key;
}

async function transcribeAudio(p: any) {
  const apiKey = await resolveVoiceKey(p.agent_id);
  const source = await fetch(p.audio_url);
  if (!source.ok) throw new Error('Não foi possível acessar o áudio gravado.');
  const audio = await source.blob();
  const type = audio.type || source.headers.get('content-type') || 'audio/webm';
  const extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : 'webm';
  const form = new FormData();
  form.append('file', audio, `audio.${extension}`);
  form.append('model', 'whisper-1');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Erro na transcrição');
  return data.text;
}

async function extractData(p: any) {
  try {
    const fileText = await fetch(p.file_url).then((r) => r.text());
    const output = await invokeLLM({
      prompt: `Extraia os dados do arquivo a seguir no formato solicitado.\n\n${fileText.slice(0, 100000)}`,
      response_json_schema: p.json_schema
    });
    return { status: 'success', details: null, output };
  } catch (e) {
    return { status: 'error', details: (e as Error).message };
  }
}

async function analyzeFile(p: any) {
  const response = await fetch(p.file_url);
  if (!response.ok) throw new Error('Não foi possível acessar o arquivo.');
  const mime = p.mime_type || response.headers.get('content-type') || 'application/octet-stream';
  if (mime.startsWith('audio/')) return { text: await transcribeAudio({ audio_url: p.file_url }) };
  if (mime.startsWith('text/') || mime.includes('csv') || mime.includes('json')) {
    const text = (await response.text()).slice(0, 100000);
    const summary = await invokeLLM({ model: p.model, prompt: `Interprete este arquivo e extraia as informações relevantes para responder às perguntas do usuário:\n\n${text}` });
    return { text: summary };
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 20 MB.');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const dataUrl = `data:${mime};base64,${btoa(binary)}`;
  const part = mime.startsWith('image/')
    ? { type: 'input_image', image_url: dataUrl }
    : { type: 'input_file', filename: p.file_name || 'documento', file_data: dataUrl };
  const data = await openai('responses', {
    model: 'gpt-4o',
    input: [{ role: 'user', content: [{ type: 'input_text', text: 'Interprete este arquivo e descreva todas as informações relevantes.' }, part] }]
  });
  return { text: data.output_text || data.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || '').join('\n') || 'Arquivo processado.' };
}

// Gera áudio (TTS) e guarda no bucket público, devolvendo a URL definitiva.
async function generateSpeech(p: any) {
  const apiKey = await resolveVoiceKey(p.agent_id, p.api_key);
  const body: Record<string, unknown> = {
    model: 'gpt-4o-mini-tts',
    voice: VOICES[p.voice as string] || 'alloy',
    input: String(p.text || '').slice(0, 5000),
    response_format: 'mp3'
  };
  // A voz dedicada brasileira força PT-BR; senão usa o idioma selecionado.
  const lang = p.voice === 'marin_br' ? 'pt-BR' : p.language_code;
  if (lang && lang !== 'auto' && VOICE_LANG_INSTRUCTIONS[lang]) {
    body.instructions = VOICE_LANG_INSTRUCTIONS[lang];
  }
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao gerar áudio');
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = `speech/${crypto.randomUUID()}.mp3`;
  const { error } = await admin().storage.from('uploads').upload(path, bytes, { contentType: 'audio/mpeg' });
  if (error) throw new Error(error.message);
  const { data } = admin().storage.from('uploads').getPublicUrl(path);
  return { url: data.publicUrl };
}

// Gera vídeo via Google Veo (operação assíncrona: cria e faz polling).
async function generateVideo(p: any) {
  const key = GEMINI_KEY();
  if (!key) {
    return {
      ok: false,
      error: 'Geração de vídeo não configurada.',
      hint: 'Defina a secret GEMINI_API_KEY nas Edge Functions do Supabase.'
    };
  }
  const base = 'https://generativelanguage.googleapis.com/v1beta';
  const start = await fetch(`${base}/models/veo-3.0-generate-001:predictLongRunning?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: p.prompt }],
      parameters: { aspectRatio: p.aspect_ratio || '16:9', durationSeconds: p.duration || 6 }
    })
  }).then((r) => r.json());
  if (!start.name) throw new Error(start.error?.message || 'Erro ao iniciar geração de vídeo');

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 6000));
    const op = await fetch(`${base}/${start.name}?key=${key}`).then((r) => r.json());
    if (op.error) throw new Error(op.error.message);
    if (op.done) {
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error('Vídeo não retornado pelo provedor');
      return { url: `${uri}${uri.includes('?') ? '&' : '?'}key=${key}` };
    }
  }
  throw new Error('Tempo esgotado ao gerar o vídeo');
}

// Push nativo via FCM. Depende do token salvo no perfil do usuário.
async function sendPushNotification(p: any) {
  const key = FCM_KEY();
  if (!key) {
    return {
      ok: false,
      error: 'Notificações push não configuradas.',
      hint: 'Defina a secret FCM_SERVER_KEY nas Edge Functions do Supabase.'
    };
  }
  const profile = await findProfile(p.user_id);
  if (!profile?.push_token) return { ok: false, error: 'Usuário sem dispositivo registrado para push.' };

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { Authorization: `key=${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: profile.push_token,
      notification: { title: p.title, body: p.content },
      data: { action_label: p.action_label || '', action_url: p.action_url || '' }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro ao enviar push');
  return { ok: true };
}

const HANDLERS: Record<string, (p: any) => Promise<unknown>> = {
  InvokeLLM: invokeLLM,
  GenerateImage: generateImage,
  SendEmail: sendEmail,
  TranscribeAudio: transcribeAudio,
  ExtractDataFromUploadedFile: extractData,
  AnalyzeFile: analyzeFile,
  GenerateSpeech: generateSpeech,
  GenerateVideo: generateVideo,
  SendPushNotification: sendPushNotification
};

// SEC-03: apenas admin pode chamar integrações privilegiadas (custo/abuso).
// InvokeLLM e GenerateSpeech ficam livres para usuários (assistente IA + TTS do app).
const ADMIN_ONLY: Record<string, boolean> = {
  GenerateImage: true,
  GenerateVideo: true,
  SendEmail: true,
  SendPushNotification: true
};

// Validação mínima de payload por handler (rejeita chamadas malformadas).
const REQUIRED_FIELDS: Record<string, string[]> = {
  InvokeLLM: ['prompt'],
  GenerateImage: ['prompt'],
  SendEmail: ['to', 'subject', 'body'],
  TranscribeAudio: ['audio_url'],
  ExtractDataFromUploadedFile: ['file_url', 'json_schema'],
  AnalyzeFile: ['file_url'],
  GenerateSpeech: ['text'],
  GenerateVideo: ['prompt'],
  SendPushNotification: ['user_id', 'title', 'content']
};

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { endpoint, payload } = await req.json();
    const handler = HANDLERS[endpoint];
    if (!handler) return json({ error: `Integração não suportada: ${endpoint}` }, 400);

    // Trava de admin para integrações privilegiadas.
    if (ADMIN_ONLY[endpoint] && user.role !== 'admin') {
      return json({ error: 'Forbidden: operação restrita a administradores' }, 403);
    }

    // Validação mínima de schema do payload.
    const required = REQUIRED_FIELDS[endpoint] || [];
    const p = payload || {};
    if (endpoint === 'GenerateSpeech' && p.api_key && user.role !== 'admin') {
      return json({ error: 'Forbidden: apenas administradores podem testar uma chave personalizada' }, 403);
    }
    for (const field of required) {
      if (p[field] === undefined || p[field] === null || p[field] === '') {
        return json({ error: `Campo obrigatório ausente: ${field}` }, 400);
      }
    }

    return json(await handler(p));
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});