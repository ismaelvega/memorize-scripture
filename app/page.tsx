"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMemorizedPassages } from '@/lib/review';
import { loadProgress } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();
  const [memorizedCount, setMemorizedCount] = React.useState(0);

  React.useEffect(() => {
    try {
      const progress = loadProgress();
      const memorizedPassages = getMemorizedPassages(progress);
      setMemorizedCount(memorizedPassages.length);
    } catch {
      setMemorizedCount(0);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 bg-white dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
            Memoriza Su Palabra
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Practica y repasa pasajes bíblicos
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/practice')}
            className="w-full h-16 rounded-2xl text-lg font-medium flex items-center justify-center gap-3 shadow-sm"
          >
            <Sparkles className="h-6 w-6" />
            Práctica
          </Button>

          <Button
            onClick={() => router.push('/repaso')}
            variant="outline"
            disabled={memorizedCount === 0}
            className="w-full h-16 rounded-2xl text-lg font-medium flex items-center justify-center gap-3"
          >
            <Target className="h-6 w-6" />
            Repaso
            {memorizedCount > 0 && (
              <span className="ml-auto text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
                {memorizedCount}
              </span>
            )}
          </Button>
        </div>

        {memorizedCount === 0 && (
          <p className="text-center text-xs text-neutral-400 dark:text-neutral-600">
            Completa los 4 modos para desbloquear el repaso
          </p>
        )}
      </div>
    </div>
  );
}
