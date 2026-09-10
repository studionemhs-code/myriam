import React from 'react';
import { FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AudioBubble from '@/components/myriam/AudioBubble';

export default function AgentMessage({ message }) {
  const mine = message.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
        {message.file_name && <div className="mb-2 flex items-center gap-1.5 text-xs opacity-80"><FileText className="h-3.5 w-3.5" /><span className="truncate">{message.file_name}</span></div>}
        {message.content && (mine ? message.content : <ReactMarkdown>{message.content}</ReactMarkdown>)}
        {message.audio_url && <AudioBubble url={message.audio_url} mine={mine} />}
        {message.pr_url && <a href={message.pr_url} target="_blank" rel="noreferrer" className="mt-2 block underline">Ver Pull Request</a>}
      </div>
    </div>
  );
}