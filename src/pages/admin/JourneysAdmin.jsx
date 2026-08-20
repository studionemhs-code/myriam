import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';

const empty = { title: '', description: '', image_url: '', start_date: '', end_date: '', status: 'ativa', content_ids: [] };
const statusLabels = { rascunho: 'Rascunho', ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

export default function JourneysAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.CollectiveJourney.list('-created_date', 100);
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEditing((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!editing.title) return;
    setSaving(true);
    try {
      const wasActive = editing.id ? items.find((j) => j.id === editing.id)?.status === 'ativa' : false;
      const saved = editing.id
        ? await base44.entities.CollectiveJourney.update(editing.id, editing)
        : await base44.entities.CollectiveJourney.create(editing);
      // Notifica todos os usuários quando uma jornada é iniciada (nova e ativa, ou reativada).
      if (saved.status === 'ativa' && !wasActive) {
        await notifyNewJourney(saved);
      }
      setEditing(null);
      await load();
    } finally { setSaving(false); }
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
  const remove = async (id) => { if (confirm('Excluir jornada?')) { await base44.entities.CollectiveJourney.delete(id); await load(); } };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle
        title="Jornadas Coletivas"
        subtitle={`${items.length} jornadas`}
        action={
          <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
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
                <Badge tone={j.status === 'ativa' ? 'green' : 'muted'}>{statusLabels[j.status]}</Badge>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...empty, ...j })} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(j.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {j.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{j.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              {j.start_date && new Date(j.start_date).toLocaleDateString('pt-BR')} — {j.end_date && new Date(j.end_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">{editing.id ? 'Editar Jornada' : 'Nova Jornada'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Field label="Título"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
              <div className="col-span-2"><Field label="Descrição"><textarea className={inputCls} rows={3} value={editing.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
              <Field label="Início"><input type="date" className={inputCls} value={editing.start_date} onChange={(e) => set('start_date', e.target.value)} /></Field>
              <Field label="Término"><input type="date" className={inputCls} value={editing.end_date} onChange={(e) => set('end_date', e.target.value)} /></Field>
              <Field label="Status">
                <select className={inputCls} value={editing.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Imagem URL"><input className={inputCls} value={editing.image_url} onChange={(e) => set('image_url', e.target.value)} /></Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}