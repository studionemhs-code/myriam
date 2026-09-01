import React, { useState } from 'react';
import { Send, Loader2, Upload, Youtube, Film } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

// Painel administrativo para enviar uma notícia/novidade a todos os usuários,
// com opção de anexar um vídeo (upload ou YouTube).
export default function BroadcastNews() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [videoMode, setVideoMode] = useState('youtube'); // 'youtube' | 'upload' | 'none'
  const [youtubeId, setYoutubeId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
      toast({ title: 'Vídeo enviado', description: 'O arquivo foi carregado com sucesso.' });
    } catch (e) {
      toast({ title: 'Erro no upload', description: 'Não foi possível enviar o vídeo.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const send = async () => {
    if (!title.trim()) {
      toast({ title: 'Título obrigatório', description: 'Informe um título para a novidade.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const payload = {
        category: 'novidades',
        title: title.trim(),
        body: body.trim(),
      };
      if (videoMode === 'youtube' && youtubeId.trim()) {
        payload.youtube_id = youtubeId.trim();
      } else if (videoMode === 'upload' && videoUrl) {
        payload.video_url = videoUrl;
      }
      if (link.trim()) payload.link = link.trim();
      const res = await base44.functions.invoke('broadcastNotification', payload);
      toast({
        title: 'Novidade enviada',
        description: `Notificação entregue a ${res.data?.created || 0} usuários.`,
      });
      setTitle('');
      setBody('');
      setYoutubeId('');
      setVideoUrl('');
      setLink('');
      setVideoMode('youtube');
    } catch (e) {
      toast({ title: 'Erro ao enviar', description: 'Não foi possível enviar a novidade.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg">
        <Send className="h-4 w-4 text-gold" /> Enviar novidade
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Dispare uma notificação a todos os usuários com um vídeo explicativo sobre a novidade.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Título *</label>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Nova funcionalidade disponível" maxLength={120} />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</label>
          <textarea className={inputCls} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Breve descrição da novidade" maxLength={500} />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vídeo</label>
          <div className="mt-1 flex gap-2">
            <button
              onClick={() => setVideoMode('youtube')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${videoMode === 'youtube' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <Youtube className="h-3.5 w-3.5" /> YouTube
            </button>
            <button
              onClick={() => setVideoMode('upload')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${videoMode === 'upload' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <Upload className="h-3.5 w-3.5" /> Enviar arquivo
            </button>
            <button
              onClick={() => setVideoMode('none')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${videoMode === 'none' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <Film className="h-3.5 w-3.5" /> Sem vídeo
            </button>
          </div>

          {videoMode === 'youtube' && (
            <input className={inputCls + ' mt-2'} value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} placeholder="ID do vídeo (ex: dQw4w9WgXcQ)" maxLength={20} />
          )}
          {videoMode === 'upload' && (
            <div className="mt-2">
              {videoUrl ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <video src={videoUrl} className="h-16 w-24 rounded object-cover" />
                  <span className="flex-1 truncate text-xs text-muted-foreground">Vídeo carregado</span>
                  <button onClick={() => setVideoUrl('')} className="text-xs text-destructive hover:underline">Remover</button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Enviando...' : 'Selecionar vídeo'}
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => handleUpload(e.target.files[0])} disabled={uploading} />
                </label>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Link da funcionalidade (opcional)</label>
          <input
            className={inputCls + ' mt-1'}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Ex: /caminho — preencha quando a novidade exige ação do usuário"
          />
          <p className="mt-1 text-xs text-muted-foreground">Se preenchido, o pop-up do usuário mostrará um botão "Ver funcionalidade".</p>
        </div>

        <button
          onClick={send}
          disabled={sending || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Enviando...' : 'Enviar para todos'}
        </button>
      </div>
    </div>
  );
}