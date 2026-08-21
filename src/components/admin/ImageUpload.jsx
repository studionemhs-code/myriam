import React, { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ImageUpload({ value, onChange, label, hint, aspect = 'video' }) {
  const [uploading, setUploading] = useState(false);

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

  const aspectCls = aspect === 'poster' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <div>
      {label && <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>}
      {hint && <p className="mb-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-1">
        {value ? (
          <div className="group relative">
            <img src={value} alt="" className={`w-full rounded-lg border border-border object-cover ${aspectCls}`} />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 ${aspectCls} hover:border-primary/50 hover:bg-muted/50`}>
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Clique para enviar</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>
    </div>
  );
}