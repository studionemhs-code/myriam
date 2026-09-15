import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ArchitectProposalEditor({ mode, initialValue, busy, onCancel, onSubmit }) {
  const [value, setValue] = useState(initialValue || '');
  const counter = mode === 'counterproposal';
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-medium">{counter ? 'Escreva sua contraproposta' : 'Edite o texto da proposta'}</label>
      <textarea
        autoFocus value={value} onChange={(event) => setValue(event.target.value)}
        placeholder={counter ? 'Descreva como a proposta deve ser ajustada...' : ''}
        className="min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="button" size="sm" onClick={() => onSubmit(value.trim(), mode)} disabled={busy || !value.trim()}>Enviar</Button>
      </div>
    </div>
  );
}