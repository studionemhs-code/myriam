import React, { useState } from 'react';
import { FileDown, ShieldAlert, Loader2, ChevronLeft, Tag, User, CalendarDays, PackageCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateWarrantyPdf } from '@/lib/generateWarrantyPdf';
import WarrantyClaimDialog from './WarrantyClaimDialog';

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d;
  try { return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return '—'; }
};

export default function CadeiazinhaViewer({ cadeiazinha, user, onBack, onAddedNew }) {
  const [showClaim, setShowClaim] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [settings, setSettings] = useState(null);

  const loadSettings = async () => {
    if (settings) return settings;
    const list = await base44.entities.WarrantySettings.list('-created_date', 1);
    const s = list[0] || {
      cert_title: 'Certificado de Garantia Vitalícia',
      cert_body_text: 'Certificamos que {nome} é detentor(a) da cadeiazinha Theotokos de código {codigo}, adquirida com {vendedor} em {data_compra} e recebida em {data_recebimento}, coberta pela Garantia Vitalícia Theotokos.',
      issuer_name: 'Theotokos',
      primary_color: '#673ab7',
      accent_color: '#c9a14a',
      border_style: 'classic',
      footer_text: 'Theotokos · Garantia Vitalícia'
    };
    setSettings(s);
    return s;
  };

  const handleDownload = async (type) => {
    setDownloading(type);
    try {
      const s = await loadSettings();
      const issueDate = new Date().toISOString().slice(0, 10);
      const doc = await generateWarrantyPdf({
        settings: s,
        cadeiazinha,
        userName: user.display_name || user.full_name || '—',
        issueDate
      });
      // type === 'cert' → apenas página 1; type === 'term' → apenas página 2; type === 'all' → ambas
      const fileName = `Theotokos_${type === 'term' ? 'Termo' : type === 'cert' ? 'Certificado' : 'Garantia'}_${cadeiazinha.unique_code || 'cadeiazinha'}.pdf`;
      if (type === 'cert') {
        // Mantém só a página 1 (certificado)
        while (doc.getNumberOfPages() > 1) doc.deletePage(doc.getNumberOfPages());
      } else if (type === 'term') {
        // Mantém só a página 2 (termo), se existir
        if (doc.getNumberOfPages() > 1) doc.deletePage(1);
      }
      doc.save(fileName);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || 'erro'));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Galeria de fotos */}
      {cadeiazinha.photos?.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cadeiazinha.photos.map((url, idx) => (
            <div key={idx} className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              <img src={url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Dados cadastrados */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-display text-lg">Dados da cadeiazinha</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <Tag className="h-4 w-4 text-gold" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Código único</p>
              <p className="text-sm font-medium">{cadeiazinha.unique_code || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <User className="h-4 w-4 text-gold" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendedor</p>
              <p className="text-sm font-medium">{cadeiazinha.seller_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <CalendarDays className="h-4 w-4 text-gold" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data da compra</p>
              <p className="text-sm font-medium">{fmtDate(cadeiazinha.purchase_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <PackageCheck className="h-4 w-4 text-gold" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data do recebimento</p>
              <p className="text-sm font-medium">{fmtDate(cadeiazinha.receipt_date)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Downloads */}
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
        <h3 className="mb-1 font-display text-base text-gold">Termo e Certificado de Garantia Vitalícia</h3>
        <p className="mb-4 text-xs text-muted-foreground">Baixe os documentos oficiais da sua garantia vitalícia.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleDownload('all')} disabled={!!downloading} className="flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep disabled:opacity-50">
            {downloading === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Baixar Termo + Certificado
          </button>
          <button onClick={() => handleDownload('term')} disabled={!!downloading} className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
            {downloading === 'term' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Só o Termo
          </button>
          <button onClick={() => handleDownload('cert')} disabled={!!downloading} className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
            {downloading === 'cert' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Só o Certificado
          </button>
        </div>
      </div>

      {/* Acionar garantia */}
      <button onClick={() => setShowClaim(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-destructive/30 bg-destructive/5 px-5 py-3.5 text-sm font-medium text-destructive transition hover:bg-destructive/10">
        <ShieldAlert className="h-5 w-5" /> Acionar Garantia Vitalícia
      </button>

      {showClaim && (
        <WarrantyClaimDialog
          cadeiazinha={cadeiazinha}
          user={user}
          onClose={() => setShowClaim(false)}
          onSubmitted={() => { setShowClaim(false); onBack(); }}
        />
      )}
    </div>
  );
}