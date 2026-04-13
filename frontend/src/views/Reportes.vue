<template>
  <div class="reportes-view">
    <header class="reportes-header">
      <div>
        <h1>📊 Módulo de Reportes</h1>
        <p>Consulta indicadores consolidados y descarga reportes en formato Excel.</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="cargarReporte" :disabled="cargando || exportando || exportandoContrato">
          {{ cargando ? 'Actualizando...' : 'Actualizar' }}
        </button>
        <button class="btn-primary" @click="descargarXlsx" :disabled="cargando || exportando || exportandoContrato">
          {{ exportando ? 'Generando XLSX...' : 'Descargar XLSX' }}
        </button>
        <button class="btn-primary btn-accent" @click="descargarXlsxContratoAdjudicacion" :disabled="cargando || exportando || exportandoContrato">
          {{ exportandoContrato ? 'Generando reporte específico...' : 'Contrato y adjudicación' }}
        </button>
      </div>
    </header>

    <section class="scope-banner" :class="auth.isDireccion ? 'scope-dir' : 'scope-global'">
      <strong>{{ auth.isDireccion ? 'Vista por dirección' : 'Vista consolidada' }}</strong>
      <span v-if="auth.isDireccion">Solo se muestran procesos de {{ auth.user?.direccionNombre || 'tu dirección' }}.</span>
      <span v-else>Los datos respetan el alcance del usuario autenticado.</span>
    </section>

    <section class="filtros-panel">
      <div class="buscador-container">
        <span class="buscador-icon">🔎</span>
        <input
          v-model="filtros.busqueda"
          class="buscador-input"
          type="text"
          placeholder="Buscar por código, proceso, dirección, responsable o etapa..."
        />
      </div>

      <select v-model="filtros.direccion" class="filtro-select" :disabled="auth.isDireccion">
        <option value="">Todas las direcciones</option>
        <option v-for="direccion in direccionesDisponibles" :key="direccion" :value="direccion">{{ direccion }}</option>
      </select>

      <select v-model="filtros.tipoPlan" class="filtro-select">
        <option value="">Todos los tipos</option>
        <option v-for="tipo in tiposPlanDisponibles" :key="tipo" :value="tipo">{{ tipo }}</option>
      </select>

      <select v-model="filtros.estado" class="filtro-select">
        <option value="">Todos los estados</option>
        <option value="completado">Completo</option>
        <option value="en_proceso">En proceso</option>
        <option value="pendiente">Pendiente</option>
        <option value="atrasada">Con atraso</option>
        <option value="vence_hoy">Vencen hoy</option>
      </select>

      <button class="btn-clear" @click="limpiarFiltros" :disabled="cargando || exportando || exportandoContrato">Limpiar</button>
    </section>

    <div v-if="error" class="alert-error">{{ error }}</div>
    <div v-if="mensaje" class="alert-success">{{ mensaje }}</div>

    <div v-if="cargando && !reporte" class="loading-state">Cargando reportes...</div>

    <template v-else-if="reporte">
      <section class="kpi-grid">
        <article class="kpi-card">
          <span class="kpi-label">Procesos</span>
          <strong>{{ reporte.kpis.totalProcesos }}</strong>
          <small>Procesos filtrados</small>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Verificables</span>
          <strong>{{ reporte.kpis.totalVerificables }}</strong>
          <small>Total de etapas aplicables</small>
        </article>
        <article class="kpi-card success">
          <span class="kpi-label">Cumplimiento</span>
          <strong>{{ reporte.kpis.cumplimientoGeneral }}%</strong>
          <small>{{ reporte.kpis.completados }} completos</small>
        </article>
        <article class="kpi-card info">
          <span class="kpi-label">En proceso</span>
          <strong>{{ reporte.kpis.enProceso }}</strong>
          <small>Verificables activos</small>
        </article>
        <article class="kpi-card warn">
          <span class="kpi-label">Pendientes</span>
          <strong>{{ reporte.kpis.pendientes }}</strong>
          <small>Sin finalizar</small>
        </article>
        <article class="kpi-card danger">
          <span class="kpi-label">Atrasadas</span>
          <strong>{{ reporte.kpis.atrasadas }}</strong>
          <small>{{ reporte.kpis.vencenHoy }} vencen hoy</small>
        </article>
        <article class="kpi-card money">
          <span class="kpi-label">Presupuesto</span>
          <strong>{{ formatearMoneda(reporte.kpis.presupuestoTotal) }}</strong>
          <small>Inicial 2026</small>
        </article>
        <article class="kpi-card money-alt">
          <span class="kpi-label">Reforma 2</span>
          <strong>{{ formatearMoneda(reporte.kpis.costoReformaTotal) }}</strong>
          <small>Costo 2026</small>
        </article>
      </section>

      <section class="panel-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Resumen por dirección</h2>
              <p>{{ reporte.resumenPorDireccion.length }} áreas con información</p>
            </div>
          </div>

          <div v-if="reporte.resumenPorDireccion.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dirección</th>
                  <th>Procesos</th>
                  <th>Verificables</th>
                  <th>Completos</th>
                  <th>Pendientes</th>
                  <th>Atrasadas</th>
                  <th>Cumplimiento</th>
                  <th>Presupuesto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in reporte.resumenPorDireccion" :key="item.direccionNombre">
                  <td>{{ item.direccionNombre }}</td>
                  <td>{{ item.totalProcesos }}</td>
                  <td>{{ item.totalVerificables }}</td>
                  <td>{{ item.completados }}</td>
                  <td>{{ item.pendientes }}</td>
                  <td>{{ item.atrasadas }}</td>
                  <td><span class="badge badge-info">{{ item.cumplimiento }}%</span></td>
                  <td>{{ formatearMoneda(item.presupuestoTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">No hay información para los filtros actuales.</div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <h2>Verificables con atraso</h2>
              <p>Listado rápido para seguimiento</p>
            </div>
          </div>

          <div v-if="etapasAtrasadas.length" class="listado-alertas">
            <div v-for="item in etapasAtrasadas" :key="`${item.subtareaId}-${item.orden}-${item.etapaNombre}`" class="alerta-item">
              <div>
                <strong>{{ item.etapaNombre }}</strong>
                <p>{{ item.proceso }} · {{ item.direccionNombre }}</p>
              </div>
              <div class="alerta-meta">
                <span>{{ item.fechaPlanificada || 'Sin fecha' }}</span>
                <span class="badge badge-danger">{{ item.diasAtraso }} días</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">No hay verificables atrasados con el filtro actual.</div>
        </article>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Detalle de procesos</h2>
            <p>{{ reporte.procesos.length }} resultados · generado {{ fechaGeneracion }}</p>
          </div>
          <div class="pagination" v-if="totalPaginas > 1">
            <button class="btn-page" :disabled="paginaActual === 1" @click="paginaActual--">‹</button>
            <span>Página {{ paginaActual }} de {{ totalPaginas }}</span>
            <button class="btn-page" :disabled="paginaActual >= totalPaginas" @click="paginaActual++">›</button>
          </div>
        </div>

        <div v-if="procesosPaginados.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Proceso</th>
                <th>Dirección</th>
                <th>Responsable</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Avance</th>
                <th>Verificables</th>
                <th>Atrasadas</th>
                <th>Presupuesto</th>
                <th>Próxima etapa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in procesosPaginados" :key="item.id">
                <td>{{ item.codigoOlympo || '-' }}</td>
                <td class="proceso-cell">
                  <strong>{{ item.nombre }}</strong>
                  <small>{{ item.completadas }}/{{ item.totalEtapas }} completas</small>
                </td>
                <td>{{ item.direccionNombre || '-' }}</td>
                <td>{{ item.responsableNombre || '-' }}</td>
                <td>{{ item.tipoPlan || '-' }}</td>
                <td>
                  <span class="badge" :class="badgeEstado(item.estadoGeneral)">{{ item.estadoGeneralLabel }}</span>
                </td>
                <td>{{ item.porcentajeAvance }}%</td>
                <td>{{ item.totalEtapas }}</td>
                <td>
                  <span class="badge" :class="item.atrasadas > 0 ? 'badge-danger' : 'badge-success'">
                    {{ item.atrasadas }}
                  </span>
                </td>
                <td>{{ formatearMoneda(item.presupuesto) }}</td>
                <td>{{ item.proximaEtapa }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">No hay procesos para mostrar.</div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { reportesService, type ReporteResumenResponse } from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const cargando = ref(false);
const exportando = ref(false);
const exportandoContrato = ref(false);
const error = ref('');
const mensaje = ref('');
const reporte = ref<ReporteResumenResponse | null>(null);
const paginaActual = ref(1);
const itemsPorPagina = 12;
const filtros = ref({
  busqueda: '',
  direccion: '',
  tipoPlan: '',
  estado: ''
});

let filtroTimer: number | null = null;

const direccionesDisponibles = computed(() => reporte.value?.direccionesDisponibles || []);
const tiposPlanDisponibles = computed(() => reporte.value?.tiposPlanDisponibles || []);
const etapasAtrasadas = computed(() => (reporte.value?.etapas || []).filter((item) => item.esAtrasada).slice(0, 10));
const totalPaginas = computed(() => Math.max(1, Math.ceil((reporte.value?.procesos.length || 0) / itemsPorPagina)));
const procesosPaginados = computed(() => {
  const items = reporte.value?.procesos || [];
  const start = (paginaActual.value - 1) * itemsPorPagina;
  return items.slice(start, start + itemsPorPagina);
});
const fechaGeneracion = computed(() => {
  if (!reporte.value?.generadoEn) return '-';
  return new Date(reporte.value.generadoEn).toLocaleString('es-EC');
});

function obtenerFiltrosActuales() {
  return {
    busqueda: filtros.value.busqueda.trim(),
    direccion: auth.isDireccion ? (auth.user?.direccionNombre || '') : filtros.value.direccion,
    tipoPlan: filtros.value.tipoPlan,
    estado: filtros.value.estado
  };
}

async function cargarReporte() {
  cargando.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    reporte.value = await reportesService.getResumen(obtenerFiltrosActuales());
    if (auth.isDireccion && auth.user?.direccionNombre) {
      filtros.value.direccion = auth.user.direccionNombre;
    }
    if (paginaActual.value > totalPaginas.value) paginaActual.value = 1;
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'No se pudo cargar el módulo de reportes.';
  } finally {
    cargando.value = false;
  }
}

function descargarBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

async function descargarXlsx() {
  exportando.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    const { blob, filename } = await reportesService.descargarXlsx(obtenerFiltrosActuales());
    descargarBlob(blob, filename);
    mensaje.value = 'Reporte XLSX descargado correctamente.';
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'No se pudo descargar el reporte XLSX.';
  } finally {
    exportando.value = false;
  }
}

async function descargarXlsxContratoAdjudicacion() {
  exportandoContrato.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    const { blob, filename } = await reportesService.descargarXlsxContratoAdjudicacion(obtenerFiltrosActuales());
    descargarBlob(blob, filename);
    mensaje.value = 'Reporte de contrato y adjudicación descargado correctamente.';
  } catch (err: any) {
    error.value = err?.response?.data?.error || 'No se pudo descargar el reporte específico de contrato y adjudicación.';
  } finally {
    exportandoContrato.value = false;
  }
}

function limpiarFiltros() {
  filtros.value.busqueda = '';
  filtros.value.tipoPlan = '';
  filtros.value.estado = '';
  filtros.value.direccion = auth.isDireccion ? (auth.user?.direccionNombre || '') : '';
}

function badgeEstado(estado: string) {
  if (estado === 'completado') return 'badge-success';
  if (estado === 'en_proceso') return 'badge-info';
  return 'badge-warn';
}

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(Number(valor || 0));
}

