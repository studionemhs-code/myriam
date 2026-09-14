import React, { useRef } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import useLiveVoice from '@/components/ai/useLiveVoice';
import VoiceOrb from '@/components/ai/VoiceOrb';

export default function LiveVoiceConversation({ agent, onClose }) {
  const audioRef = useRef(null);
  const voice = useLiveVoice(agent, audioRef);
  const finish = () => { voice.stop(); onClose(); };
  return <div className="voice-screen fixed inset-0 z-[60] flex flex-col">
    <audio ref={audioRef} autoPlay playsInline />
    <header className="flex items-center justify-between px-5 py-6"><div><p className="font-display text-lg">{agent.name}</p><p className="mt-1 text-sm text-white/60">Conversa por voz ao vivo</p></div><button onClick={finish} className="rounded-full bg-white/10 p-3" aria-label="Encerrar conversa"><PhoneOff className="h-5 w-5" /></button></header>
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4 text-center">
      <VoiceOrb agent={agent} phase={voice.phase} stream={voice.stream} outputStream={voice.outputStream} muted={voice.muted} error={voice.error} audioBlocked={voice.audioBlocked} />
      <div className="mt-4 max-w-md text-sm">
        {voice.error ? <p role="alert" className="break-words text-destructive">{voice.error}</p> : <div className="flex items-center justify-center gap-2 text-primary-foreground/60">{voice.phase === 'thinking' && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}<span>{voice.phase === 'thinking' ? voice.status : voice.muted ? 'Ligue o microfone para falar' : voice.phase === 'speaking' ? 'Você pode falar para interromper' : 'Fale naturalmente, estou aqui para ouvir'}</span></div>}
      </div>
      {voice.audioBlocked && <button onClick={voice.playAudio} className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground"><Volume2 className="h-4 w-4" /> Ativar som da chamada</button>}
      {(voice.heard || voice.reply) && <div className="mt-5 max-h-44 w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-primary-foreground/10 p-4 text-left text-sm">
        {voice.heard && <p className="text-primary-foreground/70"><strong>Você:</strong> {voice.heard}</p>}
        {voice.reply && <p className="text-primary-foreground"><strong>{agent.name}:</strong> {voice.reply}</p>}
      </div>}
    </main>
    <footer className="flex justify-center gap-5 px-6 pb-12"><button onClick={voice.toggleMute} disabled={!!voice.error || !voice.stream} aria-pressed={voice.muted} className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 disabled:opacity-40" aria-label={voice.muted ? 'Ligar microfone' : 'Desligar microfone'}>{voice.muted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}</button><button onClick={finish} className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black" aria-label="Encerrar conversa"><PhoneOff className="h-7 w-7" /></button></footer>
  </div>;
}