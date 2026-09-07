import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Field, inputCls } from '@/components/admin/ui';
import { toast } from '@/components/ui/use-toast';
import { logMonetizationEvent } from '@/lib/monetizationAdmin';

// Concessão manual de acesso pelo administrador.
export default function ManualGrantDialog({ products, onClose, onSaved }) {
  const [email, setEmail] = useState('');
  const [productId, setProductId] = useState('');
  const [validity, setValidity] = useState('permanente');
  const [days, setDays] = useState(30);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    const mail = email.trim().toLowerCase();
    if (!mail || !productId) { setError('Informe o e-mail e o produto.'); return; }
    setSaving(true);
    try {
      const users = await base44.entities.User.filter({ email: mail });
      const user = users[0] || null;
      const me = await base44.auth.me();
      const expires = validity === 'dias' ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null;
      const grant = await base44.entities.AccessGrant.create({
        user_id: user?.id || null, user_email: mail, product_id: productId, source: 'manual', status: 'ativo',
        starts_at: new Date().toISOString(), expires_at: expires, note: note || null, granted_by: me?.email || 'admin'
      });
      await logMonetizationEvent('concessao_manual', {
        user_id: user?.id || null, user_email: mail, product_id: productId, grant_id: grant.id,
        details: { expires_at: expires, note, user_registered: !!user }
      });
      toast({ description: user ? 'Acesso liberado.' : 'Acesso liberado — será aplicado quando o usuário se cadastrar com este e-mail.' });
      onSaved();
    } catch (e) {
      setError(e.message || 'Erro ao liberar acesso.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Liberar acesso manualmente</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <div className="space-y-4">
          <Field label="E-mail do usuário"><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" /></Field>
          <Field label="Produto">
            <select className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Selecionar…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Validade">
            <div className="flex gap-2">
              <select className={inputCls} value={validity} onChange={(e) => setValidity(e.target.value)}>
                <option value="permanente">Permanente</option>
                <option value="dias">Por X dias</option>
              </select>
              {validity === 'dias' && <input type="number" min="1" className={`${inputCls} w-28`} value={days} onChange={(e) => setDays(e.target.value)} />}
            </div>
          </Field>
          <Field label="Observação (opcional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: cortesia, pagamento via Pix manual" /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Liberar
          </button>
        </div>
      </div>
    </div>
  );
}