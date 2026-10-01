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

const RESET_DURATION_SECONDS = 5 * 60;

interface ForgotPasswordProps {
  onSubmitEmail: (email: string) => void;
  onGoogleContinue: () => void;
  onSubmitNewPassword: (data: { password: string; confirmPassword: string }) => void;
  onNavigateToLogin: () => void;
  step: 'request' | 'reset';
  isSubmitting: boolean;
}

export default function ForgotPassword({
  onSubmitEmail,
  onGoogleContinue,
  onSubmitNewPassword,
  onNavigateToLogin,
  step,
  isSubmitting,
}: ForgotPasswordProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESET_DURATION_SECONDS);

  useEffect(() => {
    if (step !== 'reset') return;
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isExpired = secondsLeft <= 0;

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
          <p className={`text-center text-xs mb-6 ${secondsLeft <= 60 ? 'text-erreur font-semibold' : 'text-white/60'}`}>
            {isExpired ? '⏱️ Ce lien a expiré, veuillez refaire une demande.' : `⏱️ Ce lien expire dans ${timeDisplay}`}
          </p>

          <form onSubmit={handleResetSubmit(submitReset)} noValidate>
            <Input
              id="reset-password"
              label="Nouveau mot de passe"
              type="password"
              error={resetErrors.password?.message}
              disabled={isSubmitting || isExpired}
              {...registerReset('password')}
            />

            <Input
              id="reset-confirm-password"
              label="Confirmer le mot de passe"
              type="password"
              error={resetErrors.confirmPassword?.message}
              disabled={isSubmitting || isExpired}
              {...registerReset('confirmPassword')}
            />

            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isExpired}>
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