import React from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function ArchitectConnectionStatus({ status }) {
  if (!status) return null;
  if (status.state === 'checking') return (
    <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando GitHub, Supabase e contexto técnico...
    </p>
  );
  if (status.state === 'error') return (
    <p role="alert" className="mb-2 flex items-center gap-1.5 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5" /> {status.message}
    </p>
  );
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> GitHub e Supabase conectados · contexto técnico carregado
    </p>
  );
}