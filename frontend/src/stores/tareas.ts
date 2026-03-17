import { defineStore } from 'pinia';
import { tareasService, actividadesService, type Tarea, type Actividad } from '../services/api';

export const useTareasStore = defineStore('tareas', {
  state: () => ({
    tareas: [] as Tarea[],
    actividades: [] as Actividad[],
    tareaActual: null as Tarea | null,
    cargando: false,
    error: null as string | null,
    filtros: {
      estado: '',
      prioridad: '',
      responsableId: null as number | null
    }
  }),

  getters: {
    tareasFiltradas: (state) => {
      return state.tareas;
    },

    tareasPorEstado: (state) => {
      return (estado: string) => state.tareas.filter(t => t.estado === estado);
    },

    tareasAtrasadas: (state) => {
      const hoy = new Date();
      return state.tareas.filter(tarea => {
        if (!tarea.fechaFin || tarea.estado === 'completada' || tarea.estado === 'cerrada') {
          return false;
        }
        return new Date(tarea.fechaFin) < hoy;
      });
    },

    tareasProximasVencer: (state) => {
      const hoy = new Date();
      const proximosDias = new Date();
      proximosDias.setDate(hoy.getDate() + 7);
      
      return state.tareas.filter(tarea => {
        if (!tarea.fechaFin || tarea.estado === 'completada' || tarea.estado === 'cerrada') {
          return false;
        }
        const fechaFin = new Date(tarea.fechaFin);
        return fechaFin >= hoy && fechaFin <= proximosDias;
      });
    }
  },

  actions: {
    async cargarTareas(filtros = {}) {
      this.cargando = true;
      this.error = null;
      try {
        this.tareas = await tareasService.getAll({ ...this.filtros, ...filtros });
      } catch (error: any) {
        this.error = error.message;
        console.error('Error al cargar tareas:', error);
      } finally {
        this.cargando = false;
      }
    },

    async cargarTarea(id: number) {
      this.cargando = true;
      this.error = null;
      try {
        this.tareaActual = await tareasService.getById(id);
      } catch (error: any) {
        this.error = error.message;
        console.error('Error al cargar tarea:', error);
      } finally {
        this.cargando = false;
      }
    },

    async crearTarea(tarea: Partial<Tarea>) {
      this.cargando = true;
      this.error = null;
      try {
        const nuevaTarea = await tareasService.create(tarea);
        this.tareas.push(nuevaTarea);
        return nuevaTarea;
      } catch (error: any) {
        this.error = error.message;
        console.error('Error al crear tarea:', error);
        throw error;
      } finally {
        this.cargando = false;
      }
    },

    async actualizarTarea(id: number, datos: Partial<Tarea>) {
      this.cargando = true;
      this.error = null;
      try {
        const tareaActualizada = await tareasService.update(id, datos);
        const index = this.tareas.findIndex(t => t.id === id);
        if (index !== -1) {
          this.tareas[index] = tareaActualizada;
        }
        if (this.tareaActual?.id === id) {
          this.tareaActual = tareaActualizada;
        }
        return tareaActualizada;
      } catch (error: any) {
        this.error = error.message;
        console.error('Error al actualizar tarea:', error);
        throw error;
      } finally {
        this.cargando = false;
      }
    },

    async eliminarTarea(id: number) {
      this.cargando = true;
      this.error = null;
      try {
        await tareasService.delete(id);
        this.tareas = this.tareas.filter(t => t.id !== id);
      } catch (error: any) {
        this.error = error.message;
        console.error('Error al eliminar tarea:', error);
        throw error;
      } finally {
        this.cargando = false;
      }
    },

    async cargarActividades() {
      try {
        this.actividades = await actividadesService.getAll();
      } catch (error: any) {
        console.error('Error al cargar actividades:', error);
      }
    },

    establecerFiltros(filtros: any) {
      this.filtros = { ...this.filtros, ...filtros };
    },

    limpiarFiltros() {
      this.filtros = {
        estado: '',
        prioridad: '',
        responsableId: null
      };
    }
  }
});
