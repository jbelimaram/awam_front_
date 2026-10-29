import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import Dialog from '../../Common/Dialog';
import { dialogButton, dialogInput, dialogLabel, dialogSection } from '../../Common/dialogStyles';
import DialogField from '../ui/DialogField';
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

/** Couleurs des statuts dans la fenêtre : claires, une teinte par état */
const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  a_faire: { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
  fait: { bg: '#EAF3DE', text: '#27500A', border: '#639922' },
  annule: { bg: '#F1EFE8', text: '#5F5E5A', border: '#888780' },
  reporte: { bg: '#FAEEDA', text: '#633806', border: '#BA7517' },
};

/** Durées rapides : remplissent la fin à partir du début */
const QUICK_DURATIONS: { label: string; minutes: number | 'day' }[] = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: 'Journée', minutes: 'day' },
];

/** Date locale au format du champ « datetime-local » : 2026-10-28T09:00 */
function toInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Début proposé pour un nouvel événement : l'heure pile suivante */
function nextFullHour(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toInput(d);
}

/** Une section : séparée de la précédente par un trait fin, sans bande de couleur */
const section: React.CSSProperties = { borderTop: '1px solid #eef0ee', paddingTop: 12 };

const chip: React.CSSProperties = {
  border: '1px solid #d1d5db', background: '#fff', borderRadius: 999, padding: '3px 10px',
  fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
};

/**
 * Création ou modification d'un événement de l'agenda personnel, dans une
 * fenêtre claire centrée, en sections séparées par un trait fin :
 *   titre ;
 *   🕒 Quand  : début et fin, avec des durées rapides ;
 *   statut en pastilles colorées ;
 *   🔔 Rappel : rappel par e-mail ;
 *   note.
 * « Supprimer » est à gauche du pied, en rouge, pour un événement existant.
 */
export default function EventModal({ event, defaultStart, onSave, onDelete, onClose }: EventModalProps) {
  const customReminder = splitReminderMinutes(event?.reminder_custom_minutes);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AgendaEventFormValues>({
    resolver: zodResolver(agendaEventSchema) as unknown as Resolver<AgendaEventFormValues>,
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      start_datetime: toLocalInputValue(event?.start_at ?? defaultStart) || nextFullHour(),
      end_datetime: toLocalInputValue(event?.end_at),
      status: event?.status ?? 'a_faire',
      reminder: event?.reminder ?? '1_day',
      reminder_custom_amount: customReminder.amount,
      reminder_custom_unit: customReminder.unit,
    },
  });

  const selectedReminder = watch('reminder');
  const selectedStatus = watch('status');
  const start = watch('start_datetime');

  const applyDuration = (minutes: number | 'day') => {
    if (!start) return;
    const begin = new Date(start);
    const end = minutes === 'day' ? new Date(begin.getFullYear(), begin.getMonth(), begin.getDate(), 23, 59) : new Date(begin.getTime() + minutes * 60000);
    setValue('end_datetime', toInput(end), { shouldValidate: true, shouldDirty: true });
  };

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

  const subtitle = start
    ? new Date(start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Agenda personnel';

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={event ? "Modifier l'événement" : 'Nouvel événement'}
      subtitle={subtitle.charAt(0).toUpperCase() + subtitle.slice(1)}
      width={460}
      footer={
        <>
          {event && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              style={{ ...dialogButton.secondary, color: '#b91c1c', borderColor: '#fecaca', marginRight: 'auto' }}
            >
              Supprimer
            </button>
          )}
          <button type="button" onClick={onClose} disabled={isSubmitting} style={dialogButton.secondary}>
            Annuler
          </button>
          <button type="submit" form="agenda-event-form" disabled={isSubmitting} style={dialogButton.primary}>
            {isSubmitting ? 'Enregistrement…' : event ? 'Enregistrer' : 'Créer'}
          </button>
        </>
      }
    >
      <form id="agenda-event-form" onSubmit={handleSubmit(submit)} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Titre */}
          <DialogField
            id="event-title"
            label="Titre *"
            type="text"
            placeholder="Ex. Visite de la parcelle Kemel 1"
            autoFocus={!event}
            error={errors.title?.message}
            disabled={isSubmitting}
            {...register('title')}
          />

          {/* 🕒 Quand */}
          <div style={section}>
            <div style={dialogSection('#374151')}><span aria-hidden>🕒</span> Quand</div>
            {/* minmax(0, 1fr) : les champs date-heure ne débordent pas de leur colonne */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
              <DialogField
                id="event-start"
                label="Début *"
                type="datetime-local"
                error={errors.start_datetime?.message}
                disabled={isSubmitting}
                {...register('start_datetime')}
              />
              <DialogField
                id="event-end"
                label="Fin"
                type="datetime-local"
                error={errors.end_datetime?.message}
                disabled={isSubmitting}
                {...register('end_datetime')}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 11.5, color: '#6b7280' }}>Durée :</span>
              {QUICK_DURATIONS.map((d) => (
                <button key={d.label} type="button" onClick={() => applyDuration(d.minutes)} disabled={isSubmitting || !start} style={chip}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Statut : pastilles colorées */}
          <div style={section}>
            <span style={dialogLabel}>Statut</span>
            <div role="radiogroup" aria-label="Statut" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {agendaStatusValues.map((value) => {
                const st = STATUS_STYLE[value];
                const on = selectedStatus === value;
                return (
                  <label
                    key={value}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderRadius: 999,
                      padding: '4px 12px', fontSize: 12.5, fontWeight: on ? 600 : 400,
                      background: on ? st.bg : '#fff', color: on ? st.text : '#374151',
                      border: `1px solid ${on ? st.border : '#d1d5db'}`,
                    }}
                  >
                    <input type="radio" value={value} disabled={isSubmitting} {...register('status')} style={{ display: 'none' }} />
                    <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: st.border }} />
                    {statusConfig[value].label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* 🔔 Rappel */}
          <div style={section}>
            <div style={dialogSection('#374151')}><span aria-hidden>🔔</span> Rappel par e-mail</div>
            <select id="event-reminder" disabled={isSubmitting} style={{ ...dialogInput, marginTop: 0 }} {...register('reminder')}>
              {agendaReminderValues.map((value) => (
                <option key={value} value={value}>
                  {reminderLabels[value]}
                </option>
              ))}
            </select>
            {selectedReminder === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, marginTop: 8 }}>
                <DialogField
                  id="event-reminder-amount"
                  label="Valeur"
                  type="number"
                  error={errors.reminder_custom_amount?.message}
                  disabled={isSubmitting}
                  {...register('reminder_custom_amount')}
                />
                <label htmlFor="event-reminder-unit" style={dialogLabel}>
                  Unité
                  <select id="event-reminder-unit" disabled={isSubmitting} style={dialogInput} {...register('reminder_custom_unit')}>
                    {reminderUnitValues.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit === 'minutes' ? 'Minutes' : unit === 'hours' ? 'Heures' : 'Jours'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* 📝 Note : même aspect que les autres champs */}
          <div style={section}>
            <DialogField
              id="event-description"
              multiline
              rows={3}
              label={<>Note <span style={{ color: '#9ca3af' }}>(facultative)</span></>}
              placeholder="Détails, personnes à prévenir…"
              error={errors.description?.message}
              disabled={isSubmitting}
              {...register('description')}
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}