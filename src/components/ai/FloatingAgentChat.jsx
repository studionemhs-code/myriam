import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { X, Loader2, Hammer } from 'lucide-react';
import FloatingAgentIcon from './FloatingAgentIcon';
import AgentComposer from './AgentComposer';
import AgentMessage from './AgentMessage';

export default function FloatingAgentChat({ agent, onClose }) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('text');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (agent?.welcome_message) {
      setMessages([{ role: 'assistant', content: agent.welcome_message }]);
    }
  }, [agent]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus(), 200);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async (overrideFile = file, live = mode === 'live') => {
    const typed = input.trim();
    if ((!typed && !overrideFile) || sending) return;
    setInput(''); setFile(null); setSending(true);
    setMessages(m => [...m, { role: 'user', content: typed || (overrideFile?.type?.startsWith('audio/') ? 'Mensagem de voz' : 'Analise este arquivo.'), file_name: overrideFile?.name }]);
    try {
      let msg = typed;
      let fileContext = '';
      if (overrideFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: overrideFile });
        const analyzed = overrideFile.type.startsWith('audio/')
          ? await base44.integrations.Core.TranscribeAudio({ audio_url: file_url })
          : await base44.integrations.Core.AnalyzeFile({ file_url, file_name: overrideFile.name, mime_type: overrideFile.type, model: agent.model });
        fileContext = typeof analyzed === 'string' ? analyzed : analyzed?.text || '';
        if (!msg && overrideFile.type.startsWith('audio/')) msg = fileContext;
      }
      const res = await base44.functions.invoke('chatWithAgent', { agent_id: agent.id, message: msg || 'Analise o arquivo anexado.', conversation_id: convId, file_context: fileContext });
      const reply = res.data.reply || '';
      let audioUrl = '';
      if (mode !== 'text' && agent.voice_enabled !== false) {
        const speech = await base44.integrations.Core.GenerateSpeech({ text: reply, voice: agent.default_voice || 'river' });
        audioUrl = speech?.url || '';
      }
      setMessages(m => [...m, { role: 'assistant', content: reply, audio_url: audioUrl }]);
      if (live && audioUrl) new Audio(audioUrl).play().catch(() => {});
      if (res.data.conversation_id) setConvId(res.data.conversation_id);
      if (user?.notification_prefs?.assistente_ia !== false) {
        await base44.entities.Notification.create({ user_id: user.id, category: 'assistente_ia', title: agent.name, body: reply.substring(0, 150), link: '/agentes' });
        qc.invalidateQueries({ queryKey: ['notifications', user.id] });
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const sendAudio = async (audioFile, live) => send(audioFile, live);

  return (
    <div className="fixed inset-0 z-50 flex justify-end lg:items-end lg:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <div className="relative flex h-[80vh] w-full flex-col bg-card shadow-2xl lg:h-[70vh] lg:w-[380px] lg:rounded-2xl lg:border lg:border-border animate-in slide-in-from-right lg:slide-in-from-bottom-2">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-deep px-4 py-3 text-primary-foreground lg:rounded-t-2xl">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-accent">
            {agent.icon_url
              ? <img src={agent.icon_url} alt="" className="h-full w-full object-cover" />
              : <FloatingAgentIcon className="h-8 w-8" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm leading-tight">{agent.name}</p>
            <p className="truncate text-[11px] text-primary-foreground/60">{agent.description || 'Assistente IA'}</p>
          </div>
          {agent.architect_mode_enabled && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-800"><Hammer className="h-3 w-3" /> Arquiteto</span>}
          <button onClick={onClose} className="rounded-lg p-1.5 text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
          {messages.map((message, index) => <AgentMessage key={index} message={message} />)}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-card px-3 py-3">
          <AgentComposer input={input} setInput={setInput} mode={mode} setMode={setMode} file={file} setFile={setFile} onSend={() => send()} onAudio={sendAudio} busy={sending} allowFiles={agent.files_enabled !== false} allowVoice={agent.voice_enabled !== false} />
        </div>
      </div>
    </div>
  );
}