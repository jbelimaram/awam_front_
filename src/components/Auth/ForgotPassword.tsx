import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import AuthLayout from './AuthLayout';
import Button from '../Common/Button';
import Input from '../Common/Input';
import {
  forgotPasswordEmailSchema,
  resetPasswordSchema,
  type ForgotPasswordEmailValues,
  type ResetPasswordFormValues,
} from '../../utils/schemas';

export type ResetLinkStatus = 'checking' | 'valid' | 'invalid';

/** Secondes restantes avant la date d'expiration renvoyée par le back. */
function computeSecondsLeft(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.round(ms / 1000));
}

interface ForgotPasswordProps {
  onSubmitEmail: (email: string) => void;
  onGoogleContinue: () => void;
  onSubmitNewPassword: (data: { password: string; confirmPassword: string }) => void;
  onNavigateToLogin: () => void;
  step: 'request' | 'reset';
  isSubmitting: boolean;
  expiresAt?: string | null;
  linkStatus?: ResetLinkStatus;
}

export default function ForgotPassword({
  onSubmitEmail,
  onGoogleContinue,
  onSubmitNewPassword,
  onNavigateToLogin,
  step,
  isSubmitting,
  expiresAt = null,
  linkStatus = 'checking',
}: ForgotPasswordProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(expiresAt));

  // Compte à rebours recalculé chaque seconde à partir de la vraie date
  // d'expiration fournie par le back.
  useEffect(() => {
    setSecondsLeft(computeSecondsLeft(expiresAt));
    if (step !== 'reset' || linkStatus !== 'valid' || !expiresAt) return;

    const timer = setInterval(() => {
      const left = computeSecondsLeft(expiresAt);
      setSecondsLeft(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, linkStatus, expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isChecking = linkStatus === 'checking';
  const isInvalid = linkStatus === 'invalid';
  const isExpired = isInvalid || (linkStatus === 'valid' && secondsLeft <= 0);
  const isUrgent = isExpired || (linkStatus === 'valid' && secondsLeft <= 60);

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<ForgotPasswordEmailValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submitEmail = (data: ForgotPasswordEmailValues) => {
    onSubmitEmail(data.email);
  };

  const submitReset = (data: ResetPasswordFormValues) => {
    onSubmitNewPassword(data);
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-white text-center mb-6">AWAM</h1>

      {step === 'request' && (
        <>
          <h2 className="text-lg font-medium text-white text-center mb-2">
            Mot de passe oublié ?
          </h2>
          <p className="text-xs text-white/70 text-center mb-6 leading-relaxed">
            Saisissez votre adresse e-mail, nous vous enverrons un lien de
            réinitialisation.
          </p>

          <form onSubmit={handleEmailSubmit(submitEmail)} noValidate>
            <Input
              id="forgot-email"
              label="Adresse e-mail"
              type="email"
              error={emailErrors.email?.message}
              disabled={isSubmitting}
              {...registerEmail('email')}
            />

            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Envoyer le lien
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs text-white/60">ou</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <Button variant="google" onClick={onGoogleContinue} disabled={isSubmitting}>
            Continuer avec Google
          </Button>
        </>
      )}

      {step === 'reset' && (
        <>
          <h2 className="text-lg font-medium text-white text-center mb-2">
            Créer un nouveau mot de passe
          </h2>
          <p className={`text-center text-xs mb-6 ${isUrgent ? 'text-erreur font-semibold' : 'text-white/60'}`}>
            {isChecking
              ? '⏱️ Vérification du lien…'
              : isInvalid
              ? '⏱️ Ce lien est invalide ou a expiré, veuillez refaire une demande.'
              : isExpired
              ? '⏱️ Ce lien a expiré, veuillez refaire une demande.'
              : `⏱️ Ce lien expire dans ${timeDisplay}`}
          </p>

          <form onSubmit={handleResetSubmit(submitReset)} noValidate>
            <Input
              id="reset-password"
              label="Nouveau mot de passe"
              type="password"
              error={resetErrors.password?.message}
              disabled={isSubmitting || isExpired || isChecking}
              {...registerReset('password')}
            />

            <Input
              id="reset-confirm-password"
              label="Confirmer le mot de passe"
              type="password"
              error={resetErrors.confirmPassword?.message}
              disabled={isSubmitting || isExpired || isChecking}
              {...registerReset('confirmPassword')}
            />

            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isExpired || isChecking}>
              Réinitialiser le mot de passe
            </Button>
          </form>
        </>
      )}

      <p className="text-center text-xs text-white/70 mt-6">
        Vous vous souvenez de votre mot de passe ?{' '}
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="text-menthe hover:underline"
        >
          Se connecter
        </button>
      </p>
    </AuthLayout>
  );
}