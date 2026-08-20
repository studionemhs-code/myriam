import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Flower2, BookOpen, Heart, Calendar, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, update } = useCurrentUser();
  const [step, setStep] = useState(0);
  const [consecrationDate, setConsecrationDate] = useState('');
  const [saving, setSaving] = useState(false);

  const choose = async (path) => {
    if (path === 'conhecer') {
      await update({ status: 'interessado', onboarding_completed: true });
      navigate('/acamf');
    } else if (path === 'preparar') {
      await update({ status: 'preparacao', onboarding_completed: true });
      navigate('/caminho');
    } else if (path === 'consagrado') {
      setStep(1);
    }
  };

  const registerConsecration = async () => {
    if (!consecrationDate) return;
    setSaving(true);
    try {
      await update({
        status: 'consagrado',
        consecration_date: consecrationDate,
        last_renewal_date: consecrationDate,
        onboarding_completed: true
      });
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-4 font-display text-3xl">Registre sua Consagração</h1>
            <p className="mt-2 text-sm text-muted-foreground">Em que data você realizou sua Total Consagração a Jesus por Maria?</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Data da Consagração</label>
            <input
              type="date"
              value={consecrationDate}
              onChange={(e) => setConsecrationDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
            />
            <button
              onClick={registerConsecration}
              disabled={!consecrationDate || saving}
              className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground transition disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Confirmar Consagração'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="ornament text-gold text-sm">✦</div>
          <h1 className="mt-3 font-display text-4xl">Bem-vindo à Theotokos</h1>
          <p className="mt-3 font-display italic text-muted-foreground">Seu caminho para conhecer, preparar e viver a Total Consagração a Jesus por Maria.</p>
        </div>

        <p className="mb-4 text-center font-display text-xl">Onde você está na sua caminhada?</p>

        <div className="space-y-3">
          <button
            onClick={() => choose('conhecer')}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-gold/50 hover:shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><BookOpen className="h-6 w-6 text-primary" /></div>
            <div className="flex-1">
              <p className="font-display text-lg">Quero Conhecer</p>
              <p className="text-xs text-muted-foreground">Descubra o que é a Total Consagração</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => choose('preparar')}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-gold/50 hover:shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15"><Flower2 className="h-6 w-6 text-gold" /></div>
            <div className="flex-1">
              <p className="font-display text-lg">Quero Me Preparar</p>
              <p className="text-xs text-muted-foreground">Iniciar a jornada de 33 dias</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => choose('consagrado')}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-gold/50 hover:shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marian/15"><Heart className="h-6 w-6 text-marian" /></div>
            <div className="flex-1">
              <p className="font-display text-lg">Já Sou Consagrado</p>
              <p className="text-xs text-muted-foreground">Registrar a data da sua consagração</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
          </button>
        </div>

        <button onClick={() => navigate('/')} className="mt-6 w-full text-center text-xs text-muted-foreground underline">
          Pular por agora
        </button>
      </div>
    </div>
  );
}