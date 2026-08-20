import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flower2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Ornament, GoldDivider } from '@/components/ui/marian';
import { formatDate, parseDate } from '@/lib/marianDates';

export default function Consagracao() {
  const navigate = useNavigate();
  const { user, update } = useCurrentUser();
  const [answered, setAnswered] = useState(false);
  const [hasDone, setHasDone] = useState(null); // true/false
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const predicted = user?.target_consecration_date;

  const register = async (chosenDate) => {
    if (!chosenDate) return;
    setSaving(true);
    try {
      const d = chosenDate;
      const renewals = user?.renewals || [];
      await update({
        status: 'consagrado',
        consecration_date: d,
        last_renewal_date: d,
        renewals: [...renewals, d]
      });
      navigate('/minha-consagracao');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Ornament className="text-gold" />
        <h1 className="mt-3 font-display text-3xl">🌹 Sua Consagração</h1>
        <p className="mt-2 text-sm text-muted-foreground">O momento de entregar-se totalmente a Jesus por Maria.</p>
      </div>

      {!answered && (
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-6">
          <p className="text-center font-display text-xl">Você já realizou sua Consagração?</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => { setHasDone(true); setAnswered(true); if (predicted) setDate(predicted); }}
              className="rounded-xl bg-primary py-4 font-medium text-primary-foreground"
            >
              Sim
            </button>
            <button
              onClick={() => { setHasDone(false); setAnswered(true); if (predicted) setDate(predicted); }}
              className="rounded-xl border border-primary py-4 font-medium text-primary"
            >
              Ainda não
            </button>
          </div>
        </div>
      )}

      {answered && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-display text-lg">Em que data você realizou sua Consagração?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasDone
              ? 'Você pode registrar uma consagração realizada a qualquer tempo, mesmo há muitos anos.'
              : 'Registre a data prevista para sua consagração. Você poderá ajustá-la depois.'}
          </p>

          {predicted && (
            <div className="mt-4 rounded-xl bg-gold/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">Data prevista</p>
              <p className="font-display text-xl text-gold">{formatDate(predicted)}</p>
            </div>
          )}

          <label className="mt-4 block text-xs uppercase tracking-wider text-muted-foreground">Data da Consagração</label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
          />

          <button
            onClick={() => register(date)}
            disabled={!date || saving}
            className="mt-4 w-full rounded-xl bg-gold py-3 font-medium text-deep disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Registrar minha Consagração'}
          </button>
        </div>
      )}

      <GoldDivider />
      <p className="text-center font-display italic text-muted-foreground">
        "Tudo a Jesus por Maria, tudo a Maria para Jesus."<br />
        <span className="text-xs not-italic">— São Luís Maria Grignion de Montfort</span>
      </p>
    </div>
  );
}