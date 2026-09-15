import React from 'react';
import AgentAttachment from '@/components/ai/AgentAttachment';
import ReactMarkdown from 'react-markdown';
import AudioBubble from '@/components/myriam/AudioBubble';
import ArchitectApprovalButton from './ArchitectApprovalButton';

export default function AgentMessage({ message, onApprove, onReject, onRevise, approvalBusy }) {
  const mine = message.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
        {message.file_name && <AgentAttachment message={message} />}
        {message.content && (mine ? <div className="whitespace-pre-wrap break-words">{message.content}</div> : <ReactMarkdown>{message.content}</ReactMarkdown>)}
        {message.pending_action && <ArchitectApprovalButton summary={message.pending_action.summary} onApprove={onApprove} onReject={onReject} onRevise={onRevise} busy={approvalBusy} />}
        {message.audio_url && <AudioBubble url={message.audio_url} mine={mine} />}
        {message.pr_url && <a href={message.pr_url} target="_blank" rel="noreferrer" className="mt-2 block underline">Ver Pull Request</a>}
      </div>
    </div>
  );
}