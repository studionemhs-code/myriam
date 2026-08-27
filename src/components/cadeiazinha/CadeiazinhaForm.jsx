import React, { useState } from 'react';
import { Camera, Loader2, Save, X, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CadeiazinhaForm({ user, onSaved, onCancel }) {
  const [uniqueCode, setUniqueCode] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push(file_url);
      }
      setPhotos((p) => [...p, ...uploaded]);
    } catch {
      setError('Erro ao enviar fotos.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!uniqueCode.trim()) { setError('Informe o código único da compra.'); return; }
    if (photos.length === 0) { setError('Adicione pelo menos uma foto da cadeiazinha.'); return; }
    setSaving(true);
    try {
      await base44.entities.Cadeiazinha.create({
        user_id: user.id,
        unique_code: uniqueCode.trim(),
        seller_name: sellerName.trim(),
        purchase_date: purchaseDate || null,
        receipt_date: receiptDate || null,
        photos
      });
      onSaved();
    } catch (err) {
      setError(err.message || 'Erro ao cadastrar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-lg">Cadastrar minha cadeiazinha Theotokos</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {/* Fotos */}
      <div className="mb-5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Fotos do produto</span>
        <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((url, idx) => (
            <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => removePhoto(idx)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition hover:border-gold/50 hover:text-gold">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Camera className="h-5 w-5" /><Plus className="h-4 w-4" /></>}
            <span className="text-[10px]">Adicionar</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(Array.from(e.target.files))} disabled={uploading} />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Tire fotos ou faça upload das imagens do produto recebido.</p>
      </div>

      {/* Dados */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Código único de compra *</span>
          <input type="text" value={uniqueCode} onChange={(e) => setUniqueCode(e.target.value)} placeholder="Ex: THK-2026-0001" className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm" required />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Nome do vendedor Theotokos</span>
          <input type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Nome do vendedor" className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Data da compra</span>
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Data do recebimento</span>
          <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm" />
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">Cancelar</button>
        <button type="submit" disabled={saving || uploading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-deep disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Cadastrando...' : 'Cadastrar cadeiazinha'}
        </button>
      </div>
    </form>
  );
}