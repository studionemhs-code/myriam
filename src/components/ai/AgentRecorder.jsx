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
    const media = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.current = media;
    chunks.current = [];
    const next = new MediaRecorder(media);
    next.ondataavailable = (event) => event.data.size && chunks.current.push(event.data);
    next.onstop = async () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      const file = new File([new Blob(chunks.current, { type: 'audio/webm' })], `voz-${Date.now()}.webm`, { type: 'audio/webm' });
      setProcessing(true);
      await onRecorded(file, live);
      setProcessing(false);
    };
    recorder.current = next;
    next.start();
    setRecording(true);
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