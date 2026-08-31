import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flower2, Lock, PencilLine } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Ornament, GoldDivider } from '@/components/ui/marian';
import { formatDate } from '@/lib/marianDates';
import RenewalConfirmDialog from '@/components/consagracao/RenewalConfirmDialog';
import {
  isConsecrated, canEditConsecrationDate, buildCorrectionPayload,
  buildFirstConsecrationPayload, buildRenewalPayload, EDIT_WINDOW_DAYS
} from '@/lib/consecration';

export default function Consagracao() {
  const navigate = useNavigate();
  const { user, update } = useCurrentUser();
  const [answered, setAnswered] = useState(false);
  const [hasDone, setHasDone] = useState(null);
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmRenewal, setConfirmRenewal] = useState(false);
  const [correctionDate, setCorrectionDate] = useState('');

  const predicted = user?.target_consecration_date;
  const consecrated = isConsecrated(user);
  const canCorrect = canEditConsecrationDate(user);

  const saveFirst = async (chosenDate) => {
    setSaving(true);
    try {
      await update(buildFirstConsecrationPayload(chosenDate));
      navigate('/minha-consagracao');
    } finally { setSaving(false); }
  };

  const saveRenewal = async () => {
    setSaving(true);
    try {
      await update(buildRenewalPayload(user, date));
      setConfirmRenewal(false);
      navigate('/minha-consagracao');
    } finally { setSaving(false); }
  };

  const saveCorrection = async () => {
    if (!correctionDate) return;
    setSaving(true);
    try {
      await update(buildCorrectionPayload(user, correctionDate));
      navigate('/minha-consagracao');
    } finally { setSaving(false); }
  };

  const submit = () => {
    if (!date) return;
    if (consecrated) setConfirmRenewal(true);
    else saveFirst(date);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Ornament className="text-gold" />
        <h1 className="mt-3 font-display text-3xl">🌹 Sua Consagração</h1>
        <p className="mt-2 text-sm text-muted-foreground">O momento de entregar-se totalmente a Jesus por Maria.</p>
      </div>

      {/* Já consagrado — data original protegida */}
      {consecrated && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <div className="flex items-center gap-2 text-gold">
            <Flower2 className="h-4 w-4" />
            <span className="text-xs uppercase tracking-[0.2em]">Sua consagração</span>
          </div>
          <p className="mt-2 font-display text-xl">{formatDate(user.consecration_date)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Esta é a sua primeira data de consagração e ela é mantida para sempre.
            Novas datas são registradas como renovação.
          </p>
          <Link to="/minha-consagracao" className="mt-3 inline-block text-xs text-gold">Ver minha consagração →</Link>
        </div>
      )}

      {/* Correção única, dentro da janela de 7 dias */}
      {canCorrect && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <PencilLine className="h-4 w-4 text-primary" />
            <p className="font-display text-base">Corrigir a data da consagração</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Você pode corrigir sua data de consagração <span className="font-medium">uma única vez</span>,
            até {EDIT_WINDOW_DAYS} dias após o registro. Depois disso ela fica bloqueada.
          </p>
          <input
            type="date"
            value={correctionDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setCorrectionDate(e.target.value)}
            className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3"
          />
          <button
            onClick={saveCorrection}
            disabled={!correctionDate || saving}
            className="mt-3 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Corrigir data'}
          </button>
        </div>
      )}

      {!answered && (
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-accent p-6">
          <p className="text-center font-display text-xl">
            {consecrated ? 'Deseja registrar uma renovação?' : 'Você já realizou sua Consagração?'}
          </p>
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
          <p className="font-display text-lg">
            {consecrated ? 'Em que data você renovou sua Consagração?' : 'Em que data você realizou sua Consagração?'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {consecrated
              ? 'Sua data original de consagração será mantida; esta data entrará no histórico de renovações.'
              : hasDone
                ? 'Você pode registrar uma consagração realizada a qualquer tempo, mesmo há muitos anos.'
                : 'Registre a data prevista para sua consagração. Você poderá ajustá-la depois.'}
          </p>

          {predicted && !consecrated && (
            <div className="mt-4 rounded-xl bg-gold/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">Data prevista</p>
              <p className="font-display text-xl text-gold">{formatDate(predicted)}</p>
            </div>
          )}

          <label className="mt-4 block text-xs uppercase tracking-wider text-muted-foreground">
            {consecrated ? 'Data da Renovação' : 'Data da Consagração'}
          </label>
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3"
          />

          <button
            onClick={submit}
            disabled={!date || saving}
            className="mt-4 w-full rounded-xl bg-gold py-3 font-medium text-deep disabled:opacity-40"
          >
            {saving ? 'Salvando...' : consecrated ? 'Registrar renovação' : 'Registrar minha Consagração'}
          </button>
        </div>
      )}

      <RenewalConfirmDialog
        open={confirmRenewal}
        onOpenChange={setConfirmRenewal}
        originalDate={user?.consecration_date}
        newDate={date}
        onConfirm={saveRenewal}
        loading={saving}
      />

      <GoldDivider />
      <p className="text-center font-display italic text-muted-foreground">
        "Tudo a Jesus por Maria, tudo a Maria para Jesus."<br />
        <span className="text-xs not-italic">— São Luís Maria Grignion de Montfort</span>
      </p>
    </div>
  );
}