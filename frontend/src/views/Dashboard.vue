<template>
  <div class="dashboard-pac">
    <!-- HEADER CON TÍTULO Y FECHA -->
    <div class="dashboard-header">
      <div class="header-title">
        <i class="ri-bar-chart-2-line"></i>
        <h1>CUADRO DE MANDO – EJECUCIÓN DEL PAC</h1>
        <p>Seguimiento de Contrataciones – Modelo de KPI</p>
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
        <select v-model="filtroPacNoPac" class="combo-filtro" @change="cargarDashboard">
          <option value="">PAC y NO PAC</option>
          <option value="PAC">PAC</option>
          <option value="NO PAC">NO PAC</option>
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

    <template v-else-if="datosPC">
      <!-- KPIS PRINCIPALES -->
      <section class="kpis-principales">
        <button class="kpi-card-btn total-procesos" @click="filtrarPorKpi('todos')" :class="{ active: kpiActivo === 'todos' }">
          <div class="kpi-icon">
            <i class="ri-file-list-3-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">TOTAL PROCESOS</div>
            <div class="kpi-valor">{{ datosPC.kpisPrincipales.totalProcesos }}</div>
            <div class="kpi-detalle">Procesos contractionales</div>
          </div>
        </button>

        <button class="kpi-card-btn presupuesto-total" @click="filtrarPorKpi('presupuesto')" :class="{ active: kpiActivo === 'presupuesto' }">
          <div class="kpi-icon">
            <i class="ri-money-dollar-circle-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">PRESUPUESTO TOTAL PAC</div>
            <div class="kpi-valor">{{ formatearMonto(datosPC.kpisPrincipales.presupuestoPAC) }}</div>
            <div class="kpi-detalle">Monto total programado</div>
          </div>
        </button>

        <button class="kpi-card-btn procesos-ejecucion" @click="filtrarPorKpi('ejecucion')" :class="{ active: kpiActivo === 'ejecucion' }">
          <div class="kpi-icon">
            <i class="ri-play-circle-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">PROCESOS EN EJECUCIÓN</div>
            <div class="kpi-valor">{{ datosPC.kpisPrincipales.procesosEnEjecucion }}</div>
            <div class="kpi-detalle">{{ calcularPorcentaje(datosPC.kpisPrincipales.procesosEnEjecucion, datosPC.kpisPrincipales.totalProcesos) }}% del total</div>
          </div>
        </button>

        <button class="kpi-card-btn procesos-preparacion" @click="filtrarPorKpi('preparacion')" :class="{ active: kpiActivo === 'preparacion' }">
          <div class="kpi-icon">
            <i class="ri-inbox-archive-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">PROCESOS EN PREPARACIÓN</div>
            <div class="kpi-valor">{{ datosPC.procesosPorEstado.preparatoria + datosPC.procesosPorEstado.precontractual }}</div>
            <div class="kpi-detalle">{{ calcularPorcentaje(datosPC.procesosPorEstado.preparatoria + datosPC.procesosPorEstado.precontractual, datosPC.kpisPrincipales.totalProcesos) }}% del total</div>
          </div>
        </button>

        <button class="kpi-card-btn procesos-suspendidos" @click="filtrarPorKpi('suspendidos')" :class="{ active: kpiActivo === 'suspendidos' }">
          <div class="kpi-icon">
            <i class="ri-pause-circle-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">PROCESOS SUSPENDIDOS</div>
            <div class="kpi-valor">{{ datosPC.procesosPorEstado.suspendido }}</div>
            <div class="kpi-detalle">{{ calcularPorcentaje(datosPC.procesosPorEstado.suspendido, datosPC.kpisPrincipales.totalProcesos) }}% del total</div>
          </div>
        </button>

        <button class="kpi-card-btn procesos-desiertos" @click="filtrarPorKpi('desiertos')" :class="{ active: kpiActivo === 'desiertos' }">
          <div class="kpi-icon">
            <i class="ri-close-circle-line"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">PROCESOS DESIERTOS</div>
            <div class="kpi-valor">{{ datosPC.procesosPorEstado.desierto }}</div>
            <div class="kpi-detalle">{{ calcularPorcentaje(datosPC.procesosPorEstado.desierto, datosPC.kpisPrincipales.totalProcesos) }}% del total</div>
          </div>
        </button>
      </section>

      <!-- FILA 1: GRÁFICOS -->
      <div class="dashboard-grid-2cols">
        <!-- 1. Distribución de procesos por estado -->
        <section class="chart-container">
          <h3>1. DISTRIBUCIÓN DE PROCESOS POR ESTADO</h3>
          <div class="chart-wrapper">
            <div ref="chartDistribProcesos" class="chart"></div>
          </div>
          <div class="chart-legend">
            <table class="legend-table">
              <tr>
                <td><span class="color-dot" style="background: #1e40af;"></span>Fase Preparatoria</td>
                <td>{{ datosPC.procesosPorEstado.preparatoria }} ({{ calcularPorcentaje(datosPC.procesosPorEstado.preparatoria, datosPC.kpisPrincipales.totalProcesos) }}%)</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #059669;"></span>Precontractual</td>
                <td>{{ datosPC.procesosPorEstado.precontractual }} ({{ calcularPorcentaje(datosPC.procesosPorEstado.precontractual, datosPC.kpisPrincipales.totalProcesos) }}%)</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #0891b2;"></span>En ejecución</td>
                <td>{{ datosPC.procesosPorEstado.en_ejecucion }} ({{ calcularPorcentaje(datosPC.procesosPorEstado.en_ejecucion, datosPC.kpisPrincipales.totalProcesos) }}%)</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #f59e0b;"></span>Suspendido</td>
                <td>{{ datosPC.procesosPorEstado.suspendido }} ({{ calcularPorcentaje(datosPC.procesosPorEstado.suspendido, datosPC.kpisPrincipales.totalProcesos) }}%)</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #dc2626;"></span>Desierto</td>
                <td>{{ datosPC.procesosPorEstado.desierto }} ({{ calcularPorcentaje(datosPC.procesosPorEstado.desierto, datosPC.kpisPrincipales.totalProcesos) }}%)</td>
              </tr>
            </table>
          </div>
        </section>

        <!-- 2. Distribución del presupuesto por estado -->
        <section class="chart-container">
          <h3>2. DISTRIBUCIÓN DEL PRESUPUESTO POR ESTADO</h3>
          <div class="chart-wrapper">
            <div ref="chartDistribPresupuesto" class="chart"></div>
          </div>
          <div class="chart-legend">
            <table class="legend-table">
              <tr>
                <td><span class="color-dot" style="background: #1e40af;"></span>Fase Preparatoria</td>
                <td>{{ formatearMonto(datosPC.presupuestoPorEstado.preparatoria) }}</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #059669;"></span>Precontractual</td>
                <td>{{ formatearMonto(datosPC.presupuestoPorEstado.precontractual) }}</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #0891b2;"></span>En ejecución</td>
                <td>{{ formatearMonto(datosPC.presupuestoPorEstado.en_ejecucion) }}</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #f59e0b;"></span>Suspendido</td>
                <td>{{ formatearMonto(datosPC.presupuestoPorEstado.suspendido) }}</td>
              </tr>
              <tr>
                <td><span class="color-dot" style="background: #dc2626;"></span>Desierto</td>
                <td>{{ formatearMonto(datosPC.presupuestoPorEstado.desierto) }}</td>
              </tr>
            </table>
          </div>
        </section>
      </div>

      <!-- FILA 2: VELOCÍMETRO Y KPIS EFICIENCIA -->
      <div class="dashboard-grid-2cols">
        <!-- 3. Velocímetro - Avance del PAC -->
        <section class="chart-container">
          <h3>3. VELOCÍMETRO – AVANCE DEL PAC</h3>
          <div class="chart-wrapper">
            <div ref="chartVelociometro" class="chart"></div>
          </div>
          <div class="velocimetro-info">
            <p><strong>Índice de Ejecución del PAC:</strong> {{ datosPC.velocimetro.valor }}%</p>
            <p><strong>Meta Sugerida:</strong> {{ datosPC.velocimetro.meta }}%</p>
            <p><strong>Monto en Ejecución:</strong> {{ formatearMonto(datosPC.kpisPrincipales.montoEnEjecucion) }}</p>
          </div>
        </section>

        <!-- 4. KPIs de Eficiencia -->
        <section class="chart-container">
          <h3>4. KPIs DE EFICIENCIA</h3>
          <div class="eficiencia-grid">
            <div class="eficiencia-card">
              <div class="eficiencia-label">Índice de Ejecución del PAC</div>
              <div class="eficiencia-valor">{{ datosPC.indicesEficiencia.indiceEjecucion }}%</div>
              <div class="eficiencia-detalle">(Monto en Ejecución / Presupuesto Total)</div>
            </div>
            <div class="eficiencia-card">
              <div class="eficiencia-label">Índice de Procesos Activos</div>
              <div class="eficiencia-valor">{{ datosPC.indicesEficiencia.indiceActivos }}%</div>
              <div class="eficiencia-detalle">(Preparatoria + Precontractual + Ejecución / Etapas Procesales)</div>
            </div>
            <div class="eficiencia-card">
              <div class="eficiencia-label">Índice de Procesos con Problemas</div>
              <div class="eficiencia-valor">{{ datosPC.indicesEficiencia.indiceProblemas }}%</div>
              <div class="eficiencia-detalle">(Suspendidos o Desiertos / Total Procesos)</div>
            </div>
          </div>
        </section>
      </div>

      <!-- FILA 3: KPIs POR PROCEDIMIENTO Y DISTRIBUCIÓN -->
      <div class="dashboard-grid-full">
        <!-- 5. KPIs por Procedimiento (Monto) -->
        <section class="chart-container">
          <h3>5. KPIs POR PROCEDIMIENTO (MONTO)</h3>
          <div class="chart-wrapper">
            <div ref="chartProcedimientosBar" class="chart"></div>
          </div>
        </section>

        <!-- 6. Distribución de Procesos por Procedimiento -->
        <section class="chart-container">
          <h3>6. DISTRIBUCIÓN DE PROCESOS POR PROCEDIMIENTO Y ESTADO</h3>
          <div class="chart-wrapper">
            <div ref="chartProcedimientosEstado" class="chart"></div>
          </div>
        </section>
      </div>

      <!-- FILA 4: TABLAS -->
      <div class="dashboard-grid-2cols">
        <!-- 7. Semáforo Gerencial -->
        <section class="chart-container">
          <h3>7. SEMÁFORO GERENCIAL</h3>
          <table class="semaforo-table">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Meta</th>
                <th>Valor Actual</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(indicador, key) in datosPC.semaforoIndicadores" :key="key">
                <td>{{ obtenerLabelIndicador(key) }}</td>
                <td>{{ indicador.meta }}{{ key.includes('actual') ? '%' : '' }}</td>
                <td>{{ Math.round(indicador.actual) }}{{ key.includes('actual') || key.includes('Procesos') ? '%' : '' }}</td>
                <td>
                  <span :class="['estado-badge', `estado-${indicador.estado}`]">
                    {{ indicador.estado.toUpperCase() }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- 8. Resumen General -->
        <section class="chart-container">
          <h3>8. RESUMEN GENERAL</h3>
          <div class="resumen-grid">
            <div class="resumen-item">
              <i class="ri-file-text-line"></i>
              <div>
                <div class="resumen-label">Total de procesos</div>
                <div class="resumen-valor">{{ datosPC.kpisPrincipales.totalProcesos }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-wallet-3-line"></i>
              <div>
                <div class="resumen-label">Presupuesto total PAC</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.kpisPrincipales.presupuestoPAC) }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-wallet-line"></i>
              <div>
                <div class="resumen-label">Monto en ejecución</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.kpisPrincipales.montoEnEjecucion) }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-information-line"></i>
              <div>
                <div class="resumen-label">Monto en preparatoria</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.presupuestoPorEstado.preparatoria) }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-bookmark-line"></i>
              <div>
                <div class="resumen-label">Monto precontractual</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.presupuestoPorEstado.precontractual) }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-pause-circle-line"></i>
              <div>
                <div class="resumen-label">Monto suspendido</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.presupuestoPorEstado.suspendido) }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-error-warning-line"></i>
              <div>
                <div class="resumen-label">Monto desierto</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.presupuestoPorEstado.desierto) }}</div>
              </div>
            </div>
            <div class="resumen-item">
              <i class="ri-money-dollar-circle-line"></i>
              <div>
                <div class="resumen-label">Monto NO PAC</div>
                <div class="resumen-valor">{{ formatearMonto(datosPC.kpisPrincipales.presupuestoNoPAC) }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as echarts from 'echarts';
import api from '../services/api';

const cargando = ref(true);
const error = ref('');
const datosPC = ref<any>(null);
const kpiActivo = ref('todos');

// Filtros
const filtroDireccion = ref('');
const filtroPacNoPac = ref('');
const filtroProcedimiento = ref('');
const filtroCuatrimestre = ref('');

const direccionesDisponibles = ref<string[]>([]);
const procedimientosDisponibles = ref<string[]>([]);

// Chart instances
const chartDistribProcesos = ref<any>(null);
const chartDistribPresupuesto = ref<any>(null);
const chartVelociometro = ref<any>(null);
const chartProcedimientosBar = ref<any>(null);
const chartProcedimientosEstado = ref<any>(null);

const fechaCorte = computed(() => {
  const hoy = new Date();
  return hoy.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
});

const hayFiltros = computed(() =>
  filtroDireccion.value || filtroPacNoPac.value || filtroProcedimiento.value || filtroCuatrimestre.value
);

onMounted(() => {
  cargarDashboard();
});

async function cargarDashboard() {
  try {
    cargando.value = true;
    error.value = '';

    const params = new URLSearchParams();
    if (filtroDireccion.value) params.append('direccion', filtroDireccion.value);
    if (filtroPacNoPac.value) params.append('tipoPlan', filtroPacNoPac.value);
    if (filtroProcedimiento.value) params.append('procedimiento', filtroProcedimiento.value);
    if (filtroCuatrimestre.value) params.append('cuatrimestre', filtroCuatrimestre.value);

    const response = await api.get(`/reportes/dashboard/pac?${params.toString()}`);
    datosPC.value = response.data;

    // Obtener direcciones y procedimientos disponibles
    if (!direccionesDisponibles.value.length && response.data) {
      // Hacer otra llamada para obtener el catálogo
      const catalogoResponse = await api.get('/reportes/resumen');
      direccionesDisponibles.value = catalogoResponse.data.direccionesDisponibles || [];
      procedimientosDisponibles.value = Object.keys(datosPC.value.procesosPorProcedimiento || {});
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
  if (!datosPC.value) return;

  // 1. Distribución de procesos por estado
  renderPieChart(
    chartDistribProcesos,
    [
      { value: datosPC.value.procesosPorEstado.preparatoria, name: 'Fase Preparatoria' },
      { value: datosPC.value.procesosPorEstado.precontractual, name: 'Precontractual' },
      { value: datosPC.value.procesosPorEstado.en_ejecucion, name: 'En ejecución' },
      { value: datosPC.value.procesosPorEstado.suspendido, name: 'Suspendido' },
      { value: datosPC.value.procesosPorEstado.desierto, name: 'Desierto' }
    ],
    ['#1e40af', '#059669', '#0891b2', '#f59e0b', '#dc2626']
  );

  // 2. Distribución del presupuesto por estado
  renderPieChart(
    chartDistribPresupuesto,
    [
      { value: datosPC.value.presupuestoPorEstado.preparatoria, name: 'Fase Preparatoria' },
      { value: datosPC.value.presupuestoPorEstado.precontractual, name: 'Precontractual' },
      { value: datosPC.value.presupuestoPorEstado.en_ejecucion, name: 'En ejecución' },
      { value: datosPC.value.presupuestoPorEstado.suspendido, name: 'Suspendido' },
      { value: datosPC.value.presupuestoPorEstado.desierto, name: 'Desierto' }
    ],
    ['#1e40af', '#059669', '#0891b2', '#f59e0b', '#dc2626']
  );

  // 3. Velocímetro
  renderGaugeChart(
    chartVelociometro,
    datosPC.value.velocimetro.valor,
    datosPC.value.velocimetro.meta
  );

  // 4. KPIs por Procedimiento (Bar chart)
  renderProcedimientosBar();

  // 5. Distribución por procedimiento y estado
  renderProcedimientosEstado();
}

function renderPieChart(ref: any, data: any[], colors: string[]) {
  if (!ref.value) return;
  const chart = echarts.init(ref.value);
  const option = {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: { show: false },
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

function renderProcedimientosBar() {
  if (!chartProcedimientosBar.value) return;
  const chart = echarts.init(chartProcedimientosBar.value);

  const procedimientos = Object.entries(datosPC.value.procesosPorProcedimiento).map(([nombre, data]: any) => ({
    nombre,
    monto: data.monto
  })).sort((a, b) => b.monto - a.monto);

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: procedimientos.map(p => p.nombre),
      axisLabel: { interval: 0, rotate: 45 }
    },
    yAxis: { type: 'value' },
    series: [
      {
        data: procedimientos.map(p => p.monto),
        type: 'bar',
        itemStyle: { color: '#2563eb' }
      }
    ]
  };
  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
}

function renderProcedimientosEstado() {
  if (!chartProcedimientosEstado.value) return;
  const chart = echarts.init(chartProcedimientosEstado.value);

  const procedimientos = Object.keys(datosPC.value.procesosPorProcedimiento);

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Preparatoria', 'Precontractual', 'En ejecución', 'Suspendido', 'Desierto'] },
    xAxis: {
      type: 'category',
      data: procedimientos,
      axisLabel: { interval: 0, rotate: 45 }
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Preparatoria',
        type: 'bar',
        stack: 'total',
        data: procedimientos.map(() => 0), // Placeholder
        itemStyle: { color: '#1e40af' }
      },
      {
        name: 'Precontractual',
        type: 'bar',
        stack: 'total',
        data: procedimientos.map(() => 0),
        itemStyle: { color: '#059669' }
      },
      {
        name: 'En ejecución',
        type: 'bar',
        stack: 'total',
        data: procedimientos.map(() => 0),
        itemStyle: { color: '#0891b2' }
      },
      {
        name: 'Suspendido',
        type: 'bar',
        stack: 'total',
        data: procedimientos.map(() => 0),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: 'Desierto',
        type: 'bar',
        stack: 'total',
        data: procedimientos.map(() => 0),
        itemStyle: { color: '#dc2626' }
      }
    ]
  };
  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
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

function obtenerLabelIndicador(key: string): string {
  const labels: Record<string, string> = {
    procesosEnEjecucion: 'Procesos en ejecución',
    procesosEficiencia: 'Índice de Procesos Activos',
    procesosDesiert: 'Procesos desiertos',
    avancePresup: 'Avance presupuestario',
    procesosActivos: 'Procesos activos'
  };
  return labels[key] || key;
}

function filtrarPorKpi(kpi: string) {
  kpiActivo.value = kpiActivo.value === kpi ? 'todos' : kpi;
  // Aquí se podrían agregar filtros adicionales si es necesario
}

function resetearFiltros() {
  filtroDireccion.value = '';
  filtroPacNoPac.value = '';
  filtroProcedimiento.value = '';
  filtroCuatrimestre.value = '';
  kpiActivo.value = 'todos';
  cargarDashboard();
}
</script>

<style scoped>
.dashboard-pac {
  background: #f8fafc;
  min-height: 100vh;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
  border-radius: 8px;
  color: white;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-title i {
  font-size: 2.5rem;
}

.header-title h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.header-title p {
  font-size: 0.9rem;
  color: #e0e7ff;
  margin: 0;
  margin-top: 0.25rem;
}

.header-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.header-date i {
  font-size: 1.5rem;
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
  font-size: 0.9rem;
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

.kpis-principales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.kpi-card-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
  font-family: inherit;
}

.kpi-card-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kpi-card-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.kpi-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 1.75rem;
  flex-shrink: 0;
}

.total-procesos .kpi-icon { background: #dbeafe; color: #1e40af; }
.presupuesto-total .kpi-icon { background: #dbeafe; color: #0ea5e9; }
.procesos-ejecucion .kpi-icon { background: #d1fae5; color: #059669; }
.procesos-preparacion .kpi-icon { background: #fef3c7; color: #d97706; }
.procesos-suspendidos .kpi-icon { background: #fecaca; color: #dc2626; }
.procesos-desiertos .kpi-icon { background: #e5e7eb; color: #6b7280; }

.kpi-content {
  flex: 1;
}

.kpi-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.kpi-valor {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.kpi-detalle {
  font-size: 0.85rem;
  color: #94a3b8;
}

.dashboard-grid-2cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.dashboard-grid-full {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 0.75rem;
}

.chart-wrapper {
  width: 100%;
  height: 300px;
  margin-bottom: 1rem;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-legend {
  margin-top: 1rem;
}

.legend-table {
  width: 100%;
  font-size: 0.85rem;
  border-collapse: collapse;
}

.legend-table tr {
  border-bottom: 1px solid #f1f5f9;
}

.legend-table tr:last-child {
  border-bottom: none;
}

.legend-table td {
  padding: 0.5rem 0;
  color: #475569;
}

.legend-table td:first-child {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.velocimetro-info {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #475569;
}

.velocimetro-info p {
  margin: 0.5rem 0;
}

.eficiencia-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.eficiencia-card {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  text-align: center;
  border-top: 3px solid #3b82f6;
}

.eficiencia-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.eficiencia-valor {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.eficiencia-detalle {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.3;
}

.semaforo-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.semaforo-table thead {
  background: #f1f5f9;
}

.semaforo-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 700;
  color: #475569;
  border-bottom: 2px solid #cbd5e1;
}

.semaforo-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
}

.estado-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.estado-verde {
  background: #dcfce7;
  color: #166534;
}

.estado-rojo {
  background: #fee2e2;
  color: #991b1b;
}

.estado-amarillo {
  background: #fef3c7;
  color: #92400e;
}

.resumen-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.resumen-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.resumen-item i {
  font-size: 1.5rem;
  color: #3b82f6;
  flex-shrink: 0;
}

.resumen-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.resumen-valor {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

@media (max-width: 1024px) {
  .dashboard-grid-2cols {
    grid-template-columns: 1fr;
  }

  .dashboard-grid-full {
    grid-template-columns: 1fr;
  }

  .eficiencia-grid {
    grid-template-columns: 1fr;
  }

  .resumen-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-pac {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-title {
    flex-direction: column;
  }

  .kpis-principales {
    grid-template-columns: 1fr;
  }

  .resumen-grid {
    grid-template-columns: 1fr;
  }
}
</style>
