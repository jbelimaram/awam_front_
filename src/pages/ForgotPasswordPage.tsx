import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ForgotPassword, { type ResetLinkStatus } from '../components/Auth/ForgotPassword';
import { authService } from '../Services/authService';
import { useFormStatus } from '../hooks/useFormStatus';
import { useToast } from '../hooks/useToast';
import type { ResetPasswordPayload } from '../types/auth';

export default function ForgotPasswordPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const step = token ? 'reset' : 'request';
  const { isSubmitting, run } = useFormStatus();
  const { showToast } = useToast();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<ResetLinkStatus>('checking');

  // À l'ouverture du lien reçu par e-mail : on demande au back la vraie
  // date d'expiration (ou s'il est invalide / déjà utilisé / expiré).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLinkStatus('checking');
    authService
      .getResetTokenExpiry(token)
      .then((data) => {
        if (cancelled) return;
        setExpiresAt(data.expires_at);
        setLinkStatus('valid');
      })
      .catch(() => {
        if (cancelled) return;
        setExpiresAt(null);
        setLinkStatus('invalid');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmitEmail = (email: string) => {
    run(async () => {
      await authService.forgotPassword({ email });
      showToast('success', 'Un lien de réinitialisation vous a été envoyé par e-mail.');
    });
  };

  const handleGoogleContinue = () => {
    authService.loginWithGoogle();
  };

  const handleSubmitNewPassword = (data: ResetPasswordPayload) => {
    if (!token) return;
    run(async () => {
      await authService.resetPassword(token, data);
      showToast('success', 'Mot de passe réinitialisé avec succès.');
      navigate('/login');
    });
  };

  return (
    <ForgotPassword
      step={step}
      onSubmitEmail={handleSubmitEmail}
      onGoogleContinue={handleGoogleContinue}
      onSubmitNewPassword={handleSubmitNewPassword}
      onNavigateToLogin={() => navigate('/login')}
      isSubmitting={isSubmitting}
      expiresAt={expiresAt}
      linkStatus={linkStatus}
    />
  );
}