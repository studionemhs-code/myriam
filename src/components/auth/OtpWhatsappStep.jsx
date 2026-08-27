import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MessageCircle, RotateCw, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invokeEdgeFunction } from '@/api/supabase';

export default function OtpWhatsappStep({ email, whatsappNumber, onVerified, onBack, onResend, resending }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    setError('');
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
    // Auto-submit when all 6 digits filled
    if (val && idx === 5) {
      const full = next.join('');
      if (full.length === 6) submit(full);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = pasted.split('');
    while (next.length < 6) next.push('');
    setCode(next);
    if (pasted.length === 6) submit(pasted);
  };

  const submit = async (fullCode) => {
    if (fullCode.length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      const { data } = await invokeEdgeFunction('verifyWhatsappOtp', { email, otp_code: fullCode });
      if (data?.verified) {
        onVerified();
      } else {
        setError(data?.error || 'Código inválido.');
        if (data?.attempts_remaining != null) setAttemptsRemaining(data.attempts_remaining);
        setCode(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    } catch (err) {
      setError(err.message || 'Erro ao verificar código.');
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const maskedNumber = whatsappNumber
    ? `+${whatsappNumber.slice(0, 2)} ••• ••• ${whatsappNumber.slice(-4)}`
    : '';

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
          <MessageCircle className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="font-display text-lg">Verifique seu WhatsApp</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviamos um código de 6 dígitos para
        </p>
        <p className="font-medium text-foreground">{maskedNumber}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
          {attemptsRemaining != null && attemptsRemaining > 0 && (
            <span className="block text-xs mt-0.5 opacity-80">{attemptsRemaining} tentativa(s) restante(s)</span>
          )}
        </div>
      )}

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, idx) => (
          <Input
            key={idx}
            ref={(el) => (inputsRef.current[idx] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            disabled={verifying}
            className="h-14 w-12 rounded-xl text-center text-xl font-semibold"
          />
        ))}
      </div>

      <Button
        onClick={() => submit(code.join(''))}
        disabled={verifying || code.join('').length !== 6}
        className="w-full h-12 font-medium"
      >
        {verifying ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verificando...</>
        ) : (
          <><Check className="w-4 h-4 mr-2" /> Confirmar código</>
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Alterar número
        </button>
        <button
          onClick={onResend}
          disabled={resending}
          className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Reenviar código
        </button>
      </div>
    </div>
  );
}