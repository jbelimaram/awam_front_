import { api } from './api';
import type { AgendaEvent, CreateAgendaEventPayload, UpdateAgendaEventPayload } from '../types/agenda';

export const agendaService = {
  listEvents: (): Promise<AgendaEvent[]> => api.get<AgendaEvent[]>('/agenda'),

  createEvent: (payload: CreateAgendaEventPayload): Promise<AgendaEvent> =>
    api.post<AgendaEvent>('/agenda', payload),

  updateEvent: (id: number, payload: UpdateAgendaEventPayload): Promise<AgendaEvent> =>
    api.put<AgendaEvent>(`/agenda/${id}`, payload),

  deleteEvent: (id: number): Promise<void> => api.delete<void>(`/agenda/${id}`),
};