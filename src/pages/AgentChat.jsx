import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import { Button } from '@/components/ui/button';
import { Bot, ArrowLeft, Loader2, Hammer } from 'lucide-react';
import AgentComposer from '@/components/ai/AgentComposer';
import AgentMessage from '@/components/ai/AgentMessage';
import LiveVoiceConversation from '@/components/ai/LiveVoiceConversation';
import { supabase } from '@/api/supabase/client';
import { approveArchitectAction, completeGithubArchitectAction, respondToArchitectProposal } from '@/lib/architectGithub';
import useAgentConversation from '@/components/ai/useAgentConversation';
import prepareAgentAttachment from '@/components/ai/prepareAgentAttachment';
import useAvailableAgents from '@/components/ai/useAvailableAgents';
import ArchitectConnectionStatus from '@/components/ai/ArchitectConnectionStatus';

export default function AgentChat() {
  const { data: available, error: agentsError } = useAvailableAgents();
  const agents = available?.agents;
  const [selected, setSelected] = useState(null);

  const [input, setInput] = useState('');
  const [mode, setMode] = useState('text');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const { messages, setMessages, conversationId: activeConvId, setConversationId: setActiveConvId, loadingHistory, historyError, architectContext, architectStatus } = useAgentConversation(selected, sending);
  const [liveOpen, setLiveOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (agents) setSelected(current => current ? agents.find(item => item.id === current.id) || null : null);
  }, [agents]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startChat = (agent) => setSelected(agent);

  const send = async (overrideFile = file, live = mode === 'live') => {
    if ((!input.trim() && !overrideFile) || sending) return;
    const typed = input.trim();
    setInput(''); setFile(null); setSending(true);
    setMessages(m => [...m, { role: 'user', content: typed || (overrideFile?.type?.startsWith('audio/') ? 'Mensagem de voz' : 'Analise este arquivo.'), file_name: overrideFile?.name }]);
    try {
      let msg = typed;
      let fileContext = '', attachment;
      if (overrideFile) {
        const prepared = await prepareAgentAttachment(overrideFile, selected);
        fileContext = prepared.context; attachment = prepared.attachment;
        if (!msg && overrideFile.type.startsWith('audio/')) msg = fileContext || 'Mensagem de voz';
      }
      const technicalContext = selected.architect_mode_enabled ? architectContext : '';
      const combinedContext = [technicalContext && `--- CONTEXTO TÉCNICO AUTOMÁTICO DO MODO ARQUITETO ---\n${technicalContext}`, fileContext].filter(Boolean).join('\n\n');
      const res = await base44.functions.invoke('chatWithAgent', { agent_id: selected.id, message: msg || 'Analise o arquivo anexado.', conversation_id: activeConvId, file_context: combinedContext, attachment });
      const reply = await completeGithubArchitectAction(res.data);
      let audioUrl = '';
      if (mode !== 'text' && selected.voice_enabled !== false) {
        const voiceLang = selected.default_voice === 'marin_br' ? 'pt-BR' : (selected.voice_language && selected.voice_language !== 'auto' ? selected.voice_language : undefined);
        const speech = await base44.integrations.Core.GenerateSpeech({ text: reply, voice: selected.default_voice || 'river', ...(voiceLang ? { language_code: voiceLang } : {}), agent_id: selected.id });
        audioUrl = speech?.url || '';
        if (audioUrl && res.data.assistant_message_id) {
          const { error } = await supabase.rpc('set_agent_message_audio', { p_conversation_id: res.data.conversation_id, p_message_id: res.data.assistant_message_id, p_audio_url: audioUrl });
          if (error) throw error;
        }
      }
      setMessages(m => [...m.map(item => ({ ...item, pending_action: null })), { role: 'assistant', content: reply, audio_url: audioUrl, pending_action: res.data.pending_action || null }]);
      if (live && audioUrl) new Audio(audioUrl).play().catch(() => {});
      if (res.data.conversation_id) setActiveConvId(res.data.conversation_id);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const approveChange = async () => {
    if (sending || !activeConvId) return;
    setSending(true);
    try {
      const result = await approveArchitectAction({ agentId: selected.id, conversationId: activeConvId });
      setMessages(m => [...m.map(item => ({ ...item, pending_action: null })),
        { role: 'user', content: 'Mudança aprovada pelo botão.' },
        { role: 'assistant', content: result.reply, pr_url: result.pr_url }
      ]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const handleProposal = async (action, text = '') => {
    if (sending || !activeConvId) return;
    setSending(true);
    try {
      const result = await respondToArchitectProposal({ agentId: selected.id, conversationId: activeConvId, action, text });
      const userText = action === 'reject' ? 'Proposta recusada.' : action === 'edit' ? `Proposta editada:\n${text}` : `Contraproposta:\n${text}`;
      setMessages(m => [...m.map(item => ({ ...item, pending_action: null })), { role: 'user', content: userText }, { role: 'assistant', content: result.reply, pending_action: result.pending_action || null }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const sendAudio = async (audioFile) => send(audioFile, false);

  if (agentsError && !agents) return <p role="alert" className="py-12 text-center text-destructive">Não foi possível carregar os assistentes. Tentando novamente...</p>;
  if (!agents) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!selected) {
    return (
      <div>
        <PageHeader title="Assistentes IA" subtitle="Converse com nossos assistentes virtuais" icon={Bot} />
        {agents.length === 0 ? (
          <EmptyState icon={Bot} title="Nenhum assistente disponível" subtitle="Volte em breve!" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {agents.map(a => (
              <button key={a.id} onClick={() => startChat(a)} className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-md">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <p className="font-display text-lg">{a.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.description || 'Assistente virtual'}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[380px] w-full flex-col lg:h-[calc(100dvh-96px)]">
      <div className="mb-3 flex items-center gap-3">
        <button disabled={sending} onClick={() => { setSelected(null); setActiveConvId(null); }} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight">{selected.name}</p>
          <p className="truncate text-xs text-muted-foreground">{selected.description}</p>
        </div>
        {selected.architect_mode_enabled && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-800"><Hammer className="h-3 w-3" /> Arquiteto</span>}
      </div>

      {historyError && <p role="alert" className="mb-2 text-xs text-destructive">{historyError}</p>}
      <ArchitectConnectionStatus status={architectStatus} />
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
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

      <div className="mt-3">
        <AgentComposer input={input} setInput={setInput} mode={mode} setMode={setMode} file={file} setFile={setFile} onSend={() => send()} onAudio={sendAudio} onStartLive={() => setLiveOpen(true)} busy={sending || loadingHistory || !!historyError} allowFiles={selected.files_enabled !== false} allowVoice={selected.voice_enabled !== false} />
        {liveOpen && <LiveVoiceConversation agent={selected} onClose={() => setLiveOpen(false)} />}
      </div>
    </div>
  );
}