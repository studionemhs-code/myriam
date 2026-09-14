import React, { useRef } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import useLiveVoice from '@/components/ai/useLiveVoice';
import MicrophoneLevel from '@/components/ai/MicrophoneLevel';

export default function LiveVoiceConversation({ agent, onClose }) {
  const audioRef = useRef(null);
  const voice = useLiveVoice(agent, audioRef);
  const finish = () => { voice.stop(); onClose(); };
  return <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
    <audio ref={audioRef} autoPlay playsInline />
    <header className="flex items-center justify-between px-5 py-6"><div><p className="font-display text-lg">{agent.name}</p><p className="mt-1 text-sm text-white/60">Conversa por voz ao vivo</p></div><button onClick={finish} className="rounded-full bg-white/10 p-3" aria-label="Encerrar conversa"><PhoneOff className="h-5 w-5" /></button></header>
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4 text-center">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-200 via-blue-400 to-blue-700 shadow-[0_0_70px_rgba(96,165,250,.55)]">{agent.icon_url ? <img src={agent.icon_url} alt="" className="h-full w-full object-cover" /> : <Volume2 className="h-11 w-11 text-white" />}</div>
      <div aria-live="polite" className="mt-6 max-w-md">
        {voice.error ? <p role="alert" className="break-words text-sm text-destructive">{voice.error}</p> : <div className="flex items-center justify-center gap-2 text-primary-foreground/80">{voice.status.includes('...') && <Loader2 className="h-4 w-4 animate-spin" />}<span>{voice.muted ? 'Microfone desligado' : voice.status}</span></div>}
      </div>
      {!voice.error && <MicrophoneLevel stream={voice.stream} muted={voice.muted} />}
      {voice.audioBlocked && <button onClick={voice.playAudio} className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground"><Volume2 className="h-4 w-4" /> Ativar som da chamada</button>}
      {(voice.heard || voice.reply) && <div className="mt-5 max-h-44 w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-primary-foreground/10 p-4 text-left text-sm">
        {voice.heard && <p className="text-primary-foreground/70"><strong>Você:</strong> {voice.heard}</p>}
        {voice.reply && <p className="text-primary-foreground"><strong>{agent.name}:</strong> {voice.reply}</p>}
      </div>}
    </main>
    <footer className="flex justify-center gap-5 px-6 pb-12"><button onClick={voice.toggleMute} disabled={!!voice.error || !voice.stream} aria-pressed={voice.muted} className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 disabled:opacity-40" aria-label={voice.muted ? 'Ligar microfone' : 'Desligar microfone'}>{voice.muted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}</button><button onClick={finish} className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black" aria-label="Encerrar conversa"><PhoneOff className="h-7 w-7" /></button></footer>
  </div>;
}