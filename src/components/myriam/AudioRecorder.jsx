import React, { useState, useRef, useEffect } from 'react';
import { Mic, X, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AudioRecorder({ user, conversation, onSent, onError }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { handleStop(); };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      onError('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    stopStream();
    setRecording(false);
    setSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleStop = async () => {
    stopStream();
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (blob.size === 0) return;
    const duration = seconds;
    setUploading(true);
    try {
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_name: user.display_name || user.full_name || 'Eu',
        sender_photo: user.photo_url || '',
        text: '',
        file_url,
        file_type: 'audio',
        audio_duration: duration,
        participants: conversation.participants,
        read_by: [user.id]
      });
      await base44.entities.ChatConversation.update(conversation.id, {
        last_message_text: '🎤 Áudio',
        last_message_date: new Date().toISOString(),
        last_sender_id: user.id
      });
      onSent();
    } catch (e) {
      onError('Falha ao enviar áudio.');
    } finally {
      setUploading(false);
      setSeconds(0);
    }
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (uploading) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Enviando áudio...</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={cancelRecording} className="rounded-full p-2.5 text-destructive hover:bg-destructive/10">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2.5">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
          <span className="font-mono text-sm text-destructive">{fmt(seconds)}</span>
        </div>
        <button onClick={stopRecording} className="rounded-full bg-primary p-2.5 text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startRecording} className="rounded-full p-2.5 text-muted-foreground hover:text-primary" title="Gravar áudio">
      <Mic className="h-5 w-5" />
    </button>
  );
}