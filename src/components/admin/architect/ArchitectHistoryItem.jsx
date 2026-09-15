import React from 'react';

const operations = { create: 'Criação', update: 'Edição', delete: 'Exclusão', invite: 'Convite', broadcast: 'Notificação', architect_invite_user: 'Convite', architect_broadcast_notification: 'Notificação' };
export default function ArchitectHistoryItem({ item }) {
  const date = item.created_at ? new Date(item.created_at) : null;
  const formatted = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Data não registrada';
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-semibold">{operations[item.operation] || item.operation || 'Ação'} · {item.agent_name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{item.pending ? 'Solicitada em' : 'Operação em'} <time dateTime={item.created_at}>{formatted}</time></p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{item.pending ? 'Aguardando confirmação' : 'Confirmada'}</span>
          {!item.pending && <span className={item.result_status === 'error' ? 'rounded-full bg-destructive/10 px-2.5 py-1 text-destructive' : 'rounded-full bg-primary/10 px-2.5 py-1 text-primary'}>{item.result_status === 'error' ? 'Falhou' : 'Concluída'}</span>}
        </div>
      </div>
      <p className="mb-1 mt-4 text-xs font-medium text-muted-foreground">Comando registrado</p>
      <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{item.action_summary || 'Comando não registrado.'}</p>
      {item.table_name && <p className="mt-3 break-words text-xs text-muted-foreground">Destino: {item.table_name}</p>}
      {item.result_detail && <details className="mt-4 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm text-primary">Ver resultado da operação</summary>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{item.result_detail}</p>
      </details>}
    </article>
  );
}