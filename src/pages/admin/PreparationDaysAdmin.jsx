import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil } from 'lucide-react';
import { AdminPageTitle, Loading } from '@/components/admin/ui';
import PhaseManager from '@/components/admin/PhaseManager';
import PreparationDayEditor from '@/components/admin/PreparationDayEditor';

export default function PreparationDaysAdmin() {
  const [days, setDays] = useState([]);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const [dayList, phaseList] = await Promise.all([
      base44.entities.PreparationDay.list('day_number', 50),
      base44.entities.PreparationPhase.list('sort_order', 50)
    ]);
    setDays(dayList);
    setPhases(phaseList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <AdminPageTitle title="Dias de Preparação" subtitle={`${days.length} dias cadastrados`} />

      <PhaseManager />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">Dias da Jornada</h2>
          <button
            onClick={() => setEditing({ day_number: days.length + 1, title: '', is_published: true, links: [] })}
            className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Criar dia
          </button>
        </div>
        <div className="space-y-2">
          {days.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Nenhum dia cadastrado. Clique em "Criar dia" para começar.
            </p>
          )}
          {days.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-display text-sm text-primary">{d.day_number}</div>
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.phase || 'Sem fase'} · {d.is_published ? 'Publicado' : 'Rascunho'}
                    {(d.youtube_id || d.video_url || d.audio_url || d.pdf_url) && ' · com mídia'}
                    {(d.links?.length > 0) && ` · ${d.links.length} link${d.links.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditing({ ...d })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <PreparationDayEditor
          day={editing}
          phases={phases}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}