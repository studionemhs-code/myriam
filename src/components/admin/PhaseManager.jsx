import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { inputCls } from '@/components/admin/ui';

export default function PhaseManager() {
  const [phases, setPhases] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [phaseList, dayList] = await Promise.all([
      base44.entities.PreparationPhase.list('sort_order', 50),
      base44.entities.PreparationDay.list('day_number', 50)
    ]);
    setPhases(phaseList);
    setDays(dayList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.name?.trim()) return;
    if (editing.id) {
      const oldPhase = phases.find((p) => p.id === editing.id);
      const oldName = oldPhase?.name;
      await base44.entities.PreparationPhase.update(editing.id, editing);
      if (oldName && oldName !== editing.name) {
        await base44.entities.PreparationDay.updateMany({ phase: oldName }, { $set: { phase: editing.name } });
      }
    } else {
      await base44.entities.PreparationPhase.create(editing);
    }
    setEditing(null);
    await load();
  };

  const remove = async (id) => {
    const phase = phases.find((p) => p.id === id);
    const affected = days.filter((d) => d.phase === phase?.name);
    if (affected.length > 0) {
      const ok = window.confirm(`Esta fase está associada a ${affected.length} dia(s). Ao excluir, esses dias ficarão sem fase. Deseja continuar?`);
      if (!ok) return;
    }
    await base44.entities.PreparationPhase.delete(id);
    if (phase?.name) {
      await base44.entities.PreparationDay.updateMany({ phase: phase.name }, { $set: { phase: '' } });
    }
    await load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg">Fases da Preparação</h2>
          <p className="text-xs text-muted-foreground">Crie e personalize as fases da jornada de 33 dias.</p>
        </div>
        <button onClick={() => setEditing({ name: '', description: '', sort_order: phases.length, color: '#C5A069' })} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Nova fase
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : phases.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Crie as 4 fases da preparação (ex: Desejo, Conhecimento, Iluminação, Entrega).</p>
      ) : (
        <div className="space-y-2">
          {phases.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: p.color || '#C5A069' }} />
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {days.filter((d) => d.phase === p.name).length} dia(s){p.description ? ` · ${p.description}` : ''}
                </p>
              </div>
              <button onClick={() => setEditing({ ...p })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">{editing.id ? 'Editar fase' : 'Nova fase'}</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</label>
                <input className={`mt-1 ${inputCls}`} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ex: Espírito de Desejo" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</label>
                <input className={`mt-1 ${inputCls}`} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Ordem</label>
                  <input type="number" className={`mt-1 ${inputCls}`} value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Cor</label>
                  <input type="color" className="mt-1 h-10 w-full rounded-lg border border-input bg-background" value={editing.color || '#C5A069'} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold">Mensagens de incentivo</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Início da fase</label>
                    <textarea className={`mt-1 ${inputCls}`} rows={2} value={editing.start_message || ''} onChange={(e) => setEditing({ ...editing, start_message: e.target.value })} placeholder="Ex: Que comece sua jornada de conhecimento..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Meio da fase</label>
                    <textarea className={`mt-1 ${inputCls}`} rows={2} value={editing.midway_message || ''} onChange={(e) => setEditing({ ...editing, midway_message: e.target.value })} placeholder="Ex: Você está no meio do caminho, continue firme..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Conclusão da fase</label>
                    <textarea className={`mt-1 ${inputCls}`} rows={2} value={editing.completion_message || ''} onChange={(e) => setEditing({ ...editing, completion_message: e.target.value })} placeholder="Ex: Você concluiu esta fase. Que alegria!" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={save} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}