<template>
  <div class="catalogo-etapas-view">
    <div v-if="mensaje" :class="['mensaje', tipoMensaje]">{{ mensaje }}</div>

    <!-- Modal de Crear Nueva Etapa -->
    <div v-if="mostrarModalCrear" class="modal-overlay" @click.self="mostrarModalCrear = false">
      <div class="modal-content modal-crear-etapa" @click.stop>
        <div class="modal-header">
          <h2>➕ Crear Nueva Etapa</h2>
          <button type="button" class="btn-close" @click="mostrarModalCrear = false">✕</button>
        </div>

        <form class="crear-form" @submit.prevent="crearEtapa">
          <div class="form-group">
            <label>Nombre de la etapa *</label>
            <input
              v-model="nuevaEtapa.nombre"
              type="text"
              placeholder="Nombre de la etapa"
              required
            />
          </div>
          <div class="form-group">
            <label>Clasificación *</label>
            <select v-model="nuevaEtapa.clasificacion" required>
              <option value="">-- Seleccionar --</option>
              <option value="sin_clasificar">⚪ Sin Clasificar</option>
              <option value="preparatoria">🔵 Preparatoria</option>
              <option value="precontractual">🟢 Precontractual</option>
              <option value="contractual">🔴 Contractual</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="submit" :disabled="guardando" class="btn-primary">
              {{ guardando ? 'Creando...' : '✓ Crear Etapa' }}
            </button>
            <button type="button" class="btn-secondary" @click="mostrarModalCrear = false">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tabla de Etapas -->
    <section class="card">
      <div class="section-header">
        <h2>Etapas</h2>
        <div class="header-buttons">
          <button
            type="button"
            class="btn-crear-modal"
            @click="mostrarModalCrear = true"
          >
            ➕ Crear Nueva Etapa
          </button>
          <button
            v-if="!modoClasificacion"
            type="button"
            class="btn-clasificar"
            @click="iniciarModoClasificacion"
          >
            📋 Clasificar Etapas
          </button>
          <button
            v-else
            type="button"
            class="btn-cancelar-modo"
            @click="cancelarModoClasificacion"
          >
            ✕ Cancelar
          </button>
        </div>
      </div>
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead>
            <tr>
              <th width="40" v-if="modoClasificacion">
                <input type="checkbox" v-model="seleccionarTodas" @change="actualizarSeleccion" />
              </th>
              <th width="50">ID</th>
              <th width="300">Nombre</th>
              <th width="150">Clasificación</th>
              <th width="150">Actualizado</th>
              <th width="120">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="etapasFiltradas.length === 0">
              <td colspan="6" class="sin-datos">No hay etapas para mostrar</td>
            </tr>
            <tr v-for="etapa in etapasFiltradas" :key="etapa.id" :class="{ editando: etapa.id === etapaEditando, seleccionada: modoClasificacion && etapasSeleccionadas.includes(etapa.id) }">
              <td class="checkbox-cell" v-if="modoClasificacion">
                <input type="checkbox" :checked="etapasSeleccionadas.includes(etapa.id)" @change="(e) => toggleEtapaSeleccionada(etapa.id, (e.target as HTMLInputElement).checked)" />
              </td>
              <td class="numero">{{ etapa.id }}</td>
              <td class="nombre">{{ etapa.nombre }}</td>
              <td>
                <select v-model="etapa.clasificacion" :disabled="etapa.id !== etapaEditando" class="select-clasificacion">
                  <option value="preparatoria">🔵 Preparatoria</option>
                  <option value="precontractual">🟢 Precontractual</option>
                  <option value="contractual">🔴 Contractual</option>
                  <option value="sin_clasificar">⚪ Sin Clasificar</option>
                </select>
              </td>
              <td class="fecha">{{ formatoFecha(etapa.updatedAt) }}</td>
              <td class="acciones">
                <button
                  v-if="etapa.id !== etapaEditando"
                  type="button"
                  class="btn-editar"
                  @click="iniciarEdicion(etapa.id)"
                  :disabled="guardando"
                >
                  ✏️ Editar
                </button>
                <div v-else class="acciones-edicion">
                  <button
                    type="button"
                    class="btn-guardar"
                    @click="guardarEtapa(etapa)"
                    :disabled="guardando"
                  >
                    ✓ Guardar
                  </button>
                  <button type="button" class="btn-cancelar" @click="cancelarEdicion" :disabled="guardando">
                    ✗ Cancelar
                  </button>
                </div>
                <button
                  v-if="etapa.id === etapaEditando"
                  type="button"
                  class="btn-eliminar-inline"
                  @click="eliminarEtapa(etapa)"
                  :disabled="guardando"
                >
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Edición Masiva -->
    <section class="card edicion-masiva" v-if="modoClasificacion && etapasSeleccionadas.length > 0">
      <div class="bulk-edit-container">
        <div class="bulk-edit-info">
          <p><strong>{{ etapasSeleccionadas.length }}</strong> etapa(s) seleccionada(s)</p>
          <div class="seleccionadas-list">
            <span v-for="id in etapasSeleccionadas" :key="id" class="tag">
              {{ etapas.find(e => e.id === id)?.nombre }}
            </span>
          </div>
        </div>

        <div class="bulk-edit-controls">
          <label>Cambiar clasificación de todas a:</label>
          <select
            v-model="masiva.clasificacionUnica"
            class="select-clasificacion-masiva-grande"
          >
            <option value="">-- Seleccionar clasificación --</option>
            <option value="preparatoria">🔵 Preparatoria</option>
            <option value="precontractual">🟢 Precontractual</option>
            <option value="contractual">🔴 Contractual</option>
            <option value="sin_clasificar">⚪ Sin Clasificar</option>
          </select>

          <div class="bulk-actions-bottom">
            <button
              @click="aplicarClasificacionMasiva"
              :disabled="!masiva.clasificacionUnica || guardando"
              class="btn-aplicar"
            >
              {{ guardando ? 'Guardando...' : '💾 Guardar' }}
            </button>
            <button
              @click="cancelarSeleccion"
              class="btn-cancelar-masiva"
            >
              ✗ Cancelar
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import api from '../services/api';

