import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Pencil, Trash2, X } from 'lucide-react';
import AgentEditor from '@/components/admin/AgentEditor';

export default function AgentsAdmin() {
  const [agents, setAgents] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const data = await base44.entities.AIAgent.list('-created_date');
    setAgents(data);
  };

  useEffect(() => { load(); }, []);

  const del = async (id) => {
    if (!confirm('Excluir este agente?')) return;
    await base44.entities.AIAgent.delete(id);
    load();
  };

  if (!agents) return <Loading label="Carregando agentes..." />;

  return (
    <div>
      <AdminPageTitle
        title="Agentes de IA"
        subtitle="Crie e personalize assistentes com OpenAI"
        action={<Button onClick={() => setEditing({})}><Plus className="mr-1.5 h-4 w-4" /> Novo Agente</Button>}
      />

      {editing && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg">{editing.id ? 'Editar Agente' : 'Novo Agente'}</h2>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          <AgentEditor agent={editing} onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
        </div>
      )}

      {agents.length === 0 && !editing ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum agente criado ainda. Clique em "Novo Agente" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map(a => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{a.name}</p>
                  <Badge tone={a.is_active ? 'green' : 'muted'}>{a.is_active ? 'Ativo' : 'Inativo'}</Badge>
                  <Badge tone="blue">{a.model}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{a.description || 'Sem descrição'}</p>
              </div>
              <button onClick={() => setEditing(a)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(a.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}