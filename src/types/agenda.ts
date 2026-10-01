export type AgendaStatus = 'a_faire' | 'fait' | 'annule' | 'reporte';
export type AgendaReminder = '15_min' | '1_hour' | '1_day' | '1_week' | 'custom';

export interface AgendaEvent {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  status: AgendaStatus;
  reminder_sent: boolean;
  reminder: AgendaReminder | null;
  reminder_custom_minutes: number | null;
}

export interface CreateAgendaEventPayload {
  title: string;
  description?: string | null;
  start_at: string;
  end_at?: string | null;
  status?: AgendaStatus;
  reminder?: AgendaReminder | null;
  reminder_custom_minutes?: number | null;
}

export interface UpdateAgendaEventPayload {
  title?: string;
  description?: string | null;
  start_at?: string;
  end_at?: string | null;
  status?: AgendaStatus;
  reminder?: AgendaReminder | null;
  reminder_custom_minutes?: number | null;
}