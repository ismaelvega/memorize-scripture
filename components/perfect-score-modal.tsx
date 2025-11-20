"use client";
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

type PerfectModalData = { remaining: number; isCompleted: boolean } | null;

interface PerfectScoreModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: PerfectModalData;
  modeLabel: string;
  perfectCount: number;
}

export const PerfectScoreModal: React.FC<PerfectScoreModalProps> = ({ isOpen, onOpenChange, data, modeLabel, perfectCount }) => {
  // Only show modal when perfectCount is 3 or less
  if (perfectCount > 3) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md !w-[calc(100%-2rem)] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            ¡Intento perfecto!
          </DialogTitle>
          <DialogDescription>
            {data?.isCompleted ? (
              <div className="space-y-2 text-sm">
                <p className="text-green-700 dark:text-green-300 font-semibold">🎉 ¡Has completado el {modeLabel}!</p>
                <p className="text-neutral-700 dark:text-neutral-300">Lograste 3 intentos perfectos. Ahora puedes practicar otros modos para dominar completamente este pasaje.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-neutral-700 dark:text-neutral-300">¡Excelente trabajo! Obtuviste el <span className="font-semibold">100%</span> de precisión.</p>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {data?.remaining === 2 && 'Te faltan 2 intentos perfectos más para completar este modo.'}
                  {data?.remaining === 1 && '¡Solo te falta 1 intento perfecto más para completar este modo!'}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PerfectScoreModal;
