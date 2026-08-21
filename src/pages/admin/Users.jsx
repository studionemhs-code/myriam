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
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteStatus, setInviteStatus] = useState('interessado');
  const [inviteExclusive, setInviteExclusive] = useState(false);
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
      // Após o convite, localiza o usuário recém-criado e aplica os campos extras
      const all = await base44.entities.User.list('-created_date', 200);
      const created = all.find((u) => u.email === inviteEmail);
      if (created) {
        const updates = { status: inviteStatus, exclusive_access: inviteExclusive };
        if (inviteName) updates.full_name = inviteName;
        await base44.entities.User.update(created.id, updates);
      }
      setMsg(`Usuário criado e convite enviado para ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteStatus('interessado');
      setInviteExclusive(false);
      await load();
    } catch (e) {
      setMsg('Não foi possível criar: ' + (e.message || 'erro'));
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
        <p className="mb-3 flex items-center gap-2 text-sm font-medium"><UserPlus className="h-4 w-4 text-gold" /> Criar novo usuário</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className={inputCls} type="text" placeholder="Nome completo" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <input className={inputCls} type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <select className={inputCls} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="user">Função: Usuário</option>
            <option value="admin">Função: Admin</option>
          </select>
          <select className={inputCls} value={inviteStatus} onChange={(e) => setInviteStatus(e.target.value)}>
            <option value="interessado">Nível: Interessado</option>
            <option value="preparacao">Nível: Em Preparação</option>
            <option value="consagrado">Nível: Consagrado</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <input type="checkbox" checked={inviteExclusive} onChange={(e) => setInviteExclusive(e.target.checked)} className="accent-primary" />
            <Sparkles className="h-3.5 w-3.5 text-gold" /> Acesso exclusivo
          </label>
          <button onClick={invite} disabled={inviting} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {inviting ? 'Criando...' : 'Criar usuário'}
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