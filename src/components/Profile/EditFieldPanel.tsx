import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldError, type Path, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import Dialog from '../Common/Dialog';
import { dialogButton } from '../Common/dialogStyles';
import DialogField from './ui/DialogField';

interface EditFieldPanelProps<T extends { [key: string]: string }> {
  label: string;
  fieldName: keyof T & string;
  currentValue: string;
  schema: z.ZodType<T>;
  onConfirm: (data: T) => Promise<void>;
  onCancel: () => void;
}

/** Icône, titre et aide de chaque champ du compte */
const FIELD_INFO: Record<string, { icon: string; title: string; hint: string; type: string }> = {
  full_name: {
    icon: '👤', title: 'Modifier le nom complet', type: 'text',
    hint: 'Votre nom tel qu’il apparaît dans AWAM.',
  },
  username: {
    icon: '@', title: 'Modifier le nom d’utilisateur', type: 'text',
    hint: 'L’identifiant de votre compte.',
  },
  email: {
    icon: '✉️', title: 'Modifier l’adresse e-mail', type: 'email',
    hint: 'Elle sert à vous connecter et à recevoir vos rappels.',
  },
};

/**
 * Modification d'un champ du compte, dans une fenêtre claire centrée :
 * la valeur actuelle est rappelée sous le titre, le champ est prêt à être
 * modifié (texte sélectionné), Entrée enregistre et Échap annule.
 * « Enregistrer » reste grisé tant que la valeur n'a pas changé.
 */
export default function EditFieldPanel<T extends { [key: string]: string }>({
  label,
  fieldName,
  currentValue,
  schema,
  onConfirm,
  onCancel,
}: EditFieldPanelProps<T>) {
  const info = FIELD_INFO[fieldName] ?? { icon: '✎', title: `Modifier : ${label}`, hint: '', type: 'text' };
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<T>({
    // zodResolver ne relie pas un schéma générique à son type : conversion explicite
    resolver: zodResolver(schema as unknown as Parameters<typeof zodResolver>[0]) as unknown as Resolver<T>,
    defaultValues: { [fieldName]: currentValue } as DefaultValues<T>,
    mode: 'onChange',
  });

  const field = fieldName as Path<T>;
  const value = String(watch(field) ?? '');
  const fieldError = (errors as Record<string, FieldError | undefined>)[fieldName]?.message;
  const unchanged = value.trim() === currentValue.trim();
  const formId = `edit-${fieldName}-form`;

  return (
    <Dialog
      isOpen
      onClose={onCancel}
      title={info.title}
      subtitle={currentValue ? `Actuellement : ${currentValue}` : 'Aucune valeur pour le moment'}
      width={400}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={isSubmitting} style={dialogButton.secondary}>
            Annuler
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSubmitting || unchanged}
            title={unchanged ? 'Aucun changement à enregistrer' : undefined}
            style={{ ...dialogButton.primary, opacity: unchanged ? 0.45 : 1, cursor: unchanged ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit((data) => onConfirm(data))} noValidate>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span
            aria-hidden
            style={{
              width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: '#EAF3DE', color: '#27500A',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, marginTop: 14,
            }}
          >
            {info.icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DialogField
              id={`edit-${fieldName}`}
              label={`Nouveau ${label.toLowerCase()}`}
              type={info.type}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              error={fieldError}
              hint={info.hint}
              disabled={isSubmitting}
              {...register(field)}
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}