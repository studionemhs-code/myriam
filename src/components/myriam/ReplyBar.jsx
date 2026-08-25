import React from 'react';
import { X } from 'lucide-react';

export default function ReplyBar({ replyTo, onClose }) {
  if (!replyTo) return null;
  return (
    <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-gold bg-muted/60 p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gold">{replyTo.reply_to_sender_name || 'Alma'}</p>
        <p className="truncate text-xs text-muted-foreground">{replyTo.reply_to_text || replyTo.text || 'Mensagem'}</p>
      </div>
      <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}