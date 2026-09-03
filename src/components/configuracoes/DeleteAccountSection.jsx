import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/api/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function DeleteAccountSection({ user }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId: user.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (e) {
      toast({ title: 'Não foi possível excluir a conta', description: e?.message || 'Tente novamente.', variant: 'destructive' });
      setDeleting(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-destructive/30 bg-card p-4">
      <p className="mb-2 flex items-center gap-2 font-display text-lg text-destructive"><AlertTriangle className="h-4 w-4" /> Excluir conta</p>
      <p className="mb-3 text-sm text-muted-foreground">
        Remove permanentemente sua conta e todos os seus dados: reflexões, histórico de consagração, publicações, mensagens, certificados e progresso.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {deleting ? 'Excluindo...' : 'Excluir minha conta'}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sua conta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os seus dados serão apagados definitivamente — reflexões pessoais, histórico e datas de consagração, publicações e comentários no Myriam, mensagens, intenções de oração, certificados e progresso do Caminho. Você será desconectado e não poderá recuperar a conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, excluir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}