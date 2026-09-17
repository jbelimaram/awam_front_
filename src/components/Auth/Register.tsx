import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import AuthLayout from './AuthLayout';
import Button from '../Common/Button';
import Input from '../Common/Input';
import Checkbox from '../Common/Checkbox';
import { registerSchema, type RegisterFormValues } from '../../utils/schemas';

interface RegisterProps {
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => void;
  onGoogleRegister: () => void;
  onNavigateToLogin: () => void;
  isSubmitting: boolean;
}

export default function Register({
  onSubmit,
  onGoogleRegister,
  onNavigateToLogin,
  isSubmitting,
}: RegisterProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = (data: RegisterFormValues) => {
    const { firstName, lastName, email, password, confirmPassword } = data;
    onSubmit({ firstName, lastName, email, password, confirmPassword });
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-white text-center mb-5">AWAM</h1>

      <form onSubmit={handleSubmit(submit)} noValidate>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              id="register-firstname"
              label="Prénom"
              type="text"
              error={errors.firstName?.message}
              disabled={isSubmitting}
              {...register('firstName')}
            />
          </div>
          <div className="flex-1">
            <Input
              id="register-lastname"
              label="Nom"
              type="text"
              error={errors.lastName?.message}
              disabled={isSubmitting}
              {...register('lastName')}
            />
          </div>
        </div>

        <Input
          id="register-email"
          label="Adresse e-mail"
          type="email"
          error={errors.email?.message}
          disabled={isSubmitting}
          {...register('email')}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              id="register-password"
              label="Mot de passe"
              type="password"
              error={errors.password?.message}
              disabled={isSubmitting}
              {...register('password')}
            />
          </div>
          <div className="flex-1">
            <Input
              id="register-confirm-password"
              label="Confirmer"
              type="password"
              error={errors.confirmPassword?.message}
              disabled={isSubmitting}
              {...register('confirmPassword')}
            />
          </div>
        </div>

        <Checkbox
          id="register-terms"
          disabled={isSubmitting}
          label={
            <>
              J'accepte les{' '}
              <a href="#" className="text-menthe underline">
                conditions d'utilisation
              </a>
            </>
          }
          {...register('acceptTerms')}
        />
        {errors.acceptTerms && (
          <p className="text-terracotta text-xs -mt-4 mb-4">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Créer mon compte
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-white/20" />
        <span className="text-xs text-white/60">ou</span>
        <div className="flex-1 h-px bg-white/20" />
      </div>

      <Button variant="google" onClick={onGoogleRegister} disabled={isSubmitting}>
        S'inscrire avec Google
      </Button>

      <p className="text-center text-xs text-white/70 mt-5">
        Vous avez déjà un compte ?{' '}
        <button type="button" onClick={onNavigateToLogin} className="text-menthe hover:underline">
          Se connecter
        </button>
      </p>
    </AuthLayout>
  );
}