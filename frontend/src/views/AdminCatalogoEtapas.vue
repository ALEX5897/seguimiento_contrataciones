<template>
  <div class="catalogo-etapas-view">
    <div class="header">
      <h1>Catálogo de Etapas</h1>
      <p>Administra la clasificación y orden de las etapas de contratación</p>
    </div>

    <div v-if="mensaje" :class="['mensaje', tipoMensaje]">{{ mensaje }}</div>

    <!-- Resumen -->
    <section class="card resumen">
      <h2>Resumen</h2>
      <div class="stats-grid">
        <div class="stat">
          <span class="label">Total Etapas</span>
          <span class="value">{{ resumen.totalEtapas }}</span>
        </div>
        <div class="stat">
          <span class="label">Clasificadas</span>
          <span class="value">{{ resumen.clasificadas }}</span>
        </div>
        <div class="stat">
          <span class="label">Sin Clasificar</span>
          <span class="value">{{ resumen.sinClasificar }}</span>
        </div>
      </div>

      <div class="clasificacion-stats">
        <div v-for="(datos, clasificacion) in resumen.porClasificacion" :key="clasificacion" class="stat-item">
          <span class="clasificacion-badge" :class="String(clasificacion)">{{ formatoClasificacion(String(clasificacion)) }}</span>
          <span class="cantidad">{{ datos.cantidad }} etapas</span>
        </div>
      </div>
    </section>

    <!-- Crear Nueva Etapa -->
    <section class="card crear-etapa">
      <h2>➕ Crear Nueva Etapa</h2>
      <form class="crear-form" @submit.prevent="crearEtapa">
        <div class="form-group">
          <input
            v-model="nuevaEtapa.nombre"
            type="text"
            placeholder="Nombre de la etapa"
            required
          />
        </div>
        <div class="form-group">
          <select v-model="nuevaEtapa.clasificacion">
            <option value="sin_clasificar">⚪ Sin Clasificar</option>
            <option value="preparatoria">🔵 Preparatoria</option>
            <option value="precontractual">🟢 Precontractual</option>
            <option value="contractual">🔴 Contractual</option>
          </select>
        </div>
        <div class="form-group">
          <input
            v-model.number="nuevaEtapa.orden"
            type="number"
            placeholder="Orden (opcional)"
            min="0"
          />
        </div>
        <div class="form-group">
          <textarea
            v-model="nuevaEtapa.descripcion"
            placeholder="Descripción (opcional)"
            rows="2"
          />
        </div>
        <button type="submit" :disabled="guardando" class="btn-crear">
          ➕ Crear Etapa
        </button>
      </form>
    </section>

    <!-- Filtros -->
    <section class="card filtros">
      <h2>Filtros</h2>
      <div class="filter-group">
        <label>
          Mostrar clasificación:
          <select v-model="filtroClasificacion" @change="actualizarVista">
            <option value="">Todas</option>
            <option value="preparatoria">Preparatoria</option>
            <option value="precontractual">Precontractual</option>
            <option value="contractual">Contractual</option>
            <option value="sin_clasificar">Sin Clasificar</option>
          </select>
        </label>

        <label>
          Buscar:
          <input v-model="busqueda" type="text" placeholder="Buscar por nombre..." @input="actualizarVista" />
        </label>

        <button @click="exportarJSON" class="btn-export">📥 Exportar JSON</button>
      </div>
    </section>

    <!-- Tabla de Etapas -->
    <section class="card">
      <h2>Etapas</h2>
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead>
            <tr>
              <th width="50">ID</th>
              <th width="300">Nombre</th>
              <th width="150">Clasificación</th>
              <th width="80">Orden</th>
              <th width="250">Descripción</th>
              <th width="150">Actualizado</th>
              <th width="120">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="etapasFiltradas.length === 0">
              <td colspan="7" class="sin-datos">No hay etapas para mostrar</td>
            </tr>
            <tr v-for="etapa in etapasFiltradas" :key="etapa.id" :class="{ editando: etapa.id === etapaEditando }">
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
              <td>
                <input
                  v-model.number="etapa.orden"
                  type="number"
                  :disabled="etapa.id !== etapaEditando"
                  class="input-orden"
                  min="0"
                />
              </td>
              <td>
                <textarea
                  v-model="etapa.descripcion"
                  :disabled="etapa.id !== etapaEditando"
                  class="textarea-descripcion"
                  rows="1"
                  placeholder="Agregar descripción..."
                />
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
    <section class="card edicion-masiva">
      <h2>Edición Masiva</h2>
      <p>Selecciona etapas y asigna una clasificación a todas ellas</p>

      <div class="bulk-actions">
        <div class="select-all">
          <label>
            <input type="checkbox" v-model="seleccionarTodas" @change="actualizarSeleccion" />
            Seleccionar todas las etapas mostradas
          </label>
        </div>

        <div class="bulk-form">
          <select v-model="masiva.clasificacion" :disabled="etapasSeleccionadas.length === 0">
            <option value="">-- Seleccionar clasificación --</option>
            <option value="preparatoria">🔵 Preparatoria</option>
            <option value="precontractual">🟢 Precontractual</option>
            <option value="contractual">🔴 Contractual</option>
            <option value="sin_clasificar">⚪ Sin Clasificar</option>
          </select>

          <input
            v-model.number="masiva.ordenInicial"
            type="number"
            placeholder="Orden inicial (opcional)"
            :disabled="etapasSeleccionadas.length === 0"
            min="0"
          />

          <button
            @click="aplicarClasificacionMasiva"
            :disabled="!masiva.clasificacion || etapasSeleccionadas.length === 0 || guardando"
            class="btn-aplicar"
          >
            🚀 Aplicar a {{ etapasSeleccionadas.length }} etapa(s)
          </button>
        </div>
      </div>

      <div v-if="etapasSeleccionadas.length > 0" class="seleccionadas-preview">
        <strong>Etapas seleccionadas ({{ etapasSeleccionadas.length }}):</strong>
        <div class="tags">
          <span v-for="id in etapasSeleccionadas" :key="id" class="tag">
            {{ etapas.find(e => e.id === id)?.nombre }}
          </span>
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

