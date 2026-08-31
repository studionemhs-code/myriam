import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/marianDates';

export default function RenewalConfirmDialog({ open, onOpenChange, originalDate, newDate, onConfirm, loading }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-gold/40 bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Você já é consagrado</AlertDialogTitle>
          <AlertDialogDescription>
            Sua consagração está registrada em{' '}
            <span className="font-medium text-gold">{formatDate(originalDate)}</span> e essa data
            será mantida. A data de{' '}
            <span className="font-medium text-gold">{formatDate(newDate)}</span> será registrada
            como <span className="font-medium">renovação</span> da sua consagração.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading} className="bg-gold text-deep hover:bg-gold/90">
            {loading ? 'Registrando...' : 'Registrar renovação'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}