watch(
  filtros,
  () => {
    paginaActual.value = 1;
    if (filtroTimer) window.clearTimeout(filtroTimer);
    filtroTimer = window.setTimeout(() => {
      void cargarReporte();
    }, 250);
  },
  { deep: true }
);

watch(totalPaginas, (value) => {
  if (paginaActual.value > value) paginaActual.value = value;
});

onMounted(() => {
  if (auth.isDireccion && auth.user?.direccionNombre) {
    filtros.value.direccion = auth.user.direccionNombre;
  }
  void cargarReporte();
});

onBeforeUnmount(() => {
  if (filtroTimer) window.clearTimeout(filtroTimer);
});
</script>

<style scoped>
.reportes-view {
  display: grid;
  gap: 1rem;
}

.reportes-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1.2rem;
}

.reportes-header h1 {
  margin: 0;
  color: #0f172a;
}

.reportes-header p {
  margin: 0.35rem 0 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.scope-banner {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
  border-radius: 14px;
  padding: 0.9rem 1rem;
  border: 1px solid #cbd5e1;
  font-size: 0.92rem;
}

.scope-global {
  background: #eff6ff;
  color: #1e3a8a;
}

.scope-dir {
  background: #ecfdf5;
  color: #166534;
}

.filtros-panel {
  display: grid;
  grid-template-columns: minmax(260px, 1.4fr) repeat(3, minmax(180px, 1fr)) auto;
  gap: 0.75rem;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1rem;
}

.buscador-container {
  position: relative;
}

.buscador-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
}

