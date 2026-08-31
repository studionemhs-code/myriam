import React, { useState } from 'react';
import { Sparkles, Flower2, BookOpen, Heart, ChevronRight, ChevronLeft, User, Camera, Crown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/components/ui/use-toast';
import Logo from '@/components/Logo';
import { registerConsecrationOrRenewal } from '@/lib/consecration';

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const { user, update } = useCurrentUser();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(user?.display_name || user?.full_name || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photo_url || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [consecrationDate, setConsecrationDate] = useState('');
  const [showConsecrationForm, setShowConsecrationForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch (err) {
      alert('Erro ao enviar foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    const data = {};
    if (displayName.trim()) data.display_name = displayName.trim();
    if (photoUrl) data.photo_url = photoUrl;
    if (phone.trim()) data.phone = phone.trim();
    if (Object.keys(data).length > 0) {
      await update(data);
    }
  };

  const choose = async (path) => {
    setSaving(true);
    try {
      if (path === 'conhecer') {
        await update({ status: 'interessado', onboarding_completed: true });
        window.location.href = '/acamf';
      } else if (path === 'preparar') {
        const today = new Date();
        const startStr = today.toISOString().slice(0, 10);
        const target = new Date(today);
        target.setDate(target.getDate() + 33);
        const targetStr = target.toISOString().slice(0, 10);
        await update({
          status: 'preparacao',
          onboarding_completed: true,
          preparation_start_date: startStr,
          target_consecration_date: targetStr
        });
        const existing = await base44.entities.UserProgress.filter({ created_by_id: user.id });
        if (!existing[0]) {
          await base44.entities.UserProgress.create({
            current_day: 1,
            completed_days: [],
            started_date: startStr,
            last_access_date: new Date().toISOString(),
            status: 'ativa'
          });
        }
        window.location.href = '/caminho';
      } else if (path === 'consagrado') {
        if (!consecrationDate) {
          setShowConsecrationForm(true);
          setSaving(false);
          return;
        }
        await update({
          ...registerConsecrationOrRenewal(user, consecrationDate),
          onboarding_completed: true
        });
        window.location.href = '/';
      }
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: err?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    await update({ onboarding_completed: true, status: 'interessado' });
    window.location.href = '/';
  };

  const next = async () => {
    if (step === 2) {
      await saveProfile();
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-md">
        {/* Indicador de progresso */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-gold' : i < step ? 'w-4 bg-gold/50' : 'w-4 bg-muted'
              }`}
            />
          ))}
        </div>

        <p className="mb-6 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Passo {step + 1} de {TOTAL_STEPS}
        </p>

        {/* Etapa 1: Boas-vindas */}
        {step === 0 && (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <Logo size="lg" variant="light" subtitle stacked />
            </div>
            <div className="ornament text-gold text-sm">✦</div>
            <h1 className="mt-4 font-display text-3xl">Bem-vindo à Theotokos</h1>
            <p className="mt-3 font-display italic text-muted-foreground">
              Seu caminho para conhecer, preparar e viver a Total Consagração a Jesus por Maria.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Estamos felizes em receber você. Vamos configurar sua experiência em poucos passos.
            </p>
          </div>
        )}

        {/* Etapa 2: Explicação da Total Consagração */}
        {step === 1 && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
              <Heart className="h-8 w-8 text-gold" />
            </div>
            <h1 className="font-display text-2xl">A Total Consagração</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              A Total Consagração a Jesus por Maria, segundo São Luís Maria Grignion de Montfort, é uma jornada espiritual de 33 dias que nos leva a entregar tudo a Cristo pelas mãos de Nossa Senhora.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Durante a preparação, você percorrerá quatro etapas: conhecimento de si, conhecimento de Maria, conhecimento de Jesus e, por fim, a entrega total. Ao concluir, você será convidado a fazer sua Consagração.
            </p>
            <p className="mt-4 font-display italic text-gold">Ad Iesum per Mariam</p>
          </div>
        )}

        {/* Etapa 3: Configuração de perfil */}
        {step === 2 && (
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-display text-2xl">Configure seu perfil</h1>
              <p className="mt-2 text-sm text-muted-foreground">Como gostaria de ser chamado na comunidade?</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              {/* Foto */}
              <div className="mb-5 flex flex-col items-center">
                <div className="relative">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-gold/30 bg-muted">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-full w-full p-4 text-muted-foreground" />
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:bg-primary/90">
                    <Camera className="h-3.5 w-3.5" />
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                  </label>
                </div>
                {uploadingPhoto && <p className="mt-2 text-xs text-muted-foreground">Enviando foto...</p>}
              </div>

              {/* Nome */}
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Nome de exibição</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
                />
              </label>
              <p className="mt-3 text-xs text-muted-foreground">
                Este nome aparecerá em suas publicações e interações na comunidade Myriam.
              </p>

              <label className="mt-4 block">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Telefone / WhatsApp</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base"
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                Usado para enviar notificações por WhatsApp quando você não ler as mensagens no app.
              </p>
            </div>
          </div>
        )}

        {/* Etapa 4: Escolha do caminho */}
        {step === 3 && (
          <div>
            <div className="mb-6 text-center">
              <div className="ornament text-gold text-sm">✦</div>
              <h1 className="mt-3 font-display text-2xl">Onde você está na sua caminhada?</h1>
              <p className="mt-2 text-sm text-muted-foreground">Escolha a opção que melhor descreve você hoje.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => choose('conhecer')}
                disabled={saving}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-gold/50 hover:shadow disabled:opacity-50"
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
                disabled={saving}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-gold/50 hover:shadow disabled:opacity-50"
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
                disabled={saving}
                className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-gold/50 hover:shadow disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marian/15"><Crown className="h-6 w-6 text-marian" /></div>
                <div className="flex-1">
                  <p className="font-display text-lg">Já Sou Consagrado</p>
                  <p className="text-xs text-muted-foreground">Registrar a data da sua consagração</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1" />
              </button>
            </div>

            {/* Registro de data de consagração (aparece ao escolher "Já Sou Consagrado") */}
            {showConsecrationForm && (
              <div className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4 text-center">
                <p className="text-sm text-muted-foreground">Informe a data da sua consagração:</p>
                <input
                  type="date"
                  value={consecrationDate}
                  onChange={(e) => setConsecrationDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setShowConsecrationForm(false); setConsecrationDate(''); }} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
                  <button onClick={() => choose('consagrado')} disabled={!consecrationDate || saving} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">
                    {saving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}

            <button onClick={skip} className="mt-6 w-full text-center text-xs text-muted-foreground underline">
              Pular por agora
            </button>
          </div>
        )}

        {/* Botões de navegação */}
        {step < 3 && (
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={prev} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
            ) : <span />}

            <button
              onClick={next}
              className="flex items-center gap-2 rounded-xl bg-gold px-6 py-2.5 text-sm font-medium text-deep transition hover:bg-gold/90"
            >
              {step === 0 ? 'Começar' : 'Continuar'} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}