import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FEATURE_LIST } from '@/lib/featureFlags';

// Seleciona os recursos (conteúdos, cursos, funcionalidades) liberados por um produto.
export default function ProductResourcesPicker({ selected, onChange }) {
  const [contents, setContents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.ACAMFContent.list('title', 500),
      base44.entities.Course.list('title', 200)
    ]).then(([c, cr]) => { setContents(c); setCourses(cr); });
  }, []);

  const toggle = (key) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  const match = (label) => !q || label.toLowerCase().includes(q.toLowerCase());

  const Group = ({ title, items }) => (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border bg-card p-2">
        {items.filter((i) => match(i.label)).map((i) => (
          <label key={i.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(i.key)} onChange={() => toggle(i.key)} />
            <span className="truncate">{i.label}</span>
            {i.paid && <span className="ml-auto rounded-full bg-purple-100 px-2 text-[10px] text-purple-700">pago</span>}
          </label>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item.</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recursos liberados por este produto ({selected.length})</p>
        <input className="w-40 rounded-lg border border-input bg-background px-2 py-1 text-xs" placeholder="Filtrar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">Marque tudo o que a compra deste produto deve liberar. Conteúdos que apontam diretamente para este produto no editor também são liberados.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Group title="Cursos" items={courses.map((c) => ({ key: `course:${c.id}`, label: c.title, paid: c.access_type === 'pago' }))} />
        <Group title="Conteúdos ACAMF" items={contents.map((c) => ({ key: `acamf_content:${c.id}`, label: c.title, paid: c.access_type === 'pago' }))} />
        <Group title="Funcionalidades" items={FEATURE_LIST.map((f) => ({ key: `feature:${f.feature}`, label: f.label }))} />
      </div>
    </div>
  );
}