<template>
  <div class="dashboard-admin">
    <header class="dashboard-header">
      <div>
        <h1>Contrataciones 2026</h1>
        <p>QUITO TURISMO 2026</p>
      </div>
      <div class="header-meta">
        <span class="meta-pill">📅 {{ fechaActual }}</span>
      </div>
    </header>

    <div v-if="cargando" class="loading">Cargando indicadores...</div>

    <template v-else>
      <section class="context-summary">
        <div class="filter-chips">
          <span class="filter-chip primary">Vista: {{ areaSeleccionada || 'General' }}</span>
          <span class="filter-chip primary" v-if="responsableSeleccionado">Responsable: {{ responsableSeleccionado }}</span>
       
          <span class="filter-chip">Presupuesto: {{ formatearMonto(presupuestoFiltrado) }}</span>
          
          <button v-if="areaSeleccionada || responsableSeleccionado" class="btn-clear-filter" @click="restablecerVista">
            Restablecer vista
          </button>
          <select v-model="filtroDireccion" class="combo-filtro" style="margin-left: 12px; min-width: 120px;">
            <option value="">Todas las direcciones</option>
            <option v-for="dir in direcciones" :key="dir" :value="dir">{{ dir }}</option>
          </select>
          <select v-model="filtroMonto" class="combo-filtro" style="margin-left: 8px; min-width: 120px;">
            <option value="">Todos los montos</option>
            <option v-for="monto in montosDisponibles" :key="monto" :value="monto">{{ monto }}</option>
          </select>
        </div>
      </section>



      <section class="kpi-grid professional-kpi-grid">
        <article
          class="kpi-card has-tooltip"
          tabindex="0"
          :data-tooltip="`Semáforo positivo (80/50): actual ${porcentajeProcesosVisibles}%`"
        >
          <span class="kpi-title">Total de procesos</span>
          <strong class="kpi-value">{{ kpis.totalTareas }}</strong>
          <small class="kpi-foot">Procesos activos con verificables planificados</small>
          <div class="kpi-mini-track">
            <div class="kpi-mini-fill" :style="{ width: `${porcentajeProcesosVisibles}%`, backgroundColor: colorProcesosVisibles }"></div>
          </div>
          <small class="kpi-mini-label">{{ porcentajeProcesosVisibles }}% del total activo</small>
        </article>
        <button
          type="button"
          class="kpi-card kpi-card-button success has-tooltip"
          :data-tooltip="`Semáforo positivo (80/50): actual ${kpis.porcentajeCumplimiento}%`"
          @click="abrirDetalleKpi('cumplimiento')"
        >
          <span class="kpi-title">Procesos Completos</span>
          <strong class="kpi-value">{{ kpis.porcentajeCumplimiento }}%</strong>
          <small class="kpi-foot">Procesos completos: {{ kpis.actividadesCompletadas }} de {{ kpis.totalTareas }} .</small>
          <div class="kpi-mini-track">
            <div class="kpi-mini-fill" :style="{ width: `${kpis.porcentajeCumplimiento}%`, backgroundColor: colorCumplimiento }"></div>
          </div>
        </button>
        <button
          type="button"
          class="kpi-card kpi-card-button danger has-tooltip"
          :data-tooltip="`Semáforo riesgo (<=20/<=50): actual ${porcentajeAtraso}%`"
          @click="abrirDetalleKpi('retraso')"
        >
          <span class="kpi-title">Verificables con retraso</span>
          <strong class="kpi-value">{{ kpis.atrasadas }}</strong>
          <small class="kpi-foot">Verificables que excedieron la fecha programada</small>
          <div class="kpi-mini-track">
            <div class="kpi-mini-fill" :style="{ width: `${porcentajeAtraso}%`, backgroundColor: colorAtraso }"></div>
          </div>
          <small class="kpi-mini-label">{{ porcentajeAtraso }}% del total de verificables</small>
        </button>
        <button
          type="button"
          class="kpi-card kpi-card-button accent has-tooltip"
          :data-tooltip="`Semáforo riesgo (<=20/<=50): actual ${porcentajeProximas}%`"
          @click="abrirDetalleKpi('proximas')"
        >
          <span class="kpi-title">Próximas a vencer</span>
          <div class="kpi-donut-row">
            <strong class="kpi-value">{{ verificablesPorVencer.length }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${porcentajeProximas}%`, '--kpi-color': colorProximas }">
              <span :style="{ color: colorProximas }">{{ porcentajeProximas }}%</span>
            </div>
          </div>
          <small class="kpi-foot">{{ porcentajeProximas }}% de pendientes vence en 2 y 1 día</small>
        </button>
      </section>

      <section class="trend-kpi-grid">
        <!-- Etapas programadas por semana: solo etapas -->
        <article class="kpi-card trend-card">
          <div class="trend-card-header">
            <div>
              <span class="kpi-title">Etapas programadas por semana</span>
              <strong class="kpi-value trend-value">{{ mejorSemanaCumplimientoTexto.valor }}</strong>
            </div>
            <small class="trend-badge success">Pico: {{ mejorSemanaCumplimientoTexto.label }}</small>
          </div>
          <small class="kpi-foot">Semana con mayor cantidad de verificables planificados</small>
          <div v-if="serieSemanal.length" class="trend-chart-wrap">
            <DashboardChart
              :labels="serieSemanal.map(item => item.label)"
              :etapasPlanificadas="serieSemanal.map(item => item.etapasProgramadas || 0)"
              :etapasCumplidas="serieSemanal.map(item => item.etapasCumplidas !== undefined ? item.etapasCumplidas : 0)"
              :alertas="serieSemanal.map(() => 0)"
            />
          </div>
            <div v-else class="empty-inline">Sin etapas planificadas por semana para el filtro actual.</div>
        </article>

        <!-- Alertas registradas por semana: solo alertas -->
        <article class="kpi-card trend-card alert neutral-alert-card">
          <div class="trend-card-header" style="align-items: center; gap: 1.2rem;">
            <div style="display: flex; align-items: center; gap: 0.7rem;">
              <span style="font-size: 1.7rem; color: #64748b; background: #f3f4f6; border-radius: 50%; padding: 0.15em 0.35em; display: flex; align-items: center; justify-content: center;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="12" fill="#f3f4f6"/><path d="M12 7v4m0 4h.01" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16" r="1" fill="#64748b"/></svg>
              </span>
              <div>
                <span class="kpi-title" style="font-size: 1.05rem; color: #334155;">Alertas por semana</span>
                <div style="display: flex; align-items: baseline; gap: 0.5rem;">
                  <strong class="kpi-value trend-value" style="font-size: 1.5rem; color: #334155;">
                    {{ serieSemanal.reduce((sum, item) => sum + (item.alertas || 0), 0) }}
                  </strong>
                  <span style="font-size: 1rem; color: #64748b; font-weight: 500;">total</span>
                </div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem;">
              <small class="trend-badge" style="font-size: 0.95rem; background: #f3f4f6; color: #64748b; padding: 0.2em 0.7em;">Pico: {{ peorSemanaAlertasTexto.label }}</small>
              <span style="font-size: 0.85rem; color: #64748b;">Promedio: {{ (serieSemanal.length ? (serieSemanal.reduce((sum, item) => sum + (item.alertas || 0), 0) / serieSemanal.length).toFixed(1) : 0) }}</span>
            </div>
          </div>
          <small class="kpi-foot" style="font-size: 0.9rem; color: #64748b; font-weight: 500;">Total de alertas en las últimas 16 semanas</small>
          <div v-if="!serieSemanal.length" class="empty-inline">Sin alertas registradas por semana para el filtro actual.</div>
          <div v-else class="mini-alertas-chart-wrap" style="padding: 8px 0; min-width: 220px; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f8fafc; border-radius: 10px; box-shadow: 0 1px 4px #e5e7eb;">
            <canvas ref="miniAlertasChart" height="60" width="220" style="max-width: 100%; margin-bottom: 4px; background: transparent;"></canvas>
            <div class="mini-alertas-legend" style="color: #64748b; font-size: 0.9rem; font-weight: 600;">Últimas 16 semanas</div>
            <div style="margin-top: 2px; font-size: 0.8rem; color: #64748b;">
              Semana con más alertas: <b>{{ peorSemanaAlertasTexto.label }}</b>
            </div>
          </div>
        </article>
      </section>

      <!-- ── Sección: Velocímetro + Progreso temporal ─────────────────── -->
      <section class="charts-grid temporal-section">

        <!-- Tarjeta velocímetro -->
        <article class="panel gauge-panel">
          <div class="panel-header">
            <h2>Nivel de cumplimiento</h2>
            <span>{{ completadosVerificablesConFecha }} de {{ totalVerificablesConFecha }} verificables</span>
          </div>
          <div class="gauge-wrap">
            <!--
              viewBox 0 0 196 108: centro en (98,98); la mitad inferior
              del círculo queda fuera del viewport (clipping natural).
              Los arcos de zona son <path>, sin efecto wrap-around.
            -->
            <svg class="gauge-svg" viewBox="0 0 196 108" aria-hidden="true">
              <!-- Zonas coloreadas de referencia -->
              <path d="M 18 98 A 80 80 0 0 1 98 18"          fill="none" stroke="#fecaca" stroke-width="16" stroke-linecap="butt"/>
              <path d="M 98 18 A 80 80 0 0 1 162.72 50.98"   fill="none" stroke="#fef08a" stroke-width="16" stroke-linecap="butt"/>
              <path d="M 162.72 50.98 A 80 80 0 0 1 178 98"  fill="none" stroke="#bbf7d0" stroke-width="16" stroke-linecap="butt"/>
              <!-- Divisores blancos entre zonas (50% y 80%) -->
              <line x1="98"  y1="10" x2="98"  y2="26" stroke="white" stroke-width="2"/>
              <line x1="156" y1="56" x2="169" y2="46" stroke="white" stroke-width="2"/>
              <!-- Etiquetas de escala -->
              <text x="6"   y="89" class="gauge-zone-txt">0%</text>
              <text x="98"  y="12" text-anchor="middle" class="gauge-zone-txt">50%</text>
            <text x="190" y="89" text-anchor="end"    class="gauge-zone-txt">100%</text>
              <!-- Arco de progreso delgado (sobre las zonas) -->
              <circle
                cx="98" cy="98" :r="GAUGE_R"
                fill="none"
                :stroke="gaugeColor"
                stroke-width="4"
                stroke-linecap="round"
                :stroke-dasharray="gaugeDasharray"
                stroke-dashoffset="0"
                transform="rotate(-180 98 98)"
                style="transition: stroke-dasharray 0.6s ease, stroke 0.4s ease;"
              />
              <!-- Aguja / pluma (rota CSS alrededor de 98,98) -->
              <g :style="{ transform: `rotate(${gaugeNeedleRotation}deg)`, transformOrigin: '98px 98px', transition: 'transform 0.6s ease' }">
                <polygon points="98,28 101,92 95,92" :fill="gaugeColor" style="transition: fill 0.4s ease;"/>
              </g>
              <!-- Hub de la aguja -->
              <circle cx="98" cy="98" r="9" fill="#1e293b"/>
              <circle cx="98" cy="98" r="4" fill="white"/>
            </svg>
            <div class="gauge-value" :style="{ color: gaugeColor }">{{ porcentajeVerificables }}%</div>
            <div class="gauge-sub">de {{ totalVerificablesConFecha }} verificables con fecha asignada</div>
            <div class="gauge-legend">
              <div class="gauge-legend-item">
                <span class="gauge-dot" style="background:#22c55e"></span>
                <span>Completados: <strong>{{ completadosVerificablesConFecha }}</strong></span>
              </div>
              <div class="gauge-legend-item">
                <span class="gauge-dot" style="background:#f59e0b"></span>
                <span>Pendientes: <strong>{{ pendientesVerificablesConFecha }}</strong></span>
              </div>
              <div class="gauge-legend-item">
                <span class="gauge-dot" style="background:#ef4444"></span>
                <span>Atrasados: <strong>{{ atrasadosVerificablesConFecha }}</strong></span>
              </div>
            </div>
          </div>
        </article>

        <!-- Tarjeta gráfica temporal -->
        <article class="panel temporal-panel">
          <div class="panel-header">
            <h2>Progreso de cumplimiento</h2>
            <div class="temporal-header-actions">
              <span class="temporal-overdue-total">Atrasos: {{ totalAtrasadosTemporal }}</span>
              <div class="temporal-tabs">
                <button
                  class="temporal-tab"
                  :class="{ active: vistaTemporalActiva === 'semanas' }"
                  @click="vistaTemporalActiva = 'semanas'"
                >Por semana</button>
                <button
                  class="temporal-tab"
                  :class="{ active: vistaTemporalActiva === 'meses' }"
                  @click="vistaTemporalActiva = 'meses'"
                >Por mes</button>
              </div>
            </div>
          </div>

          <div v-if="datosTemporal.length === 0" class="empty">Sin verificables con fecha planificada para mostrar.</div>

          <div v-else class="temporal-chart">
            <div class="temporal-bars-wrap">
              <div
                v-for="bucket in datosTemporal"
                :key="bucket.clave"
                class="temporal-col"
              >
                <div class="temporal-bar-group">
                  <!-- Barra pendientes -->
                  <div
                    class="temporal-bar pending"
                    :style="{ height: `${Math.round((bucket.pendientes / maxTotalTemporal) * 100)}%` }"
                    :title="`${bucket.pendientes} pendientes`"
                  ></div>
                  <!-- Barra completados -->
                  <div
                    class="temporal-bar done"
                    :style="{ height: `${Math.round((bucket.completados / maxTotalTemporal) * 100)}%` }"
                    :title="`${bucket.completados} completados`"
                  ></div>
                  <!-- Barra atrasados -->
                  <div
                    class="temporal-bar late"
                    :style="{ height: `${Math.round((bucket.atrasados / maxTotalTemporal) * 100)}%` }"
                    :title="`${bucket.atrasados} atrasados`"
                  ></div>
                </div>
                <div class="temporal-label">{{ bucket.clave }}</div>
                <div class="temporal-pct">
                  {{ bucket.total ? Math.round((bucket.completados / bucket.total) * 100) : 0 }}%
                </div>
                <div class="temporal-counts">
                  <span class="count pending">P:{{ bucket.pendientes }}</span>
                  <span class="count done">C:{{ bucket.completados }}</span>
                  <span class="count late">R:{{ bucket.atrasados }}</span>
                </div>
              </div>
            </div>
            <div class="temporal-legend">
              <span><i class="dot ok"></i>Completados</span>
              <span><i class="dot warn"></i>Pendientes</span>
              <span><i class="dot danger"></i>Atrasados</span>
            </div>
          </div>
        </article>

      </section>

      <section class="charts-grid extended-grid">
        <article class="panel donut-panel">
          <div class="panel-header">
            <h2>Procesos por área</h2>
            <span>{{ subtareasElegibles.length }} procesos</span>
          </div>
          <div v-if="procesosPorArea.length" class="donut-wrap area-donut-wrap">
            <div class="donut area-donut" :style="estiloDonaAreas">
              <div class="donut-center">
                <strong>{{ subtareasElegibles.length }}</strong>
                <span>Procesos</span>
              </div>
            </div>
            <div class="donut-legend area-legend">
              <button
                v-for="item in procesosPorArea"
                :key="item.label"
                type="button"
                class="area-legend-item"
                :class="{ active: areaSeleccionada === item.label }"
                @click="toggleArea(item.label)"
              >
                <div class="area-legend-main">
                  <i class="dot" :style="{ background: item.color }"></i>
                  <span class="area-legend-name">{{ item.label }}</span>
                </div>
                <span class="area-legend-meta">{{ item.procesos }} · {{ item.porcentajeProcesos }}%</span>
              </button>
            </div>
          </div>
          <div v-else class="empty">No hay áreas con información disponible.</div>
        </article>

        <article class="panel barras-panel ranking-panel">
          <div class="panel-header">
            <h2>Procesos y avance</h2>
            <span>Total {{ actividadesAvancePresupuesto.length }} </span>
          </div>
          <div v-if="totalPaginasRanking > 1" class="panel-paginator">
            <button class="panel-pag-btn" :disabled="paginaRanking === 1" @click="paginaRanking--">‹ Anterior</button>
            <span class="panel-pag-info">Página {{ paginaRanking }} de {{ totalPaginasRanking }}</span>
            <button class="panel-pag-btn" :disabled="paginaRanking >= totalPaginasRanking" @click="paginaRanking++">Siguiente ›</button>
          </div>
          <div v-if="actividadesAvancePresupuestoPaginadas.length" class="bars-stack bars-stack-detailed">
            <button
              v-for="item in actividadesAvancePresupuestoPaginadas"
              :key="item.id"
              type="button"
              class="actividad-bar-row actividad-bar-button"
              :class="{ active: item.destacada && !!responsableSeleccionado, muted: !item.destacada && !!responsableSeleccionado }"
              @click="abrirActividadDetalle(item.id)"
            >
              <div class="actividad-bar-top">
                <div>
                  <div class="bar-label">{{ item.nombre }}</div>
                  <div class="bar-helper">{{ item.area }} · {{ item.responsable }} · selecciona para abrir detalle</div>
                </div>
                <div class="actividad-presupuesto">{{ formatearMonto(item.presupuesto) }}</div>
              </div>
              <div class="actividad-bar-main">
                <div class="bar-track actividad-track">
                  <div
                    class="bar-fill"
                    :class="item.avance >= 70 ? 'ok' : item.avance >= 40 ? 'info' : 'warn'"
                    :style="{ width: item.width }"
                  ></div>
                </div>
                <div class="bar-value actividad-avance">{{ item.avance }}%</div>
              </div>
            </button>
          </div>
          <div v-if="actividadesAvancePresupuestoPaginadas.length && totalPaginasRanking > 1" class="panel-paginator">
            <button class="panel-pag-btn" :disabled="paginaRanking === 1" @click="paginaRanking--">‹ Anterior</button>
            <span class="panel-pag-info">Página {{ paginaRanking }} de {{ totalPaginasRanking }}</span>
            <button class="panel-pag-btn" :disabled="paginaRanking >= totalPaginasRanking" @click="paginaRanking++">Siguiente ›</button>
          </div>
          <div v-if="!actividadesAvancePresupuestoPaginadas.length" class="empty">No hay procesos activos para graficar.</div>
        </article>
      </section>

      <div v-if="detalleKpi.activo" class="modal-overlay kpi-detail-overlay" @click="cerrarDetalleKpi">
        <div class="kpi-detail-modal" @click.stop>
          <div class="kpi-detail-header">
            <div>
              <h3>{{ detalleKpiTitulo }}</h3>
              <p>{{ detalleKpiSubtitulo }}</p>
            </div>
            <button type="button" class="btn-close" @click="cerrarDetalleKpi">✕</button>
          </div>

          <div v-if="detalleKpi.tipo === 'cumplimiento'" class="kpi-detail-body listado">
            <div v-if="detalleCumplimiento.length === 0" class="empty">No hay procesos completos para el filtro actual.</div>
            <div v-for="item in detalleCumplimiento" :key="item.id" class="kpi-detail-item">
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.area }} · {{ item.responsable }}</p>
              </div>
              <div class="list-meta">{{ formatearMonto(item.presupuesto) }}</div>
            </div>
          </div>

          <div v-else-if="detalleKpi.tipo === 'retraso'" class="kpi-detail-body listado">
            <div v-if="detalleEtapasAtrasadas.length === 0" class="empty">No hay verificables con retraso para el filtro actual.</div>
            <button
              v-for="item in detalleEtapasAtrasadas"
              :key="item.id"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirEtapaAtrasadaDetalle(item.subtareaId, item.etapaId)"
            >
              <div>
                <strong>{{ item.etapaNombre }}</strong>
                <p>{{ item.subtareaNombre }} · {{ item.responsable }} · clic para abrir</p>
              </div>
              <div class="list-meta late">{{ item.diasRetraso }}D</div>
            </button>
          </div>

          <div v-else-if="detalleKpi.tipo === 'proximas'" class="kpi-detail-body listado">
            <div v-if="verificablesPorVencer.length === 0" class="empty">No hay verificables por vencer en 2 o 1 día para el filtro actual.</div>
            <button
              v-for="item in verificablesPorVencer"
              :key="item.id"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirActividadDetalle(item.subtareaId, item.etapaId)"
            >
              <div>
                <strong>{{ item.etapaNombre }}</strong>
                <p>{{ item.subtareaNombre }} · {{ item.responsable }} · clic para abrir</p>
              </div>
              <div class="list-meta">{{ item.diasRestantes }}D</div>
            </button>
          </div>

          <div v-else class="kpi-detail-body listado">
            <div v-if="detalleMontoEjecutado.length === 0" class="empty">No hay procesos terminados para el filtro actual.</div>
            <div v-for="item in detalleMontoEjecutado" :key="item.id" class="kpi-detail-item">
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.area }} · {{ item.responsable }}</p>
              </div>
              <div class="list-meta">{{ formatearMonto(item.presupuesto) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Filtros para dirección y monto
const filtroDireccion = ref('');
const filtroMonto = ref('');
// Extraer direcciones únicas de subtareas cargadas
const direcciones = computed(() => {
  const set = new Set<string>();
  for (const s of subtareas.value) {
    if (s.direccionNombre && s.direccionNombre !== 'Sin área' && s.direccionNombre !== 'Sin dirección') {
      set.add(s.direccionNombre);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});
// Extraer rangos de montos de subtareas cargadas
const montosDisponibles = computed(() => {
  // Define rangos de ejemplo, puedes ajustar según tus necesidades
  const rangos = [
    { label: '0-1,000', min: 0, max: 1000 },
    { label: '1,001-5,000', min: 1001, max: 5000 },
    { label: '5,001-10,000', min: 5001, max: 10000 },
    { label: '10,001+', min: 10001, max: Infinity }
  ];
  const usados = new Set<string>();
  for (const s of subtareas.value) {
    const monto = Number(s.presupuesto || 0);
    for (const r of rangos) {
      if (monto >= r.min && monto <= r.max) {
        usados.add(r.label);
        break;
      }
    }
  }
  return rangos.filter(r => usados.has(r.label)).map(r => r.label);
});

// Filtrar subtareas según dirección y monto seleccionados
const subtareasFiltradasPorDireccionMonto = computed(() => {
  let items = subtareas.value;
  if (filtroDireccion.value) {
    items = items.filter(s => s.direccionNombre === filtroDireccion.value);
  }
  if (filtroMonto.value) {
    // Usa los mismos rangos que montosDisponibles
    const rangos = [
      { label: '0-1,000', min: 0, max: 1000 },
      { label: '1,001-5,000', min: 1001, max: 5000 },
      { label: '5,001-10,000', min: 5001, max: 10000 },
      { label: '10,001+', min: 10001, max: Infinity }
    ];
    const rango = rangos.find(r => r.label === filtroMonto.value);
    if (rango) {
      items = items.filter(s => {
        const monto = Number(s.presupuesto || 0);
        return monto >= rango.min && monto <= rango.max;
      });
    }
  }
  return items;
});
import DashboardChart from '../components/DashboardChart.vue';
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import type { Chart as ChartJS } from 'chart.js';

// Declaraciones principales de estado reactivo
const cargando = ref(true);
const subtareas = ref<any[]>([]);
const resumenSemanal = ref<{ series: any[]; mejorSemanaCumplimiento: any | null; peorSemanaAlertas: any | null }>({
  series: [],
  mejorSemanaCumplimiento: null,
  peorSemanaAlertas: null
});
const areaSeleccionada = ref('');
const responsableSeleccionado = ref('');
const paginaRanking = ref(1);
const itemsPorPaginaRanking = 8;
const detalleKpi = ref<{ activo: boolean; tipo: 'cumplimiento' | 'retraso' | 'proximas' | 'monto' }>({
  activo: false,
  tipo: 'cumplimiento'
});
const fechaActual = new Date().toLocaleDateString('es-EC', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

// --- Computed y variables dependientes de serieSemanal ---

const serieSemanal = computed(() => {
  const source = Array.isArray(resumenSemanal.value?.series) ? resumenSemanal.value.series : [];
  return source.slice(-16);
});



const mejorSemanaCumplimientoTexto = computed(() => ({
  valor: Number(resumenSemanal.value?.mejorSemanaCumplimiento?.etapasProgramadas || 0),
  label: resumenSemanal.value?.mejorSemanaCumplimiento?.label || 'Sin datos'
}));



const peorSemanaAlertasTexto = computed(() => ({
  valor: Number(resumenSemanal.value?.peorSemanaAlertas?.alertas || 0),
  label: resumenSemanal.value?.peorSemanaAlertas?.label || 'Sin datos'
}));

const miniAlertasChart = ref<HTMLCanvasElement | null>(null);
let miniAlertasChartInstance: ChartJS | null = null;
import { useRouter } from 'vue-router';
import { subtareasService } from '../services/api';
import Chart from 'chart.js/auto';
const router = useRouter();

function renderMiniAlertasChart() {
  nextTick(() => {
    // Limpia cualquier instancia previa
    if (miniAlertasChartInstance) {
      miniAlertasChartInstance.destroy();
      miniAlertasChartInstance = null;
    }
    // Solo renderiza si el ref existe y hay datos
    if (!miniAlertasChart.value || !serieSemanal.value || !serieSemanal.value.length) {
      return;
    }
    // ...código de inicialización Chart.js aquí...
    // Ejemplo:
    // miniAlertasChartInstance = new Chart(miniAlertasChart.value, { ... });
  });
}

watch(serieSemanal, () => {
  renderMiniAlertasChart();
});

onMounted(() => {
  renderMiniAlertasChart();
});

onBeforeUnmount(() => {
  if (miniAlertasChartInstance) miniAlertasChartInstance.destroy();
});

function normalizarEstado(estado: string | undefined, fechaReal?: string | null) {
  // Si tiene fechaReal, está completado (independiente del estado)
  if (fechaReal && String(fechaReal).trim().length > 0) return 'completado';
  // Si no tiene fechaReal, verificar el campo estado
  if (!estado) return 'pendiente';
  const est = estado.toLowerCase().trim();
  if (est === 'completada' || est === 'cerrada') return 'completado';
  return 'pendiente';
}

function colorSemaforoPositivo(valor: number) {
  if (valor >= 80) return '#22c55e';
  if (valor >= 50) return '#f59e0b';
  return '#ef4444';
}

function colorSemaforoRiesgo(valor: number) {
  if (valor <= 20) return '#22c55e';
  if (valor <= 50) return '#f59e0b';
  return '#ef4444';
}

function formatearMonto(valor: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(valor || 0));
}

function calcularAvanceSubtarea(subtarea: any) {
  const avanceGeneral = Number(subtarea.avanceGeneral ?? subtarea.avance ?? 0);
  if (!Number.isNaN(avanceGeneral) && avanceGeneral > 0) {
    return Math.min(100, Math.max(0, Math.round(avanceGeneral)));
  }

  const etapasSubtarea = getEtapasConFechaSubtarea(subtarea);
  if (!etapasSubtarea.length) return 0;
  const completadasSubtarea = etapasSubtarea.filter((etapa: any) => normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado').length;
  return Math.round((completadasSubtarea / etapasSubtarea.length) * 100);
}

function getEtapasConFechaSubtarea(subtarea: any) {
  const seguimiento = Array.isArray(subtarea?.seguimientoEtapas) ? subtarea.seguimientoEtapas : [];
  const etapas = seguimiento.length
    ? seguimiento
    : (Array.isArray(subtarea?.etapas)
      ? subtarea.etapas.filter((etapa: any) => Number(etapa?.aplica) === 1 || etapa?.aplica === true || String(etapa?.aplica).toLowerCase() === 'true')
      : []);
  return etapas.filter((etapa: any) => Boolean(etapa?.fechaPlanificada || etapa?.fechaTentativa));
}

function actividadActiva(subtarea: any) {
  return Boolean(Number(subtarea?.activo ?? 1));
}

function actividadCompleta(subtarea: any) {
  const etapas = getEtapasConFechaSubtarea(subtarea);
  return etapas.length > 0 && etapas.every((etapa: any) => normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado');
}

function actividadAtrasada(subtarea: any) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return getEtapasConFechaSubtarea(subtarea).some((etapa: any) => {
    if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
    const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
    if (!fecha) return false;
    const plan = new Date(fecha);
    plan.setHours(0, 0, 0, 0);
    return plan < hoy;
  });
}

function toggleArea(area: string) {
  areaSeleccionada.value = areaSeleccionada.value === area ? '' : area;
}

function restablecerVista() {
  areaSeleccionada.value = '';
  responsableSeleccionado.value = '';
}

function responsableBase(subtarea: any) {
  return subtarea?.responsableNombre || subtarea?.responsable?.nombre || 'Sin responsable';
}

function abrirActividadDetalle(actividadId: number, etapaId?: number | string) {
  router.push({
    name: 'actividades',
    query: {
      actividadId: String(actividadId),
      ...(etapaId ? { etapaId: String(etapaId) } : {})
    }
  });
}

function abrirEtapaAtrasadaDetalle(actividadId: number, etapaId: number | string) {
  cerrarDetalleKpi();
  abrirActividadDetalle(actividadId, etapaId);
}

async function cargarResumenSemanal() {
  try {
    const response = await subtareasService.getResumenSemanal({
      area: areaSeleccionada.value || undefined,
      responsable: responsableSeleccionado.value || undefined
    });
    resumenSemanal.value = response;
  } catch (error) {
    console.error('Error cargando resumen semanal:', error);
    resumenSemanal.value = { series: [], mejorSemanaCumplimiento: null, peorSemanaAlertas: null };
  }
}

function abrirDetalleKpi(tipo: 'cumplimiento' | 'retraso' | 'proximas' | 'monto') {
  detalleKpi.value = { activo: true, tipo };
}

function cerrarDetalleKpi() {
  detalleKpi.value.activo = false;
}

function manejarEscapeModales(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (detalleKpi.value.activo) {
    cerrarDetalleKpi();
  }
}

const subtareasElegibles = computed(() =>
  subtareasFiltradasPorDireccionMonto.value.filter((subtarea: any) => actividadActiva(subtarea) && getEtapasConFechaSubtarea(subtarea).length > 0)
);

const subtareasFiltradasPorArea = computed(() =>
  areaSeleccionada.value
    ? subtareasElegibles.value.filter((subtarea: any) => (subtarea.direccionNombre || 'Sin área') === areaSeleccionada.value)
    : subtareasElegibles.value
);

const subtareasFiltradas = computed(() =>
  responsableSeleccionado.value
    ? subtareasFiltradasPorArea.value.filter((subtarea: any) => responsableBase(subtarea) === responsableSeleccionado.value)
    : subtareasFiltradasPorArea.value
);

const etapas = computed(() =>
  subtareasFiltradas.value.flatMap((subtarea: any) =>
    (subtarea.seguimientoEtapas || []).map((etapa: any) => ({
      ...etapa,
      id: etapa.id || `${subtarea.id}-${etapa.etapaId || etapa.nombre}`,
      subtareaId: subtarea.id,
      subtareaNombre: subtarea.nombre,
      areaNombre: subtarea.direccionNombre || 'Sin área',
      responsableNombre: etapa.responsableNombre || responsableBase(subtarea)
    }))
  )
);

const etapasConFechaAsignada = computed(() =>
  etapas.value.filter((etapa: any) => {
    const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
    return typeof fecha === 'string' ? fecha.trim().length > 0 : Boolean(fecha);
  })
);

const completadas = computed(() =>
  etapas.value.filter((e: any) => normalizarEstado(e.estado, e.fechaReal) === 'completado').length
);

const actividadesCompletadas = computed(() => subtareasFiltradas.value.filter((subtarea: any) => actividadCompleta(subtarea)).length);

const actividadesAtrasadas = computed(() => subtareasFiltradas.value.filter((subtarea: any) => actividadAtrasada(subtarea)).length);

const actividadesPendientes = computed(() => Math.max(0, subtareasFiltradas.value.length - actividadesCompletadas.value));

const pendientes = computed(() => etapas.value.length - completadas.value);

const atrasadas = computed(() =>
  etapas.value.filter((e: any) => {
    if (!e.fechaPlanificada || normalizarEstado(e.estado, e.fechaReal) === 'completado') return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const plan = new Date(e.fechaPlanificada);
    plan.setHours(0, 0, 0, 0);
    return plan < hoy;
  }).length
);

const kpis = computed(() => {
  const totalTareas = subtareasFiltradas.value.length;
  const totalEtapas = etapas.value.length;
  const porcentajeCumplimiento = totalTareas ? Math.round((actividadesCompletadas.value / totalTareas) * 100) : 0;
  return {
    totalTareas,
    totalEtapas,
    completadas: completadas.value,
    pendientes: Math.max(0, pendientes.value),
    atrasadas: atrasadas.value,
    porcentajeCumplimiento,
    actividadesCompletadas: actividadesCompletadas.value,
    actividadesPendientes: actividadesPendientes.value,
    actividadesAtrasadas: actividadesAtrasadas.value
  };
});

const presupuestoFiltrado = computed(() =>
  subtareasFiltradas.value.reduce((total: number, subtarea: any) => total + Number(subtarea?.presupuesto || 0), 0)
);

const porcentajeProximas = computed(() => {
  const totalPendientes = Math.max(1, kpis.value.pendientes);
  return Math.min(100, Math.round((verificablesPorVencer.value.length / totalPendientes) * 100));
});

const porcentajeAtraso = computed(() => {
  const totalEtapas = Math.max(1, kpis.value.totalEtapas);
  return Math.min(100, Math.round((kpis.value.atrasadas / totalEtapas) * 100));
});

const porcentajeProcesosVisibles = computed(() => {
  const total = Math.max(1, subtareasElegibles.value.length);
  return Math.min(100, Math.round((kpis.value.totalTareas / total) * 100));
});

const colorCumplimiento = computed(() => colorSemaforoPositivo(kpis.value.porcentajeCumplimiento));
const colorProcesosVisibles = computed(() => colorSemaforoPositivo(porcentajeProcesosVisibles.value));
const colorAtraso = computed(() => colorSemaforoRiesgo(porcentajeAtraso.value));
const colorProximas = computed(() => colorSemaforoRiesgo(porcentajeProximas.value));


const detalleCumplimiento = computed(() =>
  subtareasFiltradas.value
    .filter((subtarea: any) => actividadCompleta(subtarea))
    .map((subtarea: any) => ({
      id: subtarea.id,
      nombre: subtarea.nombre || 'Actividad sin nombre',
      area: subtarea.direccionNombre || 'Sin área',
      responsable: responsableBase(subtarea),
      presupuesto: Number(subtarea.presupuesto || 0)
    }))
    .sort((a, b) => b.presupuesto - a.presupuesto || a.nombre.localeCompare(b.nombre))
);

const detalleMontoEjecutado = computed(() => detalleCumplimiento.value);

const detalleEtapasAtrasadas = computed(() => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return etapas.value
    .filter((etapa: any) => {
      const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
      if (!fecha || normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
      const plan = new Date(fecha);
      plan.setHours(0, 0, 0, 0);
      return plan < hoy;
    })
    .map((etapa: any) => {
      const fecha = new Date(etapa?.fechaPlanificada || etapa?.fechaTentativa);
      fecha.setHours(0, 0, 0, 0);
      const diasRetraso = Math.max(0, Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: `${etapa.subtareaId}-${etapa.etapaId || etapa.id}`,
        subtareaId: etapa.subtareaId,
        etapaId: etapa.etapaId || etapa.id,
        subtareaNombre: etapa.subtareaNombre || 'Proceso',
        etapaNombre: etapa.etapaNombre || etapa.nombre || 'Etapa',
        responsable: etapa.responsableNombre || 'Sin responsable',
        diasRetraso
      };
    })
    .sort((a, b) => b.diasRetraso - a.diasRetraso || a.subtareaNombre.localeCompare(b.subtareaNombre));
});

const verificablesPorVencer = computed(() => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return etapas.value
    .filter((etapa: any) => {
      const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
      if (!fecha || normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
      const plan = new Date(fecha);
      plan.setHours(0, 0, 0, 0);
      const diasRestantes = Math.floor((plan.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return diasRestantes === 2 || diasRestantes === 1;
    })
    .map((etapa: any) => {
      const fecha = new Date(etapa?.fechaPlanificada || etapa?.fechaTentativa);
      fecha.setHours(0, 0, 0, 0);
      const diasRestantes = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: `${etapa.subtareaId}-${etapa.etapaId || etapa.id}`,
        subtareaId: etapa.subtareaId,
        etapaId: etapa.etapaId || etapa.id,
        subtareaNombre: etapa.subtareaNombre || 'Proceso',
        etapaNombre: etapa.etapaNombre || etapa.nombre || 'Verificable',
        areaNombre: etapa.areaNombre || 'Sin área',
        responsable: etapa.responsableNombre || 'Sin responsable',
        diasRestantes
      };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes || a.subtareaNombre.localeCompare(b.subtareaNombre));
});

const detalleKpiTitulo = computed(() => {
  switch (detalleKpi.value.tipo) {
    case 'proximas': return 'Detalle de verificables próximos a vencer';
    case 'retraso': return 'Detalle de verificables con retraso';
    case 'monto': return 'Detalle del monto ejecutado';
    default: return 'Detalle de cumplimiento';
  }
});

const detalleKpiSubtitulo = computed(() => {
  switch (detalleKpi.value.tipo) {
    case 'proximas': return 'Verificables pendientes con vencimiento en 2 y 1 día.';
    case 'retraso': return 'Verificables vencidos pendientes, clasificados por proceso y responsable.';
    case 'monto': return 'Procesos terminados y monto asignado considerado como ejecutado.';
    default: return 'Procesos cumplidos con su responsable asignado.';
  }
});

const procesosPorArea = computed(() => {
  const mapa = new Map<string, { label: string; procesos: number }>();

  for (const subtarea of subtareasElegibles.value) {
    const area = subtarea.direccionNombre || 'Sin área';
    const actual = mapa.get(area) || { label: area, procesos: 0 };
    actual.procesos += 1;
    mapa.set(area, actual);
  }

  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];
  const total = subtareasElegibles.value.length || 1;

  return Array.from(mapa.values())
    .sort((a, b) => b.procesos - a.procesos || a.label.localeCompare(b.label))
    .map((item, index) => ({
      ...item,
      color: palette[index % palette.length],
      porcentajeProcesos: Math.round((item.procesos / total) * 100)
    }));
});

const estiloDonaAreas = computed(() => {
  if (!procesosPorArea.value.length) {
    return { background: 'conic-gradient(#e2e8f0 0 100%)' };
  }

  let acumulado = 0;
  const segmentos: string[] = [];

  for (const item of procesosPorArea.value) {
    const inicio = acumulado;
    acumulado += item.porcentajeProcesos;
    const fin = Math.min(100, acumulado);
    segmentos.push(`${item.color} ${inicio}% ${fin}%`);
  }

  if (acumulado < 100) {
    segmentos.push(`#e2e8f0 ${acumulado}% 100%`);
  }

  return {
    background: `conic-gradient(${segmentos.join(', ')})`
  };
});

