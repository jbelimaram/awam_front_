import { useNavigate } from 'react-router-dom';
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