import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Package, MessageSquare, Settings, Share2 } from 'lucide-react';
import { AdminPageTitle } from '@/components/admin/ui';

const ITEMS = [
  { to: '/admin/orcamentos/pedidos', title: 'Pedidos', desc: 'Ver, filtrar e atualizar status dos orçamentos recebidos.', icon: ShoppingBag },
  { to: '/admin/orcamentos/catalogo', title: 'Catálogo', desc: 'Adicionar, editar ou remover produtos e imagens.', icon: Package },
  { to: '/admin/orcamentos/mensagens', title: 'Mensagens', desc: 'Personalizar o texto enviado ao WhatsApp.', icon: MessageSquare },
  { to: '/admin/orcamentos/configuracoes', title: 'Configurações', desc: 'Marca, cores, títulos e número de WhatsApp.', icon: Settings },
  { to: '/admin/orcamentos/link', title: 'Link Compartilhável', desc: 'Gerar e gerenciar o link do formulário.', icon: Share2 }
];

export default function OrcamentosDashboard() {
  return (
    <div>
      <AdminPageTitle title="Orçamentos de Cadeiazinhas" subtitle="Gerencie pedidos, catálogo e personalização do formulário." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <Link key={it.to} to={it.to}>
            <div className="group h-full rounded-xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-md">
              <it.icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-display text-base group-hover:text-primary">{it.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}