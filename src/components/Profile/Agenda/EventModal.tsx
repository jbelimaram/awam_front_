import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { agendaEventSchema, agendaStatusValues, agendaReminderValues, reminderUnitValues, type AgendaEventFormValues } from '../../../utils/schemas';
import { statusConfig } from './statusConfig';
import type { AgendaEvent, CreateAgendaEventPayload } from '../../../types/agenda';

interface EventModalProps {
  event: AgendaEvent | null;
  defaultStart?: string;
  onSave: (payload: CreateAgendaEventPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

const reminderLabels: Record<string, string> = {
  '15_min': '15 minutes avant',
  '1_hour': '1 heure avant',
  '1_day': '1 jour avant',
  '1_week': '1 semaine avant',
  custom: 'Personnalisé',
};

const UNIT_TO_MINUTES: Record<(typeof reminderUnitValues)[number], number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

/**
 * Le back enregistre le rappel personnalisé en minutes uniquement.
 * On retrouve l'unité la plus lisible pour l'affichage : 120 → 2 heures, 1440 → 1 jour.
 */
function splitReminderMinutes(minutes: number | null | undefined): {
  amount: number | undefined;
  unit: (typeof reminderUnitValues)[number];
} {
  if (!minutes) return { amount: undefined, unit: 'minutes' };
  if (minutes % UNIT_TO_MINUTES.days === 0) return { amount: minutes / UNIT_TO_MINUTES.days, unit: 'days' };
  if (minutes % UNIT_TO_MINUTES.hours === 0) return { amount: minutes / UNIT_TO_MINUTES.hours, unit: 'hours' };
  return { amount: minutes, unit: 'minutes' };
}

function toLocalInputValue(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EventModal({ event, defaultStart, onSave, onDelete, onClose }: EventModalProps) {
  const customReminder = splitReminderMinutes(event?.reminder_custom_minutes);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AgendaEventFormValues>({
    resolver: zodResolver(agendaEventSchema) as any,
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      start_datetime: toLocalInputValue(event?.start_at ?? defaultStart),
      end_datetime: toLocalInputValue(event?.end_at),
      status: event?.status ?? 'a_faire',
      reminder: event?.reminder ?? '1_day',
      reminder_custom_amount: customReminder.amount,
      reminder_custom_unit: customReminder.unit,
    },
  });

  const selectedReminder = watch('reminder');

  const submit = async (data: AgendaEventFormValues) => {
    const isCustom = data.reminder === 'custom';
    const reminder_custom_minutes =
      isCustom && data.reminder_custom_amount && data.reminder_custom_unit
        ? data.reminder_custom_amount * UNIT_TO_MINUTES[data.reminder_custom_unit]
        : null;

    const payload: CreateAgendaEventPayload = {
      title: data.title,
      description: data.description,
      status: data.status,
      reminder: data.reminder,
      start_at: new Date(data.start_datetime).toISOString(),
      // null (et non undefined) : un champ vidé doit effacer l'ancienne date de fin
      end_at: data.end_datetime ? new Date(data.end_datetime).toISOString() : null,
      reminder_custom_minutes,
    };
    await onSave(payload);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 w-full max-w-[350px] shadow-lg flex-shrink-0">
        <h3 className="text-sm font-semibold mb-3 text-white">
          {event ? "Modifier l'événement" : 'Nouvel événement'}
        </h3>

        <form onSubmit={handleSubmit(submit as any)} noValidate>
          <Input
            id="event-title"
            label="Titre"
            type="text"
            error={errors.title?.message}
            disabled={isSubmitting}
            {...register('title')}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              id="event-start"
              label="Début"
              type="datetime-local"
              error={errors.start_datetime?.message}
              disabled={isSubmitting}
              {...register('start_datetime')}
            />

            <Input
              id="event-end"
              label="Fin"
              type="datetime-local"
              error={errors.end_datetime?.message}
              disabled={isSubmitting}
              {...register('end_datetime')}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="event-status" className="block text-sm mb-1 text-white">
              Statut
            </label>
            <select
              id="event-status"
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm bg-white/10 text-white border-white/20"
              {...register('status')}
            >
              {agendaStatusValues.map((value) => (
                <option key={value} value={value}>
                  {statusConfig[value].label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="event-reminder" className="block text-sm mb-1 text-white">
              Rappel par e-mail
            </label>
            <select
              id="event-reminder"
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm bg-white/10 text-white border-white/20"
              {...register('reminder')}
            >
              {agendaReminderValues.map((value) => (
                <option key={value} value={value}>
                  {reminderLabels[value]}
                </option>
              ))}
            </select>

            {selectedReminder === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  id="event-reminder-amount"
                  label="Valeur"
                  type="number"
                  error={errors.reminder_custom_amount?.message}
                  disabled={isSubmitting}
                  {...register('reminder_custom_amount')}
                />
                <div>
                  <label htmlFor="event-reminder-unit" className="block text-sm mb-1 text-white">
                    Unité
                  </label>
                  <select
                    id="event-reminder-unit"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm bg-white/10 text-white border-white/20"
                    {...register('reminder_custom_unit')}
                  >
                    {reminderUnitValues.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit === 'minutes' ? 'Minutes' : unit === 'hours' ? 'Heures' : 'Jours'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="event-description" className="block text-sm mb-1 text-white">
              Note (optionnel)
            </label>
            <textarea
              id="event-description"
              disabled={isSubmitting}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border outline-none transition resize-none text-sm bg-white/10 text-white border-white/20"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs mt-1 text-[#FF8A75]">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {event ? 'Enregistrer' : 'Créer'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
          </div>

          {event && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 mt-2 rounded-lg font-semibold text-sm border transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-[#F3D8D2]/20 text-[#FF8A75] border-[#FF8A75]/40"
            >
              Supprimer cet événement
            </button>
          )}
        </form>
      </div>
  );
}