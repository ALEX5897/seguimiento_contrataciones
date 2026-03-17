export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const UI_FLAGS = {
  ALLOW_MANUAL_COMPLETION_DATE: String(import.meta.env.VITE_ALLOW_MANUAL_COMPLETION_DATE ?? 'true').toLowerCase() === 'true'
} as const;

export const ESTADOS = {
  PENDIENTE: 'pendiente',
  EN_CURSO: 'en_curso',
  EN_REVISION: 'en_revision',
  BLOQUEADA: 'bloqueada',
  COMPLETADA: 'completada',
  CERRADA: 'cerrada'
} as const;

export const ESTADOS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En Curso',
  en_revision: 'En Revisión',
  bloqueada: 'Bloqueada',
  completada: 'Completada',
  cerrada: 'Cerrada'
};

export const ESTADOS_COLORS: Record<string, string> = {
  pendiente: '#9ca3af',
  en_curso: '#3b82f6',
  en_revision: '#f59e0b',
  bloqueada: '#ef4444',
  completada: '#10b981',
  cerrada: '#6b7280'
};

export const PRIORIDADES = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  CRITICA: 'critica'
} as const;

export const PRIORIDADES_LABELS: Record<string, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica'
};

export const PRIORIDADES_COLORS: Record<string, string> = {
  baja: '#6b7280',
  media: '#3b82f6',
  alta: '#f59e0b',
  critica: '#ef4444'
};
