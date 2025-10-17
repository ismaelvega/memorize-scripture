"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  onReduce: () => void;
  defaultDontShow?: boolean;
}

export const LargeSelectionDialog: React.FC<Props> = ({ open, onClose, onContinue, onReduce, defaultDontShow = false }) => {
  const [dontShow, setDontShow] = React.useState<boolean>(defaultDontShow);

  React.useEffect(() => {
    setDontShow(defaultDontShow);
  }, [defaultDontShow]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selección larga</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-neutral-700 dark:text-neutral-300">
          Has seleccionado un pasaje largo. Practicar pasajes muy extensos puede hacer que la práctica sea larga y afectar la transcripción y la calificación. ¿Deseas continuar con esta selección?
        </div>
        <div className="flex items-center gap-3 mt-2">
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            No volver a mostrar esta advertencia
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onReduce}>Reducir selección</Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onContinue()}>Continuar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
