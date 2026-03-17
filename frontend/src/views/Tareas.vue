<template>
  <div class="tareas-view">
    <div class="header">
      <h1>Procesos</h1>
      <button class="btn btn-primary" @click="mostrarFormularioNueva = true">+ Nuevo Proceso</button>
    </div>

    <!-- Filtros -->
    <div class="filtros">
      <select v-model="filtroEstado" @change="aplicarFiltros" class="select">
        <option value="">Todos los estados</option>
        <option v-for="(label, value) in ESTADOS_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>

      <select v-model="filtroPrioridad" @change="aplicarFiltros" class="select">
        <option value="">Todas las prioridades</option>
        <option v-for="(label, value) in PRIORIDADES_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>

      <button v-if="filtroEstado || filtroPrioridad" @click="limpiarFiltros" class="btn btn-secondary">
        Limpiar filtros
      </button>
    </div>

    <div v-if="cargando" class="loading">Cargando procesos...</div>

    <!-- Tabla de tareas -->
    <div v-else class="tabla-container">
      <table v-if="tareas.length > 0" class="tabla">
        <thead>
          <tr>
            <th>Proceso</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Responsable</th>
            <th>Fecha Fin</th>
            <th>Avance</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tarea in tareas" :key="tarea.id">
            <td>
              <router-link :to="`/tareas/${tarea.id}`" class="tarea-nombre">
                {{ tarea.nombre }}
              </router-link>
            </td>
            <td>
              <span class="badge" :style="{ backgroundColor: getColorEstado(tarea.estado) }">
                {{ getLabelEstado(tarea.estado) }}
              </span>
            </td>
            <td>
              <span class="badge" :style="{ backgroundColor: getColorPrioridad(tarea.prioridad) }">
                {{ getLabelPrioridad(tarea.prioridad) }}
              </span>
            </td>
            <td>{{ tarea.responsable?.nombre || 'Sin asignar' }}</td>
            <td>{{ formatearFecha(tarea.fechaFin) }}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: tarea.avanceFisico + '%' }"></div>
                <span class="progress-text">{{ tarea.avanceFisico }}%</span>
              </div>
            </td>
            <td>
              <button @click="editarTarea(tarea)" class="btn-icon" title="Editar">✏️</button>
              <button @click="eliminarTareaConfirm(tarea.id)" class="btn-icon" title="Eliminar">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <p>No hay procesos que mostrar</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTareasStore } from '../stores/tareas';
import { ESTADOS_LABELS, ESTADOS_COLORS, PRIORIDADES_LABELS, PRIORIDADES_COLORS } from '../config/constants';

const tareasStore = useTareasStore();
const cargando = ref(true);
const filtroEstado = ref('');
const filtroPrioridad = ref('');
const mostrarFormularioNueva = ref(false);

const tareas = computed(() => tareasStore.tareas);

onMounted(async () => {
  await tareasStore.cargarTareas();
  cargando.value = false;
});

function aplicarFiltros() {
  tareasStore.establecerFiltros({
    estado: filtroEstado.value,
    prioridad: filtroPrioridad.value
  });
  tareasStore.cargarTareas();
}

function limpiarFiltros() {
  filtroEstado.value = '';
  filtroPrioridad.value = '';
  tareasStore.limpiarFiltros();
  tareasStore.cargarTareas();
}

function formatearFecha(fecha: string) {
  if (!fecha) return 'Sin fecha';
  return new Date(fecha).toLocaleDateString('es-EC');
}

function getLabelEstado(estado: string) {
  return ESTADOS_LABELS[estado] || estado;
}

function getColorEstado(estado: string) {
  return ESTADOS_COLORS[estado] || '#9ca3af';
}

function getLabelPrioridad(prioridad: string) {
  return PRIORIDADES_LABELS[prioridad] || prioridad;
}

function getColorPrioridad(prioridad: string) {
  return PRIORIDADES_COLORS[prioridad] || '#9ca3af';
}

function editarTarea(tarea: any) {
  // TODO: Implementar formulario de edición
  alert(`Editar proceso: ${tarea.nombre}`);
}

async function eliminarTareaConfirm(id: number) {
  if (confirm('¿Está seguro de eliminar este proceso?')) {
    try {
      await tareasStore.eliminarTarea(id);
      alert('Proceso eliminado correctamente');
    } catch (error) {
      alert('Error al eliminar el proceso');
    }
  }
}
</script>

<style scoped>
.tareas-view {
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  margin: 0;
  color: #1f2937;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}

.filtros {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.tabla-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
}

.tabla thead {
  background-color: #f9fafb;
}

.tabla th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.tabla td {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.tarea-nombre {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.tarea-nombre:hover {
  text-decoration: underline;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.progress-bar {
  position: relative;
  width: 100px;
  height: 20px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #10b981;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  margin: 0 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}
</style>
