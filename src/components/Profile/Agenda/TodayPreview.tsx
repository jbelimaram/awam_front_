import type { AgendaEvent } from '../../../types/agenda';
import { statusColors } from './statusConfig';

interface TodayPreviewProps {
  events: AgendaEvent[];
  onEventClick: (event: AgendaEvent) => void;
}

export default function TodayPreview({ events, onEventClick }: TodayPreviewProps) {
  const today = new Date();
  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.start_at);
    return (
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate()
    );
  });

  if (todayEvents.length === 0) {
    return (
      <p className="text-xs mb-4" style={{ color: 'var(--texte-secondaire)' }}>
        Aucun événement aujourd'hui.
      </p>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--texte-principal)' }}>
        Aujourd'hui
      </p>
      <div className="flex flex-col gap-1.5">
        {todayEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventClick(event)}
            className="flex items-center gap-2 text-left text-xs transition rounded-lg px-3 py-2"
            style={{ background: 'var(--fond-subtil)' }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: statusColors[event.status].dot }}
            />
            <span className="font-medium truncate" style={{ color: 'var(--texte-principal)' }}>
              {event.title}
            </span>
            <span className="ml-auto shrink-0" style={{ color: 'var(--texte-secondaire)' }}>
              {new Date(event.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}