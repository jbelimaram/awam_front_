import type { AgendaStatus } from '../../../types/agenda';

export const statusConfig: Record<AgendaStatus, { label: string; badgeClass: string; dotClass: string }> = {
  a_faire: {
    label: 'À faire',
    badgeClass: 'border',
    dotClass: '',
  },
  fait: {
    label: 'Fait',
    badgeClass: 'border',
    dotClass: '',
  },
  annule: {
    label: 'Annulé',
    badgeClass: 'border',
    dotClass: '',
  },
  reporte: {
    label: 'Reporté',
    badgeClass: 'border',
    dotClass: '',
  },
};

export const statusColors: Record<AgendaStatus, { bg: string; text: string; border: string; dot: string }> = {
  a_faire: { bg: 'var(--fond-subtil)', text: 'var(--texte-principal)', border: 'var(--bordure)', dot: 'var(--texte-secondaire)' },
  fait: { bg: '#E4EBDD', text: '#5C7052', border: '#A8B89A', dot: '#5C7052' },
  annule: { bg: '#EDEBE7', text: 'var(--texte-secondaire)', border: 'var(--bordure)', dot: 'var(--texte-secondaire)' },
  reporte: { bg: '#F3E4D8', text: '#A8683F', border: 'var(--accent-chaud)', dot: '#A8683F' },
};