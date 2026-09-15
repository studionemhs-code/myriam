import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AgentAttachment({ message }) {
  const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const open = async () => {
    if (busy || !message.file_uri) return;
    setBusy(true); setError('');
    try { const result = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: message.file_uri, expires_in: 300 }); setUrl(result.signed_url); }
    catch { setError('Não foi possível abrir o anexo.'); }
    finally { setBusy(false); }
  };
  return <div className="mb-2 space-y-2 text-xs">
    <button type="button" onClick={open} disabled={busy || !message.file_uri} className="flex max-w-full items-center gap-1.5 text-left opacity-80">
      {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{message.file_name}</span>
    </button>
    {url && (message.mime_type?.startsWith('image/') ? <img src={url} alt={message.file_name} className="max-h-64 rounded-lg" /> : message.mime_type?.startsWith('audio/') ? <audio src={url} controls className="max-w-full" /> : message.mime_type?.startsWith('video/') ? <video src={url} controls className="max-h-64 max-w-full rounded-lg" /> : <a href={url} target="_blank" rel="noreferrer" className="underline">Abrir anexo</a>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}