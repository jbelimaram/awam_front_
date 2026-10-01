import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Login from '../components/Auth/Login';
import { authService } from '../Services/authService';
import { useAuth } from '../hooks/useAuth';
import { useFormStatus } from '../hooks/useFormStatus';
import { useToast } from '../hooks/useToast';
import type { LoginPayload } from '../types/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isSubmitting, run } = useFormStatus();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const googleErrorShown = useRef(false);

  // Retour d'un échec de connexion Google : le back redirige vers
  // /login?error=google_auth_failed
  useEffect(() => {
    if (searchParams.get('error') !== 'google_auth_failed' || googleErrorShown.current) return;
    googleErrorShown.current = true;
    showToast('error', 'La connexion avec Google a échoué ou a été annulée. Veuillez réessayer.');
    // On retire le paramètre pour que le message ne réapparaisse pas au rafraîchissement
    searchParams.delete('error');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, showToast]);

  const handleSubmit = (data: LoginPayload) => {
    run(async () => {
      const response = await authService.login(data);
      login(response.user);
      showToast('success', 'Connexion réussie ! Bienvenue.');
      navigate('/');
    });
  };

  const handleGoogleLogin = () => {
    authService.loginWithGoogle();
  };

  return (
    <Login
      onSubmit={handleSubmit}
      onGoogleLogin={handleGoogleLogin}
      onNavigateToRegister={() => navigate('/register')}
      onNavigateToForgotPassword={() => navigate('/mot-de-passe-oublie')}
      isSubmitting={isSubmitting}
    />
  );
}