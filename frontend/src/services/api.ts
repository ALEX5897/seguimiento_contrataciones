import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejo de errores global
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    if (error?.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.hash !== '#/login') {
        const current = window.location.hash.replace(/^#/, '') || '/';
        window.location.hash = `/login?redirect=${encodeURIComponent(current)}`;
      }
    }
    return Promise.reject(error);
  }
);

export interface Tarea {
  id: number;
  actividadId: number;
  nombre: string;
  responsableId: number;
  estado: string;
  prioridad: string;
  fechaInicio: string;
  fechaFin: string;
  avanceFisico: number;
  observaciones: string;
  createdAt: string;
  updatedAt: string;
  actividad?: any;
  responsable?: any;
  subtareas?: any[];
  hitos?: any[];
  historial?: any[];
  diasAtraso?: number;
}

export interface Actividad {
  id: number;
  nombre: string;
  direccionId: number;
  tipoPlan: string;
  presupuesto: number;
  fechaInicio: string;
  fechaFin: string;
  direccion?: any;
  totalTareas?: number;
  tareasCompletadas?: number;
  presupuestoEjecutado?: number;
}

export interface EtapaSeguimiento {
  id: number;
  codigoOlympo: string;
  etapaId: number;
  estado: string;
  fechaPlanificada: string | null;
  fechaReal: string | null;
  responsableId: number | null;
  observaciones: string | null;
  etapaNombre?: string;
  responsableNombre?: string;
}

export interface ResumenDiarioSubtareas {
  totalEtapas: number;
  completadas: number;
  pendientes: number;
  conPendientes: number;
  enRetraso: number;
  vencenHoy: number;
  atrasadas: number;
  totalSubtareas: number;
  subtareasSegundaReforma: number;
  fecha: string;
}

export interface DashboardWeeklyPoint {
  key: string;
  label: string;
  year: number;
  week: number;
  start: string;
  end: string;
  order: number;
  etapasProgramadas: number;
  alertas: number;
}

export interface DashboardWeeklySummary {
  series: DashboardWeeklyPoint[];
  mejorSemanaCumplimiento: DashboardWeeklyPoint | null;
  peorSemanaAlertas: DashboardWeeklyPoint | null;
}

export interface Subtarea {
  codigoOlympo: string;
  nombre: string;
  actividadId: number;
  responsableId: number | null;
  partidaPresupuestaria: string | null;
  fuenteFinanciamiento: string | null;
  presupuesto: number;
  costoReforma2?: number;
  estado: string;
  avanceGeneral: number;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  responsableNombre?: string;
  actividadNombre?: string;
  porcentajeAvance?: number;
  seguimientoEtapas?: EtapaSeguimiento[];
}

export interface ReportesFiltros {
  busqueda?: string;
  direccion?: string;
  tipoPlan?: string;
  estado?: string;
}

export interface ReporteKpis {
  totalProcesos: number;
  totalVerificables: number;
  completados: number;
  enProceso: number;
  pendientes: number;
  atrasadas: number;
  vencenHoy: number;
  presupuestoTotal: number;
  costoReformaTotal: number;
  cumplimientoGeneral: number;
}

export interface ReporteProceso {
  id: number;
  codigoOlympo: string;
  nombre: string;
  direccionNombre: string;
  responsableNombre: string;
  tipoPlan: string;
  presupuesto: number;
  costoReforma2: number;
  activo: boolean;
  totalEtapas: number;
  completadas: number;
  enProceso: number;
  pendientes: number;
  atrasadas: number;
  vencenHoy: number;
  porcentajeAvance: number;
  estadoGeneral: string;
  estadoGeneralLabel: string;
  proximaEtapa: string;
}

export interface ReporteDireccion {
  direccionNombre: string;
  totalProcesos: number;
  totalVerificables: number;
  completados: number;
  enProceso: number;
  pendientes: number;
  atrasadas: number;
  presupuestoTotal: number;
  costoReformaTotal: number;
  cumplimiento: number;
}

export interface ReporteEtapa {
  subtareaId: number;
  codigoOlympo: string;
  proceso: string;
  direccionNombre: string;
  responsableNombre: string;
  tipoPlan: string;
  etapaNombre: string;
  orden: number;
  estado: string;
  estadoLabel: string;
  fechaPlanificada: string;
  fechaReal: string;
  observaciones: string;
  diasAtraso: number;
  esAtrasada: boolean;
  esVenceHoy: boolean;
}

export interface ReporteResumenResponse {
  generadoEn: string;
  filtros: Required<ReportesFiltros>;
  kpis: ReporteKpis;
  direccionesDisponibles: string[];
  tiposPlanDisponibles: string[];
  procesos: ReporteProceso[];
  etapas: ReporteEtapa[];
  resumenPorDireccion: ReporteDireccion[];
}

