import React, { useEffect, useState } from 'react';
import { X, Users, Sparkles, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/marianDates';

export default function JourneyDetailsModal({ journey, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumo');

  useEffect(() => {
    (async () => {
      try {
        const parts = await base44.entities.JourneyParticipant.filter({ journey_id: journey.id }, '-created_date', 500);
        // Buscar nomes dos usuários
        const userIds = [...new Set(parts.map((p) => p.created_by_id).filter(Boolean))];
        let userMap = {};
        if (userIds.length) {
          const users = await base44.entities.User.list('-created_date', 500);
          users.forEach((u) => { userMap[u.id] = u; });
        }
        const enriched = parts.map((p) => {
          const u = userMap[p.created_by_id];
          return {
            ...p,
            user_name: u?.display_name || u?.full_name || u?.email || 'Usuário',
            user_photo: u?.photo_url,
            user_status: u?.status
          };
        });
        setParticipants(enriched);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, [journey.id]);

  const steps = journey.steps || [];
  const primeira = participants.filter((p) => p.intent === 'primeira_consagracao');
  const renovacao = participants.filter((p) => p.intent === 'renovacao');
  const semIntent = participants.filter((p) => !p.intent);

  const stepLabel = (p) => {
    const completed = p.completed_steps || [];
    if (steps.length > 0 && completed.length >= steps.length) return 'Concluída';
    if (completed.length === 0) return 'Início';
    const nextIdx = steps.findIndex((_, i) => !completed.includes(i));
    return nextIdx >= 0 ? `Etapa ${nextIdx + 1}` : 'Concluída';
  };

  const renderTable = (list) => (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Participante</th>
            <th className="px-3 py-2">Etapa atual</th>
            <th className="px-3 py-2">Progresso</th>
            <th className="px-3 py-2">Entrou em</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {list.map((p) => (
            <tr key={p.id} className="hover:bg-muted/30">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {p.user_photo ? <img src={p.user_photo} className="h-7 w-7 rounded-full object-cover" /> :
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs">{p.user_name?.[0]?.toUpperCase()}</div>}
                  <div>
                    <p className="font-medium leading-tight">{p.user_name}</p>
                    {p.user_status && <p className="text-[10px] text-muted-foreground capitalize">{p.user_status}</p>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{stepLabel(p)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{p.progress || 0}%</span>
                </div>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{p.joined_date ? formatDate(p.joined_date) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum participante nesta categoria.</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">{journey.title}</h2>
            <p className="text-sm text-muted-foreground">Detalhes da jornada coletiva</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-1 font-display text-2xl">{participants.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl border border-border bg-primary/5 p-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-1 font-display text-2xl text-primary">{primeira.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">1ª Consagração</p>
          </div>
          <div className="rounded-xl border border-border bg-gold/5 p-4 text-center">
            <RefreshCw className="mx-auto h-5 w-5 text-gold" />
            <p className="mt-1 font-display text-2xl text-gold">{renovacao.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Renovação</p>
          </div>
        </div>

        {semIntent.length > 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {semIntent.length} participante(s) sem intenção registrada (inscrições anteriores ao recurso).
          </p>
        )}

        {/* Abas */}
        <div className="mt-5 flex gap-1 border-b border-border">
          {[
            { key: 'resumo', label: 'Resumo' },
            { key: 'primeira', label: `1ª Consagração (${primeira.length})` },
            { key: 'renovacao', label: `Renovação (${renovacao.length})` }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'border-b-2 border-gold text-gold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>
          ) : tab === 'resumo' ? (
            renderTable(participants)
          ) : tab === 'primeira' ? (
            renderTable(primeira)
          ) : (
            renderTable(renovacao)
          )}
        </div>
      </div>
    </div>
  );
}