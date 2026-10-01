import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';   // ⬅️ AJOUT
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { agendaService } from '../../../Services/agendaService';
import type { AgendaEvent, AgendaStatus, CreateAgendaEventPayload } from '../../../types/agenda';
import { statusConfig, statusColors } from './statusConfig';
import TodayPreview from './TodayPreview';
import EventModal from './EventModal';
import { useToast } from '../../../hooks/useToast';
import './AgendaCard.css';

export default function AgendaCard() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<string | undefined>(undefined);
  const { showToast } = useToast();

  const errorMessage = (err: unknown) =>
    err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.';

  const loadEvents = () => {
    agendaService
      .listEvents()
      .then(setEvents)
      .catch((err) => showToast('error', errorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDateSelect = (info: DateSelectArg) => {
    setSelectedEvent(null);
    setDefaultStart(info.startStr);
    setIsModalOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const event = events.find((e) => e.id === Number(info.event.id));
    if (event) {
      setSelectedEvent(event);
      setDefaultStart(undefined);
      setIsModalOpen(true);
    }
  };

  const handleTodayEventClick = (event: AgendaEvent) => {
    setSelectedEvent(event);
    setDefaultStart(undefined);
    setIsModalOpen(true);
  };

  // En cas d'erreur du back, le formulaire reste ouvert pour corriger
  const handleSave = async (payload: CreateAgendaEventPayload) => {
    try {
      if (selectedEvent) {
        await agendaService.updateEvent(selectedEvent.id, payload);
        showToast('success', 'Événement modifié avec succès.');
      } else {
        await agendaService.createEvent(payload);
        showToast('success', 'Événement créé avec succès.');
      }
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      showToast('error', errorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await agendaService.deleteEvent(selectedEvent.id);
      showToast('success', 'Événement supprimé avec succès.');
      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      showToast('error', errorMessage(err));
    }
  };

  const calendarEvents = events.map((e) => ({
    id: String(e.id),
    title: e.title,
    start: e.start_at,
    end: e.end_at ?? undefined,
    backgroundColor: statusColors[e.status].bg,
    borderColor: statusColors[e.status].border,
  }));

  return (
    <div className="relative flex gap-4 items-start flex-wrap">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-[380px] flex flex-col gap-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Agenda personnel
          </h3>
          <button
            type="button"
            onClick={() => {
              setSelectedEvent(null);
              setDefaultStart(undefined);
              setIsModalOpen(true);
            }}
            className="text-xs text-white font-semibold px-3 py-1.5 rounded-full transition"
            style={{ background: 'var(--accent-chaud)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-chaud-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent-chaud)')}
          >
            + Ajouter
          </button>
        </div>

        <TodayPreview events={events} onEventClick={handleTodayEventClick} />

        <div className="flex gap-2 flex-wrap">
          {(Object.keys(statusConfig) as AgendaStatus[]).map((key) => (
            <span
              key={key}
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                background: statusColors[key].bg,
                color: statusColors[key].text,
                borderColor: statusColors[key].border,
              }}
            >
              {statusConfig[key].label}
            </span>
          ))}
        </div>

        {isLoading ? (
          <p className="text-xs text-white/60">
            Chargement du calendrier...
          </p>
        ) : (
          <div className="agenda-calendar">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              locale={frLocale}          // ⬅️ MODIFIÉ
              height={340}
              selectable
              select={handleDateSelect}
              events={calendarEvents}
              eventClick={handleEventClick}
            />
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="absolute top-0 left-1/2 z-20 w-[420px]">
          <EventModal
            event={selectedEvent}
            defaultStart={defaultStart}
            onSave={handleSave}
            onDelete={selectedEvent ? handleDelete : undefined}
            onClose={() => setIsModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}