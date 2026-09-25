import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ForgotPassword from '../components/Auth/ForgotPassword';
import { authService } from '../Services/authService';
import { useFormStatus } from '../hooks/useFormStatus';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../Services/api';
import type { ResetPasswordPayload } from '../types/auth';

export default function ForgotPasswordPage() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const step = token ? 'reset' : 'request';
  const { isSubmitting, run } = useFormStatus();
  const { showToast } = useToast();

  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(step === 'reset');

  useEffect(() => {
    if (!token) return;

    authService
      .getResetTokenExpiry(token)
      .then((res) => setExpiresAt(res.expires_at))
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Lien de réinitialisation invalide ou expiré.';
        showToast('error', message);
        setExpiresAt(null);
      })
      .finally(() => setIsCheckingToken(false));
  }, [token, showToast]);

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
      expiresAt={expiresAt}
      isCheckingToken={isCheckingToken}
      onSubmitEmail={handleSubmitEmail}
      onGoogleContinue={handleGoogleContinue}
      onSubmitNewPassword={handleSubmitNewPassword}
      onNavigateToLogin={() => navigate('/login')}
      isSubmitting={isSubmitting}
    />
  );
}