import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, ChevronRight } from 'lucide-react';
import { useAssociationEligibility } from '@/hooks/useAssociationEligibility';

export default function AssociationRequestButton({ variant = 'card', className = '' }) {
  const { eligible, settings, loading } = useAssociationEligibility();

  if (loading || !eligible || !settings) return null;

  if (variant === 'inline') {
    return (
      <Link
        to="/associacao"
        className={`inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/5 px-4 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/10 ${className}`}
      >
        <Crown className="h-4 w-4" /> Solicitar ingresso na Associação
        <ChevronRight className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <Link
      to="/associacao"
      className={`block rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 to-card p-5 transition hover:border-gold/50 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
          <Crown className="h-6 w-6 text-gold" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base text-foreground">Associação Maria Rainha dos Corações</p>
          <p className="text-sm text-muted-foreground">Solicite seu ingresso na associação</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gold" />
      </div>
    </Link>
  );
}