const actividadesAvancePresupuesto = computed(() => {
  const mayorAvance = 100;

  return subtareasFiltradasPorArea.value
    .map((subtarea: any) => ({
      id: subtarea.id,
      nombre: subtarea.nombre || 'Proceso sin nombre',
      area: subtarea.direccionNombre || 'Sin área',
      responsable: responsableBase(subtarea),
      avance: calcularAvanceSubtarea(subtarea),
      presupuesto: Number(subtarea.presupuesto || 0)
    }))
    .sort((a, b) => b.presupuesto - a.presupuesto || b.avance - a.avance)
    .map((item) => ({
      ...item,
      destacada: !responsableSeleccionado.value || item.responsable === responsableSeleccionado.value,
      width: item.avance > 0
        ? `${Math.max(8, Math.round((item.avance / mayorAvance) * 100))}%`
        : '0%'
    }));
});

const totalPaginasRanking = computed(() => Math.max(1, Math.ceil(actividadesAvancePresupuesto.value.length / itemsPorPaginaRanking)));

const actividadesAvancePresupuestoPaginadas = computed(() => {
  const start = (paginaRanking.value - 1) * itemsPorPaginaRanking;
  return actividadesAvancePresupuesto.value.slice(start, start + itemsPorPaginaRanking);
});

