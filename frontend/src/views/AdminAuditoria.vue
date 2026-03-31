<template>
  <div class="admin-auditoria-view">
    <div class="encabezado">
      <div>
        <h1>Auditoría del sistema</h1>
        <p class="subtitulo">Trazabilidad de cambios: quién lo hizo, cuándo, dónde y con qué resultado</p>
      </div>
      <button type="button" class="btn-recargar" @click="() => cargar()" :disabled="cargando">Recargar</button>
    </div>

    <section class="card filtros">
      <label>
        Buscar
        <input v-model="filtros.search" placeholder="usuario, ruta, recurso, error" @keyup.enter="aplicarFiltros" />
      </label>
      <label>
        Módulo
        <input v-model="filtros.modulo" placeholder="admin_actividades" @keyup.enter="aplicarFiltros" />
      </label>
      <label>
        Acción
        <select v-model="filtros.accion">
          <option value="">Todas</option>
          <option value="create">Crear</option>
          <option value="update">Actualizar</option>
          <option value="delete">Borrar</option>
          <option value="read">Leer</option>
        </select>
      </label>
      <label>
        Rol
        <select v-model="filtros.role">
          <option value="">Todos</option>
          <option value="admin">admin</option>
          <option value="direccion">direccion</option>
          <option value="reporteria">reporteria</option>
        </select>
      </label>
      <label>
        Estado
        <select v-model="filtros.success">
          <option value="">Todos</option>
          <option value="true">Exitoso</option>
          <option value="false">Con error</option>
        </select>
      </label>
      <label>
        Desde
        <input type="date" v-model="filtros.desde" />
      </label>
      <label>
        Hasta
        <input type="date" v-model="filtros.hasta" />
      </label>
      <div class="acciones-filtro">
        <button type="button" @click="aplicarFiltros" :disabled="cargando">Aplicar</button>
        <button type="button" class="secundario" @click="limpiarFiltros" :disabled="cargando">Limpiar</button>
      </div>
    </section>

    <p v-if="mensaje" class="mensaje">{{ mensaje }}</p>

    <section class="card">
      <table class="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Módulo</th>
            <th>Acción</th>
            <th>Método</th>
            <th>Ruta</th>
            <th>Estado</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ formatearFecha(item.fecha) }}</td>
            <td>{{ item.username || '-' }}</td>
            <td>{{ item.role || '-' }}</td>
            <td>{{ item.modulo || '-' }}</td>
            <td>{{ item.accion }}</td>
            <td>{{ item.metodo }}</td>
            <td class="ruta">{{ item.ruta }}</td>
            <td>
              <span :class="['estado', item.exito ? 'ok' : 'error']">
                {{ item.exito ? 'OK' : `Error ${item.statusCode}` }}
              </span>
            </td>
            <td>
              <button type="button" class="btn-detalle" @click="abrirDetalle(item.id)">Ver</button>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="9" class="sin-datos">No hay eventos con esos filtros</td>
          </tr>
        </tbody>
      </table>

      <div class="paginacion">
        <button type="button" @click="irPagina(paginacion.page - 1)" :disabled="paginacion.page <= 1 || cargando">Anterior</button>
        <span>Página {{ paginacion.page }} de {{ paginacion.totalPages }} ({{ paginacion.total }} registros)</span>
        <button type="button" @click="irPagina(paginacion.page + 1)" :disabled="paginacion.page >= paginacion.totalPages || cargando">Siguiente</button>
      </div>
    </section>

    <section v-if="detalle" class="card detalle">
      <div class="detalle-header">
        <h2>Detalle evento #{{ detalle.id }}</h2>
        <button type="button" class="secundario" @click="detalle = null">Cerrar</button>
      </div>
      <pre>{{ detalle }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { auditoriaService, type AuditoriaEvento, type AuditoriaListadoResponse } from '../services/api';

const cargando = ref(false);
const mensaje = ref('');
const items = ref<AuditoriaEvento[]>([]);
const detalle = ref<any | null>(null);

const filtros = ref({
  search: '',
  modulo: '',
  accion: '',
  role: '',
  success: '',
  desde: '',
  hasta: ''
});

const paginacion = ref({
  page: 1,
  limit: 50,
  total: 0,
  totalPages: 1
});

function buildParams(page = paginacion.value.page) {
  return {
    page,
    limit: paginacion.value.limit,
    search: filtros.value.search || undefined,
    modulo: filtros.value.modulo || undefined,
    accion: filtros.value.accion || undefined,
    role: filtros.value.role || undefined,
    success: filtros.value.success || undefined,
    desde: filtros.value.desde || undefined,
    hasta: filtros.value.hasta || undefined
  };
}

async function cargar(page = paginacion.value.page) {
  cargando.value = true;
  mensaje.value = '';
  try {
    const response = await auditoriaService.getAll(buildParams(page));
    const data = response as AuditoriaListadoResponse;
    items.value = data.items || [];
    paginacion.value = {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages
    };
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo cargar la auditoría';
  } finally {
    cargando.value = false;
  }
}

async function abrirDetalle(id: number) {
  try {
    detalle.value = await auditoriaService.getById(id);
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo cargar el detalle';
  }
}

function aplicarFiltros() {
  paginacion.value.page = 1;
  cargar(1);
}

function limpiarFiltros() {
  filtros.value = {
    search: '',
    modulo: '',
    accion: '',
    role: '',
    success: '',
    desde: '',
    hasta: ''
  };
  aplicarFiltros();
}

function irPagina(page: number) {
  if (page < 1 || page > paginacion.value.totalPages) return;
  cargar(page);
}

function formatearFecha(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-EC');
}

onMounted(() => {
  cargar(1);
});
</script>

<style scoped>
.admin-auditoria-view {
  display: grid;
  gap: 1rem;
}

.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.subtitulo {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  padding: 0.9rem;
}

.filtros {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.filtros label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: #334155;
}

.filtros input,
.filtros select,
button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}

button {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
}

button.secundario {
  background: #fff;
  color: #334155;
}

.acciones-filtro {
  display: flex;
  align-items: end;
  gap: 0.4rem;
}

.mensaje {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
}

.tabla th,
.tabla td {
  border-bottom: 1px solid #e2e8f0;
  padding: 0.45rem;
  font-size: 0.8rem;
  text-align: left;
  vertical-align: top;
}

.tabla th {
  color: #1e293b;
  background: #f8fafc;
}

.ruta {
  max-width: 320px;
  overflow-wrap: anywhere;
}

.estado {
  display: inline-block;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
}

.estado.ok {
  background: #dcfce7;
  color: #166534;
}

.estado.error {
  background: #fee2e2;
  color: #991b1b;
}

.sin-datos {
  text-align: center;
  color: #64748b;
}

.paginacion {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.detalle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.75rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem;
  overflow: auto;
}

@media (max-width: 1100px) {
  .filtros {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .filtros {
    grid-template-columns: 1fr;
  }
}
</style>
