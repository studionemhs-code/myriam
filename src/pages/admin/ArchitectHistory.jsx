import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ArchitectHistoryItem from '@/components/admin/architect/ArchitectHistoryItem';
import useArchitectHistory, { PAGE_SIZE } from '@/components/admin/architect/useArchitectHistory';

export default function ArchitectHistory() {
  const [tab, setTab] = useState('completed');
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching, error, refetch } = useArchitectHistory(tab, page);
  const pages = Math.max(1, Math.ceil((data?.count || 0) / PAGE_SIZE));
  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-2xl">Histórico do Modo Arquiteto</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe confirmações, comandos e datas das operações.</p></div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? 'animate-spin' : ''} /> Atualizar</Button>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Tipo de histórico">
        {[['completed', 'Operações realizadas'], ['pending', 'Aguardando confirmação']].map(([value, label]) => <Button key={value} variant={tab === value ? 'default' : 'outline'} aria-pressed={tab === value} onClick={() => { setTab(value); setPage(0); }}>{label}</Button>)}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">O comando exibido é o resumo registrado pelo agente, não a mensagem original do chat. O histórico existente registra tentativas de execução confirmadas; cancelamentos e consultas de leitura não foram registrados.</p>
      {isLoading ? <p role="status" className="py-10 text-center text-muted-foreground">Carregando histórico...</p> : error ? <div role="alert" className="rounded-xl border border-destructive/30 p-5"><p className="text-sm text-destructive">Não foi possível carregar o histórico: {error.message}</p><Button variant="outline" onClick={() => refetch()} className="mt-3">Tentar novamente</Button></div> : <>
        <p className="text-sm text-muted-foreground">{data?.count || 0} registro(s)</p>
        {data?.rows.length ? <div className="space-y-3">{data.rows.map(item => <ArchitectHistoryItem key={item.id} item={item} />)}</div> : <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{tab === 'pending' ? 'Nenhuma ação aguardando confirmação.' : 'Nenhuma operação registrada ainda.'}</div>}
        {pages > 1 && <nav aria-label="Paginação do histórico" className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage(value => value - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {pages}</span>
          <Button variant="outline" disabled={page + 1 >= pages || isFetching} onClick={() => setPage(value => value + 1)}>Próxima</Button>
        </nav>}
      </>}
    </div>
  );
}