"use client";
import * as React from 'react';
import { X } from 'lucide-react';

interface ToastAction { label: string; onClick: () => void; }
export interface ToastItem { id?: string; title: string; description?: string; action?: ToastAction; }

interface ToastContextValue { pushToast: (t: ToastItem) => void; }
const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: React.PropsWithChildren) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  function pushToast(t: ToastItem) {
    const id = t.id || Math.random().toString(36).slice(2);
    setToasts(x => [...x, { ...t, id }]);
    setTimeout(()=> setToasts(x => x.filter(tt => tt.id !== id)), 6000);
  }
  function dismiss(id: string) { setToasts(ts => ts.filter(t=>t.id!==id)); }
  return <ToastContext.Provider value={{ pushToast }}>
    {children}
    <div className="fixed z-50 bottom-4 right-4 space-y-2 w-64" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium leading-tight">{t.title}</p>
              {t.description && <p className="text-xs mt-1 text-neutral-600 dark:text-neutral-400">{t.description}</p>}
            </div>
            <button aria-label="Dismiss" onClick={()=>t.id && dismiss(t.id)} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"><X size={14} /></button>
          </div>
          {t.action && <div className="mt-2"><button onClick={()=>{ t.action?.onClick(); t.id && dismiss(t.id!); }} className="text-xs font-medium underline hover:no-underline">{t.action.label}</button></div>}
        </div>
      ))}
    </div>
  </ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  return ctx || { pushToast: () => {} }; // graceful no-op if provider not yet mounted during module eval
}
