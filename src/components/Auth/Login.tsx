import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import AuthLayout from './AuthLayout';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { loginSchema, type LoginFormValues } from '../../utils/schemas';

interface LoginProps {
  onSubmit: (data: { email: string; password: string }) => void;
  onGoogleLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  isSubmitting: boolean;
}

export default function Login({
  onSubmit,
  onGoogleLogin,
  onNavigateToRegister,
  onNavigateToForgotPassword,
  isSubmitting,
}: LoginProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = (data: LoginFormValues) => {
    onSubmit(data);
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-white text-center mb-6">AWAM</h1>

      <form onSubmit={handleSubmit(submit)} noValidate>
        <Input
          id="login-email"
          label="Adresse e-mail"
          type="email"
          error={errors.email?.message}
          disabled={isSubmitting}
          {...register('email')}
        />

        <Input
          id="login-password"
          label="Mot de passe"
          type="password"
          error={errors.password?.message}
          disabled={isSubmitting}
          {...register('password')}
        />

        <div className="flex justify-end mb-6 -mt-2">
          <button
            type="button"
            onClick={onNavigateToForgotPassword}
            className="text-xs text-menthe hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Se connecter
        </Button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/20" />
        <span className="text-xs text-white/60">ou</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      <Button
        type="button"
        variant="google"
        onClick={onGoogleLogin}
        disabled={isSubmitting}
      >
        Continuer avec Google
      </Button>

      <p className="text-center text-xs text-white/70 mt-6">
        Vous n'avez pas de compte ?{' '}
        <button
          type="button"
          onClick={onNavigateToRegister}
          className="text-menthe hover:underline"
        >
          S'inscrire
        </button>
      </p>
    </AuthLayout>
  );
}