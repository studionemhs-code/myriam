import React, { useState } from 'react';
import { AdminPageTitle } from '@/components/admin/ui';
import CategoryManager from '@/components/admin/prayers/CategoryManager';
import PrayerManager from '@/components/admin/prayers/PrayerManager';

export default function OracoesAdmin() {
  const [tab, setTab] = useState('prayers');

  return (
    <div>
      <AdminPageTitle title="Orações" subtitle="Gerencie categorias e orações" />
      <div className="mb-6 flex gap-2 rounded-xl border border-border bg-card p-1">
        <button
          onClick={() => setTab('prayers')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === 'prayers' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Orações
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === 'categories' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          Categorias
        </button>
      </div>
      {tab === 'prayers' ? <PrayerManager /> : <CategoryManager />}
    </div>
  );
}