export interface PermisosAcciones {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface PermisosSesion {
  role: string;
  modulos: Record<string, PermisosAcciones>;
  menu: Record<string, boolean>;
}

export interface PermisoModuloCatalogo {
  clave: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  orden: number;
  permisos: PermisosAcciones;
}

export interface PermisoMenuCatalogo {
  clave: string;
  nombre: string;
  ruta: string;
  activo: boolean;
  orden: number;
  puedeIngresar: boolean;
}

export interface PermisosRolDetalle {
  role: string;
  modulos: PermisoModuloCatalogo[];
  menu: PermisoMenuCatalogo[];
}

export interface AuditoriaEvento {
  id: number;
  userId: number | null;
  username: string | null;
  role: string | null;
  direccionNombre: string | null;
  accion: string;
  modulo: string | null;
  recurso: string | null;
  metodo: string;
  ruta: string;
  statusCode: number;
  exito: boolean;
  ip: string | null;
  userAgent: string | null;
  errorMensaje: string | null;
  fecha: string;
}

export interface AuditoriaListadoResponse {
  items: AuditoriaEvento[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const tareasService = {
  async getAll(filtros = {}) {
    const response = await api.get('/tareas', { params: filtros });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/tareas/${id}`);
    return response.data;
  },

  async create(tarea: Partial<Tarea>) {
    const response = await api.post('/tareas', tarea);
    return response.data;
  },

  async update(id: number, tarea: Partial<Tarea>) {
    const response = await api.put(`/tareas/${id}`, tarea);
    return response.data;
  },

  async delete(id: number) {
    await api.delete(`/tareas/${id}`);
  },

  async getResumenEstados() {
    const response = await api.get('/tareas/resumen/estados');
    return response.data;
  },

  async getTareasProximasVencer() {
    const response = await api.get('/tareas/alertas/vencimiento');
    return response.data;
  },

  async getTareasAtrasadas() {
    const response = await api.get('/tareas/alertas/atrasadas');
    return response.data;
  }
};

export const actividadesService = {
  async getAll(filtros = {}) {
    const response = await api.get('/subtareas', { params: filtros });
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/subtareas/${id}`);
    return response.data;
  }
};

export const subtareasService = {
  async getAll() {
    const response = await api.get('/subtareas');
    return response.data;
  },

  async getByCodigoOlympo(codigoOlympo: string) {
    const response = await api.get(`/subtareas/${codigoOlympo}`);
    return response.data;
  },

  async getEtapas() {
    const response = await api.get('/subtareas/etapas/lista');
    return response.data;
  },

  async getResumenDiario() {
    const response = await api.get('/subtareas/resumen/diario');
    return response.data as ResumenDiarioSubtareas;
  },

  async getResumenSemanal(params: {
    area?: string;
    responsable?: string;
    busqueda?: string;
    direccion?: string;
    tipoPlan?: string;
    cuatrimestre?: string;
    tipoContratacion?: string;
    monto?: string;
  } = {}) {
    const response = await api.get('/subtareas/resumen/semanal', { params });
    return response.data as DashboardWeeklySummary;
  },

  async updateEtapa(codigoOlympo: string, etapaId: number, payload: {
    estado?: string;
    fechaPlanificada?: string | null;
    fechaReal?: string | null;
    observaciones?: string | null;
  }) {
    const response = await api.put(`/subtareas/${codigoOlympo}/etapas/${etapaId}`, payload);
    return response.data;
  }
};

export const estadosService = {
  async getAll() {
    const response = await api.get('/estados');
    return response.data;
  }
};

export const notificacionesService = {
  async getAll(filtros = {}) {
    const response = await api.get('/notificaciones', { params: filtros });
    return response.data;
  },

  async marcarLeida(id: number) {
    const response = await api.patch(`/notificaciones/${id}/leer`);
    return response.data;
  }
};

export const authService = {
  async login(username: string, password: string) {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  async getOpcionesLogin() {
    const response = await api.get('/auth/opciones-login');
    return response.data;
  },

  async getDirecciones() {
    const response = await api.get('/auth/direcciones');
    return response.data;
  },

  async me() {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export const permisosService = {
  async getAll() {
    const response = await api.get('/permisos');
    return response.data as { roles: string[]; permisos: PermisosRolDetalle[] };
  },

  async getByRole(role: string) {
    const response = await api.get(`/permisos/rol/${encodeURIComponent(role)}`);
    return response.data as PermisosRolDetalle;
  },

  async updateByRole(role: string, payload: { modulos: Array<{ clave: string; permisos: PermisosAcciones }>; menu: Array<{ clave: string; puedeIngresar: boolean }> }) {
    const response = await api.put(`/permisos/rol/${encodeURIComponent(role)}`, payload);
    return response.data as PermisosRolDetalle;
  },

  async getMine() {
    const response = await api.get('/permisos/mis-permisos');
    return response.data as PermisosSesion;
  }
};

export const auditoriaService = {
  async getAll(params: Record<string, string | number | boolean | undefined>) {
    const response = await api.get('/auditoria', { params });
    return response.data as AuditoriaListadoResponse;
  },

  async getById(id: number) {
    const response = await api.get(`/auditoria/${id}`);
    return response.data as any;
  }
};

export const usuariosService = {
  async getAll() {
    const response = await api.get('/usuarios');
    return response.data;
  },

  async create(payload: any) {
    const response = await api.post('/usuarios', payload);
    return response.data;
  },

  async update(id: number, payload: any) {
    const response = await api.put(`/usuarios/${id}`, payload);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  }
};

export const reportesService = {
  async getResumen(filtros: ReportesFiltros = {}) {
    const response = await api.get('/reportes/resumen', { params: filtros });
    return response.data as ReporteResumenResponse;
  },

  async descargarXlsx(filtros: ReportesFiltros = {}) {
    const response = await api.get('/reportes/export/xlsx', {
      params: filtros,
      responseType: 'blob'
    });

    const disposition = String(response.headers['content-disposition'] || '');
    const match = disposition.match(/filename="?([^";]+)"?/i);

    return {
      blob: response.data as Blob,
      filename: match?.[1] || 'reporte_seguimiento.xlsx'
    };
  }
};

export default api;
