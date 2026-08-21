import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Trash2, Sparkles, Crown } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABEL = { interessado: 'Interessado', preparacao: 'Em Preparação', consagrado: 'Consagrado' };
const STATUS_TONE = { interessado: 'muted', preparacao: 'blue', consagrado: 'gold' };

export default function Users() {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
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
    try {
      await base44.entities.User.update(id, { role });
      toast({ description: 'Função atualizada.' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao alterar função.' });
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await base44.entities.User.update(id, { status });
      toast({ description: 'Nível espiritual atualizado.' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao alterar nível.' });
    }
  };

  const toggleExclusive = async (u) => {
    const newValue = !u.exclusive_access;
    try {
      await base44.entities.User.update(u.id, { exclusive_access: newValue });
      toast({ description: newValue ? 'Acesso exclusivo concedido.' : 'Acesso exclusivo revogado.' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao alterar acesso exclusivo.' });
    }
  };

  const removeUser = async (u) => {
    const ok = await confirm({
      title: 'Excluir acesso',
      description: `Tem certeza que deseja excluir ${u.full_name || u.email}? Esta ação remove o acesso do usuário ao aplicativo.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try {
      await base44.entities.User.delete(u.id);
      toast({ description: 'Acesso excluído.' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Não foi possível excluir: ' + (e.message || 'erro') });
    }
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
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Nível</th>
                <th className="px-4 py-3">Função</th>
                <th className="px-4 py-3">Acesso exclusivo</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {u.exclusive_access && <Crown className="h-3.5 w-3.5 text-gold" />}
                      {u.full_name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.status || 'interessado'}
                      onChange={(e) => changeStatus(u.id, e.target.value)}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="interessado">Interessado</option>
                      <option value="preparacao">Em Preparação</option>
                      <option value="consagrado">Consagrado</option>
                    </select>
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExclusive(u)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                        u.exclusive_access
                          ? 'bg-gold/15 text-gold hover:bg-gold/25'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {u.exclusive_access ? 'Ativado' : 'Conceder'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeUser(u)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog}
    </div>
  );
}