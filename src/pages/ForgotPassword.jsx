import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("request-password-reset", { identifier, channel });
      setSent(true);
    } catch (err) {
      setError(err.message || "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Redefinir senha"
      subtitle="Escolha como receber o link de redefinição"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-foreground text-center">
          {channel === "whatsapp"
            ? "Se existir uma conta com esses dados, você receberá o link de redefinição no WhatsApp em breve."
            : "Se existir uma conta com esse e-mail, você receberá o link de redefinição em breve."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition ${
                channel === "whatsapp" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition ${
                channel === "email" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <Mail className="w-4 h-4" /> E-mail
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifier">
              {channel === "whatsapp" ? "E-mail ou WhatsApp" : "Endereço de e-mail"}
            </Label>
            <div className="relative">
              {channel === "whatsapp" ? (
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              )}
              <Input
                id="identifier"
                type={channel === "email" ? "email" : "text"}
                autoComplete={channel === "email" ? "email" : "tel"}
                autoFocus
                placeholder={channel === "whatsapp" ? "seu@email.com ou (11) 99999-9999" : "seu@email.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              `Enviar link por ${channel === "whatsapp" ? "WhatsApp" : "e-mail"}`
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}