onMounted(async () => {
  window.addEventListener('keydown', manejarEscapeModales);
  try {
    const [subtareasData, resumenData] = await Promise.all([
      subtareasService.getAll(),
      subtareasService.getResumenSemanal()
    ]);
    subtareas.value = Array.isArray(subtareasData) ? subtareasData : [];
    resumenSemanal.value = resumenData;
  } catch (error) {
    console.error('Error cargando dashboard ejecutivo:', error);
  } finally {
    cargando.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarEscapeModales);
});

watch([actividadesAvancePresupuesto, areaSeleccionada, responsableSeleccionado], () => {
  if (paginaRanking.value > totalPaginasRanking.value) {
    paginaRanking.value = totalPaginasRanking.value;
  }
  if (paginaRanking.value < 1) {
    paginaRanking.value = 1;
  }
});

watch([areaSeleccionada, responsableSeleccionado], () => {
  cargarResumenSemanal();
});

// ─── Velocímetro ─────────────────────────────────────────────────────────────
// Parámetros SVG del gauge (semicírculo, radio = 80, strokeWidth = 18)
const GAUGE_R = 80;
const GAUGE_CIRCUM = Math.PI * GAUGE_R; // longitud del semicírculo

// Velocímetro basado solo en verificables con fecha asignada
const totalVerificablesConFecha = computed(() => etapasConFechaAsignada.value.length);

