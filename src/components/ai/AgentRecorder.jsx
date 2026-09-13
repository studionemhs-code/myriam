import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export default function AgentRecorder({ onRecorded, disabled, live }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recorder = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const start = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = media;
      chunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const next = new MediaRecorder(media, { mimeType });
      next.ondataavailable = (event) => event.data.size && chunks.current.push(event.data);
      next.onstop = async () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        if (!chunks.current.length) return;
        const file = new File([new Blob(chunks.current, { type: mimeType })], `voz-${Date.now()}.webm`, { type: 'audio/webm' });
        setProcessing(true);
        try { await onRecorded(file); } finally { setProcessing(false); }
      };
      recorder.current = next;
      next.start();
      setRecording(true);
    } catch { setRecording(false); }
  };

  const stop = () => {
    recorder.current?.stop();
    setRecording(false);
  };

  return (
    <button type="button" onClick={recording ? stop : start} disabled={disabled || processing} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${recording ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`} aria-label={recording ? 'Enviar gravação' : 'Gravar áudio'}>
      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}