const guardando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('info');
const mostrarModalCrear = ref(false);
const modoClasificacion = ref(false);

const etapas = ref<any[]>([]);
const resumen = ref<any>({
  totalEtapas: 0,
  clasificadas: 0,
  sinClasificar: 0,
  porClasificacion: {}
});

const etapaEditando = ref<number | null>(null);
const etapaOriginal = ref<any>(null);

const nuevaEtapa = ref({
  nombre: '',
  clasificacion: 'sin_clasificar'
});

const seleccionarTodas = ref(false);
const etapasSeleccionadas = ref<number[]>([]);
const masiva = ref({
  clasificacionUnica: ''
});

const etapasFiltradas = computed(() => etapas.value);

function formatoFecha(fecha: string): string {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

async function cargarEtapas() {
  try {
    guardando.value = true;
    mensaje.value = '';

    const [etapasResp, resumenResp] = await Promise.all([
      api.get('/catalogos/etapas'),
      api.get('/catalogos/etapas-resumen')
    ]);

    etapas.value = etapasResp.data || [];
    resumen.value = resumenResp.data || {};
  } catch (error: any) {
    tipoMensaje.value = 'error';
    mensaje.value = error?.response?.data?.error || 'Error al cargar etapas';
    console.error('Error al cargar:', error);
  } finally {
    guardando.value = false;
  }
}

function iniciarEdicion(id: number) {
  etapaEditando.value = id;
  const etapa = etapas.value.find(e => e.id === id);
  if (etapa) {
    etapaOriginal.value = { ...etapa };
  }
}

function cancelarEdicion() {
  if (etapaOriginal.value && etapaEditando.value) {
    const idx = etapas.value.findIndex(e => e.id === etapaEditando.value);
    if (idx >= 0) {
      etapas.value[idx] = { ...etapaOriginal.value };
    }
  }
  etapaEditando.value = null;
  etapaOriginal.value = null;
}

async function crearEtapa() {
  if (!nuevaEtapa.value.nombre.trim()) {
    tipoMensaje.value = 'error';
    mensaje.value = 'El nombre de la etapa es requerido';
    return;
  }

  try {
    guardando.value = true;
    mensaje.value = '';

    await api.post('/catalogos/etapas', {
      nombre: nuevaEtapa.value.nombre.trim(),
      clasificacion: nuevaEtapa.value.clasificacion
    });

    tipoMensaje.value = 'success';
    mensaje.value = `Etapa "${nuevaEtapa.value.nombre}" creada correctamente`;

    nuevaEtapa.value = {
      nombre: '',
      clasificacion: 'sin_clasificar'
    };

    mostrarModalCrear.value = false;
    await cargarEtapas();
  } catch (error: any) {
    tipoMensaje.value = 'error';
    mensaje.value = error?.response?.data?.error || 'Error al crear etapa';
    console.error('Error:', error);
  } finally {
    guardando.value = false;
  }
}

async function guardarEtapa(etapa: any) {
  try {
    guardando.value = true;
    mensaje.value = '';

    await api.put(`/catalogos/etapas/${etapa.id}`, {
      clasificacion: etapa.clasificacion
    });

    tipoMensaje.value = 'success';
    mensaje.value = `Etapa "${etapa.nombre}" actualizada correctamente`;
    etapaEditando.value = null;
    etapaOriginal.value = null;
    await cargarEtapas();
  } catch (error: any) {
    tipoMensaje.value = 'error';
    mensaje.value = error?.response?.data?.error || 'Error al guardar etapa';
    console.error('Error:', error);
  } finally {
    guardando.value = false;
  }
}

async function eliminarEtapa(etapa: any) {
  if (!confirm(`¿Eliminar la etapa "${etapa.nombre}"? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    guardando.value = true;
    mensaje.value = '';

    await api.delete(`/catalogos/etapas/${etapa.id}`);

    tipoMensaje.value = 'success';
    mensaje.value = `Etapa "${etapa.nombre}" eliminada correctamente`;
    etapaEditando.value = null;
    etapaOriginal.value = null;
    await cargarEtapas();
  } catch (error: any) {
    tipoMensaje.value = 'error';
    mensaje.value = error?.response?.data?.error || 'Error al eliminar etapa';
    console.error('Error:', error);
  } finally {
    guardando.value = false;
  }
}

function actualizarSeleccion() {
  if (seleccionarTodas.value) {
    etapasSeleccionadas.value = etapasFiltradas.value.map(e => e.id);
  } else {
    etapasSeleccionadas.value = [];
  }
}

function toggleEtapaSeleccionada(id: number, checked: boolean) {
  if (checked) {
    if (!etapasSeleccionadas.value.includes(id)) {
      etapasSeleccionadas.value.push(id);
    }
  } else {
    etapasSeleccionadas.value = etapasSeleccionadas.value.filter(etapaId => etapaId !== id);
    seleccionarTodas.value = false;
  }
}

async function aplicarClasificacionMasiva() {
  if (!masiva.value.clasificacionUnica || etapasSeleccionadas.value.length === 0) return;

  const etapasParaActualizar = etapasSeleccionadas.value.map(id => ({
    id,
    clasificacion: masiva.value.clasificacionUnica
  }));

  try {
    guardando.value = true;
    mensaje.value = '';

    const response = await api.post('/catalogos/etapas/clasificar-multiple', {
      etapas: etapasParaActualizar
    });

    tipoMensaje.value = 'success';
    mensaje.value = `${response.data.actualizadas} etapa(s) clasificada(s) correctamente`;

    seleccionarTodas.value = false;
    etapasSeleccionadas.value = [];
    masiva.value = { clasificacionUnica: '' };
    modoClasificacion.value = false;

    await cargarEtapas();
  } catch (error: any) {
    tipoMensaje.value = 'error';
    mensaje.value = error?.response?.data?.error || 'Error al clasificar etapas';
    console.error('Error:', error);
  } finally {
    guardando.value = false;
  }
}

function cancelarSeleccion() {
  seleccionarTodas.value = false;
  etapasSeleccionadas.value = [];
  masiva.value = { clasificacionUnica: '' };
}

function iniciarModoClasificacion() {
  modoClasificacion.value = true;
  etapasSeleccionadas.value = [];
  seleccionarTodas.value = false;
  masiva.value = { clasificacionUnica: '' };
}

function cancelarModoClasificacion() {
  modoClasificacion.value = false;
  etapasSeleccionadas.value = [];
  seleccionarTodas.value = false;
  masiva.value = { clasificacionUnica: '' };
}

onMounted(() => {
  cargarEtapas();
});
</script>

<style scoped>
.catalogo-etapas-view {
  padding: 2rem;
  background: #f5f5f5;
  min-height: 100vh;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: #333;
}

.header p {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.mensaje {
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.mensaje.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.mensaje.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.mensaje.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.card {
  background: white;
  border-radius: 6px;
  padding: 0.5rem 1.5rem 1.5rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  color: #333;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-clasificar,
.btn-cancelar-modo {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-clasificar {
  background: #667eea;
  color: white;
}

.btn-clasificar:hover {
  background: #5568d3;
}

.btn-cancelar-modo {
  background: #ef4444;
  color: white;
}

.btn-cancelar-modo:hover {
  background: #dc2626;
}

.crear-etapa {
  background: #f0f9ff;
  border: 2px solid #0284c7;
}

.crear-etapa h2 {
  color: #0284c7;
}

.crear-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group textarea {
  min-height: 50px;
  resize: vertical;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
}

.btn-crear {
  padding: 0.75rem 1.5rem;
  background: #0284c7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-crear:hover:not(:disabled) {
  background: #0369a1;
}

.btn-crear:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-eliminar-inline {
  padding: 0.4rem 0.6rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.8rem;
  transition: background 0.2s;
  margin-left: 0.5rem;
}

.btn-eliminar-inline:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-eliminar-inline:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.resumen {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.resumen h2 {
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.stat .label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.stat .value {
  font-size: 2rem;
  font-weight: bold;
  margin-top: 0.5rem;
}

.clasificacion-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.9rem;
}

.clasificacion-badge {
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.85rem;
}

.clasificacion-badge.preparatoria { background: #4a90e2; color: white; }
.clasificacion-badge.precontractual { background: #7ed321; color: white; }
.clasificacion-badge.contractual { background: #f5a623; color: white; }
.clasificacion-badge.sin_clasificar { background: #999; color: white; }

.cantidad {
  opacity: 0.9;
  font-size: 0.9rem;
}

.filtros {
  background: white;
}

.filter-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 500;
  color: #333;
}

.filter-group input,
.filter-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.filter-group input:focus,
.filter-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.btn-export {
  padding: 0.75rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-export:hover {
  background: #5568d3;
}

.btn-export:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.tabla-contenedor {
  overflow-x: auto;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla thead {
  background: #f9f9f9;
  border-bottom: 2px solid #ddd;
}

.tabla th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.tabla td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  vertical-align: top;
}

.tabla tbody tr:hover {
  background: #f9f9f9;
}

.tabla tbody tr.editando {
  background: #fffacd;
}

.tabla tbody tr.seleccionada {
  background: #e0f0ff;
}

.checkbox-cell {
  text-align: center;
  padding: 0.75rem 0.5rem !important;
}

.checkbox-cell input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.tabla th input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.tabla td.numero {
  font-weight: 600;
  color: #667eea;
}

.tabla td.nombre {
  font-weight: 500;
  max-width: 300px;
  word-break: break-word;
}

.tabla td.fecha {
  color: #999;
  font-size: 0.85rem;
}

.tabla td.sin-datos {
  text-align: center;
  color: #999;
  padding: 2rem !important;
  font-style: italic;
}

.select-clasificacion {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 0.9rem;
  font-family: inherit;
}

.select-clasificacion:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.select-clasificacion:not(:disabled):focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.acciones {
  display: flex;
  gap: 0.5rem;
}

.acciones-edicion {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-editar,
.btn-guardar,
.btn-cancelar,
.btn-aplicar {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-editar {
  background: #4a90e2;
  color: white;
}

.btn-editar:hover:not(:disabled) {
  background: #3d7bc0;
}

.btn-guardar {
  background: #7ed321;
  color: white;
}

.btn-guardar:hover:not(:disabled) {
  background: #6ab61a;
}

.btn-cancelar {
  background: #e74c3c;
  color: white;
}

.btn-cancelar:hover:not(:disabled) {
  background: #c0392b;
}

.btn-editar:disabled,
.btn-guardar:disabled,
.btn-cancelar:disabled,
.btn-aplicar:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.edicion-masiva {
  background: #f0f4ff;
  border: 2px solid #667eea;
}

.edicion-masiva h2 {
  color: #333;
}

.edicion-masiva p {
  margin: 0 0 1rem 0;
  color: #666;
}

.bulk-actions {
  margin-bottom: 1.5rem;
}

.select-all {
  margin-bottom: 1rem;
}

.select-all input[type="checkbox"] {
  margin-right: 0.5rem;
  cursor: pointer;
}

.bulk-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.bulk-form select,
.bulk-form input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.bulk-edit-container {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.bulk-edit-info {
  flex: 1;
}

.bulk-edit-info p {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}

.seleccionadas-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-block;
  background: #e0f0ff;
  color: #0284c7;
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.bulk-edit-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bulk-edit-controls label {
  font-weight: 500;
  color: #333;
  display: block;
}

.select-clasificacion-masiva-grande {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.select-clasificacion-masiva-grande:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.bulk-actions-bottom {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
}

.btn-aplicar {
  background: #667eea;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-aplicar:hover:not(:disabled) {
  background: #5568d3;
}

.btn-aplicar:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-cancelar-masiva {
  background: #e5e7eb;
  color: #333;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-cancelar-masiva:hover {
  background: #d1d5db;
}

.seleccionadas-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
}

.seleccionadas-preview strong {
  display: block;
  margin-bottom: 0.75rem;
  color: #333;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  background: #e8eef9;
  color: #667eea;
  border-radius: 3px;
  font-size: 0.85rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .catalogo-etapas-view {
    padding: 1rem;
  }

  .tabla {
    font-size: 0.8rem;
  }

  .tabla th,
  .tabla td {
    padding: 0.5rem;
  }

  .header h1 {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filtros {
    grid-template-columns: 1fr !important;
  }
}

/* Header Actions */
.header-actions {
  margin-bottom: 0;
  display: flex;
  justify-content: flex-start;
}

.btn-crear-modal {
  padding: 0.4rem 0.9rem;
  background: #0284c7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.btn-crear-modal:hover {
  background: #0369a1;
}

.btn-crear-modal:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-crear-etapa {
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #0284c7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #e5e7eb;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #d1d5db;
}

</style>
