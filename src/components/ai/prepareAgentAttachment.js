import { base44 } from '@/api/base44Client';
import extractVideoFrames from '@/components/ai/extractVideoFrames';

export default async function prepareAgentAttachment(file, agent) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Envie um arquivo de até 20 MB.');
  const video = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
  const frames = video ? await extractVideoFrames(file) : undefined;
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
  const result = await base44.integrations.Core.AnalyzeFile({
    agent_id: agent.id, file_url: signed_url, file_name: file.name,
    mime_type: video ? (file.type || 'video/mp4') : file.type, video_frames: frames
  });
  return { context: result.text || '', attachment: { file_name: file.name, file_uri, mime_type: file.type } };
}