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
          <span class="filter-chip primary" v-if="busquedaDashboard">Búsqueda: {{ busquedaDashboard }}</span>
          <span class="filter-chip primary">Vista: {{ areaSeleccionada || 'General' }}</span>
          <span class="filter-chip primary" v-if="responsableSeleccionado">Responsable: {{ responsableSeleccionado }}</span>
          <span class="filter-chip" v-if="filtroDireccion">Dirección: {{ filtroDireccion }}</span>
          <span class="filter-chip" v-if="filtroPacNoPac">Plan: {{ filtroPacNoPac }}</span>
          <span class="filter-chip" v-if="filtroTipoContratacionLabel">Contratación: {{ filtroTipoContratacionLabel }}</span>
          <span class="filter-chip" v-if="filtroCuatrimestre">Cuatrimestre: {{ filtroCuatrimestre }}</span>
          <span class="filter-chip" v-if="filtroMonto">Monto: {{ filtroMonto }}</span>
          <span class="filter-chip">Presupuesto: {{ formatearMonto(presupuestoFiltrado) }}</span>

          <button v-if="hayFiltrosDashboardActivos" class="btn-clear-filter" @click="restablecerVista">
            Restablecer vista
          </button>
        </div>

        <div class="dashboard-toolbar">
          <div class="buscador-container dashboard-buscador-container">
            <span class="buscador-icon">🔎</span>
            <input
              v-model="busquedaDashboard"
              class="buscador-input combo-filtro"
              type="text"
              placeholder="Buscar por nombre, dirección o responsable..."
            />
          </div>

          <div class="dashboard-toolbar-filtros">
            <select v-model="filtroDireccion" class="combo-filtro">
              <option value="">Todas las direcciones</option>
              <option v-for="dir in direccionesDisponiblesDashboard" :key="dir" :value="dir">{{ dir }}</option>
            </select>
            <select v-model="filtroPacNoPac" class="combo-filtro">
              <option value="">PAC y NO PAC</option>
              <option value="PAC">PAC</option>
              <option value="NO PAC">NO PAC</option>
            </select>
            <select v-model="filtroTipoContratacion" class="combo-filtro">
              <option value="">Todos los tipos de contratación</option>
              <option v-for="tipo in tiposContratacionDisponibles" :key="tipo.value" :value="tipo.value">{{ tipo.label }}</option>
            </select>
            <select v-model="filtroCuatrimestre" class="combo-filtro">
              <option value="">Todos los cuatrimestres</option>
              <option value="1">Cuatrimestre 1</option>
              <option value="2">Cuatrimestre 2</option>
              <option value="3">Cuatrimestre 3</option>
              <option value="4">Cuatrimestre 4</option>
            </select>
            <select v-model="filtroMonto" class="combo-filtro">
              <option value="">Todos los montos</option>
              <option v-for="monto in montosDisponibles" :key="monto" :value="monto">{{ monto }}</option>
            </select>
            <select v-model="ordenProcesosDashboard" class="combo-filtro">
              <option value="todos">Ordenar por...</option>
              <option value="presupuesto-desc">Presupuesto: mayor a menor</option>
              <option value="presupuesto-asc">Presupuesto: menor a mayor</option>
              <option value="fecha-fin-desc">Fecha de contratación: mayor a menor</option>
              <option value="fecha-fin-asc">Fecha de contratación: menor a mayor</option>
            </select>
          </div>
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
          <small class="kpi-foot">Procesos activos</small>
          <div class="kpi-mini-track">
            <div class="kpi-mini-fill" :style="{ width: `${porcentajeProcesosVisibles}%`, backgroundColor: colorProcesosVisibles }"></div>
          </div>
          <small class="kpi-mini-label">{{ porcentajeProcesosVisibles }}% del cumplimiento general</small>
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

      <section class="charts-grid priority-grid">

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

      </section>

      <section class="charts-grid secondary-grid">
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

        <article class="panel temporal-panel">
          <div class="panel-header">
            <h2>Progreso de cumplimiento</h2>
            <div class="temporal-header-actions">
              <span class="temporal-overdue-total">Cumplidas: {{ totalCumplidasTemporal }}</span>
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

          <div v-if="datosTemporal.length === 0" class="empty">Sin etapas cumplidas para mostrar en esta vista.</div>

          <div v-else class="temporal-chart temporal-chart-line">
            <div class="temporal-summary-grid">
             
              <div class="temporal-summary-card muted">
                <span class="temporal-summary-label">Pico</span>
                <strong class="temporal-summary-value">{{ picoCumplimientoTemporal.valor }}</strong>
                <small>{{ picoCumplimientoTemporal.label }}</small>
              </div>
            </div>

            <DashboardChart
              :labels="datosTemporal.map(item => item.clave)"
              :etapasPlanificadas="datosTemporal.map(() => 0)"
              :etapasCumplidas="datosTemporal.map(item => item.completados)"
              :alertas="datosTemporal.map(() => 0)"
            />

            <div class="temporal-legend">
              <span><i class="dot ok"></i>Etapas cumplidas</span>
              <span>{{ vistaTemporalActiva === 'semanas' ? 'Vista semanal' : 'Vista mensual' }}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="trend-kpi-grid">
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
// Filtros de dashboard
const busquedaDashboard = ref('');
const filtroDireccion = ref('');
const filtroMonto = ref('');
const filtroPacNoPac = ref('');
const filtroTipoContratacion = ref('');
const filtroCuatrimestre = ref('');
const ordenProcesosDashboard = ref('fecha-fin-asc');

