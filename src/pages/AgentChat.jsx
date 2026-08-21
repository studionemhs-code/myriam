import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import { Button } from '@/components/ui/button';
import { Bot, Send, ArrowLeft, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AgentChat() {
  const [agents, setAgents] = useState(null);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState('');
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

  const send = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    try {
      const res = await base44.functions.invoke('chatWithAgent', {
        agent_id: selected.id,
        message: msg,
        conversation_id: activeConvId
      });
      setMessages(m => [...m, { role: 'assistant', content: res.data.reply }]);
      if (res.data.conversation_id) {
        setActiveConvId(res.data.conversation_id);
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ Erro: ' + (err.response?.data?.error || err.message) }]);
    } finally {
      setSending(false);
    }
  };

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
        <div>
          <p className="font-display text-lg leading-tight">{selected.name}</p>
          <p className="text-xs text-muted-foreground">{selected.description}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
            </div>
          </div>
        ))}
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

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Digite sua mensagem..."
          className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="rounded-xl shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}