import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import { Button } from '@/components/ui/button';
import { Bot, ArrowLeft, Loader2, Hammer } from 'lucide-react';
import AgentComposer from '@/components/ai/AgentComposer';
import AgentMessage from '@/components/ai/AgentMessage';

export default function AgentChat() {
  const [agents, setAgents] = useState(null);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('text');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('listActiveAgents', {});
        setAgents(res.data.agents || []);
      } catch { setAgents([]); }
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startChat = (agent) => {
    setSelected(agent);
    setMessages(agent.welcome_message ? [{ role: 'assistant', content: agent.welcome_message }] : []);
    setActiveConvId(null);
  };

  const send = async (overrideFile = file, live = mode === 'live') => {
    if ((!input.trim() && !overrideFile) || sending) return;
    const typed = input.trim();
    setInput(''); setFile(null); setSending(true);
    setMessages(m => [...m, { role: 'user', content: typed || (overrideFile?.type?.startsWith('audio/') ? 'Mensagem de voz' : 'Analise este arquivo.'), file_name: overrideFile?.name }]);
    try {
      let msg = typed;
      let fileContext = '';
      if (overrideFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: overrideFile });
        const analyzed = overrideFile.type.startsWith('audio/')
          ? await base44.integrations.Core.TranscribeAudio({ audio_url: file_url })
          : await base44.integrations.Core.AnalyzeFile({ file_url, file_name: overrideFile.name, mime_type: overrideFile.type, model: selected.model });
        fileContext = typeof analyzed === 'string' ? analyzed : analyzed?.text || '';
        if (!msg && overrideFile.type.startsWith('audio/')) msg = fileContext;
      }
      const res = await base44.functions.invoke('chatWithAgent', { agent_id: selected.id, message: msg || 'Analise o arquivo anexado.', conversation_id: activeConvId, file_context: fileContext });
      const reply = res.data.reply || '';
      let audioUrl = '';
      if (mode !== 'text' && selected.voice_enabled !== false) {
        const speech = await base44.integrations.Core.GenerateSpeech({ text: reply, voice: selected.default_voice || 'river' });
        audioUrl = speech?.url || '';
      }
      setMessages(m => [...m, { role: 'assistant', content: reply, audio_url: audioUrl }]);
      if (live && audioUrl) new Audio(audioUrl).play().catch(() => {});
      if (res.data.conversation_id) setActiveConvId(res.data.conversation_id);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro: ' + (err.message || 'tente novamente') }]);
    } finally { setSending(false); }
  };

  const sendAudio = async (audioFile, live) => send(audioFile, live);

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
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)', minHeight: '400px' }}>
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => { setSelected(null); setActiveConvId(null); }} className="text-muted-foreground hover:text-foreground">
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

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
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

      <div className="mt-3">
        <AgentComposer input={input} setInput={setInput} mode={mode} setMode={setMode} file={file} setFile={setFile} onSend={() => send()} onAudio={sendAudio} busy={sending} allowFiles={selected.files_enabled !== false} allowVoice={selected.voice_enabled !== false} />
      </div>
    </div>
  );
}