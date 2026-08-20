import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Shield } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.User.list('-created_date', 200);
    setUsers(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const invite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setMsg('');
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      setMsg(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      await load();
    } catch (e) {
      setMsg('Não foi possível convidar: ' + (e.message || 'erro'));
    } finally { setInviting(false); }
  };

  const changeRole = async (id, role) => {
    await base44.entities.User.update(id, { role });
    await load();
  };

  return (
    <div>
      <AdminPageTitle title="Usuários" subtitle={`${users.length} membros cadastrados`} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium"><UserPlus className="h-4 w-4 text-gold" /> Convidar novo usuário</p>
        <div className="flex flex-wrap gap-3">
          <input className={inputCls + ' max-w-xs'} type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <select className={inputCls + ' w-32'} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={invite} disabled={inviting} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {inviting ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      </div>

      {loading ? <Loading /> : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Função</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === 'consagrado' ? 'gold' : 'muted'}>{u.status || 'interessado'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role || 'user'}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}