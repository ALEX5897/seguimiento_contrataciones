<template>
  <div class="dashboard-pac">
    <!-- HEADER CON TÍTULO Y FECHA -->
    <div class="dashboard-header">
      <div class="header-title">
        <i class="ri-bar-chart-2-line"></i>
        <h1>CUADRO DE MANDO – EJECUCIÓN DE CONTRATACIONES</h1>
        <p>Comparativa PAC vs NO PAC</p>
      </div>
      <div class="header-date">
        <i class="ri-calendar-line"></i>
        <span>Fecha de corte: {{ fechaCorte }}</span>
      </div>
    </div>

    <!-- FILTROS -->
    <section class="filtros-section">
      <div class="filtros-toolbar">
        <select v-model="filtroDireccion" class="combo-filtro" @change="cargarDashboard">
          <option value="">Todas las direcciones</option>
          <option v-for="dir in direccionesDisponibles" :key="dir" :value="dir">{{ dir }}</option>
        </select>
        <select v-model="filtroProcedimiento" class="combo-filtro" @change="cargarDashboard">
          <option value="">Todos los procedimientos</option>
          <option v-for="proc in procedimientosDisponibles" :key="proc" :value="proc">{{ proc }}</option>
        </select>
        <select v-model="filtroCuatrimestre" class="combo-filtro" @change="cargarDashboard">
          <option value="">Todos los cuatrimestres</option>
          <option value="1">Cuatrimestre 1</option>
          <option value="2">Cuatrimestre 2</option>
          <option value="3">Cuatrimestre 3</option>
          <option value="4">Cuatrimestre 4</option>
        </select>
        <button v-if="hayFiltros" class="btn-reset" @click="resetearFiltros">
          <i class="ri-refresh-line"></i>
          Restablecer
        </button>
      </div>
    </section>

    <!-- LOADING -->
    <div v-if="cargando" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando dashboard...</p>
    </div>

    <template v-else-if="datosPAC && datosNoPAC">

      <!-- KPIs PRINCIPALES GENERALES -->
      <section class="kpis-principales">
        <div class="kpi-card-principal">
          <div class="kpi-icon-principal">{{ datosPAC.kpisPrincipales.totalProcesos + datosNoPAC.kpisPrincipales.totalProcesos }}</div>
          <div class="kpi-content-principal">
            <div class="kpi-label-principal">Total de Procesos</div>
            <div class="kpi-detalle-principal">{{ datosPAC.kpisPrincipales.totalProcesos + datosNoPAC.kpisPrincipales.totalProcesos }} contratos</div>
          </div>
        </div>

        <div class="kpi-card-principal">
          <div class="kpi-icon-principal">💰</div>
          <div class="kpi-content-principal">
            <div class="kpi-label-principal">Presupuesto Total</div>
            <div class="kpi-detalle-principal">{{ formatearMonto(datosPAC.kpisPrincipales.presupuestoPAC + datosNoPAC.kpisPrincipales.presupuestoNoPAC) }}</div>
          </div>
        </div>

        <div class="kpi-card-principal">
          <div class="kpi-icon-principal">📊</div>
          <div class="kpi-content-principal">
            <div class="kpi-label-principal">Avance General</div>
            <div class="kpi-detalle-principal">{{ avanceGeneral }}%</div>
          </div>
        </div>
      </section>

      <!-- LAYOUT DOS COLUMNAS: PAC Y NO PAC -->
      <div class="dashboard-two-columns">
        <!-- COLUMNA IZQUIERDA: PROCESOS PAC -->
        <div class="column-pac">
          <div class="column-header">
            <i class="ri-check-double-line"></i>
            <h2>PROCESOS PAC</h2>
          </div>

          <!-- KPIs PAC -->
          <section class="kpis-container">
            <h3 class="kpis-title">Indicadores Clave (KPIs)</h3>
            <div class="kpis-column">
              <div class="kpi-card-btn">
              <div class="kpi-icon">{{ datosPAC.kpisPrincipales.totalProcesos }}</div>
              <div class="kpi-content">
                <div class="kpi-label">Total Procesos</div>
                <div class="kpi-detalle">{{ datosPAC.kpisPrincipales.totalProcesos }} contratos</div>
              </div>
            </div>

            <div class="kpi-card-btn">
              <div class="kpi-icon">💰</div>
              <div class="kpi-content">
                <div class="kpi-label">Presupuesto</div>
                <div class="kpi-detalle">{{ formatearMonto(datosPAC.kpisPrincipales.presupuestoPAC) }}</div>
              </div>
            </div>

            <div class="kpi-card-btn">
              <div class="kpi-icon">⚙️</div>
              <div class="kpi-content">
                <div class="kpi-label">En Ejecución</div>
                <div class="kpi-detalle">{{ datosPAC.kpisPrincipales.procesosConContratoCompletado }} procesos</div>
              </div>
            </div>

            <div class="kpi-card-btn kpi-avance">
              <div class="kpi-icon kpi-icon-percentage">{{ avancePAC }}%</div>
              <div class="kpi-content">
                <div class="kpi-label">% Avance General</div>
                <div class="kpi-detalle">Procesos</div>
              </div>
            </div>
            </div>
          </section>

          <!-- Gráficos PAC -->
          <section class="chart-container">
            <h3>Distribución por Estado</h3>
            <div class="chart-wrapper">
              <div ref="chartDistribProcesosPAC" class="chart"></div>
            </div>
          </section>

          <!-- Gráfico Tipo de Contrato y Fases PAC -->
          <section class="chart-container">
            <h3>Distribución por Tipo de Contrato y Fase</h3>
            <div class="chart-wrapper chart-tipo-contrato">
              <div ref="chartProcedimientosYFasePAC" class="chart"></div>
            </div>
          </section>

          <section class="chart-container">
            <h3>Distribución del Presupuesto</h3>
            <div class="chart-wrapper">
              <div ref="chartDistribPresupuestoPAC" class="chart"></div>
            </div>
          </section>

          <section class="chart-container">
            <h3>Avance General</h3>
            <div class="chart-wrapper">
              <div ref="chartVelociometroPAC" class="chart"></div>
            </div>
            <div class="velocimetro-info">
              <p><strong>Índice de Ejecución:</strong> {{ datosPAC.velocimetro.valor }}%</p>
              <p><strong>Monto en Ejecución:</strong> {{ formatearMonto(datosPAC.kpisPrincipales.montoEnEjecucion) }}</p>
            </div>
          </section>

          <!-- Resumen PAC -->
          <section class="chart-container">
            <h3>Resumen</h3>
            <div class="resumen-small">
              <div class="resumen-item-small">
                <span class="label">Preparatoria</span>
                <span class="valor">{{ datosPAC.procesosPorEstado.preparatoria }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">Precontractual</span>
                <span class="valor">{{ datosPAC.procesosPorEstado.precontractual }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">En Ejecución</span>
                <span class="valor">{{ datosPAC.procesosPorEstado.en_ejecucion }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">Suspendido</span>
                <span class="valor">{{ datosPAC.procesosPorEstado.suspendido }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">Desierto</span>
                <span class="valor">{{ datosPAC.procesosPorEstado.desierto }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- COLUMNA DERECHA: PROCESOS NO PAC -->
        <div class="column-nopac">
          <div class="column-header">
            <i class="ri-close-line"></i>
            <h2>PROCESOS NO PAC</h2>
          </div>

          <!-- KPIs NO PAC -->
          <section class="kpis-container">
            <h3 class="kpis-title">Indicadores Clave (KPIs)</h3>
            <div class="kpis-column">
              <div class="kpi-card-btn">
                <div class="kpi-icon">{{ datosNoPAC.kpisPrincipales.totalProcesos }}</div>
              <div class="kpi-content">
                <div class="kpi-label">Total Procesos</div>
                <div class="kpi-detalle">{{ datosNoPAC.kpisPrincipales.totalProcesos }} contratos</div>
              </div>
            </div>

            <div class="kpi-card-btn">
              <div class="kpi-icon">💵</div>
              <div class="kpi-content">
                <div class="kpi-label">Presupuesto</div>
                <div class="kpi-detalle">{{ formatearMonto(datosNoPAC.kpisPrincipales.presupuestoNoPAC) }}</div>
              </div>
            </div>

            <div class="kpi-card-btn">
              <div class="kpi-icon">⚙️</div>
              <div class="kpi-content">
                <div class="kpi-label">En Ejecución</div>
                <div class="kpi-detalle">{{ datosNoPAC.kpisPrincipales.procesosConContratoCompletado }} procesos</div>
              </div>
            </div>

            <div class="kpi-card-btn kpi-avance">
              <div class="kpi-icon kpi-icon-percentage">{{ avanceNoPAC }}%</div>
              <div class="kpi-content">
                <div class="kpi-label">% Avance General</div>
                <div class="kpi-detalle">Procesos</div>
              </div>
            </div>
            </div>
          </section>

          <!-- Gráficos NO PAC -->
          <section class="chart-container">
            <h3>Distribución por Estado</h3>
            <div class="chart-wrapper">
              <div ref="chartDistribProcesosNoPAC" class="chart"></div>
            </div>
          </section>

          <!-- Gráfico Procedimientos y Fases NO PAC -->
          <section class="chart-container">
            <h3>Distribución por Procedimiento y Fase</h3>
            <div class="chart-wrapper chart-tipo-contrato">
              <div ref="chartProcedimientosYFaseNoPAC" class="chart"></div>
            </div>
          </section>

          <section class="chart-container">
            <h3>Distribución del Presupuesto</h3>
            <div class="chart-wrapper">
              <div ref="chartDistribPresupuestoNoPAC" class="chart"></div>
            </div>
          </section>

          <section class="chart-container">
            <h3>Avance General</h3>
            <div class="chart-wrapper">
              <div ref="chartVelociometroNoPAC" class="chart"></div>
            </div>
            <div class="velocimetro-info">
              <p><strong>Índice de Ejecución:</strong> {{ datosNoPAC.velocimetro.valor }}%</p>
              <p><strong>Monto en Ejecución:</strong> {{ formatearMonto(datosNoPAC.kpisPrincipales.montoEnEjecucion) }}</p>
            </div>
          </section>

          <!-- Resumen NO PAC -->
          <section class="chart-container">
            <h3>Resumen</h3>
            <div class="resumen-small">
              <div class="resumen-item-small">
                <span class="label">Preparatoria</span>
                <span class="valor">{{ datosNoPAC.procesosPorEstado.preparatoria }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">Precontractual</span>
                <span class="valor">{{ datosNoPAC.procesosPorEstado.precontractual }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">En Ejecución</span>
                <span class="valor">{{ datosNoPAC.procesosPorEstado.en_ejecucion }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">Suspendido</span>
                <span class="valor">{{ datosNoPAC.procesosPorEstado.suspendido }}</span>
              </div>
              <div class="resumen-item-small">
                <span class="label">Desierto</span>
                <span class="valor">{{ datosNoPAC.procesosPorEstado.desierto }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- PROCESOS CON RETRASOS POR DIRECCIÓN -->
      <section class="retrasos-section" v-if="datosPAC.procesosConRetrasosPorDireccion && Object.keys(datosPAC.procesosConRetrasosPorDireccion).length > 0">
        <h2>10. PROCESOS CON RETRASOS POR DIRECCIÓN</h2>
        <div class="retrasos-tabla-wrapper">
          <table class="retrasos-tabla">
            <thead>
              <tr>
                <th>Dirección</th>
                <th>Total Retrasados</th>
                <th>Preparatoria</th>
                <th>Precontractual</th>
                <th>Contractual</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(datos, direccion) in datosPAC.procesosConRetrasosPorDireccion" :key="direccion"
                  class="fila-clickeable"
                  @click="abrirModalPorRetrasos(String(direccion))">
                <td class="direccion-cell">{{ direccion }}</td>
                <td class="total-cell">{{ datos.total }}</td>
                <td class="fase-cell">{{ datos.porFase.preparatoria || 0 }}</td>
                <td class="fase-cell">{{ datos.porFase.precontractual || 0 }}</td>
                <td class="fase-cell">{{ datos.porFase.contractual || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- RESUMEN GENERAL -->
      <section class="resumen-general-section">
        <h2>9. RESUMEN GENERAL</h2>
        <div class="resumen-general-grid">
          <div class="resumen-item">
            <div class="item-icon">📊</div>
            <div class="item-content">
              <span class="item-label">Total de procesos</span>
              <span class="item-valor">{{ datosPAC.kpisPrincipales.totalProcesos + datosNoPAC.kpisPrincipales.totalProcesos }}</span>
            </div>
          </div>

          <div class="resumen-item">
            <div class="item-icon">💰</div>
            <div class="item-content">
              <span class="item-label">Presupuesto total</span>
              <span class="item-valor">{{ formatearMonto(datosPAC.kpisPrincipales.presupuestoPAC + datosNoPAC.kpisPrincipales.presupuestoNoPAC) }}</span>
            </div>
          </div>

          <div class="resumen-item">
            <div class="item-icon">⚙️</div>
            <div class="item-content">
              <span class="item-label">Monto en ejecución</span>
              <span class="item-valor">{{ formatearMonto((datosPAC.kpisPrincipales.montoEnEjecucion || 0) + (datosNoPAC.kpisPrincipales.montoEnEjecucion || 0)) }}</span>
            </div>
          </div>

          <div class="resumen-item">
            <div class="item-icon">📋</div>
            <div class="item-content">
              <span class="item-label">Monto en preparatoria</span>
              <span class="item-valor">{{ formatearMonto((datosPAC.presupuestoPorEstado?.preparatoria || 0) + (datosNoPAC.presupuestoPorEstado?.preparatoria || 0)) }}</span>
            </div>
          </div>

          <div class="resumen-item">
            <div class="item-icon">📝</div>
            <div class="item-content">
              <span class="item-label">Monto precontractual</span>
              <span class="item-valor">{{ formatearMonto((datosPAC.presupuestoPorEstado?.precontractual || 0) + (datosNoPAC.presupuestoPorEstado?.precontractual || 0)) }}</span>
            </div>
          </div>

          <div class="resumen-item">
            <div class="item-icon">⏸️</div>
            <div class="item-content">
              <span class="item-label">Monto suspendido</span>
              <span class="item-valor">{{ formatearMonto((datosPAC.presupuestoPorEstado?.suspendido || 0) + (datosNoPAC.presupuestoPorEstado?.suspendido || 0)) }}</span>
            </div>
          </div>

          <div class="resumen-item">
            <div class="item-icon">❌</div>
            <div class="item-content">
              <span class="item-label">Monto desierto</span>
              <span class="item-valor">{{ formatearMonto((datosPAC.presupuestoPorEstado?.desierto || 0) + (datosNoPAC.presupuestoPorEstado?.desierto || 0)) }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>

    <!-- MODAL DE PROCESOS POR FASE O TIPO DE CONTRATO -->
    <div v-if="modalAbierto" class="modal-overlay" @click.self="cerrarModal">
      <div class="modal-contenido">
        <div class="modal-header">
          <div class="modal-header-content">
            <h2>{{ tituloModal }}</h2>
            <p class="modal-header-presupuesto">Presupuesto: {{ formatearMonto(presupuestoFaseSeleccionada) }}</p>
          </div>
          <button class="btn-cerrar" @click="cerrarModal">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="procesosFaseSeleccionada.length > 0" class="procesos-lista">
            <div v-for="proceso in procesosFaseSeleccionada" :key="proceso.id" class="proceso-item">
              <div class="proceso-header">
                <span class="codigo">{{ proceso.codigoOlympo }}</span>
                <span class="tipo-plan">{{ proceso.tipoPlan }}</span>
              </div>
              <div class="proceso-nombre">{{ proceso.nombre }}</div>
              <div class="proceso-detalles">
                <span class="presupuesto">💰 {{ formatearMonto(proceso.presupuesto) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="sin-procesos">
            <p>{{ modalTipo === 'tipoContrato' ? 'No hay procesos para este tipo de contrato' : 'No hay procesos en esta fase' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as echarts from 'echarts';
import api from '../services/api';

const cargando = ref(true);
const error = ref('');
const datosPAC = ref<any>(null);
const datosNoPAC = ref<any>(null);

// Filtros
const filtroDireccion = ref('');
const filtroProcedimiento = ref('');
const filtroCuatrimestre = ref('');

const direccionesDisponibles = ref<string[]>([]);
const procedimientosDisponibles = ref<string[]>([]);

// Chart instances PAC
const chartDistribProcesosPAC = ref<any>(null);
const chartDistribPresupuestoPAC = ref<any>(null);
const chartVelociometroPAC = ref<any>(null);

// Chart instances NO PAC
const chartDistribProcesosNoPAC = ref<any>(null);
const chartDistribPresupuestoNoPAC = ref<any>(null);
const chartVelociometroNoPAC = ref<any>(null);

// Chart instances - Procedimientos y Fases
const chartProcedimientosYFasePAC = ref<any>(null);
const chartProcedimientosYFaseNoPAC = ref<any>(null);

// Modal de procesos por fase o tipo de contrato
const modalAbierto = ref(false);
const faseSeleccionada = ref('');
const tipoPlanSeleccionado = ref(''); // 'PAC' o 'NO PAC'
const tipoContratoSeleccionado = ref(''); // Tipo de contrato filtrado
const direccionSeleccionada = ref(''); // Dirección filtrada
const modalTipo = ref('fase'); // 'fase', 'tipoContrato' o 'retrasos'

const nombreFaseSeleccionada = computed(() => {
  const nombres: { [key: string]: string } = {
    preparatoria: 'Preparatoria',
    precontractual: 'Precontractual',
    contractual: 'Contractual'
  };
  return nombres[faseSeleccionada.value] || '';
});

const tituloModal = computed(() => {
  if (modalTipo.value === 'tipoContrato') {
    return `Procesos - ${tipoContratoSeleccionado.value}`;
  }
  if (modalTipo.value === 'retrasos') {
    return `Procesos Retrasados - ${direccionSeleccionada.value}`;
  }
  return `Procesos en Fase ${nombreFaseSeleccionada.value}`;
});

const procesosFaseSeleccionada = computed(() => {
  if (!tipoPlanSeleccionado.value) return [];

  const datos = tipoPlanSeleccionado.value === 'PAC' ? datosPAC.value : datosNoPAC.value;
  if (!datos || !datos.procesos) return [];

  let procesos = datos.procesos;

  // Filtrar por tipo de contrato si está seleccionado
  if (modalTipo.value === 'tipoContrato' && tipoContratoSeleccionado.value) {
    const tipoFiltro = tipoContratoSeleccionado.value.trim().toLowerCase();
    procesos = procesos.filter((p: any) => {
      const tipoContrato = (p.tipoContratacion || 'No definido').trim().toLowerCase();
      return tipoContrato === tipoFiltro;
    });
  }
  // Filtrar por retrasos si está seleccionada dirección
  else if (modalTipo.value === 'retrasos' && direccionSeleccionada.value) {
    procesos = procesos.filter((p: any) => {
      const direccion = (p.direccionNombre || '').trim();
      if (direccion !== direccionSeleccionada.value) return false;

      // Verificar si tiene al menos una etapa pendiente con retraso
      const etapasConRetraso = (p.etapasDetalle || []).some(
        (etapa: any) => etapa.estado === 'pendiente' && (etapa.diasAtraso || 0) > 0
      );
      return etapasConRetraso;
    });
  }
  // Filtrar por fase si está seleccionada
  else if (modalTipo.value === 'fase' && faseSeleccionada.value) {
    procesos = procesos.filter((p: any) => {
      const etapas = p.etapasDetalle || [];
      const fase = obtenerFaseProceso(etapas);
      return fase === faseSeleccionada.value;
    });
  }

  return procesos;
});

const presupuestoFaseSeleccionada = computed(() => {
  return procesosFaseSeleccionada.value.reduce((sum: number, p: any) => sum + (p.presupuesto || 0), 0);
});

function abrirModalPorFase(fase: string, tipoPlan: string) {
  faseSeleccionada.value = fase;
  tipoPlanSeleccionado.value = tipoPlan;
  tipoContratoSeleccionado.value = '';
  modalTipo.value = 'fase';
  modalAbierto.value = true;
}

function abrirModalPorTipoContrato(tipoContrato: string, tipoPlan: string) {
  tipoContratoSeleccionado.value = tipoContrato;
  tipoPlanSeleccionado.value = tipoPlan;
  faseSeleccionada.value = '';
  modalTipo.value = 'tipoContrato';
  modalAbierto.value = true;
}

function abrirModalPorRetrasos(direccion: string) {
  direccionSeleccionada.value = direccion;
  tipoPlanSeleccionado.value = 'PAC';
  faseSeleccionada.value = '';
  tipoContratoSeleccionado.value = '';
  modalTipo.value = 'retrasos';
  modalAbierto.value = true;
}

function cerrarModal() {
  modalAbierto.value = false;
  faseSeleccionada.value = '';
  tipoContratoSeleccionado.value = '';
  tipoPlanSeleccionado.value = '';
  modalTipo.value = 'fase';
}

// Función auxiliar para obtener la fase de un proceso (igual que backend)
function obtenerFaseProceso(etapasDetalle: any[] = []): string {
  // Verificar si tiene la etapa "contrato" completada
  const tieneContratoCompletado = etapasDetalle.some(e => {
    const nombreNorm = (e.etapaNombre || '').toLowerCase().trim();
    return (nombreNorm.includes('contrato') || nombreNorm.includes('contratacion')) &&
           e.estado === 'completado';
  });

  if (tieneContratoCompletado) {
    return 'contractual';
  }

  // Filtrar solo etapas con fase válida (ignorar sin_clasificar)
  const etapasValidas = etapasDetalle.filter(e =>
    e.fase && e.fase !== 'sin_clasificar'
  );

  // Verificar si tiene precontractuales completadas
  const tienePrecontractualCompletada = etapasValidas.some(e =>
    e.fase === 'precontractual' && e.estado === 'completado'
  );

  if (tienePrecontractualCompletada) {
    return 'precontractual';
  }

  return 'preparatoria';
}

const fechaCorte = computed(() => {
  const hoy = new Date();
  return hoy.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
});

const hayFiltros = computed(() =>
  filtroDireccion.value || filtroProcedimiento.value || filtroCuatrimestre.value
);

const avancePAC = computed(() => {
  if (!datosPAC.value?.resumenGeneral) return 0;
  const total = datosPAC.value.resumenGeneral.totalEtapas || 0;
  const completadas = datosPAC.value.resumenGeneral.etapasCompletadas || 0;
  if (total === 0) return 0;
  return Math.round((completadas / total) * 100);
});

const avanceNoPAC = computed(() => {
  if (!datosNoPAC.value?.resumenGeneral) return 0;
  const total = datosNoPAC.value.resumenGeneral.totalEtapas || 0;
  const completadas = datosNoPAC.value.resumenGeneral.etapasCompletadas || 0;
  if (total === 0) return 0;
  return Math.round((completadas / total) * 100);
});

const avanceGeneral = computed(() => {
  if (!datosPAC.value || !datosNoPAC.value) return 0;

  const totalEtapasPAC = datosPAC.value.resumenGeneral?.totalEtapas || 0;
  const etapasCompletadasPAC = datosPAC.value.resumenGeneral?.etapasCompletadas || 0;
  const totalEtapasNoPAC = datosNoPAC.value.resumenGeneral?.totalEtapas || 0;
  const etapasCompletadasNoPAC = datosNoPAC.value.resumenGeneral?.etapasCompletadas || 0;

  const totalEtapas = totalEtapasPAC + totalEtapasNoPAC;
  const etapasCompletadas = etapasCompletadasPAC + etapasCompletadasNoPAC;

  if (totalEtapas === 0) return 0;

  return Math.round((etapasCompletadas / totalEtapas) * 100);
});

onMounted(() => {
  cargarDashboard();
});

async function cargarDashboard() {
  try {
    cargando.value = true;
    error.value = '';

    // Construir parámetros base
    const paramsBase = new URLSearchParams();
    if (filtroDireccion.value) paramsBase.append('direccion', filtroDireccion.value);
    if (filtroProcedimiento.value) paramsBase.append('procedimiento', filtroProcedimiento.value);
    if (filtroCuatrimestre.value) paramsBase.append('cuatrimestre', filtroCuatrimestre.value);

    // Cargar datos PAC
    const paramsPAC = new URLSearchParams(paramsBase);
    paramsPAC.append('tipoPlan', 'PAC');
    const responsePAC = await api.get(`/reportes/dashboard/pac?${paramsPAC.toString()}`);
    datosPAC.value = responsePAC.data;

    // Cargar datos NO PAC
    const paramsNoPAC = new URLSearchParams(paramsBase);
    paramsNoPAC.append('tipoPlan', 'NO PAC');
    const responseNoPAC = await api.get(`/reportes/dashboard/pac?${paramsNoPAC.toString()}`);
    datosNoPAC.value = responseNoPAC.data;

    // Obtener direcciones disponibles
    if (!direccionesDisponibles.value.length && responsePAC.data) {
      const catalogoResponse = await api.get('/reportes/resumen');
      direccionesDisponibles.value = catalogoResponse.data.direccionesDisponibles || [];
      procedimientosDisponibles.value = [
        ...new Set([
          ...Object.keys(datosPAC.value.procesosPorProcedimiento || {}),
          ...Object.keys(datosNoPAC.value.procesosPorProcedimiento || {})
        ])
      ];
    }

    // Renderizar gráficos
    setTimeout(() => {
      renderizarGraficos();
    }, 100);
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Error al cargar el dashboard';
  } finally {
    cargando.value = false;
  }
}

function renderizarGraficos() {
  if (!datosPAC.value || !datosNoPAC.value) return;

  // GRÁFICOS PAC
  renderPieChart(
    chartDistribProcesosPAC,
    [
      { value: datosPAC.value.procesosPorFase.preparatoria, name: 'Fase Preparatoria', presupuesto: datosPAC.value.presupuestoPorFase.preparatoria },
      { value: datosPAC.value.procesosPorFase.precontractual, name: 'Fase Precontractual', presupuesto: datosPAC.value.presupuestoPorFase.precontractual },
      { value: datosPAC.value.procesosPorFase.contractual, name: 'Fase Contractual', presupuesto: datosPAC.value.presupuestoPorFase.contractual }
    ],
    ['#3b82f6', '#10b981', '#f59e0b'],
    'PAC'
  );

  renderPieChart(
    chartDistribPresupuestoPAC,
    [
      { value: datosPAC.value.presupuestoPorFase.preparatoria, name: 'Fase Preparatoria' },
      { value: datosPAC.value.presupuestoPorFase.precontractual, name: 'Fase Precontractual' },
      { value: datosPAC.value.presupuestoPorFase.contractual, name: 'Fase Contractual' }
    ],
    ['#3b82f6', '#10b981', '#f59e0b']
  );

  renderGaugeChart(
    chartVelociometroPAC,
    datosPAC.value.velocimetro.valor,
    datosPAC.value.velocimetro.meta
  );

  // GRÁFICOS NO PAC
  renderPieChart(
    chartDistribProcesosNoPAC,
    [
      { value: datosNoPAC.value.procesosPorFase.preparatoria, name: 'Fase Preparatoria', presupuesto: datosNoPAC.value.presupuestoPorFase.preparatoria },
      { value: datosNoPAC.value.procesosPorFase.precontractual, name: 'Fase Precontractual', presupuesto: datosNoPAC.value.presupuestoPorFase.precontractual },
      { value: datosNoPAC.value.procesosPorFase.contractual, name: 'Fase Contractual', presupuesto: datosNoPAC.value.presupuestoPorFase.contractual }
    ],
    ['#3b82f6', '#10b981', '#f59e0b'],
    'NO PAC'
  );

  renderPieChart(
    chartDistribPresupuestoNoPAC,
    [
      { value: datosNoPAC.value.presupuestoPorFase.preparatoria, name: 'Fase Preparatoria' },
      { value: datosNoPAC.value.presupuestoPorFase.precontractual, name: 'Fase Precontractual' },
      { value: datosNoPAC.value.presupuestoPorFase.contractual, name: 'Fase Contractual' }
    ],
    ['#3b82f6', '#10b981', '#f59e0b']
  );

  renderGaugeChart(
    chartVelociometroNoPAC,
    datosNoPAC.value.velocimetro.valor,
    datosNoPAC.value.velocimetro.meta
  );

  // Gráficos de Tipo de Contrato y Fases por tipo (PAC y NO PAC separados)
  if (datosPAC.value?.procesosPorTipoContratoYFasePAC) {
    renderStackedBarChart(chartProcedimientosYFasePAC, datosPAC.value.procesosPorTipoContratoYFasePAC, 'PAC');
  }

  if (datosNoPAC.value?.procesosPorTipoContratoYFaseNoPAC) {
    renderStackedBarChart(chartProcedimientosYFaseNoPAC, datosNoPAC.value.procesosPorTipoContratoYFaseNoPAC, 'NO PAC');
  }
}

function renderPieChart(ref: any, data: any[], colors: string[], tipoPlan?: string) {
  if (!ref.value) return;
  const chart = echarts.init(ref.value);
  const option = {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      show: true,
      orient: 'vertical',
      right: 15,
      top: 'center',
      textStyle: {
        fontSize: 12,
        color: '#475569'
      },
      formatter: (name: string) => {
        const item = data.find((d: any) => d.name === name);
        if (!item) return name;
        const presupuestoTexto = item.presupuesto ? ` - ${formatearMonto(item.presupuesto)}` : '';
        return `${name}: ${item.value}${presupuestoTexto}`;
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: data,
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true }
        }
      }
    ]
  };
  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());

  // Agregar evento click para abrir modal (solo para gráficos de distribución por fase)
  if (tipoPlan && data.length === 3) {
    chart.on('click', (params: any) => {
      const nombreFase = params.name;
      // Mapear nombre mostrado a clave interna
      const faseMap: { [key: string]: string } = {
        'Fase Preparatoria': 'preparatoria',
        'Fase Precontractual': 'precontractual',
        'Fase Contractual': 'contractual'
      };
      const fase = faseMap[nombreFase];
      if (fase) {
        abrirModalPorFase(fase, tipoPlan);
      }
    });
  }
}

function renderGaugeChart(ref: any, valor: number, meta: number) {
  if (!ref.value) return;
  const chart = echarts.init(ref.value);

  let color = '#dc2626'; // rojo
  if (valor > meta) color = '#059669'; // verde
  else if (valor > meta * 0.6) color = '#f59e0b'; // amarillo

  const option = {
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        splitNumber: 4,
        radius: '75%',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.3, '#dc2626'],
              [0.6, '#f59e0b'],
              [1, '#059669']
            ]
          }
        },
        axisTick: { show: false },
        splitLine: { show: true, length: 10 },
        axisLabel: { distance: 5, fontSize: 12 },
        pointer: { width: 8, length: '60%' },
        itemStyle: { color: color },
        data: [{ value: valor, name: `${valor}%` }],
        detail: {
          formatter: '{value}%',
          fontSize: 24,
          fontWeight: 'bold',
          color: color
        }
      }
    ]
  };
  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
}

function renderStackedBarChart(ref: any, data: any, tipoPlan: string = 'PAC') {
  if (!ref.value || !data) return;
  const chart = echarts.init(ref.value);

  // Preparar datos para gráfico de barras apiladas
  const tiposContrato = Object.keys(data).sort();

  // Validar que hay datos
  if (tiposContrato.length === 0) return;

  // Crear mapa de nombres truncados a nombres completos
  const truncatedToFull: Record<string, string> = {};
  const axisData = tiposContrato.map((t: string) => {
    let displayName = t;
    if (t.length > 25) {
      displayName = t.substring(0, 22) + '...';
    }
    truncatedToFull[displayName] = t;
    return displayName;
  });

  const preparatoriaData = tiposContrato.map((t: string) => data[t].preparatoria || 0);
  const precontractualData = tiposContrato.map((t: string) => data[t].precontractual || 0);
  const contractualData = tiposContrato.map((t: string) => data[t].contractual || 0);
  const totalData = tiposContrato.map((t: string) => data[t].total || 0);
  const presupuestoData = tiposContrato.map((t: string) => data[t].presupuesto || 0);

  // Función para formatear montos completos
  const formatearMontoCurrencia = (monto: number): string => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  };

  // Calcular ancho necesario para labels según cantidad de items
  const itemCount = tiposContrato.length;
  const baseLeftMargin = 140;
  const additionalMargin = Math.min(40, itemCount * 2);
  const estimatedLabelWidth = baseLeftMargin + additionalMargin;

  const option = {
    color: ['#3b82f6', '#10b981', '#dc2626'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const fullName = truncatedToFull[params[0].axisValue] || params[0].axisValue;
        let html = `<div style="font-size:13px;font-weight:600">${fullName}</div>`;
        params.forEach((p: any) => {
          html += `<div style="font-size:13px">${p.seriesName}: ${p.value}</div>`;
        });
        return html;
      }
    },
    legend: {
      data: ['Prep.', 'Precontractual', 'Contractual', 'TOTAL'],
      top: 5,
      left: 'center',
      textStyle: { fontSize: 12, color: '#475569', fontWeight: 500 },
      itemGap: 16
    },
    grid: {
      left: estimatedLabelWidth,
      right: 120,
      top: 35,
      bottom: 15,
      containLabel: false
    },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
      axisLabel: { fontSize: 11, color: '#64748b' },
      splitLine: { show: true, lineStyle: { color: '#e2e8f0' } }
    },
    yAxis: [
      {
        type: 'category',
        data: axisData,
        axisLabel: { fontSize: 11, color: '#475569', margin: 8 },
        gridIndex: 0
      },
      {
        type: 'category',
        data: totalData.map((val: number, idx: number) => {
          const presupuesto = presupuestoData[idx];
          const presupuestoFormato = formatearMontoCurrencia(presupuesto);
          return `${val.toString().padStart(3)} / ${presupuestoFormato}`;
        }),
        position: 'right',
        name: 'TOTAL',
        nameLocation: 'end',
        nameGap: 5,
        nameTextStyle: {
          fontSize: 12,
          color: '#1f2937',
          fontWeight: 'bold'
        },
        axisLabel: { fontSize: 13, color: '#1f2937', fontWeight: '600', fontFamily: 'monospace', margin: 8 },
        gridIndex: 0
      }
    ],
    series: [
      {
        name: 'Prep.',
        type: 'bar',
        stack: 'total',
        data: preparatoriaData,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value > 0 ? params.value : '',
          fontSize: 12,
          color: '#fff',
          fontWeight: 600
        },
        itemStyle: { color: '#3b82f6' }
      },
      {
        name: 'Precontractual',
        type: 'bar',
        stack: 'total',
        data: precontractualData,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value > 0 ? params.value : '',
          fontSize: 12,
          color: '#fff',
          fontWeight: 600
        },
        itemStyle: { color: '#10b981' }
      },
      {
        name: 'Contractual',
        type: 'bar',
        stack: 'total',
        data: contractualData,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => params.value > 0 ? params.value : '',
          fontSize: 12,
          color: '#fff',
          fontWeight: 600
        },
        itemStyle: { color: '#dc2626' }
      },
      {
        name: 'TOTAL',
        type: 'bar',
        data: totalData,
        itemStyle: { color: 'transparent' },
        z: 0
      }
    ]
  };

  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());

  // Agregar evento click para abrir modal con procesos filtrados
  chart.on('click', (params: any) => {
    if (params.seriesName && params.name) {
      // params.name es el tipo de contrato (eje Y) - podría estar truncado
      // Obtener el nombre completo usando el mapa
      const displayedName = params.name;
      const tipoContrato = truncatedToFull[displayedName] || displayedName;
      abrirModalPorTipoContrato(tipoContrato, tipoPlan);
    }
  });
}

