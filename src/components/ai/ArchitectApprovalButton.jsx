import React, { useState } from 'react';
import { Check, Loader2, Pencil, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArchitectProposalEditor from './ArchitectProposalEditor';

export default function ArchitectApprovalButton({ summary, onApprove, onReject, onRevise, busy }) {
  const [editor, setEditor] = useState(null);
  return (
    <div className="mt-3 rounded-xl border border-primary/25 bg-card p-3 text-card-foreground">
      <p className="mb-2 text-xs text-muted-foreground">Mudança aguardando sua aprovação</p>
      {summary && <p className="mb-3 whitespace-pre-wrap text-xs font-medium">{summary}</p>}
      {editor ? (
        <ArchitectProposalEditor mode={editor} initialValue={editor === 'edit' ? summary : ''} busy={busy} onCancel={() => setEditor(null)} onSubmit={onRevise} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" className="col-span-2" onClick={onApprove} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Aprovar Mudança
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onReject} disabled={busy}><X /> Recusar Proposta</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditor('counterproposal')} disabled={busy}><RotateCcw /> Digitar Proposta</Button>
          <Button type="button" size="sm" variant="outline" className="col-span-2" onClick={() => setEditor('edit')} disabled={busy}><Pencil /> Editar Prompt</Button>
        </div>
      )}
    </div>
  );
}