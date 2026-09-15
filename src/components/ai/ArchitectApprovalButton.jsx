import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ArchitectApprovalButton({ summary, onApprove, busy }) {
  return (
    <div className="mt-3 rounded-xl border border-primary/25 bg-card p-3 text-card-foreground">
      <p className="mb-2 text-xs text-muted-foreground">Mudança aguardando sua aprovação</p>
      {summary && <p className="mb-3 text-xs font-medium">{summary}</p>}
      <Button type="button" size="sm" className="w-full" onClick={onApprove} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Check />}
        Aprovar Mudança
      </Button>
    </div>
  );
}