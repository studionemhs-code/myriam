import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';
import JourneyEditor from '@/components/admin/JourneyEditor';

const statusLabels = { rascunho: 'Rascunho', ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };
const typeLabels = { consagracao: 'Consagração', renovacao: 'Renovação' };

export default function JourneysAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.CollectiveJourney.list('-created_date', 100);
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (payload) => {
    const wasActive = payload.id ? items.find((j) => j.id === payload.id)?.status === 'ativa' : false;
    const saved = payload.id
      ? await base44.entities.CollectiveJourney.update(payload.id, payload)
      : await base44.entities.CollectiveJourney.create(payload);
    if (saved.status === 'ativa' && !wasActive) {
      await notifyNewJourney(saved);
    }
    setEditing(null);
    await load();
  };

  const notifyNewJourney = async (journey) => {
    try {
      const users = await base44.entities.User.list('-created_date', 500);
      const notifs = users.map((u) => ({
        user_id: u.id,
        category: 'jornadas',
        title: `Nova jornada: ${journey.title}`,
        body: journey.description || 'Uma nova jornada coletiva começou. Venha participar!',
        link: '/jornadas',
        related_id: journey.id,
        read: false,
      }));
      if (notifs.length) await base44.entities.Notification.bulkCreate(notifs);
    } catch (e) { /* notificações são best-effort */ }
  };

  const remove = async (id) => {
    if (confirm('Excluir jornada?')) {
      await base44.entities.CollectiveJourney.delete(id);
      await load();
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle
        title="Jornadas Coletivas"
        subtitle={`${items.length} jornadas`}
        action={
          <button onClick={() => setEditing({})} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Nova Jornada
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((j) => (
          <div key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-lg">{j.title}</p>
                <div className="mt-1 flex gap-2">
                  <Badge tone={j.status === 'ativa' ? 'green' : 'muted'}>{statusLabels[j.status]}</Badge>
                  <Badge tone={j.journey_type === 'renovacao' ? 'gold' : 'muted'}>{typeLabels[j.journey_type] || 'Consagração'}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...j })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(j.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {j.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{j.description}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {j.start_date && <span>{new Date(j.start_date).toLocaleDateString('pt-BR')} — {j.end_date && new Date(j.end_date).toLocaleDateString('pt-BR')}</span>}
              {j.steps?.length > 0 && <span>{j.steps.length} etapas</span>}
              {j.notices?.length > 0 && <span>{j.notices.length} avisos</span>}
              {j.content_ids?.length > 0 && <span>{j.content_ids.length} conteúdos</span>}
              <span>{j.participant_count || 0} participantes</span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <JourneyEditor journey={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </div>
  );
}