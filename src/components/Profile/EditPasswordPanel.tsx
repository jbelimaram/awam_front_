import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from './ui/Button';
import Input from './ui/Input';
import { buildPasswordUpdateSchema, type PasswordUpdateFormValues } from '../../utils/schemas';

interface EditPasswordPanelProps {
  hasPassword: boolean;
  onConfirm: (data: PasswordUpdateFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function EditPasswordPanel({ hasPassword, onConfirm, onCancel }: EditPasswordPanelProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(buildPasswordUpdateSchema(hasPassword)),
    mode: 'onBlur',
  });

  const submit = async (data: PasswordUpdateFormValues) => {
    await onConfirm(data);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-[380px] flex-shrink-0 shadow-lg">
      <h3 className="text-sm font-semibold text-white mb-1">
        {hasPassword ? 'Modifier le mot de passe' : 'Créer un mot de passe'}
      </h3>
      <p className="text-xs text-white/50 mb-4">
        Mettez à jour votre mot de passe puis validez pour enregistrer les changements.
      </p>

      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-3">
        {hasPassword && (
          <Input
            id="current-password"
            label="Ancien mot de passe"
            type="password"
            error={errors.current_password?.message}
            disabled={isSubmitting}
            {...register('current_password')}
          />
        )}

        <Input
          id="new-password"
          label="Nouveau mot de passe"
          type="password"
          error={errors.new_password?.message}
          disabled={isSubmitting}
          {...register('new_password')}
        />

        <Input
          id="confirm-password"
          label="Confirmer le mot de passe"
          type="password"
          error={errors.confirm_password?.message}
          disabled={isSubmitting}
          {...register('confirm_password')}
        />

        <div className="flex gap-3 mt-1">
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Valider
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}