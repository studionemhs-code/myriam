import React, { useState } from 'react';
import { X, Link2, Copy, Check, Loader2, Crown, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AssociationApprovalLinkDialog({ req, onClose, onGenerated }) {
  const [token, setToken] = useState(req.approval_token || '');
  const [link, setLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (req.approval_token) {
      setLink(`${window.location.origin}/aprovacao/${req.approval_token}`);
    }
  }, [req.approval_token]);

  const generate = async () => {
    setGenerating(true);
    try {
      const newToken = crypto.randomUUID();
      await base44.entities.AssociationRequest.update(req.id, { approval_token: newToken });
      setToken(newToken);
      setLink(`${window.location.origin}/aprovacao/${newToken}`);
      onGenerated?.();
    } catch (e) {
      alert('Erro ao gerar link: ' + (e?.message || String(e)));
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            <h3 className="font-display text-lg">Link da Autoridade Certificadora</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 text-sm">
          <p className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-gold" />
            <span className="font-medium">{req.user_name}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{req.user_email}</p>
        </div>

        {!link ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Gere um link secreto e compartilhe com a autoridade certificadora da associação. A autoridade poderá revisar todos os dados, baixar o PDF e aprovar ou rejeitar o ingresso.
            </p>
            <button
              onClick={generate}
              disabled={generating}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-deep disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {generating ? 'Gerando...' : 'Gerar Link Secreto'}
            </button>
          </>
        ) : (
          <>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Link compartilhável</p>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
              <button
                onClick={copy}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${copied ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'}`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              ⚠️ Este link é secreto e permite a aprovação do ingresso. Compartilhe apenas com a autoridade certificadora responsável.
            </p>
            <button onClick={onClose} className="mt-4 w-full rounded-xl border border-border px-4 py-3 text-sm">
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}