const etapas = ref<any[]>([]);
const resumen = ref<any>({
  totalEtapas: 0,
  clasificadas: 0,
  sinClasificar: 0,
  porClasificacion: {}
});

const filtroClasificacion = ref('');
const busqueda = ref('');
const etapaEditando = ref<number | null>(null);
const etapaOriginal = ref<any>(null);

const nuevaEtapa = ref({
  nombre: '',
  clasificacion: 'sin_clasificar',
  orden: null as number | null,
  descripcion: ''
});

const seleccionarTodas = ref(false);
const etapasSeleccionadas = ref<number[]>([]);
const masiva = ref({
  clasificacion: '',
  ordenInicial: null
});

const etapasFiltradas = computed(() => {
  let resultado = etapas.value;

  if (filtroClasificacion.value) {
    resultado = resultado.filter(e => e.clasificacion === filtroClasificacion.value);
  }

  if (busqueda.value) {
    const term = busqueda.value.toLowerCase();
    resultado = resultado.filter(
      e => e.nombre.toLowerCase().includes(term) || String(e.id).includes(term)
    );
  }

  return resultado;
});

function formatoClasificacion(clase: string): string {
  const mapa: Record<string, string> = {
    preparatoria: '🔵 Preparatoria',
    precontractual: '🟢 Precontractual',
    contractual: '🔴 Contractual',
    sin_clasificar: '⚪ Sin Clasificar'
  };
  return mapa[clase] || clase;
}

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

    tipoMensaje.value = 'info';
    mensaje.value = `Se cargaron ${etapas.value.length} etapas`;
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
      clasificacion: nuevaEtapa.value.clasificacion,
      orden: nuevaEtapa.value.orden,
      descripcion: nuevaEtapa.value.descripcion.trim() || null
    });

    tipoMensaje.value = 'success';
    mensaje.value = `Etapa "${nuevaEtapa.value.nombre}" creada correctamente`;

    nuevaEtapa.value = {
      nombre: '',
      clasificacion: 'sin_clasificar',
      orden: null,
      descripcion: ''
    };

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
      clasificacion: etapa.clasificacion,
      orden: etapa.orden,
      descripcion: etapa.descripcion
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

async function aplicarClasificacionMasiva() {
  if (!masiva.value.clasificacion || etapasSeleccionadas.value.length === 0) return;

  try {
    guardando.value = true;
    mensaje.value = '';

    const etapasParaActualizar = etapasSeleccionadas.value.map((id, idx) => ({
      id,
      clasificacion: masiva.value.clasificacion,
      orden: masiva.value.ordenInicial ? masiva.value.ordenInicial + idx : null
    }));

    const response = await api.post('/catalogos/etapas/clasificar-multiple', {
      etapas: etapasParaActualizar
    });

    tipoMensaje.value = 'success';
    mensaje.value = `${response.data.actualizadas} etapa(s) clasificada(s) correctamente`;

    seleccionarTodas.value = false;
    etapasSeleccionadas.value = [];
    masiva.value = { clasificacion: '', ordenInicial: null };

    await cargarEtapas();
  } catch (error: any) {
    tipoMensaje.value = 'error';
    mensaje.value = error?.response?.data?.error || 'Error al clasificar etapas';
    console.error('Error:', error);
  } finally {
    guardando.value = false;
  }
}

function actualizarVista() {
  seleccionarTodas.value = false;
  etapasSeleccionadas.value = [];
}

function exportarJSON() {
  const datosPara = filtroClasificacion.value
    ? etapas.value.filter(e => e.clasificacion === filtroClasificacion.value)
    : etapas.value;

  const json = JSON.stringify(datosPara, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `catalogo-etapas-${filtroClasificacion.value || 'completo'}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card h2 {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  color: #333;
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

.select-clasificacion,
.input-orden,
.textarea-descripcion {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 0.9rem;
  font-family: inherit;
}

.select-clasificacion:disabled,
.input-orden:disabled,
.textarea-descripcion:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.select-clasificacion:not(:disabled):focus,
.input-orden:not(:disabled):focus,
.textarea-descripcion:not(:disabled):focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.input-orden {
  width: 70px;
}

.textarea-descripcion {
  width: 100%;
  resize: vertical;
  min-height: 2.5rem;
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

.btn-aplicar {
  background: #667eea;
  color: white;
  padding: 0.75rem 1.5rem;
}

.btn-aplicar:hover:not(:disabled) {
  background: #5568d3;
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
</style>
