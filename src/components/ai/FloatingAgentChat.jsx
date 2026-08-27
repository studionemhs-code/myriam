import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import FloatingAgentIcon from './FloatingAgentIcon';

export default function FloatingAgentChat({ agent, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
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

  const send = async () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    try {
      const res = await base44.functions.invoke('chatWithAgent', {
        agent_id: agent.id,
        message: msg,
        conversation_id: convId
      });
      setMessages(m => [...m, { role: 'assistant', content: res.data.reply }]);
      if (res.data.conversation_id) setConvId(res.data.conversation_id);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ Erro: ' + (err.message || 'tente novamente') }]);
    } finally {
      setSending(false);
    }
  };

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
          <button onClick={onClose} className="rounded-lg p-1.5 text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-card px-3 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              disabled={sending}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-deep transition hover:bg-gold/90 disabled:opacity-40"
              aria-label="Enviar"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}