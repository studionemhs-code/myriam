import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function PendingApproval() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
            <Clock className="h-8 w-8 text-gold" />
          </div>
          <h1 className="mb-3 font-heading text-2xl font-bold text-foreground">
            Cadastro em análise
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Seu cadastro foi recebido e está aguardando aprovação do administrador.
            Assim que for liberado, você poderá acessar a plataforma normalmente.
          </p>
          <button
            onClick={() => logout(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}