// [SUPABASE] Storage (uploads) e chamadas às Edge Functions.
import { supabase } from './client';

const toSlug = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Invoca uma Edge Function do Supabase (ex: notifyUser → notify-user).
export async function invokeEdgeFunction(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(toSlug(name), { body: payload });
  if (error) {
    // O SDK do Supabase retorna "Edge Function returned a non-2xx status code"
    // como mensagem genérica. Extrai a mensagem real do corpo da resposta.
    let message = error.message || `Erro ao chamar ${name}`;
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) message = body.error;
        else if (typeof body === 'string') message = body;
      }
    } catch { /* mantém a mensagem padrão */ }
    const err = new Error(message);
    err.status = error.status || 500;
    throw err;
  }
  if (data && data.error) {
    throw new Error(data.error);
  }
  return { data };
}

const uniquePath = (file) => {
  const clean = (file.name || 'arquivo').replace(/[^\w.\-]/g, '_');
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
};

async function UploadFile({ file }) {
  const path = uniquePath(file);
  const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

async function UploadPrivateFile({ file }) {
  const path = uniquePath(file);
  const { error } = await supabase.storage.from('private').upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return { file_uri: path };
}

async function CreateFileSignedUrl({ file_uri, expires_in = 300 }) {
  const { data, error } = await supabase.storage.from('private').createSignedUrl(file_uri, expires_in);
  if (error) throw new Error(error.message);
  return { signed_url: data.signedUrl };
}

// IA, e-mail e extração de dados rodam na Edge Function `integrations`.
const viaEdge = (endpoint) => async (payload) => {
  const { data } = await invokeEdgeFunction('integrations', { endpoint, payload });
  return data;
};

export const supabaseIntegrations = {
  Core: {
    UploadFile,
    UploadPrivateFile,
    CreateFileSignedUrl,
    InvokeLLM: viaEdge('InvokeLLM'),
    GenerateImage: viaEdge('GenerateImage'),
    GenerateSpeech: viaEdge('GenerateSpeech'),
    GenerateVideo: viaEdge('GenerateVideo'),
    TranscribeAudio: viaEdge('TranscribeAudio'),
    SendEmail: viaEdge('SendEmail'),
    SendPushNotification: viaEdge('SendPushNotification'),
    ExtractDataFromUploadedFile: viaEdge('ExtractDataFromUploadedFile')
  }
};