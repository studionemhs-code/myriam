import { requestAgentOpenAI } from './agentAccess.ts';

export default async function analyzeAgentVideo(p: any, transcribe: (payload: any) => Promise<string>) {
  if (!Array.isArray(p.video_frames) || !p.video_frames.length || p.video_frames.length > 8) throw new Error('Envie o vídeo novamente para extrair os quadros.');
  const frames = p.video_frames;
  if (frames.some((frame: any) => typeof frame.url !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(frame.url) || frame.url.length > 500000 || !Number.isFinite(frame.time))) throw new Error('Quadros do vídeo inválidos.');
  let transcript = '';
  try { transcript = await transcribe({ ...p, audio_url: p.file_url }); }
  catch (error) {
    if ((error as any).status !== 400 || !/audio|stream|format|decode/i.test((error as Error).message)) throw error;
    transcript = '[Faixa de áudio ausente ou não decodificável; análise limitada aos quadros visuais.]';
  }
  const content: any[] = [{ type: 'input_text', text: `Analise este vídeo a partir de 8 quadros amostrados e da transcrição abaixo. Explique limitações da amostragem e não invente partes que não foram observadas. Responda em português.\nTranscrição: ${transcript}` }];
  frames.forEach((frame: any) => content.push({ type: 'input_text', text: `Quadro aos ${frame.time} segundos` }, { type: 'input_image', image_url: frame.url }));
  const response = await requestAgentOpenAI('responses', { model: 'gpt-4o', input: [{ role: 'user', content }] }, p._agentKey);
  const result = await response.json();
  const text = result.output_text || result.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || '').join('\n');
  if (!text) throw new Error('Não foi possível interpretar o vídeo.');
  return { text };
}