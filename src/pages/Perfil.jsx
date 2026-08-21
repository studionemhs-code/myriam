import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Flower2, Calendar, BookOpen, Heart, Settings, ShoppingBag, ChevronRight, LogOut, Camera, Shield, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader, StatPill, GoldDivider } from '@/components/ui/marian';
import { formatDate } from '@/lib/marianDates';
import SpiritualStatus from '@/components/perfil/SpiritualStatus';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

const STORE_URL = 'https://www.lojatheotokos.com.br';

export default function Perfil() {
  const { user, update, loading } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ reflections: 0, intentions: 0 });

  useEffect(() => {
    if (user) {
      setBio(user.bio || '');
      setPhoto(user.photo_url || '');
      (async () => {
        try {
          const refs = await base44.entities.Reflection.filter({ created_by_id: user.id });
          const intents = await base44.entities.PrayerIntention.filter({ created_by_id: user.id });
          setStats({ reflections: refs.length, intentions: intents.length });
        } catch (e) { /* ignore */ }
      })();
    }
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  const statusLabel = { interessado: 'Interessado', preparacao: 'Em Preparação', consagrado: 'Consagrado' }[user.status];

  const save = async () => {
    setSaving(true);
    try {
      await update({ bio, photo_url: photo });
      setEditing(false);
    } finally { setSaving(false); }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhoto(file_url);
  };

  return (
    <div>
      <PageHeader title="Meu Perfil" icon={User} />

      {/* Cartão de identidade */}
      <section className="relative overflow-hidden rounded-2xl bg-deep p-6 text-primary-foreground">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {photo ? (
              <img src={photo} alt="" className="h-24 w-24 rounded-full border-2 border-gold object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-foreground/15 font-display text-3xl text-gold">
                {(user.full_name || 'A')[0]}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gold text-deep">
              <Camera className="h-3.5 w-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
          </div>
          <p className="mt-3 font-display text-2xl">{user.full_name || 'Alma'}</p>
          <span className="mt-1 rounded-full bg-gold/20 px-3 py-0.5 text-xs uppercase tracking-wider text-gold">{statusLabel}</span>
        </div>
      </section>

      {/* Bio editável */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        {editing ? (
          <div>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Conte um pouco sobre você..." className="w-full rounded-xl border border-input bg-background p-3 text-sm" />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setEditing(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Salvar</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">{bio || 'Sem biografia ainda.'}</p>
            <button onClick={() => setEditing(true)} className="mt-2 text-xs text-gold">Editar perfil</button>
          </div>
        )}
      </section>

      <SpiritualStatus user={user} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatPill value={stats.reflections} label="reflexões" />
        <StatPill value={stats.intentions} label="intenções" />
      </div>

      <GoldDivider />

      {/* Menu */}
      <div className="space-y-1">
        <MenuItem to="/minha-consagracao" icon={Flower2} label="Minha Consagração" />
        <MenuItem to="/historico" icon={Award} label="Histórico de Jornadas" />
        <MenuItem to="/caminho" icon={Flower2} label="Ver minha caminhada" />
        <MenuItem to="/calendario" icon={Calendar} label="Calendário Mariano" />
        <MenuItem to="/intencoes" icon={Heart} label="Intenções de Oração" />
        <MenuItem to="/jornadas" icon={BookOpen} label="Jornadas Coletivas" />
        <MenuItem to="/configuracoes" icon={Settings} label="Configurações" />
        {user.role === 'admin' && <MenuItem to="/admin" icon={Shield} label="Painel Administrativo" />}
        <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-muted">
          <ShoppingBag className="h-5 w-5 text-gold" /> Conheça os Produtos Theotokos <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        </a>
        <div className="py-1">
          <PwaInstallPrompt />
        </div>
        <button onClick={() => base44.auth.logout()} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted">
          <LogOut className="h-5 w-5" /> Sair
        </button>
      </div>
    </div>
  );
}

function MenuItem({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-muted">
      <Icon className="h-5 w-5 text-gold" /> {label}
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </Link>
  );
}