"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Shield,
} from "lucide-react";
import { DicebearAvatar } from "@/components/dicebear-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  const avatarSeeds = useMemo(
    () => [
      "rio",
      "nube",
      "sol",
      "roble",
      "luna",
      "montana",
      "mar",
      "brisa",
      "lucero",
      "cielo",
      "palma",
      "oro",
      "pino",
      "arena",
      "fuego",
      "alba",
      "hoja",
      "delta",
      "cobre",
      "sal",
      "piedra",
      "lago",
      "campo",
      "noche",
      "luz",
      "valle",
      "paz",
      "tierra",
      "aurora",
      "viento",
    ],
    [],
  );

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
  const avatarSeed =
    (user.user_metadata?.avatar_seed as string | undefined) ||
    user.id ||
    displayName;

  async function handleAvatarSelect(seed: string) {
    if (isUpdatingAvatar) return;
    if (user.user_metadata?.avatar_seed === seed) return;

    setIsUpdatingAvatar(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_seed: seed },
      });

      if (error || !data.user) {
        throw error || new Error("No se pudo actualizar el avatar.");
      }

      setUser(data.user);
      pushToast({
        title: "Avatar actualizado",
        description: "Tu nuevo avatar ya está listo.",
      });
      setIsAvatarDialogOpen(false);
    } catch {
      pushToast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el avatar. Intenta de nuevo.",
      });
    } finally {
      setIsUpdatingAvatar(false);
    }
  }

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
              <div className="relative mb-4 h-28 w-28">
                <div className="h-28 w-28 rounded-full border border-neutral-900 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={displayName}
                      className="h-28 w-28 rounded-full object-cover"
                    />
                  ) : (
                    <DicebearAvatar
                      seed={avatarSeed}
                      alt={displayName}
                      className="h-28 w-28"
                  />
                  )}
                </div>
                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-neutral-900 text-white shadow-md transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:border-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                      aria-label="Editar avatar"
                      disabled={isUpdatingAvatar}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[92vw] max-w-sm rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Elige tu avatar</DialogTitle>
                      <DialogDescription>
                        Selecciona un estilo de avatar para tu perfil.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-6 gap-3 pt-2">
                      {avatarSeeds.map((seed) => {
                        const isSelected =
                          (user.user_metadata?.avatar_seed as string | undefined) === seed;
                        return (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => handleAvatarSelect(seed)}
                            disabled={isUpdatingAvatar}
                            className={`h-11 w-11 rounded-full border transition-colors ${
                              isSelected
                                ? "border-neutral-900"
                                : "border-neutral-200 hover:border-neutral-400"
                            } ${isUpdatingAvatar ? "opacity-60" : ""}`}
                            aria-label={`Elegir avatar ${seed}`}
                          >
                            <DicebearAvatar
                              seed={seed}
                              alt={`Avatar ${seed}`}
                              size={44}
                              className="h-11 w-11"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
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
