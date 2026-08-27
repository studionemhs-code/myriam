import React, { useState } from 'react';
import { Loader2, Send, CheckCircle2, FlaskConical, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/api/supabase/client';

// E-mail interno fixo usado apenas para o teste — funciona como chave que liga
// o envio e a verificação no mesmo registro da tabela whatsapp_otps.
const TEST_EMAIL = 'teste-otp@theotokos.app';

// Chama uma Edge Function e extrai o corpo da resposta mesmo em erros HTTP
// (o supabase.functions.invoke coloca o Response no error.context).
async function callFn(name, payload) {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) {
    try {
      const body = await error.context?.json();
      if (body) return body;
    } catch { /* sem corpo JSON */ }
    return { error: error.message || 'Erro ao chamar a função' };
  }
  return data;
}

export default function OtpTestPanel({ enabled }) {
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  const sendTest = async () => {
    setSending(true);
    setSendResult(null);
    setVerifyResult(null);
    try {
      const res = await callFn('send-whatsapp-otp', {
        email: TEST_EMAIL,
        whatsapp_number: number.replace(/\D/g, ''),
        full_name: 'Teste Admin'
      });
      setSendResult(res);
    } catch (err) {
      setSendResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  const verifyTest = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await callFn('verify-whatsapp-otp', {
        email: TEST_EMAIL,
        otp_code: code.trim()
      });
      setVerifyResult(res);
    } catch (err) {
      setVerifyResult({ error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  const canSend = enabled && number.replace(/\D/g, '').length >= 8 && !sending;
  const canVerify = sendResult?.enabled && sendResult?.sent && code.length === 6 && !verifying;

  return (
    <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h2 className="font-display text-base">Painel de Teste</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Dispara um código real para o número informado (usando o webhook configurado acima) e valida o código recebido,
        confirmando que o fluxo completo de envio e verificação funciona.
      </p>

      {!enabled && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Ative e salve a verificação nas configurações acima antes de testar.
        </div>
      )}

      {/* Etapa 1 — Envio */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Número de WhatsApp para teste</span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="5511999998888"
            disabled={!enabled}
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          />
          <span className="mt-1 block text-xs text-muted-foreground">DDI + DDD + número (só dígitos).</span>
        </label>

        <button
          onClick={sendTest}
          disabled={!canSend}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Enviando...' : 'Enviar código de teste'}
        </button>

        {sendResult && <SendResultBox result={sendResult} />}
      </div>

      {/* Etapa 2 — Verificação (só aparece após envio bem-sucedido) */}
      {sendResult?.enabled && sendResult?.sent && (
        <div className="space-y-3 border-t border-border pt-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Código recebido (6 dígitos)</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              disabled={verifying}
              className="mt-1 w-48 rounded-xl border border-input bg-background px-4 py-2.5 text-sm tracking-[0.5em] outline-none focus:border-primary"
            />
          </label>
          <button
            onClick={verifyTest}
            disabled={!canVerify}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {verifying ? 'Verificando...' : 'Verificar código'}
          </button>

          {verifyResult && <VerifyResultBox result={verifyResult} />}
        </div>
      )}
    </div>
  );
}

function SendResultBox({ result }) {
  if (result.error) {
    return <ResultBox tone="red" icon={XCircle} text={result.error} hint="Verifique se a Edge Function send-whatsapp-otp foi publicada no Supabase." />;
  }
  if (result.enabled === false) {
    return <ResultBox tone="amber" icon={AlertTriangle} text="Verificação desativada nas configurações." />;
  }
  if (result.sent) {
    if (result.webhook_ok) {
      return <ResultBox tone="green" icon={CheckCircle2} text={`Webhook respondeu HTTP ${result.webhook_status}. Código gerado e enviado.`} hint="Confira se a mensagem chegou no WhatsApp informado." />;
    }
    if (result.webhook_status) {
      return <ResultBox tone="red" icon={XCircle} text={`Webhook respondeu HTTP ${result.webhook_status} (falha).`} hint="O código foi gerado, mas o webhook pode não ter entregado a mensagem." />;
    }
    if (result.webhook_error) {
      return <ResultBox tone="red" icon={XCircle} text={`Webhook não respondeu: ${result.webhook_error}`} hint="Verifique a URL do webhook e se o serviço externo está acessível." />;
    }
    return <ResultBox tone="green" icon={CheckCircle2} text="Código enviado." hint="Webhook sem detalhe de status — atualize a Edge Function para ver o HTTP status." />;
  }
  return <ResultBox tone="red" icon={XCircle} text="Resposta inesperada do backend." />;
}

function VerifyResultBox({ result }) {
  if (result.verified) {
    return <ResultBox tone="green" icon={CheckCircle2} text="Código válido! Fluxo completo confirmado." hint="O webhook está entregando e a verificação está funcionando." />;
  }
  const hints = [];
  if (result.expired) hints.push('Código expirado.');
  if (result.blocked) hints.push('Bloqueado por muitas tentativas.');
  if (result.attempts_remaining != null) hints.push(`${result.attempts_remaining} tentativa(s) restante(s).`);
  return <ResultBox tone="red" icon={XCircle} text={result.error || 'Código inválido.'} hint={hints.join(' ')} />;
}

function ResultBox({ tone, icon: Icon, text, hint }) {
  const tones = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200'
  };
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${tones[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p>{text}</p>
        {hint && <p className="mt-0.5 text-xs opacity-80">{hint}</p>}
      </div>
    </div>
  );
}