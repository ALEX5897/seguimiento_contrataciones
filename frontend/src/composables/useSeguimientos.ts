import { ref, computed } from 'vue';
import api from '../services/api';

export interface Seguimiento {
  id: number;
  subtareaId: number;
  etapaId: number;
  fecha: string;
  comentario: string;
  tieneAlerta: boolean;
  responsableId: number | null;
  responsableNombre?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Composable para gestionar seguimientos diarios de actividades
 * Proporciona funcionalidad completa para crear, leer, actualizar y eliminar seguimientos
 */
export function useSeguimientos() {
  // Estado
  const mostrarSeguimientos = ref(false);
  const cargandoSeguimientos = ref(false);
  const etapaActualSeguimiento = ref<any>(null);
  const seguimientosDiarios = ref<Seguimiento[]>([]);
  const nuevoComentario = ref('');
  const nuevoAlerta = ref(false);
  const error = ref('');
  const guardando = ref(false);

  // Computed
  const tieneSeguimientos = computed(() => seguimientosDiarios.value.length > 0);
  const alertasActivas = computed(() =>
    seguimientosDiarios.value.filter(s => s.tieneAlerta).length
  );
  const ultimoSeguimiento = computed(() => 
    seguimientosDiarios.value[0] || null
  );

  /**
   * Abre el modal de seguimientos y carga el historial
   */
  async function abrirSeguimientos(
    subtareaId: number,
    etapa: any,
    responsableId?: number
  ) {
    if (!subtareaId || !etapa?.etapaId) {
      error.value = 'Datos de subtarea/etapa inválidos';
      return;
    }

    etapaActualSeguimiento.value = { ...etapa, subtareaId, responsableId };
    mostrarSeguimientos.value = true;
    cargandoSeguimientos.value = true;
    error.value = '';

    try {
      const url = `/subtareas/${subtareaId}/etapas/${etapa.etapaId}/seguimientos?dias=30`;
      const response = await api.get(url);
      
      seguimientosDiarios.value = Array.isArray(response.data)
        ? response.data
        : (response.data.seguimientos || []);
    } catch (err: any) {
      error.value = err.message || 'Error al cargar seguimientos';
      console.error('Error cargando seguimientos:', err);
    } finally {
      cargandoSeguimientos.value = false;
    }
  }

  /**
   * Cierra el modal y limpia el estado
   */
  function cerrarSeguimientos() {
    mostrarSeguimientos.value = false;
    etapaActualSeguimiento.value = null;
    seguimientosDiarios.value = [];
    nuevoComentario.value = '';
    nuevoAlerta.value = false;
    error.value = '';
  }

  /**
   * Guarda un nuevo seguimiento diario
   */
  async function guardarSeguimiento(comentario?: string, tieneAlerta?: boolean) {
    const comentarioFinal = comentario || nuevoComentario.value;
    const tieneAlertaFinal = tieneAlerta !== undefined ? tieneAlerta : nuevoAlerta.value;

    if (!etapaActualSeguimiento.value) {
      error.value = 'No hay etapa seleccionada';
      return false;
    }

    if (!comentarioFinal.trim()) {
      error.value = 'El comentario no puede estar vacío';
      return false;
    }

    guardando.value = true;
    error.value = '';

    try {
      const { subtareaId, etapaId, responsableId } = etapaActualSeguimiento.value;
      
      const url = `/subtareas/${subtareaId}/etapas/${etapaId}/seguimientos`;
      const response = await api.post(url, {
        comentario: comentarioFinal.trim(),
        tieneAlerta: Boolean(tieneAlertaFinal),
        responsableId: responsableId || null,
        fecha: new Date().toISOString().split('T')[0]
      });

      // Actualizar lista
      seguimientosDiarios.value = Array.isArray(response.data.seguimientos)
        ? response.data.seguimientos
        : (response.data || []);

      // Limpiar formulario
      nuevoComentario.value = '';
      nuevoAlerta.value = false;

      return true;
    } catch (err: any) {
      error.value = err.message || 'Error al guardar seguimiento';
      console.error('Error guardando seguimiento:', err);
      return false;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Actualiza un seguimiento existente
   */
  async function actualizarSeguimiento(
    seguimientoId: number,
    comentario: string,
    tieneAlerta: boolean
  ) {
    if (!etapaActualSeguimiento.value) {
      error.value = 'No hay etapa seleccionada';
      return false;
    }

    if (!comentario.trim()) {
      error.value = 'El comentario no puede estar vacío';
      return false;
    }

    guardando.value = true;
    error.value = '';

    try {
      const { subtareaId, etapaId } = etapaActualSeguimiento.value;
      
      const url = `/subtareas/${subtareaId}/etapas/${etapaId}/seguimientos/${seguimientoId}`;
      const response = await api.put(url, {
        comentario: comentario.trim(),
        tieneAlerta: Boolean(tieneAlerta)
      });

      seguimientosDiarios.value = Array.isArray(response.data.seguimientos)
        ? response.data.seguimientos
        : (response.data || []);

      return true;
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar seguimiento';
      console.error('Error actualizando seguimiento:', err);
      return false;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Elimina un seguimiento
   */
  async function eliminarSeguimiento(seguimientoId: number) {
    if (!confirm('¿Estás seguro de que deseas eliminar este seguimiento?')) {
      return false;
    }

    if (!etapaActualSeguimiento.value) {
      error.value = 'No hay etapa seleccionada';
      return false;
    }

    guardando.value = true;
    error.value = '';

    try {
      const { subtareaId, etapaId } = etapaActualSeguimiento.value;
      
      const url = `/subtareas/${subtareaId}/etapas/${etapaId}/seguimientos/${seguimientoId}`;
      const response = await api.delete(url);

      seguimientosDiarios.value = Array.isArray(response.data.seguimientos)
        ? response.data.seguimientos
        : (response.data || []);

      return true;
    } catch (err: any) {
      error.value = err.message || 'Error al eliminar seguimiento';
      console.error('Error eliminando seguimiento:', err);
      return false;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Formatea fecha con hora para visualización
   */
  function formatearFecha(fechaISO: string | undefined | null): string {
    if (!fechaISO) return 'Sin fecha';
    try {
      const fecha = new Date(fechaISO);
      return fecha.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  }

  /**
   * Obtiene el icono según el estado
   */
  function getIconoAlerta(tieneAlerta: boolean): string {
    return tieneAlerta ? '🚨' : '📝';
  }

  return {
    // Estado
    mostrarSeguimientos,
    cargandoSeguimientos,
    guardando,
    error,
    etapaActualSeguimiento,
    seguimientosDiarios,
    nuevoComentario,
    nuevoAlerta,

    // Computed
    tieneSeguimientos,
    alertasActivas,
    ultimoSeguimiento,

    // Métodos
    abrirSeguimientos,
    cerrarSeguimientos,
    guardarSeguimiento,
    actualizarSeguimiento,
    eliminarSeguimiento,
    formatearFecha,
    getIconoAlerta
  };
}
