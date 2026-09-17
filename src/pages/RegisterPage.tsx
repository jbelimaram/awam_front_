import { useNavigate } from 'react-router-dom';
import Register from '../components/Auth/Register';
import { authService } from '../Services/authService';
import { useAuth } from '../hooks/useAuth';
import { useFormStatus } from '../hooks/useFormStatus';
import { useToast } from '../hooks/useToast';
import type { RegisterPayload } from '../types/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isSubmitting, run } = useFormStatus();
  const { showToast } = useToast();

  const handleSubmit = (data: RegisterPayload) => {
    run(async () => {
      const response = await authService.register(data);
      login(response.user);
      showToast('success', 'Compte créé avec succès !');
      navigate('/');
    });
  };

  const handleGoogleRegister = () => {
    authService.loginWithGoogle();
  };

  return (
    <Register
      onSubmit={handleSubmit}
      onGoogleRegister={handleGoogleRegister}
      onNavigateToLogin={() => navigate('/login')}
      isSubmitting={isSubmitting}
    />
  );
}