.buscador-input,
.filtro-select {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 0.65rem 0.85rem;
  font-size: 0.95rem;
}

.buscador-input {
  padding-left: 2.3rem;
}

.btn-primary,
.btn-secondary,
.btn-clear,
.btn-page {
  border: none;
  border-radius: 12px;
  padding: 0.72rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
}

.btn-accent {
  background: #0f766e;
}

.btn-secondary {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-clear,
.btn-page {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-clear:disabled,
.btn-page:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert-error,
.alert-success,
.loading-state,
.empty-state {
  border-radius: 14px;
  padding: 0.9rem 1rem;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.alert-error {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.alert-success {
  color: #166534;
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.loading-state,
.empty-state {
  color: #475569;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1rem;
  display: grid;
  gap: 0.35rem;
}

.kpi-card strong {
  font-size: 1.35rem;
  color: #0f172a;
}

.kpi-label {
  color: #64748b;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kpi-card.success { border-color: #bbf7d0; background: #f0fdf4; }
.kpi-card.info { border-color: #bfdbfe; background: #eff6ff; }
.kpi-card.warn { border-color: #fde68a; background: #fffbeb; }
.kpi-card.danger { border-color: #fecaca; background: #fef2f2; }
.kpi-card.money { border-color: #c7d2fe; background: #eef2ff; }
.kpi-card.money-alt { border-color: #ddd6fe; background: #f5f3ff; }

.panel-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1rem;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.8rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.panel-header p,
.pagination span {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.86rem;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
 td {
  padding: 0.75rem 0.7rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
  font-size: 0.9rem;
}

th {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  background: #f8fafc;
  position: sticky;
  top: 0;
}

.proceso-cell {
  min-width: 240px;
}

.proceso-cell strong {
  display: block;
  color: #0f172a;
}

.proceso-cell small {
  color: #64748b;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.22rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.badge-success {
  background: #dcfce7;
  color: #166534;
}

.badge-info {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-warn {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.listado-alertas {
  display: grid;
  gap: 0.7rem;
}

.alerta-item {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.85rem;
  background: #fff;
}

.alerta-item strong {
  color: #0f172a;
}

.alerta-item p {
  margin: 0.2rem 0 0;
  color: #64748b;
}

.alerta-meta {
  display: grid;
  gap: 0.45rem;
  justify-items: end;
  color: #64748b;
  font-size: 0.84rem;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panel-grid {
    grid-template-columns: 1fr;
  }

  .filtros-panel {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .reportes-header,
  .panel-header,
  .alerta-item {
    flex-direction: column;
    align-items: stretch;
  }

  .kpi-grid,
  .filtros-panel {
    grid-template-columns: 1fr;
  }

  .alerta-meta {
    justify-items: start;
  }
}
</style>
