import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const SAMPLE = 'Olá! Que bom ter você aqui. Sou seu assistente virtual e estou aqui para acompanhar sua caminhada de fé. Como posso ajudar você hoje?';

export default function AgentVoicePreview({ voice, language }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const audio = useRef(null);
  const alive = useRef(false);
  const pending = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; audio.current?.pause(); }; }, []);
  const preview = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      if (url) { audio.current.currentTime = 0; await audio.current.play(); return; }
      const langCode = voice === 'marin_br' ? 'pt-BR' : (language && language !== 'auto' ? language : undefined);
      const result = await base44.integrations.Core.GenerateSpeech({ text: SAMPLE, voice, ...(langCode ? { language_code: langCode } : {}) });
      if (!result?.url) throw new Error('Não foi possível gerar a prévia de voz.');
      if (alive.current) setUrl(result.url);
    } catch (err) {
      if (alive.current) setError(String(err.message || 'Não foi possível testar a voz.').replace(/sk-[\w.*-]+/g, '[chave protegida]'));
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  return <div className="space-y-2 rounded-lg border border-border p-3">
    <p className="text-xs font-medium">Prévia em português brasileiro</p>
    <p className="text-xs text-muted-foreground">{SAMPLE}</p>
    <Button type="button" variant="outline" size="sm" onClick={preview} disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Volume2 className="mr-2 h-4 w-4" />}
      {busy ? 'Gerando prévia...' : url ? 'Ouvir novamente' : 'Testar voz selecionada'}
    </Button>
    {url && <audio ref={audio} src={url} controls autoPlay className="w-full" aria-label="Prévia da voz selecionada" onError={() => setError('Não foi possível reproduzir a prévia. Tente novamente.')} />}
    {error && <p role="alert" className="break-words text-xs text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">Voz gerada por IA. Cada nova prévia tem custo na OpenAI; repetir este áudio não gera nova cobrança.</p>
    <p className="text-xs text-muted-foreground">O teste usa a chave padrão segura do sistema. Esta prévia corresponde às mensagens de áudio; a conversa ao vivo pode usar outra voz.</p>
  </div>;
}