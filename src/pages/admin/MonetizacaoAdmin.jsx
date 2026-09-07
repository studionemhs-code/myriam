import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings2, Package, Plug, KeyRound, CreditCard, History } from 'lucide-react';
import { AdminPageTitle } from '@/components/admin/ui';
import GeneralSettingsTab from '@/components/admin/monetizacao/GeneralSettingsTab';
import ProductsTab from '@/components/admin/monetizacao/ProductsTab';
import IntegrationsTab from '@/components/admin/monetizacao/IntegrationsTab';
import GrantsTab from '@/components/admin/monetizacao/GrantsTab';
import PaymentsTab from '@/components/admin/monetizacao/PaymentsTab';
import EventsTab from '@/components/admin/monetizacao/EventsTab';

const TABS = [
  { key: 'geral', label: 'Geral', icon: Settings2, component: GeneralSettingsTab },
  { key: 'produtos', label: 'Produtos', icon: Package, component: ProductsTab },
  { key: 'integracoes', label: 'Integrações', icon: Plug, component: IntegrationsTab },
  { key: 'acessos', label: 'Permissões', icon: KeyRound, component: GrantsTab },
  { key: 'pagamentos', label: 'Pagamentos', icon: CreditCard, component: PaymentsTab },
  { key: 'historico', label: 'Histórico', icon: History, component: EventsTab }
];

export default function MonetizacaoAdmin() {
  const [params, setParams] = useSearchParams();
  const current = TABS.find((t) => t.key === params.get('tab')) || TABS[0];
  const Active = current.component;

  return (
    <div>
      <AdminPageTitle
        title="Configurações de Acesso e Monetização"
        subtitle="Defina o que é gratuito, o que é pago, quem pode acessar e por qual checkout."
      />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === current.key;
          return (
            <button
              key={t.key} onClick={() => setParams({ tab: t.key })}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>
      <Active />
    </div>
  );
}