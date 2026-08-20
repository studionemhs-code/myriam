import React, { useEffect, useState } from 'react';
import { Award, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Badge } from '@/components/admin/ui';
import CertificateEditor from '@/components/admin/CertificateEditor';
import { generateCertificatePdf } from '@/lib/generateCertificatePdf';

const typeLabels = { preparacao: 'Preparação', jornada: 'Jornada', renovacao: 'Renovação' };

export default function CertificatesAdmin() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const list = await base44.entities.CertificateTemplate.list('name');
    setTemplates(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm('Excluir este modelo de certificado?')) return;
    await base44.entities.CertificateTemplate.delete(id);
    load();
  };

  const preview = async (tpl) => {
    const doc = await generateCertificatePdf({
      template: tpl,
      userData: { name: 'Maria Exemplo', email: 'maria@exemplo.com', city: 'São Paulo', state: 'SP' },
      signature: { type: 'typed', data: 'Maria Exemplo' },
      issueDate: new Date().toISOString().slice(0, 10),
      certificateType: tpl.certificate_type
    });
    doc.save(`preview-${tpl.name}.pdf`);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <AdminPageTitle
        title="Certificados"
        subtitle="Modelos de certificados de conclusão"
        action={
          <button onClick={() => setEditing({})} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            <Plus className="h-4 w-4" /> Novo modelo
          </button>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Award className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum modelo criado ainda. Crie um modelo para que os consagrados possam emitir seus certificados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.title} · {typeLabels[t.certificate_type]}</p>
              </div>
              {t.is_active ? <Badge tone="green">Ativo</Badge> : <Badge>Inativo</Badge>}
              <button onClick={() => preview(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" title="Pré-visualizar"><Eye className="h-4 w-4" /></button>
              <button onClick={() => setEditing(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(t.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive" title="Excluir"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && <CertificateEditor template={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}