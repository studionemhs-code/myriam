import React from 'react';
import { X, FileDown, Loader2 } from 'lucide-react';

export const EXPORT_SECTIONS = [
  { key: 'consagracao', label: 'Minha consagração (data e estado atual)' },
  { key: 'renovacoes', label: 'Lista de renovações' },
  { key: 'preparacao', label: 'Preparação de 33 dias (conteúdos vistos)' },
  { key: 'jornadas', label: 'Jornadas coletivas participadas (etapas vistas)' },
  { key: 'reflexoes', label: 'Minhas reflexões' },
  { key: 'certificados', label: 'Certificados emitidos' }
];

export default function ExportOptionsDialog({ options, setOptions, onConfirm, onClose, loading }) {
  const toggle = (k) => setOptions({ ...options, [k]: !options[k] });
  const allOn = EXPORT_SECTIONS.every((s) => options[s.key]);
  const toggleAll = () =>
    setOptions(Object.fromEntries(EXPORT_SECTIONS.map((s) => [s.key, !allOn])));
  const anySelected = EXPORT_SECTIONS.some((s) => options[s.key]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg">Exportar em PDF</h2>
            <p className="text-sm text-muted-foreground">Escolha o que deseja incluir no documento.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        <button onClick={toggleAll} className="mb-2 text-xs text-gold">
          {allOn ? 'Desmarcar tudo' : 'Selecionar histórico completo'}
        </button>

        <div className="space-y-1">
          {EXPORT_SECTIONS.map((s) => (
            <label key={s.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={!!options[s.key]}
                onChange={() => toggle(s.key)}
                className="h-4 w-4 accent-current text-gold"
              />
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </div>

        <button
          onClick={onConfirm}
          disabled={loading || !anySelected}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-deep disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {loading ? 'Gerando PDF...' : 'Gerar PDF'}
        </button>
      </div>
    </div>
  );
}