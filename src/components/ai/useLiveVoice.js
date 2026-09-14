import { useEffect, useRef, useState } from 'react';
import { invokeEdgeFunction } from '@/api/supabase/storageAndFunctions';
import realtimeEvents from '@/components/ai/realtimeEvents';

export default function useLiveVoice(agent, audioRef) {
  const [status, setStatus] = useState('Conectando...');
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [stream, setStream] = useState(null);
  const [outputStream, setOutputStream] = useState(null);
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const resources = useRef({});
  const stop = () => { resources.current.stream?.getTracks().forEach((track) => track.stop()); resources.current.pc?.close(); resources.current.dc?.close(); };
  const playAudio = async () => {
    try { await audioRef.current?.play(); setAudioBlocked(false); } catch { setAudioBlocked(true); }
  };
  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (!active) { media.getTracks().forEach((track) => track.stop()); return; }
        resources.current.stream = media; setStream(media);
        const { data } = await invokeEdgeFunction('createRealtimeSession', { agent_id: agent.id });
        if (!active) return;
        const pc = new RTCPeerConnection(); resources.current.pc = pc;
        pc.ontrack = (event) => { if (active && audioRef.current) { const remote = event.streams[0] || new MediaStream([event.track]); setOutputStream(remote); audioRef.current.srcObject = remote; playAudio(); } };
        pc.onconnectionstatechange = () => { if (active && pc.connectionState === 'failed') { setError('A conexão de áudio foi interrompida. Encerre e inicie novamente.'); stop(); } };
        media.getTracks().forEach((track) => pc.addTrack(track, media));
        const dc = pc.createDataChannel('oai-events'); resources.current.dc = dc;
        dc.onopen = () => { if (active) { setStatus('Preparando saudação...'); dc.send(JSON.stringify({ type: 'response.create', response: { output_modalities: ['audio'], instructions: 'Cumprimente brevemente o usuário em português brasileiro, apresente-se e pergunte como pode ajudar. Responda em voz.' } })); } };
        const handleEvent = realtimeEvents({ agentName: agent.name, setStatus, setError, setHeard, setReply });
        dc.onmessage = (event) => { if (active) handleEvent(event); };
        dc.onerror = () => { if (active) setError('Não foi possível trocar mensagens na chamada. Encerre e tente novamente.'); };
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        const answer = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', headers: { Authorization: `Bearer ${data.client_secret}`, 'Content-Type': 'application/sdp' }, body: offer.sdp });
        if (!answer.ok) throw new Error('Não foi possível conectar o áudio ao vivo.');
        const sdp = await answer.text(); if (active) await pc.setRemoteDescription({ type: 'answer', sdp });
      } catch (e) { if (active) { setError(e.name === 'NotAllowedError' ? 'Permita o acesso ao microfone para conversar por voz.' : e.message || 'Não foi possível iniciar a conversa por voz.'); stop(); } }
    };
    start();
    return () => { active = false; stop(); };
  }, [agent.id, agent.name]);
  const toggleMute = () => { const next = !muted; resources.current.stream?.getAudioTracks().forEach((track) => { track.enabled = !next; }); setMuted(next); };
  const phase = status.includes('está falando') ? 'speaking' : /Conectando|Preparando/.test(status) ? 'thinking' : 'listening';
  return { status, phase, error, muted, stream, outputStream, heard, reply, audioBlocked, playAudio, toggleMute, stop };
}