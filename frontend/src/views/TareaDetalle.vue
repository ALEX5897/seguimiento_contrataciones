<template>
  <div class="tarea-detalle">
    <div v-if="cargando" class="loading">Cargando detalle...</div>

    <div v-else-if="tarea">
      <div class="header">
        <button @click="$router.back()" class="btn-back">← Volver</button>
        <h1>{{ tarea.nombre }}</h1>
      </div>

      <!-- Info Principal -->
      <div class="card">
        <h2>Información General</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Estado:</label>
            <select v-model="tarea.estado" @change="actualizarEstado" class="select">
              <option v-for="(label, value) in ESTADOS_LABELS" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </div>

          <div class="info-item">
            <label>Prioridad:</label>
            <span class="badge" :style="{ backgroundColor: getColorPrioridad(tarea.prioridad) }">
              {{ getLabelPrioridad(tarea.prioridad) }}
            </span>
          </div>

          <div class="info-item">
            <label>Responsable:</label>
            <p>{{ tarea.responsable?.nombre || 'Sin asignar' }}</p>
          </div>

          <div class="info-item">
            <label>Proceso:</label>
            <p>{{ tarea.actividad?.nombre || 'N/A' }}</p>
          </div>

          <div class="info-item">
            <label>Fecha Inicio:</label>
            <p>{{ formatearFecha(tarea.fechaInicio) }}</p>
          </div>

          <div class="info-item">
            <label>Fecha Fin:</label>
            <p>{{ formatearFecha(tarea.fechaFin) }}</p>
          </div>

          <div class="info-item">
            <label>Avance Físico:</label>
            <div class="progress-container">
              <input 
                type="number" 
                v-model.number="tarea.avanceFisico" 
                min="0" 
                max="100" 
                @change="actualizarAvance"
                class="input-avance"
              >
              <span>%</span>
            </div>
          </div>
        </div>

        <div v-if="tarea.observaciones" class="observaciones">
          <label>Observaciones:</label>
          <p>{{ tarea.observaciones }}</p>
        </div>
      </div>

      <!-- Subtareas -->
      <div v-if="tarea.subtareas && tarea.subtareas.length > 0" class="card">
        <h2>Subtareas</h2>
        <div v-for="subtarea in tarea.subtareas" :key="subtarea.id" class="subtarea-item">
          <h3>{{ subtarea.nombre }}</h3>
          <div class="subtarea-info">
            <p><strong>Código Olympo:</strong> {{ subtarea.codigoOlympo }}</p>
            <p><strong>Partida:</strong> {{ subtarea.partidaPresupuestaria }}</p>
            <p><strong>Presupuesto:</strong> ${{ subtarea.presupuesto?.toLocaleString() }}</p>
            <p><strong>Avance:</strong> {{ subtarea.avance }}%</p>
          </div>
        </div>
      </div>

      <!-- Hitos de Contratación -->
      <div v-if="tarea.hitos && tarea.hitos.length > 0" class="card">
        <h2>Hitos de Contratación</h2>
        <div class="hitos-lista">
          <div v-for="hito in tarea.hitos" :key="hito.id" class="hito-item">
            <div class="hito-header">
              <h3>{{ hito.nombre }}</h3>
              <span 
                class="badge" 
                :class="hito.estado === 'pendiente' ? 'badge-warning' : 'badge-success'"
              >
                {{ hito.estado }}
              </span>
            </div>
            <p><strong>Fecha planificada:</strong> {{ formatearFecha(hito.fechaPlanificada) }}</p>
            <p v-if="hito.fechaReal">
              <strong>Fecha real:</strong> {{ formatearFecha(hito.fechaReal) }}
            </p>
            <p v-if="hito.observaciones">{{ hito.observaciones }}</p>
          </div>
        </div>
      </div>

      <!-- Historial de Estados -->
      <div v-if="tarea.historial && tarea.historial.length > 0" class="card">
        <h2>Historial de Cambios</h2>
        <div class="historial">
          <div v-for="(cambio, index) in tarea.historial" :key="index" class="historial-item">
            <div class="historial-fecha">{{ formatearFechaHora(cambio.fecha) }}</div>
            <div class="historial-cambio">
              <span class="estado-anterior">{{ getLabelEstado(cambio.estadoAnterior) }}</span>
              →
              <span class="estado-nuevo">{{ getLabelEstado(cambio.estadoNuevo) }}</span>
            </div>
            <p v-if="cambio.observaciones" class="historial-obs">{{ cambio.observaciones }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="error">
      Proceso no encontrado
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTareasStore } from '../stores/tareas';
import { ESTADOS_LABELS, PRIORIDADES_LABELS, PRIORIDADES_COLORS } from '../config/constants';

const route = useRoute();
const tareasStore = useTareasStore();
const cargando = ref(true);
const tarea = ref<any>(null);

onMounted(async () => {
  const id = parseInt(route.params.id as string);
  await tareasStore.cargarTarea(id);
  tarea.value = tareasStore.tareaActual;
  cargando.value = false;
});

async function actualizarEstado() {
  if (!tarea.value) return;
  try {
    await tareasStore.actualizarTarea(tarea.value.id, { estado: tarea.value.estado });
    alert('Estado actualizado correctamente');
  } catch (error) {
    alert('Error al actualizar el estado');
  }
}

async function actualizarAvance() {
  if (!tarea.value) return;
  try {
    await tareasStore.actualizarTarea(tarea.value.id, { avanceFisico: tarea.value.avanceFisico });
  } catch (error) {
    alert('Error al actualizar el avance');
  }
}

function formatearFecha(fecha: string) {
  if (!fecha) return 'Sin fecha';
  return new Date(fecha).toLocaleDateString('es-EC');
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString('es-EC');
}

function getLabelEstado(estado: string) {
  return ESTADOS_LABELS[estado] || estado;
}

function getLabelPrioridad(prioridad: string) {
  return PRIORIDADES_LABELS[prioridad] || prioridad;
}

function getColorPrioridad(prioridad: string) {
  return PRIORIDADES_COLORS[prioridad] || '#9ca3af';
}
</script>

<style scoped>
.tarea-detalle {
  padding: 1rem;
}

.header {
  margin-bottom: 2rem;
}

.btn-back {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 1rem;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
}

.btn-back:hover {
  text-decoration: underline;
}

h1 {
  margin: 0;
  color: #1f2937;
}

h2 {
  margin-top: 0;
  color: #374151;
  font-size: 1.25rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.info-item label {
  display: block;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.info-item p {
  margin: 0;
  color: #1f2937;
}

.select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 100%;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.badge-warning {
  background-color: #f59e0b;
}

.badge-success {
  background-color: #10b981;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input-avance {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.observaciones {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.subtarea-item {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.subtarea-item h3 {
  margin-top: 0;
  color: #1f2937;
}

.subtarea-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.subtarea-info p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.hitos-lista {
  display: grid;
  gap: 1rem;
}

.hito-item {
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 4px;
}

.hito-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.hito-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1f2937;
}

.hito-item p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.historial {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.historial-item {
  padding: 1rem;
  background-color: #f9fafb;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
}

.historial-fecha {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.historial-cambio {
  font-weight: 600;
  color: #1f2937;
}

.historial-obs {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.estado-anterior {
  color: #9ca3af;
}

.estado-nuevo {
  color: #3b82f6;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}
</style>
