import { useCallback, useState } from 'react';
import { ApiError } from '../Services/api';
import { useToast } from './useToast';

interface FormStatus {
  isSubmitting: boolean;
}

const initialStatus: FormStatus = { isSubmitting: false };

export function useFormStatus() {
  const [status, setStatus] = useState<FormStatus>(initialStatus);
  const { showToast } = useToast();

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setStatus({ isSubmitting: true });
      try {
        await action();
        setStatus({ isSubmitting: false });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Une erreur est survenue. Veuillez réessayer.';
        showToast('error', message);
        setStatus({ isSubmitting: false });
      }
    },
    [showToast]
  );

  const reset = useCallback(() => setStatus(initialStatus), []);

  return { ...status, run, reset };
}