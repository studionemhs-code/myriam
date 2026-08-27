import React, { useState } from 'react';
import { Loader2, ShieldAlert, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function WarrantyClaimDialog({ cadeiazinha, user, onClose, onSubmitted }) {
  const [problemDescription, setProblemDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!problemDescription.trim()) { setError('Descreva o problema encontrado.'); return; }
    setSaving(true);
    try {
      // 1. Cria o chamado
      await base44.entities.WarrantyClaim.create({
        cadeiazinha_id: cadeiazinha.id,
        user_id: user.id,
        problem_description: problemDescription.trim(),
        observations: observations.trim()
      });
      // 2. Notifica os admins (best-effort)
      try {
        await base44.functions.invoke('notifyAdmins', {
          category: 'novidades',
          title: 'Novo chamado de Garantia Vitalícia',
          body: `${user.display_name || user.full_name || 'Usuário'} acionou a garantia da cadeiazinha (código: ${cadeiazinha.unique_code || '—'}).`,
          link: '/admin/garantia',
          related_id: cadeiazinha.id
        });
      } catch { /* notificação falha silenciosamente — o chamado já foi criado */ }
      onSubmitted();
    } catch (err) {
      setError(err.message || 'Erro ao enviar chamado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-gold" /> Acionar Garantia Vitalícia</DialogTitle>
          <DialogDescription>Descreva o problema encontrado com sua cadeiazinha para que nossa equipe possa atendê-lo.</DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Problema encontrado *</span>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              rows={5}
              placeholder="Ex: A corrente apresentou oxidação, o fecho quebrou, etc."
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Observações adicionais</span>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Informações complementares que julgar relevantes"
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-gold text-deep hover:bg-gold/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {saving ? 'Enviando...' : 'Enviar chamado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}