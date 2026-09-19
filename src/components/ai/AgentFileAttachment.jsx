import React from 'react';
import { FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';

export default function AgentFileAttachment({ file }) {
  if (!file?.url) return null;
  const isImage = file.type === 'image' || file.mime_type?.startsWith('image/');
  const Icon = isImage ? ImageIcon : FileText;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-background/60">
      {/* Preview para imagens */}
      {isImage && (
        <a href={file.url} target="_blank" rel="noreferrer" className="block">
          <img src={file.url} alt={file.name || 'Imagem gerada'} className="max-h-64 w-full object-cover" />
        </a>
      )}
      {/* Card com info e ações */}
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name || (isImage ? 'Imagem gerada' : 'Documento PDF')}</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{isImage ? 'Imagem' : 'PDF'}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <a
            href={file.url}
            download={file.name || undefined}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </a>
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}