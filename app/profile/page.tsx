"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Loader2, 
  User, 
  Mail, 
  Calendar, 
  LogOut, 
  Shield,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push("/login");
          return;
        }
        
        setUser(user);
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      pushToast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });
      router.push("/");
    } catch {
      pushToast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cerrar sesión. Intenta de nuevo.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const createdAt = user.created_at 
    ? new Date(user.created_at).toLocaleDateString("es", { 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    : null;

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Mi Perfil
          </h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center mb-4">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={displayName}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-neutral-500 dark:text-neutral-400" />
                )}
              </div>

              {/* Name */}
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {displayName}
              </h2>

              {/* Email */}
              <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-1">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>

              {/* Member since */}
              {createdAt && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 mt-2">
                  <Calendar className="h-3 w-3" />
                  Miembro desde {createdAt}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Link 
              href="/profile/change-password"
              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-neutral-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Cambiar contraseña
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            </Link>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-600 dark:text-red-400">
              Zona de peligro
            </CardTitle>
            <CardDescription>
              Acciones irreversibles para tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
