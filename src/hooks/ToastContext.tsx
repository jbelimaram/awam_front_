import { createContext, ReactNode, useCallback, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'loading';

export interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (variant: ToastVariant, message: string, duration?: number) => number;
  dismissToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Messages affichés et leur minuterie, pour ne jamais empiler deux fois le même
  const shown = useRef(new Map<string, { id: number; timer?: ReturnType<typeof setTimeout> }>());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    for (const [key, value] of shown.current) {
      if (value.id === id) {
        if (value.timer) clearTimeout(value.timer);
        shown.current.delete(key);
      }
    }
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string, duration = 3000) => {
      const key = `${variant}|${message}`;
      const existing = shown.current.get(key);
      // Le même message est déjà affiché : on prolonge son affichage, sans le dupliquer
      const id = existing ? existing.id : nextId++;
      if (existing?.timer) clearTimeout(existing.timer);
      if (!existing) setToasts((prev) => [...prev, { id, variant, message }]);
      const timer = variant !== 'loading' ? setTimeout(() => dismissToast(id), duration) : undefined;
      shown.current.set(key, { id, timer });
      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}