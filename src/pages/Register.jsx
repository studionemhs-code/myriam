import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { invokeEdgeFunction } from "@/api/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Phone } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import OtpWhatsappStep from "@/components/auth/OtpWhatsappStep";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [checkingOtp, setCheckingOtp] = useState(true);
  const [step, setStep] = useState("form"); // 'form' | 'otp' | 'pending'
  const [resending, setResending] = useState(false);
  const [regMode, setRegMode] = useState("auto");
  const [pendingMessage, setPendingMessage] = useState("");

  // Verifica se o OTP via WhatsApp está ativado e o modo de cadastro
  useEffect(() => {
    Promise.all([
      base44.entities.WhatsappOtpSettings.list('-created_date', 1),
      base44.entities.RegistrationSettings.list('-created_date', 1),
    ])
      .then(([otpList, regList]) => {
        setOtpEnabled(otpList[0]?.enabled ?? false);
        setRegMode(regList[0]?.mode ?? "auto");
        setPendingMessage(regList[0]?.pending_message ?? "");
      })
      .catch(() => {
        setOtpEnabled(false);
        setRegMode("auto");
      })
      .finally(() => setCheckingOtp(false));
  }, []);

  const sendOtp = async (isResend = false) => {
    const fn = isResend ? setResending : setLoading;
    fn(true);
    try {
      const { data } = await invokeEdgeFunction('sendWhatsappOtp', {
        email: email.trim().toLowerCase(),
        whatsapp_number: whatsapp.replace(/\D/g, '')
      });
      if (data?.enabled === false) {
        // Admin desativou entre o submit e agora — segue fluxo simples
        await registerAndLogin();
        return;
      }
      setStep('otp');
      if (isResend) toast({ description: "Novo código enviado para seu WhatsApp." });
    } catch (err) {
      setError(err.message || "Erro ao enviar código WhatsApp.");
    } finally {
      fn(false);
    }
  };

  const registerAndLogin = async () => {
    await base44.auth.register({ email, password });
    await base44.auth.loginViaEmailPassword(email, password);
    // Salva o WhatsApp no perfil (obrigatório) e, no modo "approval", marca como não aprovado
    const me = await base44.auth.me();
    if (me?.id) {
      const patch = { phone: whatsapp.replace(/\D/g, '') };
      if (regMode === "approval") patch.is_approved = false;
      await base44.entities.User.update(me.id, patch);
    }
    if (regMode === "approval") {
      setStep("pending");
      return;
    }
    window.location.href = safeReturnTo();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (whatsapp.replace(/\D/g, '').length < 10) {
      setError("Informe um número de WhatsApp válido com DDD.");
      return;
    }
    setLoading(true);
    try {
      if (otpEnabled) {
        await sendOtp(false);
      } else {
        await registerAndLogin();
      }
    } catch (err) {
      setError(err.message || "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = async () => {
    // Token validado — agora registra no Supabase e faz login
    setLoading(true);
    try {
      await registerAndLogin();
    } catch (err) {
      setError(err.message || "Falha ao finalizar cadastro.");
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  // --- Etapa Pendência (aguardando aprovação) ---
  if (step === 'pending') {
    return (
      <AuthLayout
        icon={UserPlus}
        title="Cadastro recebido"
        subtitle="Aguardando aprovação"
        footer={
          <button
            onClick={() => { base44.auth.logout('/login'); }}
            className="text-primary font-medium hover:underline"
          >
            Voltar ao login
          </button>
        }
      >
        <div className="rounded-lg bg-gold/10 p-4 text-center text-sm leading-relaxed text-foreground">
          {pendingMessage || "Seu cadastro foi recebido e está aguardando aprovação do administrador. Você receberá acesso em breve."}
        </div>
      </AuthLayout>
    );
  }

  // --- Etapa OTP ---
  if (step === 'otp') {
    return (
      <AuthLayout
        icon={UserPlus}
        title="Verifique seu WhatsApp"
        subtitle="Digite o código que você recebeu"
        footer={
          <button
            onClick={() => { setStep('form'); setError(""); }}
            className="text-primary font-medium hover:underline"
          >
            Voltar
          </button>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <OtpWhatsappStep
          email={email.trim().toLowerCase()}
          whatsappNumber={whatsapp.replace(/\D/g, '')}
          onVerified={handleVerified}
          onBack={() => { setStep('form'); setError(""); }}
          onResend={() => sendOtp(true)}
          resending={resending}
        />
      </AuthLayout>
    );
  }

  // --- Formulário de cadastro ---
  return (
    <AuthLayout
      icon={UserPlus}
      title="Crie sua conta"
      subtitle="Cadastre-se para começar"
      footer={
        <>
          Já tem uma conta?{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="whatsapp"
                type="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {otpEnabled
                ? "Enviaremos um código de verificação para este número via WhatsApp."
                : "Usado para identificar seus pedidos e para contato."}
            </p>
          </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || checkingOtp}>
          {loading || checkingOtp ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {otpEnabled ? "Enviando código..." : "Criando conta..."}
            </>
          ) : (
            otpEnabled ? "Enviar código WhatsApp" : "Criar conta"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}