function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(monto);
}

function calcularPorcentaje(valor: number, total: number): number {
  return total > 0 ? Math.round((valor / total) * 100) : 0;
}

function resetearFiltros() {
  filtroDireccion.value = '';
  filtroProcedimiento.value = '';
  filtroCuatrimestre.value = '';
  cargarDashboard();
}

</script>

<style scoped>
.dashboard-pac {
  background: #f8fafc;
  min-height: 100vh;
  padding: 0;
  padding-top: 65px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}


.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #1f3a70;
  border-radius: 0;
  color: white;
  position: fixed;
  top: 0;
  left: 204px;
  right: 0;
  z-index: 1001;
  box-sizing: border-box;
  border-right: 1px solid rgba(148, 186, 224, 0.28);
}

@media (max-width: 900px) {
  .dashboard-header {
    left: 0;
  }
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-title i {
  font-size: 1.75rem;
}

.header-title h1 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.header-title p {
  font-size: 0.75rem;
  color: #e0e7ff;
  margin: 0;
  margin-left: 0.25rem;
}

.header-date {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.filtros-section {
  margin-bottom: 2rem;
}

.filtros-toolbar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.combo-filtro {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  color: #334155;
  font-weight: 500;
}

.combo-filtro:hover {
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.combo-filtro:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-reset {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.loading-state {
  text-align: center;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  padding: 2rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  text-align: center;
}

.dashboard-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

.column-pac,
.column-nopac {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.column-nopac .column-header {
  border-left-color: #dc2626;
}

.column-header i {
  font-size: 1.5rem;
  color: #2563eb;
}

.column-nopac .column-header i {
  color: #dc2626;
}

.column-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.kpis-column {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.kpi-card-btn {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  font-family: inherit;
  align-items: center;
}

.kpi-card-btn:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.kpi-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 1.75rem;
  font-weight: 700;
  background: #f0f4ff;
  color: #2563eb;
}

.column-nopac .kpi-icon {
  background: #fee2e2;
  color: #dc2626;
}

.kpi-content {
  flex: 1;
  width: 100%;
}

.kpi-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.kpi-detalle {
  font-size: 0.85rem;
  color: #334155;
  font-weight: 600;
}

.chart-container {
  background: white;
  padding: 1.25rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.75rem;
}

.chart-wrapper {
  width: 100%;
  height: 250px;
  margin-bottom: 1rem;
}

.chart-wrapper.chart-tipo-contrato {
  height: 320px;
}

.chart {
  width: 100%;
  height: 100%;
}

.velocimetro-info {
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #475569;
}

.velocimetro-info p {
  margin: 0.4rem 0;
  line-height: 1.3;
}

.resumen-small {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.resumen-item-small {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #2563eb;
}

.column-nopac .resumen-item-small {
  border-left-color: #dc2626;
}

.resumen-item-small .label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.resumen-item-small .valor {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

@media (max-width: 1400px) {
  .dashboard-two-columns {
    gap: 1.5rem;
  }

  .chart-wrapper {
    height: 220px;
  }

  .kpis-column {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .kpi-card-btn {
    padding: 0.85rem;
  }

  .kpi-icon {
    width: 45px;
    height: 45px;
    font-size: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .dashboard-pac {
    padding: 1rem;
  }

  .dashboard-two-columns {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .chart-wrapper {
    height: 280px;
  }
}

.kpis-principales {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  border-top: 3px solid #2563eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kpi-card-principal {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #2563eb;
  align-items: center;
}

.kpi-icon-principal {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 2rem;
  font-weight: 700;
  background: #f0f4ff;
  color: #2563eb;
  flex-shrink: 0;
}

.kpi-content-principal {
  flex: 1;
}

.kpi-label-principal {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.kpi-detalle-principal {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.kpis-container {
  background: white;
  padding: 1.25rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kpis-title {
  margin: 0 0 1rem 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.75rem;
}

.kpi-avance {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
}

.column-nopac .kpi-avance {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #ef4444;
}

.kpi-icon-percentage {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white !important;
  font-size: 1.5rem;
  font-weight: 700;
}

.column-nopac .kpi-icon-percentage {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

@media (max-width: 1024px) {
  .kpis-column {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-wrapper.chart-tipo-contrato {
    min-height: 320px;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-title {
    flex-direction: column;
  }

  .header-title h1 {
    font-size: 1.25rem;
  }

  .kpis-principales {
    grid-template-columns: 1fr;
  }

  .kpis-column {
    grid-template-columns: 1fr;
  }

  .chart-wrapper {
    height: 250px;
  }
}

/* MODAL DE PROCESOS POR FASE */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-contenido {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.modal-header-content {
  flex: 1;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.modal-header-presupuesto {
  font-size: 0.95rem;
  color: #64748b;
  margin: 0;
  font-weight: 600;
  color: #f59e0b;
}

.btn-cerrar {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  transition: color 0.2s;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cerrar:hover {
  color: #0f172a;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.procesos-lista {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.proceso-item {
  padding: 1rem;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  border-radius: 6px;
  transition: all 0.2s;
}

.proceso-item:hover {
  background: #f1f5f9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.proceso-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.codigo {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tipo-plan {
  font-size: 0.7rem;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.proceso-nombre {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.proceso-detalles {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #64748b;
}

.presupuesto,
.avance {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sin-procesos {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

.sin-procesos p {
  margin: 0;
  font-size: 0.95rem;
}

@media (max-width: 640px) {
  .modal-contenido {
    max-width: 100%;
    max-height: 90vh;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-header h2 {
    font-size: 1.1rem;
  }

  .modal-body {
    padding: 1rem;
  }
}

/* PROCESOS CON RETRASOS */
.retrasos-section {
  margin: 2rem auto;
  max-width: 1200px;
  padding: 0 1rem;
}

.retrasos-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f3a70;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 3px solid #dc2626;
}

.retrasos-tabla-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: auto;
}

.retrasos-tabla {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.retrasos-tabla thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.retrasos-tabla th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
}

.retrasos-tabla tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s ease;
}

.retrasos-tabla tbody tr.fila-clickeable {
  cursor: pointer;
}

.retrasos-tabla tbody tr:hover {
  background: #f1f5f9;
}

.retrasos-tabla tbody tr.fila-clickeable:hover {
  background: #fecaca;
}

.retrasos-tabla td {
  padding: 1rem;
  color: #475569;
  font-size: 0.95rem;
}

.retrasos-tabla .direccion-cell {
  font-weight: 600;
  color: #1f2937;
}

.retrasos-tabla .total-cell {
  font-weight: 700;
  color: #dc2626;
  font-size: 1.1rem;
}

.retrasos-tabla .fase-cell {
  text-align: center;
  background: #fef2f2;
  color: #991b1b;
  font-weight: 600;
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

/* RESUMEN GENERAL */
.resumen-general-section {
  margin: 2rem auto;
  max-width: 1200px;
  padding: 0 1rem;
}

.resumen-general-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f3a70;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 3px solid #1f3a70;
}

.resumen-general-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.resumen-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #3b82f6;
  transition: box-shadow 0.2s ease;
}

.resumen-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.item-icon {
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-label {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.item-valor {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1f2937;
}

@media (max-width: 900px) {
  .resumen-general-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .resumen-item {
    padding: 1rem;
  }

  .item-icon {
    font-size: 1.5rem;
    min-width: 40px;
  }

  .item-valor {
    font-size: 1.1rem;
  }
}
</style>