const completadosVerificablesConFecha = computed(() =>
  etapasConFechaAsignada.value.filter((etapa: any) => normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado').length
);

const pendientesVerificablesConFecha = computed(() =>
  Math.max(0, totalVerificablesConFecha.value - completadosVerificablesConFecha.value)
);

const atrasadosVerificablesConFecha = computed(() => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return etapasConFechaAsignada.value.filter((etapa: any) => {
    if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
    const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
    if (!fecha) return false;
    const plan = new Date(fecha);
    if (isNaN(plan.getTime())) return false;
    plan.setHours(0, 0, 0, 0);
    return plan < hoy;
  }).length;
});

const porcentajeVerificables = computed(() =>
  totalVerificablesConFecha.value
    ? Math.round((completadosVerificablesConFecha.value / totalVerificablesConFecha.value) * 100)
    : 0
);

// Rotación de la aguja: -90° (0%) → 0° (50%, apunta arriba) → +90° (100%)
const gaugeNeedleRotation = computed(() => -90 + (porcentajeVerificables.value / 100) * 180);

const gaugeDasharray = computed(() => {
  const pct = Math.min(100, Math.max(0, porcentajeVerificables.value));
  const filled = (pct / 100) * GAUGE_CIRCUM;
  // gap = circunferencia total − filled → la mitad inferior del círculo queda siempre oculta
  return `${filled.toFixed(2)} ${(GAUGE_CIRCUM * 2 - filled).toFixed(2)}`;
});

