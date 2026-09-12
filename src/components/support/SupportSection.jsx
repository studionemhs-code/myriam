import React, { useState } from 'react';
import { LifeBuoy, ChevronRight } from 'lucide-react';
import { useSupportSettings } from '@/hooks/useSupportSettings';
import SupportSheet from '@/components/support/SupportSheet';

export default function SupportSection() {
  const { settings, loading } = useSupportSettings();
  const [open, setOpen] = useState(false);

  if (!loading && settings?.enabled === false) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-gold/40"
      >
        <LifeBuoy className="h-5 w-5 text-gold" />
        <div className="flex-1">
          <p className="text-sm font-medium">Suporte</p>
          <p className="text-xs text-muted-foreground">Fale conosco por WhatsApp, e-mail ou telefone</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <SupportSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}