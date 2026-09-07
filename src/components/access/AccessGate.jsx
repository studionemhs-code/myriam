import React from 'react';
import { useAccess } from '@/hooks/useAccess';
import Paywall from '@/components/access/Paywall';

// Envolve um recurso: renderiza os filhos se o usuário tiver acesso, senão a tela de bloqueio.
// resource = { type, id, access_type, product_id }
export default function AccessGate({ resource, title, backTo, children }) {
  const { loading, check } = useAccess();
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }
  const result = check(resource);
  if (!result.allowed) return <Paywall result={result} title={title} backTo={backTo} />;
  return children;
}