const gaugeColor = computed(() => colorSemaforoPositivo(porcentajeVerificables.value));

// ─── Gráfica temporal (semanas / meses) ──────────────────────────────────────
const vistaTemporalActiva = ref<'semanas' | 'meses'>('semanas');

/** Formatea una fecha ISO a clave de semana: "S12 Mar" */
function claveSemanaPorFecha(fechaStr: string): string {
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return 'Sin fecha';
  // Número de semana ISO-8601
  const inicio = new Date(d.getFullYear(), 0, 1);
  const sem = Math.ceil(((d.getTime() - inicio.getTime()) / 86400000 + inicio.getDay() + 1) / 7);
  const mes = d.toLocaleString('es-EC', { month: 'short' });
  return `S${sem} ${(mes[0] ?? '').toUpperCase()}${mes.slice(1)}`;
}

/** Formatea una fecha ISO a clave de mes: "Ene 26" */
function claveMesPorFecha(fechaStr: string): string {
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return 'Sin fecha';
  const mes = d.toLocaleString('es-EC', { month: 'short' });
  const anio = String(d.getFullYear()).slice(2);
  return `${(mes[0] ?? '').toUpperCase()}${mes.slice(1)} '${anio}`;
}

type BucketTemporal = { clave: string; completados: number; pendientes: number; atrasados: number; total: number; orden: number };