const subtareasActivasBase = computed(() =>
  subtareas.value.filter((subtarea: any) => actividadActiva(subtarea))
);

const direccionesDisponiblesDashboard = computed(() => {
  const set = new Set<string>();
  for (const subtarea of subtareasActivasBase.value) {
    const direccion = obtenerDireccionDashboard(subtarea);
    if (direccion !== 'N/A') {
      set.add(direccion);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

const tiposContratacionDisponibles = computed(() => {
  const opciones = new Map<string, string>();

  for (const subtarea of subtareasActivasBase.value) {
    const label = obtenerTipoContratacionDashboard(subtarea);
    if (!label || label === 'Contratación sugerida no definida') continue;
    const value = normalizarTextoBusqueda(label);
    if (value && !opciones.has(value)) {
      opciones.set(value, label);
    }
  }

  return Array.from(opciones.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const montosDisponibles = computed(() => {
  const rangos = [
    { label: '0-1,000', min: 0, max: 1000 },
    { label: '1,001-5,000', min: 1001, max: 5000 },
    { label: '5,001-10,000', min: 5001, max: 10000 },
    { label: '10,001+', min: 10001, max: Infinity }
  ];
  const usados = new Set<string>();
  for (const subtarea of subtareasActivasBase.value) {
    const monto = obtenerPresupuestoDashboard(subtarea);
    for (const r of rangos) {
      if (monto >= r.min && monto <= r.max) {
        usados.add(r.label);
        break;
      }
    }
  }
  return rangos.filter(r => usados.has(r.label)).map(r => r.label);
});

const filtroTipoContratacionLabel = computed(() =>
  tiposContratacionDisponibles.value.find((tipo) => tipo.value === filtroTipoContratacion.value)?.label || ''
);

const hayFiltrosDashboardActivos = computed(() =>
  Boolean(
    busquedaDashboard.value
    || areaSeleccionada.value
    || responsableSeleccionado.value
    || filtroDireccion.value
    || filtroMonto.value
    || filtroPacNoPac.value
    || filtroTipoContratacion.value
    || filtroCuatrimestre.value
  )
);

const subtareasBaseFiltradas = computed(() => {
  let items = [...subtareasActivasBase.value];

  const query = normalizarTextoBusqueda(busquedaDashboard.value);
  if (query) {
    items = items.filter((subtarea: any) => {
      const direccion = obtenerDireccionDashboard(subtarea);
      const responsable = obtenerResponsableDashboard(subtarea);
      return normalizarTextoBusqueda(`${subtarea?.nombre || ''} ${direccion} ${responsable}`).includes(query);
    });
  }

  if (filtroDireccion.value) {
    items = items.filter((subtarea: any) => obtenerDireccionDashboard(subtarea) === filtroDireccion.value);
  }
  if (filtroPacNoPac.value) {
    items = items.filter((subtarea: any) => {
      const tipo = String(subtarea?.pacNoPac || subtarea?.pac_no_pac || subtarea?.tipoPlan || '').toUpperCase();
      return tipo === filtroPacNoPac.value;
    });
  }
  if (filtroTipoContratacion.value) {
    items = items.filter((subtarea: any) =>
      normalizarTextoBusqueda(obtenerTipoContratacionDashboard(subtarea)) === filtroTipoContratacion.value
    );
  }
  if (filtroCuatrimestre.value) {
    items = items.filter((subtarea: any) => String(obtenerCuatrimestreDashboard(subtarea)) === filtroCuatrimestre.value);
  }
  if (filtroMonto.value) {
    const rangos = [
      { label: '0-1,000', min: 0, max: 1000 },
      { label: '1,001-5,000', min: 1001, max: 5000 },
      { label: '5,001-10,000', min: 5001, max: 10000 },
      { label: '10,001+', min: 10001, max: Infinity }
    ];
    const rango = rangos.find(r => r.label === filtroMonto.value);
    if (rango) {
      items = items.filter((subtarea: any) => {
        const monto = obtenerPresupuestoDashboard(subtarea);
        return monto >= rango.min && monto <= rango.max;
      });
    }
  }

  if (ordenProcesosDashboard.value === 'presupuesto-desc') {
    items.sort((a: any, b: any) => obtenerPresupuestoDashboard(b) - obtenerPresupuestoDashboard(a));
  } else if (ordenProcesosDashboard.value === 'presupuesto-asc') {
    items.sort((a: any, b: any) => obtenerPresupuestoDashboard(a) - obtenerPresupuestoDashboard(b));
  } else if (ordenProcesosDashboard.value === 'fecha-fin-desc') {
    items.sort((a: any, b: any) => obtenerFechaFinDashboard(b) - obtenerFechaFinDashboard(a));
  } else if (ordenProcesosDashboard.value === 'fecha-fin-asc') {
    items.sort((a: any, b: any) => obtenerFechaFinDashboard(a) - obtenerFechaFinDashboard(b));
  }

  return items;
});
import DashboardChart from '../components/DashboardChart.vue';
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import type { Chart as ChartJS } from 'chart.js';
import { normalizarTextoBusqueda } from '../utils/search';

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

function obtenerDireccionDashboard(subtarea: any) {
  return subtarea?.direccionNombre
    || subtarea?.direccion?.nombre
    || subtarea?.direccion_encargada
    || subtarea?.direccionEncargada
    || 'N/A';
}

function obtenerResponsableDashboard(subtarea: any) {
  return subtarea?.responsableNombre
    || subtarea?.responsableDirectivo
    || subtarea?.responsable_directivo
    || subtarea?.responsable?.nombre
    || subtarea?.responsable
    || 'N/A';
}

function obtenerPresupuestoDashboard(subtarea: any) {
  const valor = Number(
    subtarea?.presupuesto
    ?? subtarea?.presupuesto2026Inicial
    ?? subtarea?.presupuesto_2026_inicial
    ?? 0
  );
  return Number.isFinite(valor) ? valor : 0;
}

function obtenerTipoContratacionDashboard(subtarea: any) {
  const valor = String(
    subtarea?.procedimientoSugerido
    ?? subtarea?.procedimiento_sugerido
    ?? subtarea?.tipoContratacion
    ?? subtarea?.tipo_contratacion
    ?? subtarea?.procedimiento
    ?? ''
  ).trim();

  return valor || 'Contratación sugerida no definida';
}

function obtenerCuatrimestreDashboard(subtarea: any) {
  const valor = Number(subtarea?.cuatrimestre ?? subtarea?.cuatrimestreNombre ?? 999);
  return Number.isFinite(valor) ? valor : 999;
}

function obtenerFechaFinDashboard(subtarea: any) {
  const fechaFin = subtarea?.fechaFin || subtarea?.fecha_fin;
  const timestamp = fechaFin ? new Date(fechaFin).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function toggleArea(area: string) {
  areaSeleccionada.value = areaSeleccionada.value === area ? '' : area;
}

function restablecerVista() {
  busquedaDashboard.value = '';
  areaSeleccionada.value = '';
  responsableSeleccionado.value = '';
  filtroDireccion.value = '';
  filtroMonto.value = '';
  filtroPacNoPac.value = '';
  filtroTipoContratacion.value = '';
  filtroCuatrimestre.value = '';
  ordenProcesosDashboard.value = 'fecha-fin-asc';
}

function responsableBase(subtarea: any) {
  return obtenerResponsableDashboard(subtarea).replace(/^N\/A$/i, 'Sin responsable');
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
      responsable: responsableSeleccionado.value || undefined,
      busqueda: busquedaDashboard.value.trim() || undefined,
      direccion: filtroDireccion.value || undefined,
      tipoPlan: filtroPacNoPac.value || undefined,
      cuatrimestre: filtroCuatrimestre.value || undefined,
      tipoContratacion: filtroTipoContratacionLabel.value || undefined,
      monto: filtroMonto.value || undefined
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
  subtareasBaseFiltradas.value.filter((subtarea: any) => getEtapasConFechaSubtarea(subtarea).length > 0)
);

const subtareasFiltradasPorArea = computed(() =>
  areaSeleccionada.value
    ? subtareasElegibles.value.filter((subtarea: any) => (obtenerDireccionDashboard(subtarea) || 'Sin área') === areaSeleccionada.value)
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
      areaNombre: obtenerDireccionDashboard(subtarea) || 'Sin área',
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
      area: obtenerDireccionDashboard(subtarea) || 'Sin área',
      responsable: responsableBase(subtarea),
      presupuesto: obtenerPresupuestoDashboard(subtarea)
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
    const area = obtenerDireccionDashboard(subtarea) || 'Sin área';
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
      area: obtenerDireccionDashboard(subtarea) || 'Sin área',
      responsable: responsableBase(subtarea),
      avance: calcularAvanceSubtarea(subtarea),
      presupuesto: obtenerPresupuestoDashboard(subtarea)
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

watch([
  actividadesAvancePresupuesto,
  areaSeleccionada,
  responsableSeleccionado,
  busquedaDashboard,
  filtroDireccion,
  filtroMonto,
  filtroPacNoPac,
  filtroTipoContratacion,
  filtroCuatrimestre,
  ordenProcesosDashboard
], () => {
  if (paginaRanking.value > totalPaginasRanking.value) {
    paginaRanking.value = totalPaginasRanking.value;
  }
  if (paginaRanking.value < 1) {
    paginaRanking.value = 1;
  }
});

watch([
  areaSeleccionada,
  responsableSeleccionado,
  busquedaDashboard,
  filtroDireccion,
  filtroMonto,
  filtroPacNoPac,
  filtroTipoContratacionLabel,
  filtroCuatrimestre
], () => {
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

type BucketTemporal = { clave: string; completados: number; total: number; orden: number };

const datosTemporal = computed((): BucketTemporal[] => {
  const mapa = new Map<string, BucketTemporal>();

  for (const etapa of etapasConFechaAsignada.value) {
    const estadoNorm = normalizarEstado(etapa.estado, etapa.fechaReal);
    if (estadoNorm !== 'completado') continue;

    const fechaBase: string | undefined = etapa?.fechaReal || etapa?.fechaPlanificada || etapa?.fechaTentativa;
    if (!fechaBase) continue;

    const dBase = new Date(fechaBase);
    if (isNaN(dBase.getTime())) continue;

    const clave = vistaTemporalActiva.value === 'semanas'
      ? claveSemanaPorFecha(fechaBase)
      : claveMesPorFecha(fechaBase);

    const orden = vistaTemporalActiva.value === 'semanas'
      ? dBase.getFullYear() * 100 + Math.ceil(((dBase.getTime() - new Date(dBase.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(dBase.getFullYear(), 0, 1).getDay() + 1) / 7)
      : dBase.getFullYear() * 100 + (dBase.getMonth() + 1);

    const bucket = mapa.get(clave) || { clave, completados: 0, total: 0, orden };
    bucket.completados += 1;
    bucket.total += 1;

    mapa.set(clave, bucket);
  }

  return Array.from(mapa.values()).sort((a, b) => a.orden - b.orden);
});

const totalCumplidasTemporal = computed(() =>
  datosTemporal.value.reduce((total, b) => total + b.completados, 0)
);

const picoCumplimientoTemporal = computed(() => {
  if (!datosTemporal.value.length) {
    return { valor: 0, label: 'Sin datos' };
  }

  const maximo = datosTemporal.value.reduce((previo, actual) =>
    actual.completados > previo.completados ? actual : previo
  );

  return {
    valor: maximo.completados,
    label: maximo.clave
  };
});
</script>

<style scoped>
/* ── Design Tokens ────────────────────────────────────────────────────────── */
:root {
  --c-bg: #f0f4f8;
  --c-surface: #ffffff;
  --c-border: #e2e8f0;
  --c-text-primary: #0f172a;
  --c-text-secondary: #475569;
  --c-text-muted: #94a3b8;
  --c-accent: #2563eb;
  --c-accent-light: #dbeafe;
  --c-success: #16a34a;
  --c-success-light: #dcfce7;
  --c-warning: #d97706;
  --c-warning-light: #fef3c7;
  --c-danger: #dc2626;
  --c-danger-light: #fee2e2;
  --c-teal: #0d9488;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-sm: 0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
  --shadow-md: 0 4px 16px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.04);
  --shadow-lg: 0 10px 32px rgba(15,23,42,.12), 0 4px 12px rgba(15,23,42,.06);
}

/* ── Layout ───────────────────────────────────────────────────────────────── */
.dashboard-admin {
  display: grid;
  gap: 1.1rem;
  font-family: 'DM Sans', 'Outfit', 'Segoe UI', system-ui, sans-serif;
  padding: 0.35rem;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.dashboard-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 58%, #334155 100%);
  color: #fff;
  border-radius: var(--radius-lg);
  padding: 1.4rem 1.8rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
  position: relative;
  overflow: hidden;
}

.dashboard-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 82% 38%, rgba(148, 163, 184, 0.16) 0%, transparent 62%);
  pointer-events: none;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.dashboard-header p {
  margin: 0.2rem 0 0;
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meta-pill {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
  backdrop-filter: blur(6px);
  font-weight: 500;
}

.loading,
.empty {
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: var(--radius-md);
  padding: 1.5rem;
  color: var(--c-text-muted);
  text-align: center;
  font-size: 0.9rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

/* ── Context Summary & Filters ────────────────────────────────────────────── */
.context-summary {
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.8rem;
}

.btn-clear-filter {
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  border: 1px dashed #fca5a5;
  background: #fff5f5;
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-clear-filter:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.btn-clear-filter:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.dashboard-toolbar-filtros {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.dashboard-buscador-container {
  min-width: 280px;
  flex: 1;
}

.buscador-container {
  position: relative;
}

.buscador-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: #94a3b8;
}

.buscador-input {
  width: 100%;
  padding-left: 2rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: #f8fafc;
  color: var(--c-text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
}

.filter-chip.primary {
  background: var(--c-accent-light);
  border-color: #93c5fd;
  color: #1d4ed8;
}

.filter-chip.success {
  background: var(--c-success-light);
  border-color: #86efac;
  color: #15803d;
}

.combo-filtro {
  border: 1px solid var(--c-border);
  background: #f8fafc;
  color: var(--c-text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.combo-filtro:focus {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

/* ── KPI Grid ─────────────────────────────────────────────────────────────── */
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
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: var(--radius-md);
  padding: 1.1rem 1.15rem;
  display: grid;
  gap: 0.4rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}

.kpi-card:hover {
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
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
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  font-size: 0.7rem;
  line-height: 1.3;
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
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
  transition: opacity 0.18s ease, transform 0.18s ease;
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
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.kpi-card-button:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.kpi-card-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

/* KPI accent bar — left colored stripe */
.kpi-card.success {
  box-shadow: inset 4px 0 0 var(--c-success), 0 10px 30px rgba(15, 23, 42, 0.05);
}

.kpi-card.danger {
  box-shadow: inset 4px 0 0 var(--c-danger), 0 10px 30px rgba(15, 23, 42, 0.05);
}

.kpi-card.accent {
  box-shadow: inset 4px 0 0 var(--c-teal), 0 10px 30px rgba(15, 23, 42, 0.05);
}

/* White executive surfaces with only a slim state accent */
.kpi-card.success,
.kpi-card.danger,
.kpi-card.accent {
  background: #ffffff;
}

.kpi-title {
  color: var(--c-text-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.kpi-value {
  color: var(--c-text-primary);
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
}

.kpi-value-money {
  font-size: 1.45rem;
}

.kpi-foot {
  color: var(--c-text-muted);
  font-size: 0.74rem;
}

.kpi-mini-track {
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
  margin-top: 0.2rem;
}

.kpi-mini-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}

.kpi-mini-fill.ok    { background: var(--c-success); }
.kpi-mini-fill.danger { background: var(--c-danger); }
.kpi-mini-fill.info  { background: var(--c-accent); }

.kpi-mini-label {
  color: var(--c-text-muted);
  font-size: 0.7rem;
}

.kpi-donut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}

/* ── Trend Cards ──────────────────────────────────────────────────────────── */
.trend-card {
  gap: 0.6rem;
}

.trend-card.alert {
  box-shadow: inset 4px 0 0 var(--c-danger), 0 10px 30px rgba(15, 23, 42, 0.05);
  background: #ffffff;
}

.neutral-alert-card {
  box-shadow: inset 4px 0 0 #64748b, 0 10px 30px rgba(15, 23, 42, 0.05) !important;
  background: #ffffff !important;
}

.alert-value {
  color: var(--c-danger);
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.mini-alertas-legend {
  color: #64748b;
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
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.trend-badge {
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.trend-badge.success {
  background: var(--c-success-light);
  color: #166534;
}

.trend-badge.danger {
  background: var(--c-danger-light);
  color: #991b1b;
}

.trend-chart-wrap {
  display: grid;
  gap: 0.35rem;
}

.trend-chart {
  width: 100%;
  height: 120px;
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  border: 1px solid var(--c-border);
}

.trend-grid {
  fill: none;
  stroke: #e2e8f0;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.trend-line {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-line.line-primary { stroke: var(--c-accent); }
.trend-line.line-danger  { stroke: var(--c-danger); }

.trend-axis {
  display: flex;
  justify-content: space-between;
  color: var(--c-text-muted);
  font-size: 0.7rem;
  font-weight: 600;
}

.empty-inline {
  color: var(--c-text-muted);
  font-size: 0.8rem;
  padding: 1rem;
  text-align: center;
  background: #f8fafc;
  border-radius: 8px;
}

.kpi-mini-donut {
  --value: 0%;
  --kpi-color: #0d9488;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: conic-gradient(var(--kpi-color) var(--value), #e2e8f0 var(--value));
  display: grid;
  place-items: center;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.kpi-mini-donut span {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  font-size: 0.6rem;
  font-weight: 800;
}

/* ── Charts Grid & Panels ─────────────────────────────────────────────────── */
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
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: var(--radius-md);
  padding: 1.1rem 1.2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.panel:hover {
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid #edf2f7;
  gap: 0.8rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--c-text-primary);
  letter-spacing: -0.01em;
}

.panel-header span {
  color: var(--c-text-muted);
  font-size: 0.76rem;
  background: #f1f5f9;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
  font-weight: 600;
}

.panel-paginator {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.panel-pag-btn {
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  border-radius: 8px;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.3rem 0.65rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.panel-pag-btn:hover:not(:disabled) {
  border-color: #93c5fd;
  background: var(--c-accent-light);
  color: #1d4ed8;
}

.panel-pag-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.panel-pag-info {
  font-size: 0.74rem;
  color: var(--c-text-muted);
  font-weight: 600;
}

/* ── Table ────────────────────────────────────────────────────────────────── */
.tabla-wrap {
  overflow: auto;
  max-height: 360px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.tabla-verificables {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.tabla-verificables th,
.tabla-verificables td {
  text-align: left;
  padding: 0.55rem 0.65rem;
  border-bottom: 1px solid var(--c-border);
  font-size: 0.8rem;
}

.tabla-verificables th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: var(--c-text-secondary);
  background: #f8fafc;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-size: 0.72rem;
  text-transform: uppercase;
}

.tabla-verificables td {
  color: var(--c-text-secondary);
}

.tabla-row-click {
  cursor: pointer;
  transition: background-color 0.15s;
}

.tabla-row-click:hover {
  background: var(--c-accent-light);
}

/* ── Donuts ───────────────────────────────────────────────────────────────── */
.donut-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 1.2rem;
}

.donut {
  --value: 0%;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: conic-gradient(#22c55e var(--value), #e8f0fe var(--value));
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 4px 12px rgba(34,197,94,0.2));
}

.donut-center {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.donut-center strong {
  color: var(--c-text-primary);
  font-size: 1.15rem;
  font-weight: 800;
}

.donut-center span {
  color: var(--c-text-muted);
  font-size: 0.68rem;
  font-weight: 600;
}

.donut-legend {
  display: grid;
  gap: 0.5rem;
  color: var(--c-text-secondary);
  font-size: 0.85rem;
}

.area-donut-wrap {
  grid-template-columns: auto 1fr;
  align-items: flex-start;
}

.area-donut {
  background: conic-gradient(#e2e8f0 0 100%);
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.12));
}

.area-legend {
  max-height: 260px;
  overflow: auto;
  padding-right: 0.3rem;
  display: grid;
  gap: 0.4rem;
}

.area-legend-item {
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-surface);
  color: var(--c-text-secondary);
  width: 100%;
  text-align: left;
  padding: 0.5rem 0.65rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.area-legend-item:hover {
  border-color: #93c5fd;
  box-shadow: var(--shadow-sm);
  background: #f8fbff;
}

.area-legend-item.active {
  border-color: var(--c-accent);
  background: var(--c-accent-light);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.area-legend-main {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.area-legend-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.area-legend-meta {
  color: #1e40af;
  font-weight: 700;
  white-space: nowrap;
  background: var(--c-accent-light);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
}

/* ── Dots ─────────────────────────────────────────────────────────────────── */
.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 0.38rem;
  flex-shrink: 0;
}

.dot.ok     { background: #22c55e; }
.dot.warn   { background: #f59e0b; }
.dot.danger { background: #ef4444; }

/* ── Bar Stacks ───────────────────────────────────────────────────────────── */
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
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  padding: 0.75rem 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.bar-row-button:hover {
  border-color: #93c5fd;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.bar-row-button:focus-visible {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.bar-row-button.active {
  border-color: var(--c-accent);
  background: var(--c-accent-light);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.bar-row-button.is-zero {
  border-style: dashed;
}

.bar-row-button.is-zero .bar-helper,
.bar-row-button.is-zero .bar-value {
  color: var(--c-text-muted);
}

.bar-row-button.is-zero .bar-track {
  background: #f1f5f9;
}

.bar-label {
  font-size: 0.82rem;
  color: var(--c-text-secondary);
  font-weight: 600;
}

.bar-helper {
  margin-top: 0.18rem;
  font-size: 0.72rem;
  color: var(--c-text-muted);
}

.bar-track {
  height: 8px;
  background: #eef2ff;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.bar-fill.ok      { background: linear-gradient(90deg, #22c55e, #16a34a); }
.bar-fill.warn    { background: linear-gradient(90deg, #f59e0b, #d97706); }
.bar-fill.danger  { background: linear-gradient(90deg, #ef4444, #dc2626); }
.bar-fill.info    { background: linear-gradient(90deg, #3b82f6, #2563eb); }

.bar-value {
  font-size: 0.78rem;
  color: var(--c-text-secondary);
  text-align: right;
  font-weight: 700;
}

.bars-stack-detailed {
  gap: 0.85rem;
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
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.85rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.actividad-bar-button:hover {
  border-color: #93c5fd;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.actividad-bar-button:focus-visible {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.actividad-bar-button.active {
  border-color: #22c55e;
  background: #f0fdf4;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.actividad-bar-button.muted {
  opacity: 0.4;
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
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--c-text-primary);
  white-space: nowrap;
  background: #f8fafc;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 0.15rem 0.45rem;
}

.actividad-avance {
  min-width: 42px;
}

/* ── List Items ───────────────────────────────────────────────────────────── */
.listado {
  display: grid;
  gap: 0.55rem;
}

.list-item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.list-item-button {
  width: 100%;
  background: var(--c-surface);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.list-item-button:hover {
  border-color: #93c5fd;
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.list-item-button:focus-visible {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.list-item-button.active {
  border-color: var(--c-accent);
  background: var(--c-accent-light);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.list-item strong {
  color: var(--c-text-primary);
  font-size: 0.9rem;
  font-weight: 600;
}

.list-item p {
  margin: 0.18rem 0 0;
  color: var(--c-text-muted);
  font-size: 0.76rem;
}

.list-meta {
  font-size: 0.72rem;
  font-weight: 700;
  color: #1e40af;
  background: var(--c-accent-light);
  border: 1px solid #93c5fd;
  border-radius: 999px;
  padding: 0.24rem 0.6rem;
  white-space: nowrap;
}

.list-meta.late {
  color: #991b1b;
  background: var(--c-danger-light);
  border-color: #fca5a5;
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
.kpi-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.kpi-detail-modal {
  width: min(820px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: var(--c-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--c-border);
  box-shadow: var(--shadow-lg);
}

.kpi-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.2rem 1.3rem 0.9rem;
  border-bottom: 1px solid var(--c-border);
  background: linear-gradient(135deg, #f8fafc, #fff);
}

.kpi-detail-header h3 {
  margin: 0;
  color: var(--c-text-primary);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.kpi-detail-header p {
  margin: 0.25rem 0 0;
  color: var(--c-text-muted);
  font-size: 0.82rem;
}

.kpi-detail-body {
  padding: 1.1rem;
}

.kpi-detail-item {
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  background: var(--c-surface);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.kpi-detail-item-button {
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.kpi-detail-item:hover {
  border-color: #bfdbfe;
  box-shadow: var(--shadow-sm);
}

.kpi-detail-item strong {
  color: var(--c-text-primary);
  font-size: 0.88rem;
  font-weight: 600;
}

.kpi-detail-item p {
  margin: 0.18rem 0 0;
  color: var(--c-text-muted);
  font-size: 0.75rem;
}

.btn-close {
  border: none;
  background: #f1f5f9;
  color: var(--c-text-secondary);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-close:hover {
  background: var(--c-danger-light);
  color: var(--c-danger);
}

/* ── Gauge (Velocímetro) ──────────────────────────────────────────────────── */
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
  max-width: 230px;
  overflow: visible;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08));
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
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--c-text-secondary);
  background: #f8fafc;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.6rem 0.85rem;
  width: 100%;
  max-width: 200px;
}

.gauge-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  font-size: 2.4rem;
  font-weight: 900;
  text-align: center;
  line-height: 1;
  margin-top: 0.1rem;
  letter-spacing: -0.04em;
  transition: color 0.4s ease;
}

.gauge-sub {
  font-size: 0.7rem;
  color: var(--c-text-muted);
  text-align: center;
  margin-bottom: 0.2rem;
}

/* ── Temporal Chart ───────────────────────────────────────────────────────── */
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
  background: #f1f5f9;
  padding: 0.2rem;
  border-radius: 8px;
}

.temporal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.temporal-overdue-total {
  font-size: 0.72rem;
  font-weight: 700;
  color: #166534;
  background: var(--c-success-light);
  border: 1px solid #86efac;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  white-space: nowrap;
}

.temporal-tab {
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.28rem 0.65rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.temporal-tab:hover {
  background: #e2e8f0;
  color: var(--c-text-secondary);
}

.temporal-tab.active {
  background: var(--c-surface);
  color: var(--c-accent);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.temporal-chart {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex: 1;
}

.temporal-chart-line {
  gap: 0.85rem;
}

.temporal-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.temporal-summary-card {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: #f8fafc;
}

.temporal-summary-card.muted {
  background: #ffffff;
}

.temporal-summary-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--c-text-muted);
}

.temporal-summary-value {
  font-size: 1.8rem;
  line-height: 1;
  font-weight: 800;
  color: var(--c-text-primary);
}

.temporal-summary-card small {
  color: var(--c-text-secondary);
  font-size: 0.78rem;
}

.temporal-bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 160px;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.temporal-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  min-width: 58px;
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
  transition: height 0.5s ease, opacity 0.2s;
}

.temporal-bar:hover {
  opacity: 0.8;
}

.temporal-bar.done    { background: linear-gradient(180deg, #4ade80, #22c55e); }
.temporal-bar.pending { background: linear-gradient(180deg, #fcd34d, #f59e0b); }
.temporal-bar.late    { background: linear-gradient(180deg, #f87171, #ef4444); }

.temporal-label {
  font-size: 0.62rem;
  color: var(--c-text-muted);
  text-align: center;
  white-space: nowrap;
  font-weight: 600;
}

.temporal-pct {
  font-size: 0.6rem;
  color: var(--c-text-secondary);
  font-weight: 700;
}

.temporal-counts {
  display: flex;
  gap: 0.2rem;
  align-items: center;
  flex-wrap: nowrap;
}

.temporal-counts .count {
  font-size: 0.58rem;
  font-weight: 700;
}

.temporal-counts .count.pending { color: #b45309; }
.temporal-counts .count.done    { color: #15803d; }
.temporal-counts .count.late    { color: #991b1b; }

.temporal-legend {
  display: flex;
  gap: 1.1rem;
  font-size: 0.78rem;
  color: var(--c-text-secondary);
  align-items: center;
  padding: 0.5rem 0.6rem;
  background: #f8fafc;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.temporal-legend .dot {
  margin-right: 0.25rem;
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
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
    padding: 1.1rem 1.2rem;
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

  .temporal-header-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .temporal-summary-grid {
    grid-template-columns: 1fr;
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