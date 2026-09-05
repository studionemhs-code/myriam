import React from 'react';
import { Wifi } from 'lucide-react';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';

const STATUS_LABEL = { interessado: 'Interessado', preparacao: 'Em Preparação', consagrado: 'Consagrado' };

export default function OnlineUsersPanel() {
  const users = useOnlineUsers();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Online agora
          </h2>
          <p className="text-xs text-muted-foreground">Usuários com o app aberto nos últimos 3 minutos · atualiza a cada 30s</p>
        </div>
        <span className="font-display text-2xl text-emerald-600">{users?.length ?? '—'}</span>
      </div>

      <div className="mt-4 divide-y divide-border">
        {users === null ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Carregando…</p>
        ) : users.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground"><Wifi className="h-3.5 w-3.5" /> Ninguém online neste momento.</p>
        ) : users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-2.5">
            <div className="relative shrink-0">
              {u.photo_url ? (
                <img src={u.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {(u.display_name || u.full_name || u.email || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.display_name || u.full_name || u.email}</p>
              <p className="truncate text-[11px] text-muted-foreground">{STATUS_LABEL[u.status] || 'Interessado'} · {u.email}</p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">{relTime(u.last_seen_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function relTime(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'agora';
  return `há ${Math.floor(s / 60)} min`;
}