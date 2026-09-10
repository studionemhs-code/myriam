import React from 'react';
import { FileText, Headphones, Paperclip, Send, Type, X } from 'lucide-react';
import AgentRecorder from './AgentRecorder';

const modes = [{ id: 'text', icon: Type, label: 'Texto' }, { id: 'audio', icon: Headphones, label: 'Áudio' }, { id: 'live', icon: Headphones, label: 'Conversa' }];

export default function AgentComposer({ input, setInput, mode, setMode, file, setFile, onSend, onAudio, busy, allowFiles = true, allowVoice = true }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {modes.filter((item) => allowVoice || item.id === 'text').map(({ id, icon: Icon, label }) => (
          <button key={id} type="button" onClick={() => setMode(id)} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${mode === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Icon className="h-3 w-3" />{label}</button>
        ))}
        {allowFiles && <label className="ml-auto cursor-pointer rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Anexar arquivo"><Paperclip className="h-4 w-4" /><input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.csv,.html,image/*,audio/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>}
      </div>
      {file && <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs"><FileText className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button onClick={() => setFile(null)}><X className="h-3.5 w-3.5" /></button></div>}
      <div className="flex items-center gap-2">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={mode === 'text' ? 'Digite sua mensagem...' : 'Escreva ou grave sua mensagem...'} className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" disabled={busy} />
        {allowVoice && mode !== 'text' && <AgentRecorder onRecorded={onAudio} disabled={busy} live={mode === 'live'} />}
        <button onClick={() => onSend()} disabled={busy || (!input.trim() && !file)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-deep disabled:opacity-40" aria-label="Enviar"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}