import { json, preflight, currentUser, admin, findProfile } from '../_shared/utils.ts';

const OPENAI_KEY = () => Deno.env.get('OPENAI_API_KEY');
const RESEND_KEY = () => Deno.env.get('RESEND_API_KEY');
const GEMINI_KEY = () => Deno.env.get('GEMINI_API_KEY');
const FCM_KEY = () => Deno.env.get('FCM_SERVER_KEY');

// Vozes do app mapeadas para as vozes da OpenAI.
const VOICES: Record<string, string> = {
  river: 'alloy', honey: 'shimmer', sunny: 'nova', storm: 'onyx', spark: 'fable'
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
  const data = await openai('chat/completions', {
    model: p.model && p.model !== 'automatic' ? 'gpt-4o' : 'gpt-4o-mini',
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

async function sendEmail(p: any) {
  if (!RESEND_KEY()) {
    return {
      ok: false,
      error: 'Serviço de e-mail não configurado.',
      hint: 'Defina a secret RESEND_API_KEY (e opcionalmente EMAIL_FROM) nas Edge Functions do Supabase.'
    };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: p.from_name ? `${p.from_name} <${FROM_EMAIL().replace(/.*</, '').replace('>', '')}>` : FROM_EMAIL(),
      to: [p.to], subject: p.subject, html: p.body
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erro ao enviar e-mail');
  return { ok: true, id: data.id };
}

async function transcribeAudio(p: any) {
  const audio = await fetch(p.audio_url).then((r) => r.blob());
  const form = new FormData();
  form.append('file', audio, 'audio.mp3');
  form.append('model', 'whisper-1');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_KEY()}` }, body: form
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

// Gera áudio (TTS) e guarda no bucket público, devolvendo a URL definitiva.
async function generateSpeech(p: any) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: VOICES[p.voice as string] || 'alloy',
      input: String(p.text || '').slice(0, 5000),
      response_format: 'mp3'
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao gerar áudio');
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = `speech/${crypto.randomUUID()}.mp3`;
  const { error } = await admin().storage.from('public').upload(path, bytes, { contentType: 'audio/mpeg' });
  if (error) throw new Error(error.message);
  const { data } = admin().storage.from('public').getPublicUrl(path);
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
  GenerateSpeech: generateSpeech,
  GenerateVideo: generateVideo,
  SendPushNotification: sendPushNotification
};

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { endpoint, payload } = await req.json();
    const handler = HANDLERS[endpoint];
    if (!handler) return json({ error: `Integração não suportada: ${endpoint}` }, 400);

    return json(await handler(payload || {}));
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});