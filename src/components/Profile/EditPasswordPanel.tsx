import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Dialog from '../Common/Dialog';
import { dialogButton } from '../Common/dialogStyles';
import DialogField from './ui/DialogField';
import { buildPasswordUpdateSchema, type PasswordUpdateFormValues } from '../../utils/schemas';

interface EditPasswordPanelProps {
  hasPassword: boolean;
  onConfirm: (data: PasswordUpdateFormValues) => Promise<void>;
  onCancel: () => void;
}

/**
 * Solidité d'un mot de passe, à titre indicatif : la seule règle imposée
 * est 8 caractères minimum (utils/schemas.ts) ; longueur, chiffres,
 * majuscules et symboles le rendent plus difficile à deviner.
 */
function strengthOf(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#e5e7eb' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (password.length < 8) return { score: 1, label: 'Trop court : 8 caractères minimum', color: '#E24B4A' };
  if (score <= 2) return { score: 2, label: 'Faible', color: '#EF9F27' };
  if (score <= 3) return { score: 3, label: 'Moyen', color: '#EF9F27' };
  return { score: 4, label: 'Solide', color: '#639922' };
}

/**
 * Modification (ou création) du mot de passe, dans une fenêtre claire :
 * 👁 pour afficher chaque champ, jauge de solidité en direct, et ✓ quand
 * la confirmation correspond.
 */
export default function EditPasswordPanel({ hasPassword, onConfirm, onCancel }: EditPasswordPanelProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(buildPasswordUpdateSchema(hasPassword)),
    mode: 'onBlur',
  });

  const newPassword = watch('new_password') ?? '';
  const confirm = watch('confirm_password') ?? '';
  const strength = strengthOf(newPassword);
  const matches = confirm.length > 0 && confirm === newPassword;

  return (
    <Dialog
      isOpen
      onClose={onCancel}
      title={hasPassword ? 'Modifier le mot de passe' : 'Créer un mot de passe'}
      subtitle="8 caractères minimum · conseillé : chiffres, majuscules et symboles"
      width={400}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={isSubmitting} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="submit" form="edit-password-form" disabled={isSubmitting} style={dialogButton.primary}>
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id="edit-password-form" onSubmit={handleSubmit((data) => onConfirm(data))} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hasPassword && (
            <DialogField
              id="current-password"
              label="Mot de passe actuel"
              type="password"
              autoFocus
              autoComplete="current-password"
              error={errors.current_password?.message}
              disabled={isSubmitting}
              {...register('current_password')}
            />
          )}

          {/* Nouveau mot de passe : séparé par un trait fin, sans bande de couleur */}
          <div style={{ borderTop: hasPassword ? '1px solid #eef0ee' : 'none', paddingTop: hasPassword ? 12 : 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <DialogField
                id="new-password"
                label="Nouveau mot de passe"
                type="password"
                autoFocus={!hasPassword}
                autoComplete="new-password"
                error={errors.new_password?.message}
                disabled={isSubmitting}
                {...register('new_password')}
              />
              {newPassword && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }} aria-hidden>
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength.score ? strength.color : '#e5e7eb' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11.5, color: strength.color === '#639922' ? '#3B6D11' : strength.color === '#E24B4A' ? '#A32D2D' : '#854F0B' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <DialogField
              id="confirm-password"
              label="Confirmer le nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              error={errors.confirm_password?.message}
              hint={matches ? <span style={{ color: '#3B6D11' }}>✓ Les deux mots de passe correspondent</span> : undefined}
              disabled={isSubmitting}
              {...register('confirm_password')}
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}