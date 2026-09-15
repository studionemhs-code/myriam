import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabase/client';
import { X, Loader2, Hammer } from 'lucide-react';
import FloatingAgentIcon from './FloatingAgentIcon';
import AgentComposer from './AgentComposer';
import AgentMessage from './AgentMessage';
import LiveVoiceConversation from './LiveVoiceConversation';
import { approveArchitectAction, completeGithubArchitectAction, respondToArchitectProposal } from '@/lib/architectGithub';
import useAgentConversation from '@/components/ai/useAgentConversation';
import prepareAgentAttachment from '@/components/ai/prepareAgentAttachment';
import ArchitectConnectionStatus from '@/components/ai/ArchitectConnectionStatus';

export default function FloatingAgentChat({ agent, onClose, onAssistantReply }) {

  const [input, setInput] = useState('');
  const [mode, setMode] = useState('text');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const { messages, setMessages, conversationId: convId, setConversationId: setConvId, loadingHistory, historyError, architectContext, architectStatus } = useAgentConversation(agent, sending);
  const [liveOpen, setLiveOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);



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
      let fileContext = '', attachment;
      if (overrideFile) {
        const prepared = await prepareAgentAttachment(overrideFile, agent);
        fileContext = prepared.context; attachment = prepared.attachment;
        if (!msg && overrideFile.type.startsWith('audio/')) msg = fileContext || 'Mensagem de voz';
      }
      const technicalContext = agent.architect_mode_enabled ? architectContext : '';
      const combinedContext = [technicalContext && `--- CONTEXTO TÉCNICO AUTOMÁTICO DO MODO ARQUITETO ---\n${technicalContext}`, fileContext].filter(Boolean).join('\n\n');
      const res = await base44.functions.invoke('chatWithAgent', { agent_id: agent.id, message: msg || 'Analise o arquivo anexado.', conversation_id: convId, file_context: combinedContext, attachment });
      const reply = await completeGithubArchitectAction(res.data);
      let audioUrl = '';
      if (mode !== 'text' && agent.voice_enabled !== false) {
        const voiceLang = agent.default_voice === 'marin_br' ? 'pt-BR' : (agent.voice_language && agent.voice_language !== 'auto' ? agent.voice_language : undefined);
        const speech = await base44.integrations.Core.GenerateSpeech({ text: reply, voice: agent.default_voice || 'river', ...(voiceLang ? { language_code: voiceLang } : {}), agent_id: agent.id });
        audioUrl = speech?.url || '';
        if (audioUrl && res.data.assistant_message_id) {
          const { error } = await supabase.rpc('set_agent_message_audio', { p_conversation_id: res.data.conversation_id, p_message_id: res.data.assistant_message_id, p_audio_url: audioUrl });
          if (error) throw error;
        }
      }
      setMessages(m => [...m.map(item => ({ ...item, pending_action: null })), { role: 'assistant', content: reply, audio_url: audioUrl, pending_action: res.data.pending_action || null }]);
      if (live && audioUrl) new Audio(audioUrl).play().catch(() => {});
      if (res.data.conversation_id) setConvId(res.data.conversation_id);
      onAssistantReply?.(mountedRef.current);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const approveChange = async () => {
    if (sending || !convId) return;
    setSending(true);
    try {
      const result = await approveArchitectAction({ agentId: agent.id, conversationId: convId });
      setMessages(m => [...m.map(item => ({ ...item, pending_action: null })),
        { role: 'user', content: 'Mudança aprovada pelo botão.' },
        { role: 'assistant', content: result.reply, pr_url: result.pr_url }
      ]);
      onAssistantReply?.(mountedRef.current);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const handleProposal = async (action, text = '') => {
    if (sending || !convId) return;
    setSending(true);
    try {
      const result = await respondToArchitectProposal({ agentId: agent.id, conversationId: convId, action, text });
      const userText = action === 'reject' ? 'Proposta recusada.' : action === 'edit' ? `Proposta editada:\n${text}` : `Contraproposta:\n${text}`;
      setMessages(m => [...m.map(item => ({ ...item, pending_action: null })), { role: 'user', content: userText }, { role: 'assistant', content: result.reply, pending_action: result.pending_action || null }]);
      onAssistantReply?.(mountedRef.current);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const sendAudio = async (audioFile) => send(audioFile, false);

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
        {historyError && <p role="alert" className="px-4 py-2 text-xs text-destructive">{historyError}</p>}
        <div className="px-4 pt-2"><ArchitectConnectionStatus status={architectStatus} /></div>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
          {loadingHistory && <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
          {!loadingHistory && messages.map((message, index) => <AgentMessage key={index} message={message} onApprove={approveChange} onReject={() => handleProposal('reject')} onRevise={(text, action) => handleProposal(action, text)} approvalBusy={sending} />)}
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
          <AgentComposer input={input} setInput={setInput} mode={mode} setMode={setMode} file={file} setFile={setFile} onSend={() => send()} onAudio={sendAudio} onStartLive={() => setLiveOpen(true)} busy={sending || loadingHistory || !!historyError} allowFiles={agent.files_enabled !== false} allowVoice={agent.voice_enabled !== false} />
          {liveOpen && <LiveVoiceConversation agent={agent} onClose={() => setLiveOpen(false)} />}
        </div>
      </div>
    </div>
  );
}