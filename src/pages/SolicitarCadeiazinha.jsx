import React from 'react';
import { useCatalog } from '@/hooks/useCatalog';
import QuoteForm from '@/components/cadeiazinha/QuoteForm';
import { PageHeader } from '@/components/ui/marian';
import { Sparkles } from 'lucide-react';

export default function SolicitarCadeiazinha() {
  const { catalog, settings, loading, error } = useCatalog();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-lg">Não foi possível carregar o catálogo</p>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Solicite sua cadeiazinha" subtitle="Monte sua peça personalizada e receba o orçamento no WhatsApp" icon={Sparkles} />
      <QuoteForm catalog={catalog} settings={settings} />
    </div>
  );
}