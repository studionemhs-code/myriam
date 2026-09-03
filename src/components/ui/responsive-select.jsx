import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

// No desktop: <select> nativo. No mobile: botão que abre um bottom sheet (Vaul) com as opções.
export default function ResponsiveSelect({ value, onChange, options, className = '', title = 'Selecione', placeholder = 'Selecione' }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!isMobile) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }

  const current = options.find((o) => o.value === value);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`flex items-center justify-between gap-2 text-left ${className}`}>
        <span className={current ? '' : 'text-muted-foreground'}>{current?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <DrawerHeader><DrawerTitle className="font-display">{title}</DrawerTitle></DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm ${active ? 'bg-gold/15 font-medium text-gold' : 'hover:bg-muted'}`}
                >
                  {o.label}
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}