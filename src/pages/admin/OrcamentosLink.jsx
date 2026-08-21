import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AdminPageTitle, Loading, Field, inputCls } from '@/components/admin/ui';
import { generateToken } from '@/lib/quoteUtils';
import { Copy, Check, Share2, QrCode, ExternalLink, RefreshCw, Save, Loader2, Eye, Send, RotateCcw } from 'lucide-react';

export default function OrcamentosLink() {
  const [link, setLink] = useState(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [origin, setOrigin] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.ShareLink.list().then((d) => {
    if (d[0]) { setLink(d[0]); setMessage(d[0].message || ''); }
  });

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, []);

  const url = useMemo(() => (link?.token && origin ? `${origin}/solicitar-cadeiazinha?s=${link.token}` : ''), [link?.token, origin]);

  const filledMessage = useMemo(() => (message ? message.replace(/\{url\}/g, url) : url), [message, url]);

  const saveMsg = async () => {
    setSaving(true);
    try { await base44.entities.ShareLink.update(link.id, { message }); alert('Mensagem salva!'); } catch { alert('Erro'); } finally { setSaving(false); }
  };

  const toggleActive = async (active) => {
    await base44.entities.ShareLink.update(link.id, { active });
    load();
  };

  const regenerate = async () => {
    if (!confirm('Gerar um novo link? O link atual deixará de funcionar e os contadores serão zerados.')) return;
    const token = generateToken();
    await base44.entities.ShareLink.update(link.id, { token, visits: 0, shares: 0 });
    load();
  };

  const resetStats = async () => {
    if (!confirm('Zerar todas as estatísticas do link?')) return;
    await base44.entities.ShareLink.update(link.id, { visits: 0, shares: 0 });
    load();
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const shareWhats = () => { window.open(`https://wa.me/?text=${encodeURIComponent(filledMessage)}`, '_blank'); trackShare(); };

  const trackShare = async () => {
    if (link?.token) await base44.entities.ShareLink.update(link.id, { shares: (link.shares || 0) + 1 });
  };

  const qrSrc = url ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}` : '';

  if (!link) return <Loading />;

  return (
    <div>
      <AdminPageTitle title="Link compartilhável" subtitle="Compartilhe o link do formulário com seus clientes." />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Share2 className="h-5 w-5" /></div>
            <div>
              <h3 className="font-display text-base">Link do formulário</h3>
              <p className="text-sm text-muted-foreground">Ative, compartilhe ou regenere o link.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${link.active ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${link.active ? 'bg-green-600' : 'bg-muted-foreground'}`} />
              {link.active ? 'Ativo' : 'Desativado'}
            </span>
            <button onClick={() => toggleActive(!link.active)} className={`relative h-6 w-11 rounded-full transition ${link.active ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${link.active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Acessos</div>
            <div className="mt-1 text-2xl font-semibold">{link.visits || 0}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Send className="h-3.5 w-3.5" /> Compartilhamentos</div>
            <div className="mt-1 text-2xl font-semibold">{link.shares || 0}</div>
          </div>
          <div className="flex items-end justify-end">
            <button onClick={resetStats} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Zerar contadores
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={url} readOnly className={`${inputCls} font-mono text-xs`} />
          <div className="flex flex-wrap gap-2">
            <button onClick={copyUrl} disabled={!link.active} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar'}
            </button>
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
              <ExternalLink className="h-4 w-4" /> Abrir
            </a>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={shareWhats} disabled={!link.active} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40">
            <Share2 className="h-4 w-4" /> WhatsApp
          </button>
          <button onClick={() => setShowQr(!showQr)} disabled={!link.active} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40">
            <QrCode className="h-4 w-4" /> {showQr ? 'Ocultar QR' : 'QR Code'}
          </button>
          <button onClick={regenerate} className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
            <RefreshCw className="h-4 w-4" /> Regenerar link
          </button>
        </div>

        {showQr && qrSrc && (
          <div className="mt-4">
            <img src={qrSrc} alt="QR code" className="rounded-lg border bg-white p-2" width={240} height={240} />
          </div>
        )}

        <div className="mt-6">
          <Field label="Mensagem de compartilhamento" hint="Use {url} para inserir o link." />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={`${inputCls} mt-1`} />
          <div className="mt-3 flex justify-end">
            <button onClick={saveMsg} disabled={saving} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar mensagem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}