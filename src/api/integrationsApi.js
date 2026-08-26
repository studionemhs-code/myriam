import { supabase } from './supabaseClient';

const toSlug = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Chama uma Edge Function do Supabase e devolve { data } (mesmo formato do SDK antigo).
export async function invokeFunction(name, payload = {}) {
  const { data, error } = await supabase.functions.invoke(toSlug(name), { body: payload });
  if (error) {
    const err = new Error(error.message || `Erro ao chamar ${name}`);
    err.status = error.status || 500;
    throw err;
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

// Integrações de IA/e-mail rodam na Edge Function `integrations`.
const viaEdge = (endpoint) => async (payload) => {
  const { data } = await invokeFunction('integrations', { endpoint, payload });
  return data;
};

export const integrations = {
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