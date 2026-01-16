"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Target, LogIn } from 'lucide-react';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { Button } from '@/components/ui/button';
import { getMemorizedPassages } from '@/lib/review';
import { loadProgress, onProgressUpdated } from '@/lib/storage';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function HomePage() {
  const router = useRouter();
  const [memorizedCount, setMemorizedCount] = React.useState(0);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const lastSyncRef = React.useRef<number | null>(null);
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuario';
  const avatarSeed =
    (user?.user_metadata?.avatar_seed as string | undefined) ||
    user?.id ||
    displayName;

  React.useEffect(() => {
    try {
      const progress = loadProgress();
      const memorizedPassages = getMemorizedPassages(progress);
      setMemorizedCount(memorizedPassages.length);
    } catch {
      setMemorizedCount(0);
    }
  }, []);

  React.useEffect(() => {
    return onProgressUpdated(() => {
      try {
        const progress = loadProgress();
        const memorizedPassages = getMemorizedPassages(progress);
        setMemorizedCount(memorizedPassages.length);
      } catch {
        setMemorizedCount(0);
      }
    });
  }, []);

  React.useEffect(() => {
    const supabase = getSupabaseClient();

    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          lastSyncRef.current = Date.now();
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        lastSyncRef.current = Date.now();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
      {/* Auth header */}
      <header className="flex justify-end p-4">
        {isLoading ? (
          <div className="h-9 w-9 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse" />
        ) : user ? (
          <Link
            href="/profile"
            className="flex items-center justify-center h-11 w-11 rounded-full border border-neutral-900/80 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors overflow-hidden animate-in zoom-in-50 duration-300 ease-out hover:scale-105"
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <DicebearAvatar
                seed={avatarSeed}
                alt={displayName}
                size={44}
                className="h-11 w-11"
              />
            )}
          </Link>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4 mr-1.5" />
              Iniciar sesión
            </Link>
          </Button>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
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
              Memoriza tu primer pasaje para habilitar Repaso
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
