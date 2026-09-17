import { createContext, ReactNode, useCallback, useState } from 'react';

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

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, message: string, duration = 3000) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, variant, message }]);
      if (variant !== 'loading') {
        setTimeout(() => dismissToast(id), duration);
      }
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