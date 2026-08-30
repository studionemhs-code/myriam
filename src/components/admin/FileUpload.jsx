import React, { useState } from 'react';
import { Upload, X, Loader2, FileText, Music, Video, Image as ImageIcon, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';

const TYPE_ICON = {
  pdf: FileText,
  ebook: FileText,
  audio: Music,
  video: Video,
  imagem: ImageIcon,
};

const TYPE_LABEL = {
  pdf: 'PDF',
  ebook: 'E-book',
  audio: 'Áudio',
  video: 'Vídeo',
  imagem: 'Imagem',
};

export default function FileUpload({ value, onChange, accept = '*/*', label = 'Arquivo', hint, contentType = 'pdf' }) {
  const [uploading, setUploading] = useState(false);
  const Icon = TYPE_ICON[contentType] || FileText;
  const typeLabel = TYPE_LABEL[contentType] || 'Arquivo';

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* URL field */}
      <Field label="URL do arquivo">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </Field>

      {/* Upload area */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ou envie um arquivo</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background py-6 hover:border-primary/50 hover:bg-muted/40 transition ${uploading ? 'pointer-events-none' : ''}`}>
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Enviando {typeLabel}...</span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Clique para enviar um {typeLabel.toLowerCase()}</span>
          </>
        )}
        <input type="file" accept={accept} onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}