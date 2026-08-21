import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export function useConfirm() {
  const [state, setState] = useState({ open: false });

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, resolve, ...opts });
    });
  }, []);

  const done = (result) => {
    state.resolve?.(result);
    setState({ open: false });
  };

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && done(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title || 'Confirmar ação'}</AlertDialogTitle>
          {state.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => done(false)}>
            {state.cancelLabel || 'Cancelar'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => done(true)}
            className={state.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {state.confirmLabel || 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}