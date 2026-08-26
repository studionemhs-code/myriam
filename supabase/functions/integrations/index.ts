import { json, preflight, currentUser } from '../_shared/utils.ts';

const OPENAI_KEY = () => Deno.env.get('OPENAI_API_KEY');
const RESEND_KEY = () => Deno.env.get('RESEND_API_KEY');
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
  if (!RESEND_KEY()) throw new Error('RESEND_API_KEY não configurada');
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

const HANDLERS: Record<string, (p: any) => Promise<unknown>> = {
  InvokeLLM: invokeLLM,
  GenerateImage: generateImage,
  SendEmail: sendEmail,
  TranscribeAudio: transcribeAudio,
  ExtractDataFromUploadedFile: extractData
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