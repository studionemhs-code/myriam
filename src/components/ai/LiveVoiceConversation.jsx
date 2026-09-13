import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import { invokeEdgeFunction } from '@/api/supabase/storageAndFunctions';

export default function LiveVoiceConversation({ agent, onClose }) {
  const [status, setStatus] = useState('Conectando...');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef(null);
  const pcRef = useRef(null);
  const audioRef = useRef(null);

  const finish = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    pcRef.current?.close();
    onClose();
  };

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const { data } = await invokeEdgeFunction('createRealtimeSession', { agent_id: agent.id });
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.ontrack = (event) => { if (audioRef.current) { audioRef.current.srcObject = event.streams[0]; audioRef.current.play().catch(() => {}); } };
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        const dc = pc.createDataChannel('oai-events');
        dc.onopen = () => { if (active) setStatus('Ouvindo você'); };
        dc.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'input_audio_buffer.speech_started') setStatus('Ouvindo você');
          if (message.type === 'response.audio.delta') setStatus(`${agent.name} está falando`);
          if (message.type === 'response.done') setStatus('Ouvindo você');
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const answer = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${data.client_secret}`, 'Content-Type': 'application/sdp' }, body: offer.sdp });
        if (!answer.ok) throw new Error('Não foi possível conectar o áudio ao vivo.');
        await pc.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
      } catch (e) { if (active) setError(e.message || 'Não foi possível iniciar a conversa por voz.'); }
    };
    start();
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); pcRef.current?.close(); };
  }, [agent]);

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
    setStatus(next ? 'Microfone desligado' : 'Ouvindo você');
  };

  return <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
    <audio ref={audioRef} autoPlay />
    <header className="flex items-center justify-between px-5 py-6"><div><p className="font-display text-lg">{agent.name}</p><p className="mt-1 text-sm text-white/60">Conversa por voz ao vivo</p></div><button onClick={finish} className="rounded-full bg-white/10 p-3" aria-label="Encerrar conversa"><PhoneOff className="h-5 w-5" /></button></header>
    <main className="flex flex-1 flex-col items-center justify-center px-8 text-center"><div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-200 via-blue-400 to-blue-700 shadow-[0_0_70px_rgba(96,165,250,.55)]">{agent.icon_url ? <img src={agent.icon_url} alt="" className="h-full w-full object-cover" /> : <Volume2 className="h-11 w-11 text-white" />}</div>{error ? <p className="mt-8 max-w-xs text-sm text-red-300">{error}</p> : <div className="mt-8 flex items-center gap-2 text-white/70"><Loader2 className={`h-4 w-4 ${status === 'Conectando...' ? 'animate-spin' : 'hidden'}`} /><span>{status}</span></div>}</main>
    <footer className="flex justify-center gap-5 px-6 pb-12"><button onClick={toggleMute} disabled={!!error} className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 disabled:opacity-40" aria-label={muted ? 'Ligar microfone' : 'Desligar microfone'}>{muted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}</button><button onClick={finish} className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black" aria-label="Encerrar conversa"><PhoneOff className="h-7 w-7" /></button></footer>
  </div>;
}