const datosTemporal = computed((): BucketTemporal[] => {
  const mapa = new Map<string, BucketTemporal>();

  for (const etapa of etapasConFechaAsignada.value) {
    // Usar fecha planificada/tentativa para agrupar por semana/mes
    const fechaPlanificadaRaw: string | undefined = etapa?.fechaPlanificada || etapa?.fechaTentativa;
    if (!fechaPlanificadaRaw) continue;
    const dPlan = new Date(fechaPlanificadaRaw);
    if (isNaN(dPlan.getTime())) continue;

    const clave = vistaTemporalActiva.value === 'semanas'
      ? claveSemanaPorFecha(fechaPlanificadaRaw)
      : claveMesPorFecha(fechaPlanificadaRaw);

    // Número de orden para ordenar cronológicamente
    const orden = vistaTemporalActiva.value === 'semanas'
      ? dPlan.getFullYear() * 100 + Math.ceil(((dPlan.getTime() - new Date(dPlan.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(dPlan.getFullYear(), 0, 1).getDay() + 1) / 7)
      : dPlan.getFullYear() * 100 + (dPlan.getMonth() + 1);

    const bucket = mapa.get(clave) || { clave, completados: 0, pendientes: 0, atrasados: 0, total: 0, orden };
    bucket.total += 1;

    const estadoNorm = normalizarEstado(etapa.estado, etapa.fechaReal);
    if (estadoNorm === 'completado') {
      // Si está completado, verificar si fue a tiempo o con retraso
      const fechaRealRaw = etapa?.fechaReal;
      if (fechaRealRaw) {
        const dReal = new Date(fechaRealRaw);
        dReal.setHours(0, 0, 0, 0);
        const dPlanCopy = new Date(dPlan);
        dPlanCopy.setHours(0, 0, 0, 0);
        
        if (dReal > dPlanCopy) {
          // Completado DESPUÉS de la fecha planificada = ATRASADO
          bucket.atrasados += 1;
        } else {
          // Completado A TIEMPO
          bucket.completados += 1;
        }
      } else {
        // No tiene fechaReal registrada, asumir que se completó a tiempo
        bucket.completados += 1;
      }
    } else {
      // No está completado = PENDIENTE
      bucket.pendientes += 1;
    }
    
    mapa.set(clave, bucket);
  }

  return Array.from(mapa.values()).sort((a, b) => a.orden - b.orden);
});

const maxTotalTemporal = computed(() =>
  datosTemporal.value.reduce((max, b) => Math.max(max, b.total), 1)
);

const totalAtrasadosTemporal = computed(() =>
  datosTemporal.value.reduce((total, b) => total + b.atrasados, 0)
);
</script>

<style scoped>
.dashboard-admin {
  display: grid;
  gap: 1.25rem;
}

.dashboard-header {
  background: linear-gradient(135deg, #0f172a, #1d4ed8);
  color: #fff;
  border-radius: 14px;
  padding: 1.2rem 1.4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.dashboard-header p {
  margin: 0.25rem 0 0;
  color: #cbd5e1;
}

.meta-pill {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
}

.loading,
.empty {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
  color: #64748b;
}

.context-summary {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.btn-clear-filter {
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-clear-filter:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
}

.filter-chip.primary {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.filter-chip.success {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.trend-kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.95rem 1rem;
  display: grid;
  gap: 0.35rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.kpi-card.has-tooltip {
  position: relative;
}

.kpi-card.has-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%) translateY(6px);
  background: #0f172a;
  color: #f8fafc;
  padding: 0.4rem 0.55rem;
  border-radius: 8px;
  font-size: 0.68rem;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease, transform 0.16s ease;
  z-index: 25;
}

.kpi-card.has-tooltip::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4px);
  transform: translateX(-50%) translateY(6px);
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #0f172a;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease, transform 0.16s ease;
  z-index: 25;
}

.kpi-card.has-tooltip:hover::after,
.kpi-card.has-tooltip:hover::before,
.kpi-card.has-tooltip:focus::after,
.kpi-card.has-tooltip:focus::before,
.kpi-card.has-tooltip:focus-within::after,
.kpi-card.has-tooltip:focus-within::before {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.kpi-card-button {
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.kpi-card-button:hover {
  border-color: #93c5fd;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
  transform: translateY(-1px);
}

.kpi-card-button:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.kpi-card.success {
  border-left: 4px solid #16a34a;
}

.kpi-card.danger {
  border-left: 4px solid #dc2626;
}

.kpi-card.accent {
  border-left: 4px solid #0f766e;
}

.kpi-title {
  color: #64748b;
  font-size: 0.82rem;
}

.kpi-value {
  color: #0f172a;
  font-size: 1.7rem;
  line-height: 1;
}

.kpi-value-money {
  font-size: 1.35rem;
}

.kpi-foot {
  color: #94a3b8;
  font-size: 0.76rem;
}

.kpi-mini-track {
  height: 8px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  margin-top: 0.1rem;
}

.kpi-mini-fill {
  height: 100%;
  border-radius: 999px;
}

.kpi-mini-fill.ok {
  background: #22c55e;
}

.kpi-mini-fill.danger {
  background: #ef4444;
}

.kpi-mini-fill.info {
  background: #3b82f6;
}

.kpi-mini-label {
  color: #64748b;
  font-size: 0.72rem;
}

.kpi-donut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}

.trend-card {
  gap: 0.55rem;
}

.trend-card.alert {
  border-left: 4px solid #dc2626;
}

.alert-value {
  color: #dc2626;
  font-size: 2.1rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.mini-alertas-legend {
  color: #dc2626;
  font-size: 0.78rem;
  margin-top: 2px;
  text-align: center;
  font-weight: 600;
}

.trend-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.8rem;
}

.trend-value {
  font-size: 1.9rem;
}

.trend-badge {
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.trend-badge.success {
  background: #dcfce7;
  color: #166534;
}

.trend-badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

.trend-chart-wrap {
  display: grid;
  gap: 0.35rem;
}

.trend-chart {
  width: 100%;
  height: 120px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
}

.trend-grid {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.trend-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-line.line-primary {
  stroke: #2563eb;
}

.trend-line.line-danger {
  stroke: #dc2626;
}

.trend-axis {
  display: flex;
  justify-content: space-between;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 600;
}

.empty-inline {
  color: #64748b;
  font-size: 0.8rem;
}

.kpi-mini-donut {
  --value: 0%;
  --kpi-color: #14b8a6;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: conic-gradient(var(--kpi-color) var(--value), #e2e8f0 var(--value));
  display: grid;
  place-items: center;
}

.kpi-mini-donut span {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: grid;
  place-items: center;
  font-size: 0.62rem;
  font-weight: 700;
}

.charts-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.extended-grid {
  align-items: start;
}

.ranking-panel {
  grid-row: span 2;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.85rem;
  gap: 0.8rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
}

.panel-header span {
  color: #64748b;
  font-size: 0.78rem;
}

.panel-paginator {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.8rem;
}

.panel-pag-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.32rem 0.62rem;
  cursor: pointer;
}

.panel-pag-btn:hover:not(:disabled) {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.panel-pag-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.panel-pag-info {
  font-size: 0.76rem;
  color: #64748b;
  font-weight: 600;
}

.tabla-wrap {
  overflow: auto;
  max-height: 360px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.tabla-verificables {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.tabla-verificables th,
.tabla-verificables td {
  text-align: left;
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.8rem;
}

.tabla-verificables th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: #475569;
  background: #f8fafc;
  font-weight: 700;
}

.tabla-verificables td {
  color: #334155;
}

.tabla-row-click {
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.tabla-row-click:hover {
  background: #eff6ff;
}

.donut-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 1rem;
}

.donut {
  --value: 0%;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: conic-gradient(#22c55e var(--value), #e2e8f0 var(--value));
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-center {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  border: 1px solid #e2e8f0;
}

.donut-center strong {
  color: #0f172a;
  font-size: 1.05rem;
}

.donut-center span {
  color: #64748b;
  font-size: 0.7rem;
}

.donut-legend {
  display: grid;
  gap: 0.45rem;
  color: #475569;
  font-size: 0.85rem;
}

.area-donut-wrap {
  grid-template-columns: auto 1fr;
  align-items: flex-start;
}

.area-donut {
  background: conic-gradient(#e2e8f0 0 100%);
}

.area-legend {
  max-height: 250px;
  overflow: auto;
  padding-right: 0.2rem;
}

.area-legend-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  width: 100%;
  text-align: left;
  padding: 0.45rem 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.area-legend-item:hover {
  border-color: #93c5fd;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.08);
}

.area-legend-item.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.area-legend-main {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.area-legend-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.area-legend-meta {
  color: #1e40af;
  font-weight: 700;
  white-space: nowrap;
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 0.38rem;
}

.dot.ok {
  background: #22c55e;
}

.dot.warn {
  background: #f59e0b;
}

.dot.danger {
  background: #ef4444;
}

.bars-stack {
  display: grid;
  gap: 0.7rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 120px 1fr 44px;
  align-items: center;
  gap: 0.55rem;
}

.bar-row-button {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  padding: 0.7rem 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.bar-row-button:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  transform: translateY(-1px);
}

.bar-row-button:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}

.bar-row-button.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.bar-row-button.is-zero {
  border-style: dashed;
}

.bar-row-button.is-zero .bar-helper,
.bar-row-button.is-zero .bar-value {
  color: #94a3b8;
}

.bar-row-button.is-zero .bar-track {
  background: #f1f5f9;
}

.bar-label {
  font-size: 0.82rem;
  color: #475569;
  font-weight: 600;
}

.bar-helper {
  margin-top: 0.18rem;
  font-size: 0.74rem;
  color: #94a3b8;
}

.bar-track {
  height: 10px;
  background: #eef2ff;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
}

.bar-fill.ok {
  background: #22c55e;
}

.bar-fill.warn {
  background: #f59e0b;
}

.bar-fill.danger {
  background: #ef4444;
}

.bar-fill.info {
  background: #3b82f6;
}

.bar-value {
  font-size: 0.78rem;
  color: #334155;
  text-align: right;
}

.bars-stack-detailed {
  gap: 0.95rem;
}

.bar-row-detailed {
  grid-template-columns: minmax(140px, 180px) 1fr 48px;
}

.actividad-bar-row {
  display: grid;
  gap: 0.45rem;
}

.actividad-bar-button {
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.actividad-bar-button:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  transform: translateY(-1px);
}

.actividad-bar-button:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}

.actividad-bar-button.active {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.actividad-bar-button.muted {
  opacity: 0.42;
}

.actividad-bar-top,
.actividad-bar-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
}

.actividad-track {
  min-width: 0;
}

.actividad-presupuesto {
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}

.actividad-avance {
  min-width: 42px;
}

.listado {
  display: grid;
  gap: 0.6rem;
}

.list-item {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.list-item-button {
  width: 100%;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.list-item-button:hover {
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  transform: translateY(-1px);
}

.list-item-button:focus-visible {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
}

.list-item-button.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.list-item strong {
  color: #0f172a;
  font-size: 0.9rem;
}

.list-item p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.77rem;
}

.list-meta {
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e40af;
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 999px;
  padding: 0.24rem 0.54rem;
}

.list-meta.late {
  color: #991b1b;
  background: #fee2e2;
  border-color: #fca5a5;
}

.kpi-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.kpi-detail-modal {
  width: min(820px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
}

.kpi-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.kpi-detail-header h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.08rem;
}

.kpi-detail-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.82rem;
}

.kpi-detail-body {
  padding: 1rem;
}

.kpi-detail-item {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  background: #fff;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.kpi-detail-item-button {
  width: 100%;
  text-align: left;
  cursor: pointer;
  background: #fff;
}

.kpi-detail-item:hover {
  border-color: #bfdbfe;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
}

.kpi-detail-item strong {
  color: #0f172a;
  font-size: 0.9rem;
}

.kpi-detail-item p {
  margin: 0.18rem 0 0;
  color: #64748b;
  font-size: 0.77rem;
}

/* ── Velocímetro ──────────────────────────────────────────────────────────── */
.gauge-panel {
  display: flex;
  flex-direction: column;
}

.gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  justify-content: center;
}

.gauge-svg {
  width: 100%;
  max-width: 220px;
  overflow: visible;
}

.gauge-pct {
  font-size: 22px;
  font-weight: 800;
  font-family: inherit;
}

.gauge-label {
  font-size: 10px;
  fill: #64748b;
  font-family: inherit;
}

.gauge-legend {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: #475569;
}

.gauge-legend-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.gauge-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gauge-zone-txt {
  font-size: 9px;
  fill: #94a3b8;
  font-weight: 700;
  font-family: inherit;
}

.gauge-value {
  font-size: 1.9rem;
  font-weight: 800;
  text-align: center;
  line-height: 1;
  margin-top: 0.15rem;
  transition: color 0.4s ease;
}

.gauge-sub {
  font-size: 0.72rem;
  color: #64748b;
  text-align: center;
  margin-bottom: 0.1rem;
}

/* ── Gráfica temporal ────────────────────────────────────────────────────── */
.temporal-section {
  align-items: stretch;
}

.temporal-panel {
  display: flex;
  flex-direction: column;
}

.temporal-tabs {
  display: flex;
  gap: 0.3rem;
}

.temporal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.temporal-overdue-total {
  font-size: 0.72rem;
  font-weight: 700;
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 999px;
  padding: 0.22rem 0.5rem;
  white-space: nowrap;
}

.temporal-tab {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.28rem 0.65rem;
  cursor: pointer;
  transition: border-color 0.16s, background 0.16s, color 0.16s;
}

.temporal-tab:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

.temporal-tab.active {
  border-color: #3b82f6;
  background: #dbeafe;
  color: #1d4ed8;
}

.temporal-chart {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex: 1;
}

.temporal-bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 160px;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  flex: 1;
}

.temporal-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  min-width: 62px;
}

.temporal-bar-group {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
}

.temporal-bar {
  width: 14px;
  border-radius: 4px 4px 0 0;
  min-height: 3px;
  transition: height 0.4s ease;
}

.temporal-bar.done {
  background: #22c55e;
}

.temporal-bar.pending {
  background: #f59e0b;
}

.temporal-bar.late {
  background: #ef4444;
}

.temporal-label {
  font-size: 0.64rem;
  color: #64748b;
  text-align: center;
  white-space: nowrap;
  font-weight: 600;
}

.temporal-pct {
  font-size: 0.62rem;
  color: #94a3b8;
  font-weight: 700;
}

.temporal-counts {
  display: flex;
  gap: 0.24rem;
  align-items: center;
  flex-wrap: nowrap;
}

.temporal-counts .count {
  font-size: 0.6rem;
  font-weight: 700;
}

.temporal-counts .count.pending {
  color: #b45309;
}

.temporal-counts .count.done {
  color: #15803d;
}

.temporal-counts .count.late {
  color: #991b1b;
}

.temporal-legend {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #475569;
  align-items: center;
}

.temporal-legend .dot {
  margin-right: 0.25rem;
}

@media (max-width: 1080px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-kpi-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .ranking-panel {
    grid-row: auto;
  }
}

@media (max-width: 680px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .trend-card-header {
    flex-direction: column;
  }

  .donut-wrap {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .area-donut-wrap {
    justify-items: stretch;
  }

  .bar-row {
    grid-template-columns: 92px 1fr 36px;
  }

  .bar-row-detailed,
  .actividad-bar-top,
  .actividad-bar-main {
    grid-template-columns: 1fr;
  }

  .actividad-presupuesto,
  .actividad-avance,
  .bar-value {
    text-align: left;
  }

  .kpi-detail-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>