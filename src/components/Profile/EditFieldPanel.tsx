import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from './ui/Button';
import Input from './ui/Input';

interface EditFieldPanelProps<T extends { [key: string]: string }> {
  label: string;
  fieldName: keyof T & string;
  currentValue: string;
  schema: z.ZodType<T>;
  onConfirm: (data: T) => Promise<void>;
  onCancel: () => void;
}

export default function EditFieldPanel<T extends { [key: string]: string }>({
  label,
  fieldName,
  currentValue,
  schema,
  onConfirm,
  onCancel,
}: EditFieldPanelProps<T>) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<T>({
    resolver: zodResolver(schema as any) as any,
    defaultValues: { [fieldName]: currentValue } as any,
    mode: 'onBlur',
  });

  const submit = async (data: T) => {
    await onConfirm(data);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-[380px] flex-shrink-0 shadow-lg flex flex-col">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Modifier : {label}</h3>
        <p className="text-xs text-white/50 mb-6">
          Mettez à jour cette information puis validez pour enregistrer les changements.
        </p>

        <div className="mb-6">
          <p className="text-xs text-white/60 mb-1.5">Ancien {label.toLowerCase()}</p>
          <p className="text-sm text-white px-3.5 py-3 rounded-lg bg-white/10 border border-white/15">
            {currentValue || '—'}
          </p>
        </div>

        <div className="h-px bg-white/10 mb-6" />

        <form onSubmit={handleSubmit(submit)} noValidate>
          <Input
            id={`edit-${fieldName}`}
            label={`Nouveau ${label.toLowerCase()}`}
            type="text"
            error={(errors as any)[fieldName]?.message}
            disabled={isSubmitting}
            {...register(fieldName as any)}
          />

          <div className="flex gap-3 mt-5">
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Valider
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}