"use client"
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Toast state store (shadcn-style minimal)
type ToastAction = { label: string; onClick: () => void }
type ToastItem = { id: string; title: string; description?: string; action?: ToastAction; variant?: "default" | "destructive" }
type ToastState = { toasts: ToastItem[] }

const listeners = new Set<(state: ToastState) => void>()
let memoryState: ToastState = { toasts: [] }

const TOAST_DURATION_MS = 6000
const REMOVE_DELAY_MS = 350

function genId() { return Math.random().toString(36).slice(2) }

function setState(newState: ToastState) {
  memoryState = newState
  listeners.forEach((l) => l(memoryState))
}

function addToast(t: Omit<ToastItem, "id">) {
  const id = genId()
  const toast: ToastItem = { id, variant: "default", ...t }
  setState({ toasts: [...memoryState.toasts, toast] })
  // Auto remove after duration
  window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
  return id
}

function dismissToast(id: string) {
  // Let Radix close animation play, then remove
  window.setTimeout(() => {
    setState({ toasts: memoryState.toasts.filter((t) => t.id !== id) })
  }, REMOVE_DELAY_MS)
}

export function useToast() {
  const [state, setLocal] = React.useState<ToastState>(memoryState)
  React.useEffect(() => {
    listeners.add(setLocal)
    return () => void listeners.delete(setLocal)
  }, [])
  return {
    // Compat API: existing code expects pushToast({ title, description, action })
    pushToast: (t: { title: string; description?: string; action?: ToastAction; variant?: "default" | "destructive" }) => void addToast(t),
    dismiss: (id: string) => dismissToast(id),
    toasts: state.toasts,
  }
}

// Visual primitives
export function ToastProvider({ children }: React.PropsWithChildren) {
  return (
    <ToastPrimitives.Provider swipeDirection="left">
      {children}
      <Toaster />
    </ToastPrimitives.Provider>
  )
}

function Toaster() {
  const { toasts } = useToast()
  return (
    <ToastPrimitives.Viewport className="fixed bottom-4 left-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
      {toasts.map((t) => (
        <ToastPrimitives.Root key={t.id} duration={TOAST_DURATION_MS} className={cn(
          "group pointer-events-auto relative flex w-full items-start justify-between gap-2 overflow-hidden rounded-md border p-3 shadow bg-white text-foreground border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900",
          t.variant === "destructive" && "border-red-200/60 bg-red-50 dark:border-red-900/50 dark:bg-red-950"
        )}>
          <div className="grid gap-1">
            {t.title && <div className="font-medium leading-tight text-sm">{t.title}</div>}
            {t.description && <div className="text-xs text-neutral-600 dark:text-neutral-400">{t.description}</div>}
            {t.action && (
              <button
                className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline"
                onClick={() => {
                  try { t.action?.onClick() } finally { dismissToast(t.id) }
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
          <ToastPrimitives.Close aria-label="Cerrar notificación" className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
            <X size={14} />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
    </ToastPrimitives.Viewport>
  )
}
