import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const REASONS = [
  'Conteúdo ofensivo ou inadequado',
  'Spam ou publicidade',
  'Discurso de ódio ou discriminação',
  'Informação falsa',
  'Outro motivo'
];

export default function ReportDialog({ open, onClose, targetType, targetId }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await base44.entities.Report.create({ target_type: targetType, target_id: targetId, reason, status: 'pendente' });
      setDone(true);
      setTimeout(() => { setDone(false); setReason(''); onClose(); }, 1500);
    } finally { setSubmitting(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg"><Flag className="h-5 w-5 text-gold" /> Denunciar</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        {done ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Denúncia enviada. A equipe de moderação irá analisar.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Selecione o motivo da denúncia:</p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button key={r} onClick={() => setReason(r)} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left text-sm transition ${reason === r ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <span className={`h-3 w-3 rounded-full ${reason === r ? 'bg-primary' : 'border border-muted-foreground'}`} />
                  {r}
                </button>
              ))}
            </div>
            <button onClick={submit} disabled={!reason || submitting} className="mt-4 w-full rounded-xl bg-destructive py-2.5 text-sm font-medium text-destructive-foreground disabled:opacity-40">
              {submitting ? 'Enviando...' : 'Enviar denúncia'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}