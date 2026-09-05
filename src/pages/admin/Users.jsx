import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Trash2, Sparkles, Crown, KeyRound, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { AdminPageTitle, Field, inputCls, Loading, Badge } from '@/components/admin/ui';
import { useConfirm } from '@/hooks/useConfirm';
import { useToast } from '@/components/ui/use-toast';
import UserFeatureAccessDialog from '@/components/admin/UserFeatureAccessDialog';
import { isOnline } from '@/hooks/useOnlineUsers';

const STATUS_LABEL = { interessado: 'Interessado', preparacao: 'Em Preparação', consagrado: 'Consagrado', usuario_escolhe: 'Usuário Escolhe' };
const STATUS_TONE = { interessado: 'muted', preparacao: 'blue', consagrado: 'gold', usuario_escolhe: 'purple' };

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
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState('');
  const [accessUser, setAccessUser] = useState(null);
  const [regSettings, setRegSettings] = useState(null);
  const [savingReg, setSavingReg] = useState(false);

  const load = async () => {
    setLoading(true);
    const [list, regList] = await Promise.all([
      base44.entities.User.list('-created_date', 200),
      base44.entities.RegistrationSettings.list('-created_date', 1),
    ]);
    setUsers(list);
    setRegSettings(regList[0] || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveRegMode = async (mode) => {
    setSavingReg(true);
    try {
      if (regSettings?.id) {
        await base44.entities.RegistrationSettings.update(regSettings.id, { mode });
      } else {
        const created = await base44.entities.RegistrationSettings.create({ mode });
        setRegSettings(created);
      }
      setRegSettings((prev) => ({ ...(prev || {}), mode }));
      toast({ description: mode === 'approval' ? 'Cadastros agora exigem aprovação.' : 'Cadastros com acesso imediato.' });
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao salvar configuração.' });
    } finally { setSavingReg(false); }
  };

  const approveUser = async (u) => {
    try {
      await base44.entities.User.update(u.id, { is_approved: true });
      toast({ description: `${u.display_name || u.full_name || u.email} aprovado com sucesso!` });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao aprovar usuário.' });
    }
  };

  const invite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setMsg('');
    try {
      // Cria o usuário via Edge Function (senha definida pelo admin, e-mail já confirmado).
      await base44.functions.invoke('inviteUser', {
        email: inviteEmail,
        role: inviteRole,
        full_name: inviteName || undefined,
        password: invitePassword || undefined,
      });
      // Aplica os campos extras no profile.
      const all = await base44.entities.User.list('-created_date', 200);
      const created = all.find((u) => u.email === inviteEmail);
      if (created) {
        const updates = { status: inviteStatus, exclusive_access: inviteExclusive };
        if (inviteName) updates.full_name = inviteName;
        // Nível específico → onboarding concluído (usuário só preenche perfil); 'Usuário Escolhe' → vê escolha de nível.
        if (inviteStatus !== 'usuario_escolhe') updates.onboarding_completed = true;
        await base44.entities.User.update(created.id, updates);
      }
      // SEC-04: a senha não volta da Edge Function — o admin já a digitou e deve repassá-la por canal próprio.
      setMsg(invitePassword
        ? `Usuário criado! Login: ${inviteEmail} · Senha: a que você digitou acima. Repasse ao usuário por canal seguro.`
        : `Usuário criado! Login: ${inviteEmail} · Senha gerada automaticamente (não exibida). O usuário deve usar "Esqueci a senha" para definir a própria.`);
      setInviteEmail('');
      setInviteName('');
      setInviteStatus('interessado');
      setInviteExclusive(false);
      setInvitePassword('');
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
      const updates = { status };
      // Reverter para 'Usuário Escolhe' reabre o onboarding (etapa de nível volta a aparecer).
      if (status === 'usuario_escolhe') updates.onboarding_completed = false;
      await base44.entities.User.update(id, updates);
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
      description: `Tem certeza que deseja excluir ${u.display_name || u.full_name || u.email}? Esta ação remove o acesso do usuário ao aplicativo.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    try {
      await base44.functions.invoke('deleteUser', { userId: u.id });
      toast({ description: 'Usuário excluído permanentemente.' });
      await load();
    } catch (e) {
      toast({ variant: 'destructive', description: 'Não foi possível excluir: ' + (e.message || 'erro') });
    }
  };

  return (
    <div>
      <AdminPageTitle title="Usuários" subtitle={`${users.length} membros cadastrados`} />

      {/* Modo de cadastro */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-1 flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-gold" /> Modo de cadastro</p>
        <p className="mb-3 text-xs text-muted-foreground">Escolha como novos usuários acessam a plataforma ao se cadastrar.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => saveRegMode('auto')}
            disabled={savingReg}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:opacity-50 ${
              regSettings?.mode !== 'approval'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <CheckCircle2 className={`mt-0.5 h-5 w-5 ${regSettings?.mode !== 'approval' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">Acesso imediato</p>
              <p className="text-xs text-muted-foreground">O usuário se cadastra e já pode entrar na hora, sem aprovação.</p>
            </div>
          </button>
          <button
            onClick={() => saveRegMode('approval')}
            disabled={savingReg}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:opacity-50 ${
              regSettings?.mode === 'approval'
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <Clock className={`mt-0.5 h-5 w-5 ${regSettings?.mode === 'approval' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">Aprovação do admin</p>
              <p className="text-xs text-muted-foreground">O usuário se cadastra, mas fica bloqueado até você aprovar aqui.</p>
            </div>
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium"><UserPlus className="h-4 w-4 text-gold" /> Criar novo usuário</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className={inputCls} type="text" placeholder="Nome completo" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <input className={inputCls} type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <input className={inputCls} type="text" placeholder="Senha (mín. 6 caracteres)" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} />
          <select className={inputCls} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            <option value="user">Função: Usuário</option>
            <option value="admin">Função: Admin</option>
          </select>
          <select className={inputCls} value={inviteStatus} onChange={(e) => setInviteStatus(e.target.value)}>
            <option value="interessado">Nível: Interessado</option>
            <option value="preparacao">Nível: Em Preparação</option>
            <option value="consagrado">Nível: Consagrado</option>
            <option value="usuario_escolhe">Nível: Usuário Escolhe</option>
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
                <th className="px-4 py-3">Aprovado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        title={isOnline(u) ? 'Online agora' : 'Offline'}
                        className={`h-2 w-2 shrink-0 rounded-full ${isOnline(u) ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                      />
                      {u.exclusive_access && <Crown className="h-3.5 w-3.5 text-gold" />}
                      {u.display_name || u.full_name || '—'}
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
                      <option value="usuario_escolhe">Usuário Escolhe</option>
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
                  <td className="px-4 py-3">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : u.is_approved === false ? (
                      <button
                        onClick={() => approveUser(u)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold transition hover:bg-gold/25"
                      >
                        <Clock className="h-3 w-3" /> Aprovar
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Sim
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setAccessUser(u)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                        title="Gerenciar acessos"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Acessos
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog}

      {accessUser && (
        <UserFeatureAccessDialog user={accessUser} onClose={() => setAccessUser(null)} />
      )}
    </div>
  );
}