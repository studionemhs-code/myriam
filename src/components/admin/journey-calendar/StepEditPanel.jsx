import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Field, inputCls } from '@/components/admin/ui';
import InlineContentForm from './InlineContentForm';

const sourceLabels = {
  none: 'Sem conteúdo',
  acamf: 'Conteúdo ACAMF',
  prayer: 'Oração',
  journey_library: 'Biblioteca de jornada',
  inline: 'Conteúdo próprio (inline)'
};

export default function StepEditPanel({ step, isNewInline, contents, prayers, journeyLib, onSave, onRemove, onClose }) {
  const [form, setForm] = useState({ ...step });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const dateLabel = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg">{isNewInline ? 'Criar conteúdo inline' : 'Editar etapa'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Data">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm capitalize">{dateLabel}</div>
          </Field>

          <Field label="Título da etapa">
            <input className={inputCls} value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Título da etapa" />
          </Field>

          <Field label="Descrição (opcional)">
            <input className={inputCls} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Descrição" />
          </Field>

          {!isNewInline && (
            <Field label="Origem do conteúdo">
              <select className={inputCls} value={form.content_source || 'none'} onChange={(e) => set('content_source', e.target.value)}>
                {Object.entries(sourceLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          )}

          {form.content_source === 'acamf' && (
            <Field label="Conteúdo ACAMF">
              <select className={inputCls} value={form.content_id || ''} onChange={(e) => set('content_id', e.target.value)}>
                <option value="">— Selecione —</option>
                {contents.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
          )}

          {form.content_source === 'prayer' && (
            <Field label="Oração">
              <select className={inputCls} value={form.prayer_id || ''} onChange={(e) => set('prayer_id', e.target.value)}>
                <option value="">— Selecione —</option>
                {prayers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
          )}

          {form.content_source === 'journey_library' && (
            <Field label="Conteúdo da biblioteca">
              <select className={inputCls} value={form.journey_content_id || ''} onChange={(e) => set('journey_content_id', e.target.value)}>
                <option value="">— Selecione —</option>
                {journeyLib.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
          )}

          {form.content_source === 'inline' && (
            <InlineContentForm data={form.content_data || {}} onChange={(d) => set('content_data', d)} />
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          {!isNewInline && onRemove ? (
            <button onClick={onRemove} className="inline-flex items-center gap-1 text-sm text-destructive hover:underline">
              <Trash2 className="h-4 w-4" /> Remover etapa
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
            <button onClick={() => onSave(form)} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}