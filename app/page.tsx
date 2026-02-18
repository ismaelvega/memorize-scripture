"use client";
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Target, LogIn } from 'lucide-react';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { resolveUserAvatarPresentation } from '@/lib/profile-avatar';
import { Button } from '@/components/ui/button';
import { getMemorizedPassages } from '@/lib/review';
import { loadProgress, onProgressUpdated } from '@/lib/storage';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function HomePage() {
  const router = useRouter();
  const [memorizedCount, setMemorizedCount] = React.useState(0);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<{
    avatar_seed?: string | null;
    avatar_url?: string | null;
    avatar_preference?: 'photo' | 'avatar' | null;
    display_name?: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const lastSyncRef = React.useRef<number | null>(null);
  const { displayName, avatarSeed, avatarUrl, shouldUsePhoto } = resolveUserAvatarPresentation({
    profile,
    user,
  });

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

    async function loadProfile(nextUser: User | null) {
      if (!nextUser) {
        setProfile(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_seed, avatar_url, avatar_preference, display_name')
        .eq('user_id', nextUser.id)
        .maybeSingle();
      setProfile(profile ?? null);
    }

    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          lastSyncRef.current = Date.now();
        }
        await loadProfile(user ?? null);
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        lastSyncRef.current = Date.now();
      }
      void loadProfile(nextUser);
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
            {shouldUsePhoto ? (
              <img
                src={avatarUrl ?? undefined}
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
            <div className="mx-auto h-16 w-16 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <Image
                src="/logo_png.png"
                alt="Logo Memoriza Su Palabra"
                width={64}
                height={64}
                className="h-16 w-16 object-cover"
                priority
              />
            </div>
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

      <footer className="px-6 pb-6 pt-2">
        <nav className="flex items-center justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <Link href="/politica-de-privacidad" className="hover:text-neutral-800 dark:hover:text-neutral-200">
            Política de Privacidad
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terminos-de-servicio" className="hover:text-neutral-800 dark:hover:text-neutral-200">
            Términos de Servicio
          </Link>
        </nav>
      </footer>
    </div>
  );
}
