<template>
  <div class="dashboard-admin">


    <div v-if="cargando" class="loading">Cargando indicadores...</div>

    <template v-else>
      <section class="context-summary">
        <div class="filter-chips">
          <button class="btn-toggle-filtros" @click="mostrarFiltros = !mostrarFiltros" :title="mostrarFiltros ? 'Ocultar filtros' : 'Mostrar filtros'">
            <i :class="mostrarFiltros ? 'ri-filter-2-fill' : 'ri-filter-2-line'" aria-hidden="true"></i>
            {{ mostrarFiltros ? 'Ocultar' : 'Mostrar' }} filtros
          </button>

          <span class="filter-chip primary" v-if="areaSeleccionada || !filtroDireccion">Vista: {{ areaSeleccionada || 'General' }}</span>
          <span class="filter-chip primary" v-if="responsableSeleccionado">Responsable: {{ responsableSeleccionado }}</span>
          <span class="filter-chip direccion-active" v-if="filtroDireccion">📂 {{ filtroDireccion }}</span>
          <span class="filter-chip" v-if="filtroPacNoPac">Plan: {{ filtroPacNoPac }}</span>
          <span class="filter-chip" v-if="filtroTipoContratacionLabel">Contratación: {{ filtroTipoContratacionLabel }}</span>
          <span class="filter-chip" v-if="filtroCuatrimestre">Cuatrimestre: {{ filtroCuatrimestre }}</span>

          <button v-if="hayFiltrosDashboardActivos" class="btn-clear-filter" @click="restablecerVista">
            <i class="ri-refresh-line" aria-hidden="true"></i>
            Restablecer vista
          </button>
        </div>

        <div class="dashboard-toolbar" v-show="mostrarFiltros">
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
          </div>
        </div>
      </section>



      <section class="kpi-grid professional-kpi-grid">
<button
          type="button"
          class="kpi-card kpi-card-button has-tooltip"
          :data-tooltip="`Procesos activos: ${procesosActivosValidos.length} - Cumplimiento: ${porcentajeCumplimientoTotalProcesos}%`"
          @click="abrirDetalleKpi('procesos')"
        >
          <div class="kpi-header">
            <i class="ri-file-list-3-line kpi-icon" style="color: #3b82f6;"></i>
            <span class="kpi-title">Total de procesos</span>
          </div>
          <div class="kpi-donut-row">
            <strong class="kpi-value">{{ procesosActivosValidos.length }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${porcentajeCumplimientoTotalProcesos}%`, '--kpi-color': colorCumplimientoTotalProcesos }">
              <span :style="{ color: colorCumplimientoTotalProcesos }">{{ porcentajeCumplimientoTotalProcesos }}%</span>
            </div>
          </div>
          <small class="kpi-foot">{{ porcentajeCumplimientoTotalProcesos }}% de avance general</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button has-tooltip"
          :data-tooltip="`Presupuesto total disponible: ${formatearMonto(presupuestoTotal)}`"
        >
          <div class="kpi-header">
            <i class="ri-bank-card-line kpi-icon" style="color: #10b981;"></i>
            <span class="kpi-title">Presupuesto Total</span>
          </div>
          <strong class="kpi-value kpi-value-money">{{ formatearMonto(presupuestoTotal) }}</strong>
          <small class="kpi-foot"></small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button has-tooltip"
          :data-tooltip="`Presupuesto PAC: ${formatearMonto(presupuestoPAC)} (${porcentajPresupuestoPAC}%)`"
        >
          <div class="kpi-header">
            <i class="ri-calendar-line kpi-icon" style="color: #2563eb;"></i>
            <span class="kpi-title">Presupuesto PAC</span>
          </div>
          <div class="kpi-donut-row">
            <strong class="kpi-value kpi-value-money">{{ formatearMonto(presupuestoPAC) }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${porcentajPresupuestoPAC}%`, '--kpi-color': '#2563eb' }">
              <span style="color: #2563eb">{{ porcentajPresupuestoPAC }}%</span>
            </div>
          </div>
          <small class="kpi-foot">{{ porcentajPresupuestoPAC }}% del total</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button has-tooltip"
          :data-tooltip="`Presupuesto NO PAC: ${formatearMonto(presupuestoNOPAC)} (${porcentajPresupuestoNOPAC}%)`"
        >
          <div class="kpi-header">
            <i class="ri-time-line kpi-icon" style="color: #f59e0b;"></i>
            <span class="kpi-title">Presupuesto NO PAC</span>
          </div>
          <div class="kpi-donut-row">
            <strong class="kpi-value kpi-value-money">{{ formatearMonto(presupuestoNOPAC) }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${porcentajPresupuestoNOPAC}%`, '--kpi-color': '#f59e0b' }">
              <span style="color: #f59e0b">{{ porcentajPresupuestoNOPAC }}%</span>
            </div>
          </div>
          <small class="kpi-foot">{{ porcentajPresupuestoNOPAC }}% del total</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button success has-tooltip"
          :data-tooltip="`Semáforo positivo (80/50): actual ${kpis.porcentajeCumplimiento}%`"
          @click="abrirDetalleKpi('cumplimiento')"
        >
          <div class="kpi-header">
            <i class="ri-check-double-line kpi-icon" style="color: #16a34a;"></i>
            <span class="kpi-title">Procesos Completos</span>
          </div>
          <div class="kpi-donut-row">
            <strong class="kpi-value">{{ kpis.actividadesCompletadas }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${kpis.porcentajeCumplimiento}%`, '--kpi-color': colorCumplimiento }">
              <span :style="{ color: colorCumplimiento }">{{ kpis.porcentajeCumplimiento }}%</span>
            </div>
          </div>
          <small class="kpi-foot">{{ kpis.porcentajeCumplimiento }}% del total de procesos</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button danger has-tooltip"
          :data-tooltip="`Semáforo riesgo (<=20/<=50): actual ${porcentajeAtraso}%`"
          @click="abrirDetalleKpi('retraso')"
        >
          <div class="kpi-header">
            <i class="ri-alert-line kpi-icon" style="color: #dc2626;"></i>
            <span class="kpi-title">Procesos retrasados</span>
          </div>
          <div class="kpi-donut-row">
            <strong class="kpi-value">{{ kpis.atrasadas }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${porcentajeAtraso}%`, '--kpi-color': colorAtraso }">
              <span :style="{ color: colorAtraso }">{{ porcentajeAtraso }}%</span>
            </div>
          </div>
          <small class="kpi-foot">Procesos fuera de fecha</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button warning has-tooltip"
          :data-tooltip="`Procesos con riesgo general marcado: ${detalleProcesosRiesgo.length}`"
          @click="abrirDetalleKpi('riesgo')"
        >
          <div class="kpi-header">
            <i class="ri-shield-warning-line kpi-icon" style="color: #f59e0b;"></i>
            <span class="kpi-title">En riesgo</span>
          </div>
          <strong class="kpi-value">{{ detalleProcesosRiesgo.length }}</strong>
          <small class="kpi-foot">Marcados con riesgo</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button warning has-tooltip"
          :data-tooltip="`Procesos marcados como desiertos: ${detalleProcesosDesiertos.length}`"
          @click="abrirDetalleKpi('desiertos')"
        >
          <div class="kpi-header">
            <i class="ri-forbid-2-line kpi-icon" style="color: #f59e0b;"></i>
            <span class="kpi-title">Desiertos</span>
          </div>
          <strong class="kpi-value">{{ detalleProcesosDesiertos.length }}</strong>
          <small class="kpi-foot">Estado desierto</small>
        </button>
<button
          type="button"
          class="kpi-card kpi-card-button warning has-tooltip"
          :data-tooltip="`Procesos con presupuesto 0 o sin asignación: ${detalleProcesosDesfinanciados.length}`"
          @click="abrirDetalleKpi('desfinanciados')"
        >
          <div class="kpi-header">
            <i class="ri-money-dollar-circle-line kpi-icon" style="color: #f59e0b;"></i>
            <span class="kpi-title">Desfinanciados</span>
          </div>
          <strong class="kpi-value">{{ detalleProcesosDesfinanciados.length }}</strong>
          <small class="kpi-foot">Sin presupuesto asignado</small>
        </button>
      </section>

      <section class="charts-grid priority-grid">

        <!-- Tarjeta velocímetro PAC -->
        <article class="panel gauge-panel">
          <div class="panel-header">
            <h2>Cumplimiento - PAC</h2>
            <span>{{ totalProcesosPAC }} procesos</span>
          </div>
          <div class="gauge-wrap">
            <svg class="gauge-svg" viewBox="0 0 220 130" aria-hidden="true">
              <path
                class="gauge-track"
                d="M 22 108 A 88 88 0 0 1 198 108"
                fill="none"
                stroke="#dce5f2"
                stroke-width="16"
                stroke-linecap="round"
              />
              <path
                class="gauge-progress"
                d="M 22 108 A 88 88 0 0 1 198 108"
                fill="none"
                :stroke="gaugeColorPAC"
                stroke-width="16"
                stroke-linecap="round"
                pathLength="100"
                :stroke-dasharray="`${gaugeProgressPAC} 100`"
                style="transition: stroke-dasharray 0.6s ease, stroke 0.4s ease;"
              />
              <g
                class="gauge-needle"
                :style="{ transform: `rotate(${gaugeNeedleRotationPAC}deg)`, transformOrigin: '110px 108px', transition: 'transform 0.55s ease' }"
              >
                <line
                  x1="110"
                  y1="108"
                  x2="110"
                  y2="38"
                  :stroke="gaugeColorPAC"
                  stroke-width="4"
                  stroke-linecap="round"
                />
              </g>
              <circle cx="110" cy="108" r="7" fill="#1e293b" />
              <circle cx="110" cy="108" r="3.2" fill="#ffffff" />
              <line class="gauge-mark" x1="22" y1="108" x2="30" y2="108" />
              <line class="gauge-mark" x1="110" y1="20" x2="110" y2="28" />
              <line class="gauge-mark" x1="198" y1="108" x2="190" y2="108" />
              <text x="22" y="124" class="gauge-zone-txt">0%</text>
              <text x="110" y="14" text-anchor="middle" class="gauge-zone-txt">50%</text>
              <text x="198" y="124" text-anchor="end" class="gauge-zone-txt">100%</text>
            </svg>
            <div class="gauge-value" :style="{ color: gaugeColorPAC }">{{ porcentajeEtapasPAC }}%</div>
            <div class="gauge-sub">de {{ totalEtapasConFechaPAC }} procesos</div>
            <div class="gauge-progress-list">
              <div class="gauge-progress-item">
                <div class="gauge-progress-head">
                  <span class="gauge-progress-label">Completas</span>
                  <span class="gauge-progress-meta">{{ etapasCompletadasConFechaPAC }} · {{ porcentajeEtapasCompletadasPAC }}%</span>
                </div>
                <div class="gauge-progress-track">
                  <div
                    class="gauge-progress-fill success"
                    :style="{ width: `${porcentajeEtapasCompletadasPAC}%` }"
                  ></div>
                </div>
              </div>

              <div class="gauge-progress-item">
                <div class="gauge-progress-head">
                  <span class="gauge-progress-label">Pendientes</span>
                  <span class="gauge-progress-meta">{{ etapasPendientesConFechaPAC }} · {{ porcentajeEtapasPendientesPAC }}%</span>
                </div>
                <div class="gauge-progress-track">
                  <div
                    class="gauge-progress-fill warning"
                    :style="{ width: `${porcentajeEtapasPendientesPAC}%` }"
                  ></div>
                </div>
              </div>

              <div class="gauge-progress-item">
                <div class="gauge-progress-head">
                  <span class="gauge-progress-label">Atrasadas</span>
                  <span class="gauge-progress-meta">{{ etapasAtrasadasConFechaPAC }} · {{ porcentajeEtapasAtrasadasPAC }}%</span>
                </div>
                <div class="gauge-progress-track">
                  <div
                    class="gauge-progress-fill danger"
                    :style="{ width: `${porcentajeEtapasAtrasadasPAC}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- Tarjeta velocímetro NO PAC -->
        <article class="panel gauge-panel">
          <div class="panel-header">
            <h2>Cumplimiento - NO PAC</h2>
            <span>{{ totalProcesosNOPAC }} procesos</span>
          </div>
          <div class="gauge-wrap">
            <svg class="gauge-svg" viewBox="0 0 220 130" aria-hidden="true">
              <path
                class="gauge-track"
                d="M 22 108 A 88 88 0 0 1 198 108"
                fill="none"
                stroke="#dce5f2"
                stroke-width="16"
                stroke-linecap="round"
              />
              <path
                class="gauge-progress"
                d="M 22 108 A 88 88 0 0 1 198 108"
                fill="none"
                :stroke="gaugeColorNOPAC"
                stroke-width="16"
                stroke-linecap="round"
                pathLength="100"
                :stroke-dasharray="`${gaugeProgressNOPAC} 100`"
                style="transition: stroke-dasharray 0.6s ease, stroke 0.4s ease;"
              />
              <g
                class="gauge-needle"
                :style="{ transform: `rotate(${gaugeNeedleRotationNOPAC}deg)`, transformOrigin: '110px 108px', transition: 'transform 0.55s ease' }"
              >
                <line
                  x1="110"
                  y1="108"
                  x2="110"
                  y2="38"
                  :stroke="gaugeColorNOPAC"
                  stroke-width="4"
                  stroke-linecap="round"
                />
              </g>
              <circle cx="110" cy="108" r="7" fill="#1e293b" />
              <circle cx="110" cy="108" r="3.2" fill="#ffffff" />
              <line class="gauge-mark" x1="22" y1="108" x2="30" y2="108" />
              <line class="gauge-mark" x1="110" y1="20" x2="110" y2="28" />
              <line class="gauge-mark" x1="198" y1="108" x2="190" y2="108" />
              <text x="22" y="124" class="gauge-zone-txt">0%</text>
              <text x="110" y="14" text-anchor="middle" class="gauge-zone-txt">50%</text>
              <text x="198" y="124" text-anchor="end" class="gauge-zone-txt">100%</text>
            </svg>
            <div class="gauge-value" :style="{ color: gaugeColorNOPAC }">{{ porcentajeEtapasNOPAC }}%</div>
            <div class="gauge-sub">de {{ totalEtapasConFechaNOPAC }} procesos</div>
            <div class="gauge-progress-list">
              <div class="gauge-progress-item">
                <div class="gauge-progress-head">
                  <span class="gauge-progress-label">Completas</span>
                  <span class="gauge-progress-meta">{{ etapasCompletadasConFechaNOPAC }} · {{ porcentajeEtapasCompletadasNOPAC }}%</span>
                </div>
                <div class="gauge-progress-track">
                  <div
                    class="gauge-progress-fill success"
                    :style="{ width: `${porcentajeEtapasCompletadasNOPAC}%` }"
                  ></div>
                </div>
              </div>

              <div class="gauge-progress-item">
                <div class="gauge-progress-head">
                  <span class="gauge-progress-label">Pendientes</span>
                  <span class="gauge-progress-meta">{{ etapasPendientesConFechaNOPAC }} · {{ porcentajeEtapasPendientesNOPAC }}%</span>
                </div>
                <div class="gauge-progress-track">
                  <div
                    class="gauge-progress-fill warning"
                    :style="{ width: `${porcentajeEtapasPendientesNOPAC}%` }"
                  ></div>
                </div>
              </div>

              <div class="gauge-progress-item">
                <div class="gauge-progress-head">
                  <span class="gauge-progress-label">Atrasadas</span>
                  <span class="gauge-progress-meta">{{ etapasAtrasadasConFechaNOPAC }} · {{ porcentajeEtapasAtrasadasNOPAC }}%</span>
                </div>
                <div class="gauge-progress-track">
                  <div
                    class="gauge-progress-fill danger"
                    :style="{ width: `${porcentajeEtapasAtrasadasNOPAC}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel donut-panel area-panel">
          <div class="panel-header">
            <h2>Procesos por área</h2>
            <span>{{ subtareasElegibles.length }} procesos</span>
          </div>
          <div v-if="procesosPorArea.length" class="donut-wrap area-donut-stack">
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

        <article class="panel donut-panel montos-panel">
          <div class="panel-header">
            <h2>Montos por dirección</h2>
            <span>{{ montosPorDireccion.length }} direcciones</span>
          </div>
          <div v-if="montosPorDireccion.length" class="montos-content-wrapper">
            <div class="donut-chart-row">
              <div class="donut area-donut" :style="estiloDonaMontos"></div>
              <div class="montos-total-display">
                <strong>{{ totalMontoDirecciones > 0 ? formatearMonto(totalMontoDirecciones) : '$0' }}</strong>
                <span>Monto Total</span>
              </div>
            </div>
            <div class="donut-legend area-legend">
              <button
                v-for="item in montosPorDireccion"
                :key="`monto-${item.direccion}`"
                type="button"
                class="area-legend-item"
                disabled
              >
                <div class="area-legend-main">
                  <i class="dot" :style="{ background: item.color }"></i>
                  <span class="area-legend-name">{{ item.direccion }}</span>
                </div>
                <span class="area-legend-meta">{{ item.porcentajeMonto }}% · {{ formatearMonto(item.monto) }}</span>
              </button>
            </div>
          </div>
          <div v-else class="empty">Sin montos disponibles por dirección para el filtro actual.</div>
        </article>

      </section>

      <section class="trend-kpi-grid cumplimiento-top-grid">
        <article class="kpi-card trend-card cumplimiento-card">
          <div class="trend-card-header">
            <div>
              <span class="kpi-title">Cumplimiento por dirección</span>
             
            </div>
            
          </div>

          <div class="direccion-group-legend">
            <span><i class="dot" style="background:#28a745"></i>Procesos con flujo normal</span>
            <span><i class="dot" style="background:#dc3545"></i>Procesos con retraso</span>
          </div>
          <div v-if="resumenDireccionesCumplimiento.length" class="direccion-bars-wrap">
            <div class="direccion-vertical-chart">
              <div class="direccion-y-axis">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              <div class="direccion-chart-canvas">
                <div class="direccion-chart-guides">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

                <div class="direccion-groups vertical">
                  <div v-for="item in resumenDireccionesCumplimiento" :key="item.direccion" class="direccion-group-col vertical">
                    <div class="direccion-group-bar-shell vertical">
                      <button
                        type="button"
                        class="direccion-group-bar vertical direccion-group-button"
                        :title="`Dirección: ${item.direccion}\nTotal de procesos: ${item.totalProcesos}\nFlujo normal: ${item.flujoNormal} (${item.flujoNormalPct}%)\nCon retraso: ${item.conRetraso} (${item.conRetrasoPct}%)\nClic para ver detalle de procesos y avance`"
                        @click="abrirDetalleProcesosPorDireccion(item.direccion)"
                      >
                        <div v-if="item.flujoNormal > 0" class="direccion-stack-fill ok" :style="{ height: `${item.flujoNormalPctWidth}%` }">
                          <span class="direccion-stack-label">{{ item.flujoNormal }} ({{ item.flujoNormalPct }}%)</span>
                        </div>
                        <div v-if="item.conRetraso > 0" class="direccion-stack-fill danger" :style="{ height: `${item.conRetrasoPctWidth}%` }">
                          <span class="direccion-stack-label">{{ item.conRetraso }} ({{ item.conRetrasoPct }}%)</span>
                        </div>
                      </button>
                    </div>
                    <div class="direccion-group-label">{{ item.direccion }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-inline">Sin información de direcciones para el filtro actual.</div>
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

          <div v-if="detalleKpi.tipo === 'procesos'" class="kpi-detail-body listado">
            <div v-if="!actividadesAvancePresupuesto.length" class="empty">No hay procesos para mostrar en el filtro actual.</div>
            <div v-else class="bars-stack bars-stack-detailed">
              <section
                v-for="grupo in actividadesPorCuatrimestre"
                :key="`cuatrimestre-${grupo.key}`"
                class="cuatrimestre-group"
              >
                <header class="cuatrimestre-group-header">
                  <h4>{{ grupo.label }}</h4>
                  <span>{{ grupo.items.length }} procesos</span>
                </header>

                <button
                  v-for="item in grupo.items"
                  :key="`modal-proceso-${grupo.key}-${item.id}`"
                  type="button"
                  class="actividad-bar-row actividad-bar-button"
                  :class="{ active: item.destacada && !!responsableSeleccionado, muted: !item.destacada && !!responsableSeleccionado }"
                  @click="abrirActividadDetalle(item.id)"
                >
                  <div class="actividad-bar-top">
                    <div>
                      <div class="bar-label">{{ item.nombre }}</div>
                      <div class="bar-helper">{{ item.area }} · {{ item.responsable }} · {{ item.tieneRetraso ? 'con retraso' : 'flujo normal' }} · clic para abrir detalle</div>
                    </div>
                    <div class="actividad-top-meta">
                      <div class="actividad-presupuesto">{{ formatearMonto(item.presupuesto) }}</div>
                      <div :class="['actividad-delay-badge', item.etapasRetrasadas > 0 ? 'late' : 'on-time']">
                        {{ item.etapasRetrasadas }} {{ item.etapasRetrasadas === 1 ? 'etapa tarde' : 'etapas tarde' }}
                      </div>
                    </div>
                  </div>
                  <div class="actividad-bar-main">
                    <div class="bar-track actividad-track">
                      <div
                        class="bar-fill"
                        :class="item.tieneRetraso ? 'warn' : 'ok'"
                        :style="{ width: item.width }"
                      ></div>
                    </div>
                    <div class="bar-value actividad-avance">{{ item.avance }}%</div>
                  </div>
                </button>
              </section>
            </div>
          </div>

          <div v-else-if="detalleKpi.tipo === 'cumplimiento'" class="kpi-detail-body listado">
            <div v-if="detalleCumplimiento.length === 0" class="empty">No hay procesos completos para el filtro actual.</div>
            <button
              v-for="item in detalleCumplimiento"
              :key="item.id"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirActividadDetalle(item.id)"
            >
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.area }} · {{ item.responsable }} · clic para abrir seguimiento</p>
              </div>
              <div class="list-meta">{{ formatearMonto(item.presupuesto) }}</div>
            </button>
          </div>

          <div v-else-if="detalleKpi.tipo === 'retraso'" class="kpi-detail-body listado">
            <div v-if="detalleProcesosAtrasados.length === 0" class="empty">No hay procesos con etapas retrasadas para el filtro actual.</div>
            <button
              v-for="item in detalleProcesosAtrasados"
              :key="item.id"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirActividadDetalle(item.id)"
            >
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.direccion }} · {{ item.etapasRetrasadas }} etapas con retraso · clic para abrir</p>
              </div>
              <div class="list-meta late">{{ item.etapasRetrasadas }} etapas con retraso</div>
            </button>
          </div>

          <div v-else-if="detalleKpi.tipo === 'proximas'" class="kpi-detail-body listado">
            <div v-if="etapasPorVencer.length === 0" class="empty">No hay etapas por vencer en 2 o 1 día para el filtro actual.</div>
            <button
              v-for="item in etapasPorVencer"
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

          <div v-else-if="detalleKpi.tipo === 'riesgo'" class="kpi-detail-body listado">
            <div v-if="detalleProcesosRiesgo.length === 0" class="empty">No hay procesos marcados en riesgo para el filtro actual.</div>
            <button
              v-for="item in detalleProcesosRiesgo"
              :key="item.id"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirActividadDetalle(item.id)"
            >
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.area }} · {{ item.responsable }} · clic para abrir</p>
                <p class="kpi-risk-comment">{{ item.comentario }}</p>
              </div>
              <div class="list-meta warning">Riesgo</div>
            </button>
          </div>

          <div v-else-if="detalleKpi.tipo === 'desiertos'" class="kpi-detail-body listado">
            <div v-if="detalleProcesosDesiertos.length === 0" class="empty">No hay procesos en estado desierto para el filtro actual.</div>
            <button
              v-for="item in detalleProcesosDesiertos"
              :key="`desierto-${item.id}`"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirActividadDetalle(item.id)"
            >
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.area }} · {{ item.responsable }} · clic para abrir</p>
              </div>
              <div class="list-meta warning">Desierto</div>
            </button>
          </div>

          <div v-else-if="detalleKpi.tipo === 'desfinanciados'" class="kpi-detail-body listado">
            <div v-if="detalleProcesosDesfinanciados.length === 0" class="empty">No hay procesos desfinanciados para el filtro actual.</div>
            <button
              v-for="item in detalleProcesosDesfinanciados"
              :key="`desfinanciado-${item.id}`"
              type="button"
              class="kpi-detail-item kpi-detail-item-button"
              @click="abrirActividadDetalle(item.id)"
            >
              <div>
                <strong>{{ item.nombre }}</strong>
                <p>{{ item.area }} · {{ item.responsable }}</p>
                <p>Solicitud de certificación presupuestaria: {{ item.fechaSolicitudTexto }}</p>
              </div>
              <div class="list-meta warning">Sin presupuesto</div>
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
const filtroDireccion = ref('');
const filtroPacNoPac = ref('');
const filtroTipoContratacion = ref('');
const filtroCuatrimestre = ref('');

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

const filtroTipoContratacionLabel = computed(() =>
  tiposContratacionDisponibles.value.find((tipo) => tipo.value === filtroTipoContratacion.value)?.label || ''
);

const hayFiltrosDashboardActivos = computed(() =>
  Boolean(
    areaSeleccionada.value
    || responsableSeleccionado.value
    || filtroDireccion.value
    || filtroPacNoPac.value
    || filtroTipoContratacion.value
    || filtroCuatrimestre.value
  )
);

function aplicarFiltrosGeneralesDashboard(items: any[]) {
  let filtrados = [...items];

  if (filtroDireccion.value) {
    filtrados = filtrados.filter((subtarea: any) => obtenerDireccionDashboard(subtarea) === filtroDireccion.value);
  }
  if (filtroPacNoPac.value) {
    filtrados = filtrados.filter((subtarea: any) => {
      const tipo = String(subtarea?.pacNoPac || subtarea?.pac_no_pac || subtarea?.tipoPlan || '').toUpperCase();
      return tipo === filtroPacNoPac.value;
    });
  }
  if (filtroTipoContratacion.value) {
    filtrados = filtrados.filter((subtarea: any) =>
      normalizarTextoBusqueda(obtenerTipoContratacionDashboard(subtarea)) === filtroTipoContratacion.value
    );
  }
  if (filtroCuatrimestre.value) {
    filtrados = filtrados.filter((subtarea: any) => String(obtenerCuatrimestreDashboard(subtarea)) === filtroCuatrimestre.value);
  }

  return filtrados;
}

const subtareasConEstadoBaseFiltradas = computed(() => aplicarFiltrosGeneralesDashboard(subtareas.value));

const subtareasBaseFiltradas = computed(() =>
  subtareasConEstadoBaseFiltradas.value.filter((subtarea: any) => actividadActiva(subtarea))
);
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
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
const detalleKpi = ref<{ activo: boolean; tipo: 'procesos' | 'cumplimiento' | 'retraso' | 'proximas' | 'monto' | 'riesgo' | 'desfinanciados' | 'desiertos' }>({
  activo: false,
  tipo: 'cumplimiento'
});
const mostrarFiltros = ref(false);
const GUAYAQUIL_TIMEZONE = 'America/Guayaquil';

// --- Computed y variables dependientes de serieSemanal ---

import { useRouter } from 'vue-router';
import { subtareasService } from '../services/api';
const router = useRouter();

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

function obtenerFechaHoyDashboard() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: GUAYAQUIL_TIMEZONE }).format(new Date());
}

function parseFechaDashboard(fecha: string | Date | null | undefined) {
  if (!fecha) return null;
  if (fecha instanceof Date) {
    const copia = new Date(fecha.getTime());
    copia.setHours(0, 0, 0, 0);
    return copia;
  }

  const texto = String(fecha).trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  }

  const parsed = new Date(texto);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatearFechaDashboard(fecha: string | Date | null | undefined) {
  if (!fecha) return 'Sin fecha registrada';
  const parsed = parseFechaDashboard(fecha) || new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha registrada';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: GUAYAQUIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
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

function obtenerEstadoProcesoDashboard(subtarea: any): 0 | 1 | 2 {
  const valor = subtarea?.activo;
  if (valor === undefined || valor === null || valor === '') return 1;
  if (typeof valor === 'number') {
    if (valor === 2) return 2;
    return valor === 0 ? 0 : 1;
  }
  if (typeof valor === 'boolean') return valor ? 1 : 0;

  const normalizado = String(valor).trim().toLowerCase();
  if (['2', 'desierto'].includes(normalizado)) return 2;
  if (['0', 'false', 'inactivo'].includes(normalizado)) return 0;
  return 1;
}

function actividadActiva(subtarea: any) {
  return obtenerEstadoProcesoDashboard(subtarea) === 1;
}

function actividadCompleta(subtarea: any) {
  const etapas = getEtapasConFechaSubtarea(subtarea);
  return etapas.length > 0 && etapas.every((etapa: any) => normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado');
}

function contarEtapasAtrasadasSubtarea(subtarea: any) {
  if (!procesoCuentaEnIndicadoresYAtrasosDashboard(subtarea)) return 0;

  const hoy = parseFechaDashboard(obtenerFechaHoyDashboard());
  if (!hoy) return 0;

  return getEtapasConFechaSubtarea(subtarea).filter((etapa: any) => {
    if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
    const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
    return Boolean(plan && plan < hoy);
  }).length;
}

function actividadAtrasada(subtarea: any) {
  return contarEtapasAtrasadasSubtarea(subtarea) > 0;
}

function procesoEnRiesgoDashboard(subtarea: any) {
  const valor = subtarea?.procesoEnRiesgo ?? subtarea?.proceso_en_riesgo ?? false;
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  return String(valor).toLowerCase() === 'true';
}

function comentarioRiesgoDashboard(subtarea: any) {
  return String(subtarea?.riesgoComentario ?? subtarea?.riesgo_comentario ?? '').trim();
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

function procesoActivoSinPresupuestoDashboard(subtarea: any) {
  return obtenerEstadoProcesoDashboard(subtarea) === 1 && obtenerPresupuestoDashboard(subtarea) <= 0;
}

function procesoCuentaEnIndicadoresYAtrasosDashboard(subtarea: any) {
  return obtenerEstadoProcesoDashboard(subtarea) === 1 && !procesoActivoSinPresupuestoDashboard(subtarea);
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

function toggleArea(area: string) {
  areaSeleccionada.value = areaSeleccionada.value === area ? '' : area;
}

function restablecerVista() {
  areaSeleccionada.value = '';
  responsableSeleccionado.value = '';
  filtroDireccion.value = '';
  filtroPacNoPac.value = '';
  filtroTipoContratacion.value = '';
  filtroCuatrimestre.value = '';
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


async function cargarResumenSemanal() {
  try {
    const response = await subtareasService.getResumenSemanal({
      area: areaSeleccionada.value || undefined,
      responsable: responsableSeleccionado.value || undefined,
      direccion: filtroDireccion.value || undefined,
      tipoPlan: filtroPacNoPac.value || undefined,
      cuatrimestre: filtroCuatrimestre.value || undefined,
      tipoContratacion: filtroTipoContratacionLabel.value || undefined
    });
    resumenSemanal.value = response;
  } catch (error) {
    console.error('Error cargando resumen semanal:', error);
    resumenSemanal.value = { series: [], mejorSemanaCumplimiento: null, peorSemanaAlertas: null };
  }
}

function abrirDetalleKpi(tipo: 'procesos' | 'cumplimiento' | 'retraso' | 'proximas' | 'monto' | 'riesgo' | 'desfinanciados' | 'desiertos') {
  detalleKpi.value = { activo: true, tipo };
}

function abrirDetalleProcesosPorDireccion(direccion: string) {
  areaSeleccionada.value = direccion;
  detalleKpi.value = { activo: true, tipo: 'procesos' };
}

function cerrarDetalleKpi() {
  detalleKpi.value.activo = false;
  restablecerVista();
}

function manejarEscapeModales(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (detalleKpi.value.activo) {
    cerrarDetalleKpi();
  }
}

const subtareasElegibles = computed(() =>
  subtareasBaseFiltradas.value.filter((subtarea: any) =>
    procesoCuentaEnIndicadoresYAtrasosDashboard(subtarea) && getEtapasConFechaSubtarea(subtarea).length > 0
  )
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

const completadas = computed(() =>
  etapas.value.filter((e: any) => normalizarEstado(e.estado, e.fechaReal) === 'completado').length
);

const actividadesCompletadas = computed(() => subtareasFiltradas.value.filter((subtarea: any) => actividadCompleta(subtarea)).length);

const actividadesAtrasadas = computed(() => subtareasFiltradas.value.filter((subtarea: any) => actividadAtrasada(subtarea)).length);

const actividadesPendientes = computed(() => Math.max(0, subtareasFiltradas.value.length - actividadesCompletadas.value));

const pendientes = computed(() => etapas.value.length - completadas.value);

const atrasadas = computed(() => actividadesAtrasadas.value);

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

const porcentajeAtraso = computed(() => {
  const totalProcesos = Math.max(1, kpis.value.totalTareas);
  return Math.min(100, Math.round((kpis.value.atrasadas / totalProcesos) * 100));
});

const porcentajeProcesosVisibles = computed(() => {
  const total = Math.max(1, subtareasElegibles.value.length);
  return Math.min(100, Math.round((kpis.value.totalTareas / total) * 100));
});

const colorCumplimiento = computed(() => colorSemaforoPositivo(kpis.value.porcentajeCumplimiento));
const colorAtraso = computed(() => colorSemaforoRiesgo(porcentajeAtraso.value));
const detalleProcesosRiesgo = computed(() =>
  subtareasFiltradas.value
    .filter((subtarea: any) => procesoEnRiesgoDashboard(subtarea))
    .map((subtarea: any) => ({
      id: subtarea.id,
      nombre: subtarea.nombre || 'Proceso sin nombre',
      area: obtenerDireccionDashboard(subtarea) || 'Sin área',
      responsable: responsableBase(subtarea),
      comentario: comentarioRiesgoDashboard(subtarea) || 'Sin comentario registrado'
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
);
const porcentajeProcesosRiesgo = computed(() => {
  const total = Math.max(1, kpis.value.totalTareas);
  return Math.min(100, Math.round((detalleProcesosRiesgo.value.length / total) * 100));
});
const colorProcesosRiesgo = computed(() => colorSemaforoRiesgo(porcentajeProcesosRiesgo.value));

const detalleProcesosDesiertos = computed(() => {
  let items = subtareasConEstadoBaseFiltradas.value.filter((subtarea: any) => obtenerEstadoProcesoDashboard(subtarea) === 2);

  if (areaSeleccionada.value) {
    items = items.filter((subtarea: any) => (obtenerDireccionDashboard(subtarea) || 'Sin área') === areaSeleccionada.value);
  }
  if (responsableSeleccionado.value) {
    items = items.filter((subtarea: any) => responsableBase(subtarea) === responsableSeleccionado.value);
  }

  return items
    .map((subtarea: any) => ({
      id: subtarea.id,
      nombre: subtarea.nombre || 'Proceso sin nombre',
      area: obtenerDireccionDashboard(subtarea) || 'Sin área',
      responsable: responsableBase(subtarea)
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
});

const totalProcesosConsideradosDashboard = computed(() =>
  Math.max(1, subtareasFiltradas.value.length + detalleProcesosDesiertos.value.length)
);

const porcentajeProcesosDesiertos = computed(() => {
  return Math.min(100, Math.round((detalleProcesosDesiertos.value.length / totalProcesosConsideradosDashboard.value) * 100));
});
const colorProcesosDesiertos = computed(() =>
  detalleProcesosDesiertos.value.length > 0 ? '#f97316' : '#94a3b8'
);

function obtenerEtapaSolicitudCertificacionPresupuestaria(subtarea: any) {
  return getEtapasConFechaSubtarea(subtarea).find((etapa: any) => {
    const nombre = normalizarTextoBusqueda(String(etapa?.etapaNombre || etapa?.nombre || ''));
    return nombre.includes('solicitud de certificacion presupuestaria')
      || nombre.includes('certificacion presupuestaria')
      || nombre.includes('certificacion presuestaria');
  }) || null;
}

const detalleProcesosDesfinanciados = computed(() => {
  let items = subtareasBaseFiltradas.value.filter((subtarea: any) => procesoActivoSinPresupuestoDashboard(subtarea));

  if (areaSeleccionada.value) {
    items = items.filter((subtarea: any) => (obtenerDireccionDashboard(subtarea) || 'Sin área') === areaSeleccionada.value);
  }
  if (responsableSeleccionado.value) {
    items = items.filter((subtarea: any) => responsableBase(subtarea) === responsableSeleccionado.value);
  }

  return items
    .map((subtarea: any) => {
      const etapaSolicitud = obtenerEtapaSolicitudCertificacionPresupuestaria(subtarea);
      const fechaSolicitud = etapaSolicitud?.fechaPlanificada || etapaSolicitud?.fechaTentativa || etapaSolicitud?.fechaReal || null;

      return {
        id: subtarea.id,
        etapaId: etapaSolicitud?.etapaId || etapaSolicitud?.id,
        nombre: subtarea.nombre || 'Proceso sin nombre',
        area: obtenerDireccionDashboard(subtarea) || 'Sin área',
        responsable: responsableBase(subtarea),
        fechaSolicitud,
        fechaSolicitudTexto: formatearFechaDashboard(fechaSolicitud),
        presupuesto: obtenerPresupuestoDashboard(subtarea)
      };
    })
    .sort((a, b) => {
      const fechaA = a.fechaSolicitud ? new Date(a.fechaSolicitud).getTime() : Number.POSITIVE_INFINITY;
      const fechaB = b.fechaSolicitud ? new Date(b.fechaSolicitud).getTime() : Number.POSITIVE_INFINITY;
      return fechaA - fechaB || a.nombre.localeCompare(b.nombre);
    });
});

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

const detalleProcesosAtrasados = computed(() => {
  const hoy = parseFechaDashboard(obtenerFechaHoyDashboard());
  if (!hoy) return [];

  return subtareasFiltradas.value
    .map((subtarea: any) => {
      const etapasRetrasadas = getEtapasConFechaSubtarea(subtarea).filter((etapa: any) => {
        if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
        const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
        return Boolean(plan && plan < hoy);
      }).length;

      if (!etapasRetrasadas) return null;

      return {
        id: subtarea.id,
        nombre: subtarea.nombre || 'Proceso sin nombre',
        direccion: obtenerDireccionDashboard(subtarea) || 'Sin dirección',
        etapasRetrasadas
      };
    })
    .filter((item): item is { id: number; nombre: string; direccion: string; etapasRetrasadas: number } => Boolean(item))
    .sort((a, b) => b.etapasRetrasadas - a.etapasRetrasadas || a.nombre.localeCompare(b.nombre));
});

const etapasPorVencer = computed(() => {
  const hoy = parseFechaDashboard(obtenerFechaHoyDashboard());
  if (!hoy) return [];

  return etapas.value
    .filter((etapa: any) => {
      if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
      const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
      if (!plan) return false;
      const diasRestantes = Math.floor((plan.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return diasRestantes === 2 || diasRestantes === 1;
    })
    .map((etapa: any) => {
      const fecha = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
      const diasRestantes = fecha
        ? Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
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
    case 'procesos': return 'Detalle de procesos y avance';
    case 'proximas': return 'Detalle de etapas próximas a vencer';
    case 'retraso': return 'Detalle de procesos con etapas retrasadas';
    case 'riesgo': return 'Detalle de procesos en riesgo';
    case 'desiertos': return 'Detalle de procesos desiertos';
    case 'desfinanciados': return 'Detalle de procesos desfinanciados';
    case 'monto': return 'Detalle del monto ejecutado';
    default: return 'Detalle de cumplimiento';
  }
});

const detalleKpiSubtitulo = computed(() => {
  switch (detalleKpi.value.tipo) {
    case 'procesos': return areaSeleccionada.value
      ? `Listado de procesos y avance para la dirección ${areaSeleccionada.value}.`
      : 'Listado de procesos visibles con su avance actual y presupuesto asignado.';
    case 'proximas': return 'Etapas pendientes con vencimiento en 2 y 1 día.';
    case 'retraso': return 'Procesos que tienen etapas vencidas.';
    case 'riesgo': return 'Procesos marcados con riesgo general.';
    case 'desiertos': return 'Procesos marcados con estado desierto y excluidos del seguimiento general.';
    case 'desfinanciados': return 'Procesos con presupuesto 0 o sin asignación, mostrando la fecha de la etapa de solicitud de certificación presupuestaria.';
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

const resumenDireccionesCumplimiento = computed(() => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mapa = new Map<string, { direccion: string; flujoNormal: number; conRetraso: number; totalProcesos: number }>();

  for (const subtarea of subtareasElegibles.value) {
    const direccion = obtenerDireccionDashboard(subtarea) || 'Sin dirección';
    const actual = mapa.get(direccion) || { direccion, flujoNormal: 0, conRetraso: 0, totalProcesos: 0 };
    actual.totalProcesos += 1;

    const etapasProceso = getEtapasConFechaSubtarea(subtarea);
    const tieneRetraso = etapasProceso.some((etapa: any) => {
      const estado = normalizarEstado(etapa.estado, etapa.fechaReal);
      if (estado === 'completado') return false;
      const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
      return Boolean(plan && plan < hoy);
    });

    if (tieneRetraso) {
      actual.conRetraso += 1;
    } else {
      actual.flujoNormal += 1;
    }

    mapa.set(direccion, actual);
  }

  return Array.from(mapa.values())
    .map((item) => {
      const flujoNormalPctWidth = item.totalProcesos > 0 ? Number(((item.flujoNormal / item.totalProcesos) * 100).toFixed(2)) : 0;
      const conRetrasoPctWidth = item.totalProcesos > 0 ? Number(((item.conRetraso / item.totalProcesos) * 100).toFixed(2)) : 0;
      const flujoNormalPct = Math.round(flujoNormalPctWidth);
      const conRetrasoPct = Math.round(conRetrasoPctWidth);

      return {
        ...item,
        flujoNormalPct,
        conRetrasoPct,
        flujoNormalPctWidth,
        conRetrasoPctWidth
      };
    })
    .sort((a, b) => b.flujoNormalPct - a.flujoNormalPct || a.conRetrasoPct - b.conRetrasoPct || a.direccion.localeCompare(b.direccion));
});

const montosPorDireccion = computed(() => {
  const palette = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#a21caf', '#0ea5e9', '#f97316', '#64748b', '#14b8a6'];
  const mapa = new Map<string, number>();

  for (const subtarea of subtareasBaseFiltradas.value) {
    const direccion = obtenerDireccionDashboard(subtarea) || 'Sin dirección';
    mapa.set(direccion, (mapa.get(direccion) || 0) + obtenerPresupuestoDashboard(subtarea));
  }

  const lista = Array.from(mapa.entries())
    .map(([direccion, monto]) => ({ direccion, monto }))
    .sort((a, b) => b.monto - a.monto || a.direccion.localeCompare(b.direccion))
    .map((item, index) => ({ ...item, color: palette[index % palette.length] }));

  const totalMontos = lista.reduce((total, item) => total + item.monto, 0);
  return lista.map((item) => ({
    ...item,
    porcentajeMonto: totalMontos > 0 ? Number(((item.monto / totalMontos) * 100).toFixed(1)) : 0
  }));
});

const totalMontoDirecciones = computed(() =>
  montosPorDireccion.value.reduce((total, item) => total + item.monto, 0)
);

const estiloDonaMontos = computed(() => {
  if (!montosPorDireccion.value.length || totalMontoDirecciones.value <= 0) {
    return { background: 'conic-gradient(#e2e8f0 0 100%)' };
  }

  let acumulado = 0;
  const segmentos: string[] = [];

  for (const item of montosPorDireccion.value) {
    const inicio = acumulado;
    const porcentaje = (item.monto / totalMontoDirecciones.value) * 100;
    acumulado += porcentaje;
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
      presupuesto: obtenerPresupuestoDashboard(subtarea),
      cuatrimestre: obtenerCuatrimestreDashboard(subtarea),
      etapasRetrasadas: contarEtapasAtrasadasSubtarea(subtarea),
      tieneRetraso: actividadAtrasada(subtarea)
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

const actividadesPorCuatrimestre = computed(() => {
  const grupos = new Map<number, typeof actividadesAvancePresupuesto.value>();

  for (const item of actividadesAvancePresupuesto.value) {
    const key = Number.isFinite(item.cuatrimestre) ? item.cuatrimestre : 999;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(item);
  }

  return Array.from(grupos.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([key, items]) => ({
      key,
      label: key >= 1 && key <= 4 ? `Cuatrimestre ${key}` : 'Sin cuatrimestre',
      items: [...items].sort((a, b) => {
        if (a.tieneRetraso !== b.tieneRetraso) return a.tieneRetraso ? -1 : 1;
        return b.etapasRetrasadas - a.etapasRetrasadas || b.presupuesto - a.presupuesto || b.avance - a.avance;
      })
    }));
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
  areaSeleccionada,
  responsableSeleccionado,
  filtroDireccion,
  filtroPacNoPac,
  filtroTipoContratacionLabel,
  filtroCuatrimestre
], () => {
  cargarResumenSemanal();
});

// Obtener subtareas válidas para presupuesto (excluyendo sin presupuesto y desiertos)
function obtenerSubtareasValidasParaPresupuesto() {
  return subtareasBaseFiltradas.value.filter((subtarea: any) => {
    const presupuesto = obtenerPresupuestoDashboard(subtarea);
    const estado = obtenerEstadoProcesoDashboard(subtarea);
    return presupuesto > 0 && estado !== 2;
  });
}

// Presupuesto total
const presupuestoTotal = computed(() =>
  obtenerSubtareasValidasParaPresupuesto().reduce((total, subtarea) => total + obtenerPresupuestoDashboard(subtarea), 0)
);

// Presupuesto PAC
const presupuestoPAC = computed(() => {
  return obtenerSubtareasValidasParaPresupuesto()
    .filter((subtarea: any) => {
      const tipo = String(subtarea?.pacNoPac || subtarea?.pac_no_pac || subtarea?.tipoPlan || '').toUpperCase();
      return tipo === 'PAC';
    })
    .reduce((total, subtarea) => total + obtenerPresupuestoDashboard(subtarea), 0);
});

// Presupuesto NO PAC
const presupuestoNOPAC = computed(() => {
  return obtenerSubtareasValidasParaPresupuesto()
    .filter((subtarea: any) => {
      const tipo = String(subtarea?.pacNoPac || subtarea?.pac_no_pac || subtarea?.tipoPlan || '').toUpperCase();
      return tipo === 'NO PAC';
    })
    .reduce((total, subtarea) => total + obtenerPresupuestoDashboard(subtarea), 0);
});

// Porcentaje de presupuesto PAC
const porcentajPresupuestoPAC = computed(() => {
  const total = presupuestoTotal.value;
  return total > 0 ? Math.round((presupuestoPAC.value / total) * 100) : 0;
});

// Porcentaje de presupuesto NO PAC
const porcentajPresupuestoNOPAC = computed(() => {
  const total = presupuestoTotal.value;
  return total > 0 ? Math.round((presupuestoNOPAC.value / total) * 100) : 0;
});

// Etapas PAC y NO PAC (solo de subtareas válidas: sin presupuesto 0 y no desiertos)
const etapasPAC = computed(() => {
  const subtareasValidas = obtenerSubtareasValidasParaPresupuesto();
  return etapas.value.filter((etapa: any) => {
    const subtarea = subtareasFiltradas.value.find(s => s.id === etapa.subtareaId);
    if (!subtarea) return false;
    // Verificar que la subtarea esté en la lista de válidas
    if (!subtareasValidas.find(s => s.id === subtarea.id)) return false;
    const tipo = String(subtarea?.pacNoPac || subtarea?.pac_no_pac || subtarea?.tipoPlan || '').toUpperCase();
    return tipo === 'PAC';
  });
});

const etapasNOPAC = computed(() => {
  const subtareasValidas = obtenerSubtareasValidasParaPresupuesto();
  return etapas.value.filter((etapa: any) => {
    const subtarea = subtareasFiltradas.value.find(s => s.id === etapa.subtareaId);
    if (!subtarea) return false;
    // Verificar que la subtarea esté en la lista de válidas
    if (!subtareasValidas.find(s => s.id === subtarea.id)) return false;
    const tipo = String(subtarea?.pacNoPac || subtarea?.pac_no_pac || subtarea?.tipoPlan || '').toUpperCase();
    return tipo === 'NO PAC';
  });
});

const etapasConFechaAsignadaPAC = computed(() =>
  etapasPAC.value.filter((etapa: any) => {
    const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
    return typeof fecha === 'string' ? fecha.trim().length > 0 : Boolean(fecha);
  })
);

const etapasConFechaAsignadaNOPAC = computed(() =>
  etapasNOPAC.value.filter((etapa: any) => {
    const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
    return typeof fecha === 'string' ? fecha.trim().length > 0 : Boolean(fecha);
  })
);

const totalEtapasConFechaPAC = computed(() => etapasConFechaAsignadaPAC.value.length);
const totalEtapasConFechaNOPAC = computed(() => etapasConFechaAsignadaNOPAC.value.length);

// Contar procesos únicos PAC y NO PAC de etapas con fecha
// Nota: Según DB, hay 45 procesos PAC pero solo 26 tienen etapas con fecha
// Los 19 faltantes no tienen etapas programadas y se excluyen
const totalProcesosPAC = computed(() => {
  const procesosUnicos = new Set(etapasConFechaAsignadaPAC.value.map((etapa: any) => etapa.subtareaId));
  return procesosUnicos.size;
});

const totalProcesosNOPAC = computed(() => {
  const procesosUnicos = new Set(etapasConFechaAsignadaNOPAC.value.map((etapa: any) => etapa.subtareaId));
  return procesosUnicos.size;
});

const etapasCompletadasConFechaPAC = computed(() =>
  etapasConFechaAsignadaPAC.value.filter((etapa: any) => normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado').length
);

const etapasCompletadasConFechaNOPAC = computed(() =>
  etapasConFechaAsignadaNOPAC.value.filter((etapa: any) => normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado').length
);

const etapasAtrasadasConFechaPAC = computed(() => {
  const hoy = parseFechaDashboard(obtenerFechaHoyDashboard());
  if (!hoy) return 0;

  return etapasConFechaAsignadaPAC.value.filter((etapa: any) => {
    if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
    const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
    return Boolean(plan && plan < hoy);
  }).length;
});

const etapasAtrasadasConFechaNOPAC = computed(() => {
  const hoy = parseFechaDashboard(obtenerFechaHoyDashboard());
  if (!hoy) return 0;

  return etapasConFechaAsignadaNOPAC.value.filter((etapa: any) => {
    if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
    const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
    return Boolean(plan && plan < hoy);
  }).length;
});

const etapasPendientesConFechaPAC = computed(() =>
  Math.max(0, totalEtapasConFechaPAC.value - etapasCompletadasConFechaPAC.value - etapasAtrasadasConFechaPAC.value)
);

const etapasPendientesConFechaNOPAC = computed(() =>
  Math.max(0, totalEtapasConFechaNOPAC.value - etapasCompletadasConFechaNOPAC.value - etapasAtrasadasConFechaNOPAC.value)
);

// Porcentaje de cumplimiento PAC y NO PAC (basado en total consolidado de etapas)
const porcentajeEtapasPAC = computed(() =>
  totalEtapasConsolidado.value
    ? Math.round((etapasCompletadasConFechaPAC.value / totalEtapasConsolidado.value) * 100)
    : 0
);

const porcentajeEtapasNOPAC = computed(() =>
  totalEtapasConsolidado.value
    ? Math.round((etapasCompletadasConFechaNOPAC.value / totalEtapasConsolidado.value) * 100)
    : 0
);

const porcentajeEtapasCompletadasPAC = computed(() => porcentajeEtapasPAC.value);
const porcentajeEtapasCompletadasNOPAC = computed(() => porcentajeEtapasNOPAC.value);

const porcentajeEtapasPendientesPAC = computed(() =>
  Math.max(0, 100 - porcentajeEtapasCompletadasPAC.value - porcentajeEtapasAtrasadasPAC.value)
);

const porcentajeEtapasPendientesNOPAC = computed(() =>
  Math.max(0, 100 - porcentajeEtapasCompletadasNOPAC.value - porcentajeEtapasAtrasadasNOPAC.value)
);

const porcentajeEtapasAtrasadasPAC = computed(() =>
  totalEtapasConFechaPAC.value
    ? Math.round((etapasAtrasadasConFechaPAC.value / totalEtapasConFechaPAC.value) * 100)
    : 0
);

const porcentajeEtapasAtrasadasNOPAC = computed(() =>
  totalEtapasConFechaNOPAC.value
    ? Math.round((etapasAtrasadasConFechaNOPAC.value / totalEtapasConFechaNOPAC.value) * 100)
    : 0
);

const gaugeProgressPAC = computed(() => Math.min(100, Math.max(0, porcentajeEtapasPAC.value)));
const gaugeNeedleRotationPAC = computed(() => -90 + (gaugeProgressPAC.value / 100) * 180);
const gaugeColorPAC = computed(() => colorSemaforoPositivo(porcentajeEtapasPAC.value));

const gaugeProgressNOPAC = computed(() => Math.min(100, Math.max(0, porcentajeEtapasNOPAC.value)));
const gaugeNeedleRotationNOPAC = computed(() => -90 + (gaugeProgressNOPAC.value / 100) * 180);
const gaugeColorNOPAC = computed(() => colorSemaforoPositivo(porcentajeEtapasNOPAC.value));

// Total de procesos activos válidos (excluyendo desiertos, desfinanciados y sin etapas con fecha)
const procesosActivosValidos = computed(() => {
  return subtareasBaseFiltradas.value.filter((subtarea: any) => {
    const presupuesto = obtenerPresupuestoDashboard(subtarea);
    const estado = obtenerEstadoProcesoDashboard(subtarea);
    // Excluir desfinanciados (presupuesto = 0) y desiertos (estado = 2)
    if (presupuesto <= 0 || estado === 2) return false;
    // Excluir procesos sin etapas con fecha
    const etapasConFecha = getEtapasConFechaSubtarea(subtarea);
    return etapasConFecha.length > 0;
  });
});

// Etapas de procesos activos válidos (solo con fecha asignada)
const etapasActivosValidos = computed(() =>
  procesosActivosValidos.value.flatMap((subtarea: any) =>
    (subtarea.seguimientoEtapas || []).filter((etapa: any) => {
      const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
      return typeof fecha === 'string' ? fecha.trim().length > 0 : Boolean(fecha);
    }).map((etapa: any) => ({
      ...etapa,
      id: etapa.id || `${subtarea.id}-${etapa.etapaId || etapa.nombre}`,
      subtareaId: subtarea.id
    }))
  )
);

// Etapas completadas de procesos activos válidos
const etapasCompletadasActivosValidos = computed(() =>
  etapasActivosValidos.value.filter((etapa: any) =>
    normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado'
  ).length
);

// Etapas atrasadas (pendientes con días de retraso) de procesos activos válidos
const etapasAtrasadasActivosValidos = computed(() => {
  const hoy = parseFechaDashboard(obtenerFechaHoyDashboard());
  if (!hoy) return 0;

  return etapasActivosValidos.value.filter((etapa: any) => {
    if (normalizarEstado(etapa.estado, etapa.fechaReal) === 'completado') return false;
    const plan = parseFechaDashboard(etapa?.fechaPlanificada || etapa?.fechaTentativa);
    return Boolean(plan && plan < hoy);
  }).length;
});

// Etapas en progreso (pendientes sin días de retraso) de procesos activos válidos
const etapasEnProgresoActivosValidos = computed(() =>
  Math.max(0, etapasActivosValidos.value.length - etapasCompletadasActivosValidos.value - etapasAtrasadasActivosValidos.value)
);

// Porcentaje de cumplimiento para Total de procesos (basado en etapas)
const porcentajeCumplimientoTotalProcesos = computed(() =>
  etapasActivosValidos.value.length
    ? Math.round((etapasCompletadasActivosValidos.value / etapasActivosValidos.value.length) * 100)
    : 0
);

// Porcentaje de etapas atrasadas
const porcentajeEtapasAtrasadasTotal = computed(() =>
  etapasActivosValidos.value.length
    ? Math.round((etapasAtrasadasActivosValidos.value / etapasActivosValidos.value.length) * 100)
    : 0
);

const colorCumplimientoTotalProcesos = computed(() =>
  colorSemaforoPositivo(porcentajeCumplimientoTotalProcesos.value)
);

// Cumplimiento total consolidado (PAC + NO PAC) - Basado en etapas
const totalEtapasConsolidado = computed(() =>
  totalEtapasConFechaPAC.value + totalEtapasConFechaNOPAC.value
);

const etapasCompletadasConsolidado = computed(() =>
  etapasCompletadasConFechaPAC.value + etapasCompletadasConFechaNOPAC.value
);

const porcentajeCumplimientoConsolidado = computed(() =>
  totalEtapasConsolidado.value
    ? Math.round((etapasCompletadasConsolidado.value / totalEtapasConsolidado.value) * 100)
    : 0
);

const colorCumplimientoConsolidado = computed(() =>
  colorSemaforoPositivo(porcentajeCumplimientoConsolidado.value)
);

</script>

<style scoped>
/* ── Design Tokens ────────────────────────────────────────────────────────── */
:global(:root) {
  --c-bg: #eef3fa;
  --c-surface: #ffffff;
  --c-border: #d7e3f1;
  --c-text-primary: #0f172a;
  --c-text-secondary: #2f4560;
  --c-text-muted: #6b8198;
  --c-accent: #3b82f6;
  --c-accent-light: #e3efff;
  --c-success: #16a34a;
  --c-success-light: #dcfce7;
  --c-warning: #d97706;
  --c-warning-light: #fef3c7;
  --c-danger: #dc2626;
  --c-danger-light: #fee2e2;
  --c-teal: #0ea5e9;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --shadow-sm: 0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
  --shadow-md: 0 4px 16px rgba(15,23,42,.08), 0 2px 6px rgba(15,23,42,.04);
  --shadow-lg: 0 10px 32px rgba(15,23,42,.12), 0 4px 12px rgba(15,23,42,.06);
  --panel-compact-height: 210px;
  --panel-secondary-height: 260px;
}

/* ── Layout ───────────────────────────────────────────────────────────────── */
.dashboard-admin {
  display: grid;
  gap: 0.9rem;
  font-family: 'DM Sans', 'Outfit', 'Segoe UI', system-ui, sans-serif;
  padding: 0;
  margin-top: -0.5rem;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.dashboard-header {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 58%, #334155 100%);
  color: #fff;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  padding: 0.72rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-top: 0;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
  position: relative;
  overflow: hidden;
  margin: -1rem -1rem 0;
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
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.08;
}

.dashboard-header p {
  margin: 0.08rem 0 0;
  color: #cbd5e1;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.meta-pill {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 0.22rem 0.62rem;
  font-size: 0.72rem;
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
  background: linear-gradient(120deg, #f8fbff 0%, #eef5ff 100%);
  border: 1px solid #c9d9ee;
  border-radius: 12px;
  padding: 0.55rem 0.75rem;
  box-shadow: 0 6px 14px rgba(17, 46, 78, 0.08);
  position: sticky;
  top: 0.5rem;
  z-index: 40;
}

.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.btn-toggle-filtros {
  height: 30px;
  padding: 0 0.68rem;
  border-radius: 7px;
  border: 1px solid #7c3aed;
  background: linear-gradient(135deg, #7c3aed, #a78bfa);
  color: #ffffff;
  font-size: 0.73rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(124, 58, 237, 0.28);
  transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.btn-toggle-filtros:hover {
  background: linear-gradient(135deg, #6d28d9, #9d67ff);
  border-color: #5b21b6;
  box-shadow: 0 5px 11px rgba(124, 58, 237, 0.34);
  transform: translateY(-1px);
}

.btn-toggle-filtros:active {
  transform: translateY(0);
}

.btn-clear-filter {
  height: 30px;
  padding: 0 0.68rem;
  border-radius: 7px;
  border: 1px solid #2f7bd7;
  background: linear-gradient(135deg, #2f7bd7, #4e9cf0);
  color: #ffffff;
  font-size: 0.73rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(47, 123, 215, 0.28);
  transition: background 0.15s, border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}

.btn-clear-filter:hover {
  background: linear-gradient(135deg, #2b73ca, #3c8be2);
  border-color: #1f5fab;
  box-shadow: 0 5px 11px rgba(47, 123, 215, 0.34);
  transform: translateY(-1px);
}

.btn-clear-filter:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.dashboard-toolbar-filtros {
  display: flex;
  gap: 0.4rem;
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
  padding-right: 0.9rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 0.56rem;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: #f4f8ff;
  color: #28496d;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

.filter-chip.primary {
  background: linear-gradient(135deg, #e4efff, #d7e9ff);
  border-color: #9ec4ef;
  color: #17467c;
}

.filter-chip.success {
  background: var(--c-success-light);
  border-color: #86efac;
  color: #15803d;
}

.filter-chip.direccion-active {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  border-color: #38bdf8;
  color: #0c4a6e;
  font-size: 0.72rem;
  font-weight: 800;
  height: 28px;
  padding: 0 0.62rem;
  box-shadow: 0 1px 4px rgba(14, 165, 233, 0.24);
  letter-spacing: 0.01em;
}

.combo-filtro {
  border: 1px solid var(--c-border);
  background: linear-gradient(180deg, #ffffff, #f4f8ff);
  color: #244668;
  font-size: 0.74rem;
  font-weight: 700;
  border-radius: 8px;
  height: 30px;
  padding: 0 0.62rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.combo-filtro:focus {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  background: #ffffff;
}

.dashboard-toolbar-filtros .combo-filtro {
  border-color: #b6cee9;
  color: #1f4a78;
  box-shadow: 0 1px 3px rgba(17, 46, 78, 0.08);
}

.dashboard-toolbar-filtros .combo-filtro:hover {
  border-color: #90b7e1;
  background: linear-gradient(180deg, #ffffff, #ecf4ff);
}

.dashboard-toolbar-filtros select.combo-filtro {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 1.6rem;
  background-image:
    linear-gradient(45deg, transparent 50%, #2563eb 50%),
    linear-gradient(135deg, #2563eb 50%, transparent 50%);
  background-position:
    calc(100% - 11px) calc(50% - 2px),
    calc(100% - 7px) calc(50% - 2px);
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}

.dashboard-buscador-container .buscador-input.combo-filtro {
  background: linear-gradient(180deg, #ffffff, #edf5ff);
  border-color: #98bde7;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.12);
  padding-left: 1.8rem;
  padding-right: 0.72rem;
}

.dashboard-buscador-container .buscador-input.combo-filtro::placeholder {
  color: #64748b;
  font-weight: 600;
}

/* ── KPI Grid ─────────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.72rem;
}

.professional-kpi-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: stretch;
}

.trend-kpi-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 0.72rem;
}

.cumplimiento-top-grid {
  grid-template-columns: minmax(0, 1fr);
}

.cumplimiento-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  overflow: visible;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #d3e0ef;
  border-left: 4px solid #d3e0ef;
  border-radius: var(--radius-md);
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.2rem;
  box-shadow: 0 10px 26px rgba(17, 46, 78, 0.09);
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
  text-align: center;
  min-height: 110px;
}

.kpi-card.success {
  border-left-color: #16a34a;
}

.kpi-card.danger {
  border-left-color: #dc2626;
}

.kpi-card.warning {
  border-left-color: #f59e0b;
}

.kpi-card-button:not(.success):not(.danger):not(.warning) {
  border-left-color: #3b82f6;
}

.kpi-card:hover {
  box-shadow: 0 14px 30px rgba(17, 46, 78, 0.13);
  border-color: #b8d1f0;
}

.kpi-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  flex-shrink: 0;
}

.kpi-icon {
  font-size: 1.05rem;
  flex-shrink: 0;
  opacity: 0.85;
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

.kpi-card.warning {
  box-shadow: inset 4px 0 0 var(--c-warning), 0 10px 30px rgba(15, 23, 42, 0.05);
}

/* White executive surfaces with only a slim state accent */
.kpi-card.success,
.kpi-card.danger,
.kpi-card.accent,
.kpi-card.warning {
  background: #ffffff;
}

.kpi-title {
  color: var(--c-text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.2;
}

.kpi-value {
  color: var(--c-text-primary);
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  flex-grow: 1;
  display: flex;
  align-items: center;
}

.kpi-value-money {
  font-size: 1.45rem;
}

.kpi-foot {
  color: var(--c-text-muted);
  font-size: 0.68rem;
  line-height: 1.3;
  width: 100%;
  text-align: center;
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
  justify-content: center;
  align-items: center;
  gap: 1.2rem;
  flex-grow: 1;
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

.direccion-group-legend {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.2rem;
  color: var(--c-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  padding: 0.4rem 0;
  background: linear-gradient(180deg, transparent 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
}

.direccion-bars-wrap {
  overflow-x: visible;
  padding-bottom: 0.2rem;
}

.direccion-vertical-chart {
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr);
  align-items: end;
  gap: 0.9rem;
  min-width: 100%;
}

.direccion-y-axis {
  height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  color: var(--c-text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  padding-bottom: 1.65rem;
  padding-right: 0.3rem;
}

.direccion-chart-canvas {
  position: relative;
  height: 220px;
  border-left: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  padding: 0.45rem 0.45rem 0.35rem;
}

.direccion-chart-guides {
  position: absolute;
  inset: 0.45rem 0.45rem 1.85rem 0.45rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.direccion-chart-guides span {
  border-top: 1px dashed #e2e8f0;
}

.direccion-groups.vertical {
  position: relative;
  z-index: 1;
  height: 100%;
  display: grid;
  grid-auto-columns: minmax(76px, 1fr);
  grid-auto-flow: column;
  align-items: end;
  gap: 0.55rem;
}

.direccion-group-col.vertical {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}

.direccion-group-bar-shell.vertical {
  width: 64px;
  height: 180px;
  display: flex;
  align-items: flex-end;
}

.direccion-group-bar.vertical {
  width: 100%;
  height: 100%;
  border-radius: 12px 12px 0 0;
  border: 1.5px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.direccion-group-bar.vertical:hover {
  border-color: #93c5fd;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12);
}

.direccion-group-button {
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.direccion-group-button:hover {
  transform: translateY(-2px);
  border-color: #93c5fd;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
}

.direccion-group-button:focus-visible {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}

.direccion-stack-fill {
  width: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: height 0.45s ease;
  overflow: hidden;
}

.direccion-stack-fill.ok {
  background: #28a745;
  color: #ffffff;
}

.direccion-stack-fill.danger {
  background: #dc3545;
  color: #ffffff;
}

.direccion-stack-label {
  font-size: 0.56rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  padding: 0.18rem;
  word-break: break-word;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.12);
}

.direccion-group-label {
  width: 100%;
  font-size: 0.68rem;
  text-align: center;
  color: var(--c-text-secondary);
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  word-break: break-word;
  margin-top: 0.35rem;
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
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: conic-gradient(var(--kpi-color) var(--value), #e2e8f0 var(--value));
  display: grid;
  place-items: center;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.12));
  transition: filter 0.2s;
}

.kpi-card:hover .kpi-mini-donut {
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.16));
}

.kpi-mini-donut span {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  font-size: 0.65rem;
  font-weight: 800;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
}

/* ── Charts Grid & Panels ─────────────────────────────────────────────────── */
.charts-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.72rem;
}

.priority-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
}

.secondary-grid {
  grid-template-columns: 1fr;
  align-items: stretch;
}

.extended-grid {
  align-items: start;
}

.ranking-panel {
  grid-row: auto;
}

.cumplimiento-card {
  min-width: 0;
}

.panel {
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: var(--radius-md);
  padding: 0.92rem 1rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.priority-grid .panel {
  padding: 0.9rem 1rem;
  height: 100%;
  min-height: var(--panel-compact-height);
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
}

.secondary-grid .panel {
  padding: 0.78rem 0.82rem;
  height: auto;
  min-height: var(--panel-secondary-height, 340px);
  max-height: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.secondary-grid .panel > * {
  min-height: 0;
}

.secondary-grid .panel-header {
  margin-bottom: 0.45rem;
  padding-bottom: 0.28rem;
}

.secondary-grid .panel-header h2 {
  font-size: 1.02rem;
}

.secondary-grid .panel-header span {
  font-size: 0.76rem;
  padding: 0.18rem 0.6rem;
}

.donut-panel .donut-wrap,
.temporal-panel .temporal-chart,
.gauge-panel .gauge-wrap {
  flex: 1;
}

.priority-grid .panel-header {
  margin-bottom: 0.35rem;
  padding-bottom: 0.25rem;
}

.priority-grid .panel-header h2 {
  font-size: 0.9rem;
}

.priority-grid .panel-header span {
  font-size: 0.68rem;
}

.priority-grid .gauge-wrap {
  justify-content: center;
  gap: 0.4rem;
}

.priority-grid .gauge-svg {
  max-width: 160px;
}

.priority-grid .gauge-value {
  font-size: 1.6rem;
}

.priority-grid .gauge-sub {
  font-size: 0.72rem;
}

.priority-grid .gauge-legend {
  max-width: fit-content;
  font-size: 0.78rem;
  padding: 0.42rem 0.56rem;
  gap: 0.24rem;
  margin: 0 auto;
}

.priority-grid .gauge-legend-item {
  justify-content: center;
}

.priority-grid .gauge-progress-list {
  width: 100%;
  max-width: 100%;
}

.gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}

.priority-grid .donut-wrap {
  height: 100%;
  align-items: stretch;
  gap: 0.9rem;
}

.priority-grid .area-donut-stack {
  grid-template-columns: 1fr;
  justify-items: center;
  align-content: start;
}

.priority-grid .donut {
  width: 100px;
  height: 100px;
}

.priority-grid .donut-center {
  width: 62px;
  height: 62px;
}

.priority-grid .donut-center strong {
  font-size: 0.95rem;
}

.priority-grid .donut-center span {
  font-size: 0.58rem;
}

.priority-grid .area-legend,
.priority-grid .montos-panel .area-legend {
  max-height: 180px;
  min-height: auto;
  overflow-y: auto;
  gap: 0.18rem;
  width: 100%;
  align-content: start;
  padding-right: 0.18rem;
}

.priority-grid .montos-panel {
  height: 100%;
  min-height: var(--panel-compact-height);
  max-height: none;
}

.priority-grid .area-legend-item {
  min-height: 1.35rem;
  padding: 0.2rem 0.28rem;
  font-size: 0.6rem;
}

.priority-grid .area-legend-meta {
  font-size: 0.56rem;
}

.priority-grid .area-legend-name {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.2;
}

.priority-grid .temporal-panel .temporal-chart-line {
  gap: 0.35rem;
}

.priority-grid .temporal-summary-card {
  padding: 0.38rem 0.46rem;
}

.priority-grid .temporal-summary-value {
  font-size: 1.05rem;
}

.priority-grid .temporal-legend {
  padding: 0.24rem 0.32rem;
  font-size: 0.62rem;
}

.priority-grid .temporal-tab {
  font-size: 0.66rem;
  padding: 0.2rem 0.4rem;
}

.priority-grid .temporal-overdue-total {
  font-size: 0.64rem;
  padding: 0.14rem 0.36rem;
}

.barras-panel {
  height: auto;
  min-height: var(--panel-secondary-height, 340px);
  max-height: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.montos-panel {
  height: auto;
  min-height: var(--panel-secondary-height, 340px);
  max-height: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.barras-panel .panel-header {
  flex: 0 0 auto;
}

.montos-panel .panel-header {
  flex: 0 0 auto;
}

.barras-panel .bars-stack-detailed {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.2rem;
  gap: 0.45rem;
}


.montos-panel .area-legend {
  min-height: calc(8 * 1.55rem);
  max-height: calc(8 * 1.55rem);
  overflow-y: auto;
  gap: 0.22rem;
  width: 100%;
  align-content: start;
  padding-right: 0.18rem;
}

.montos-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
  flex: 1 1 0;
}

.donut-chart-row {
  display: flex;
  flex-direction: row;
  gap: 0.8rem;
  align-items: center;
  height: auto;
  min-height: 0;
}

.donut-chart-row .area-donut {
  flex: 0 0 auto;
  width: 110px;
  height: 110px;
}

.montos-total-display {
  flex: 0 0 auto;
  padding: 0.6rem 0.8rem;
  text-align: center;
  border-left: 1px solid rgba(226, 232, 240, 0.5);
  border-top: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  justify-content: center;
  align-items: center;
  min-width: 100px;
}

.montos-content-wrapper .donut-legend {
  width: 100%;
}

.montos-total-display strong {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.montos-total-display span {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.secondary-grid .actividad-bar-button {
  padding: 0.45rem 0.55rem;
}

.secondary-grid .bar-label {
  font-size: 0.72rem;
}

.secondary-grid .bar-helper {
  font-size: 0.64rem;
}

.secondary-grid .area-donut-stack {
  grid-template-columns: 1fr;
  justify-items: center;
  align-content: start;
  min-height: 0;
}

.secondary-grid .donut-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  align-items: start;
}

.secondary-grid .donut {
  width: 112px;
  height: 112px;
}

.secondary-grid .donut-center {
  width: 72px;
  height: 72px;
}

.secondary-grid .donut-center strong {
  font-size: 1.05rem;
}

.secondary-grid .donut-center span {
  font-size: 0.6rem;
}

.secondary-grid .area-legend {
  max-height: 100%;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  width: 100%;
  gap: 0.22rem;
  padding-right: 0.18rem;
}

.secondary-grid .montos-panel .area-donut-stack {
  min-height: 0;
  height: 100%;
}

.secondary-grid .area-legend-item {
  min-height: 1.45rem;
  padding: 0.24rem 0.3rem;
  font-size: 0.62rem;
}

.secondary-grid .area-legend-meta {
  font-size: 0.58rem;
}

.secondary-grid .area-legend-name {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.2;
}

.area-panel .panel-header h2,
.gauge-panel .panel-header h2 {
  font-size: 1.02rem;
}

.montos-panel .area-legend-name {
  font-size: 0.62rem;
  font-weight: 500;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.2;
}

.montos-panel .area-legend-meta {
  font-size: 0.58rem;
  font-weight: 700;
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
  gap: 1.4rem;
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
  filter: drop-shadow(0 6px 16px rgba(15,23,42,0.12));
  transition: filter 0.2s;
}

.donut:hover {
  filter: drop-shadow(0 8px 20px rgba(15,23,42,0.18));
}

.donut-center {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: box-shadow 0.2s;
}

.donut:hover .donut-center {
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
}

.donut-center strong {
  color: var(--c-text-primary);
  font-size: 1.2rem;
  font-weight: 800;
}

.donut-center span {
  color: var(--c-text-muted);
  font-size: 0.7rem;
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
  border: 1.5px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-surface);
  color: var(--c-text-secondary);
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.7rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.78rem;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.2s;
}

.area-legend-item:hover:not(.static) {
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.16);
  background: #f8fbff;
  transform: translateX(2px);
}

.area-legend-item.active {
  border-color: var(--c-accent);
  background: var(--c-accent-light);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  font-weight: 600;
}

.area-legend-item.static {
  cursor: default;
}

.area-legend-item.static:hover {
  border-color: var(--c-border);
  box-shadow: none;
  background: var(--c-surface);
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
.dot.tomato { background: #dc2626; }

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
.bar-fill.warn    { background: linear-gradient(90deg, #ef4444, #dc2626); }
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

.cuatrimestre-group {
  display: grid;
  gap: 0.55rem;
}

.cuatrimestre-group + .cuatrimestre-group {
  margin-top: 0.5rem;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--c-border);
}

.cuatrimestre-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.cuatrimestre-group-header h4 {
  margin: 0;
  font-size: 0.84rem;
  color: #0f3f73;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-weight: 800;
  background: linear-gradient(135deg, #e5f0ff, #d8e8ff);
  border: 1px solid #b8d1f0;
  border-radius: 999px;
  padding: 0.22rem 0.62rem;
}

.cuatrimestre-group-header span {
  font-size: 0.7rem;
  color: #5f7895;
  background: #eef5ff;
  border: 1px solid #c9d9ee;
  border-radius: 999px;
  padding: 0.16rem 0.52rem;
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

.actividad-top-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
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

.actividad-delay-badge {
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  border: 1px solid transparent;
}

.actividad-delay-badge.on-time {
  color: #166534;
  background: #dcfce7;
  border-color: #86efac;
}

.actividad-delay-badge.late {
  color: #991b1b;
  background: #fee2e2;
  border-color: #fca5a5;
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

.list-meta.warning {
  color: #9a3412;
  background: var(--c-warning-light);
  border-color: #fcd34d;
}

.kpi-risk-comment {
  margin: 0.35rem 0 0;
  color: var(--c-text-muted);
  font-size: 0.8rem;
  line-height: 1.4;
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
  background: var(--c-surface, #ffffff);
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
  background: var(--c-surface, #ffffff);
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
  max-width: 236px;
  overflow: visible;
  filter: drop-shadow(0 6px 14px rgba(17,46,78,0.12));
}

.gauge-track {
  opacity: 0.95;
}

.gauge-progress {
  filter: drop-shadow(0 2px 6px rgba(37, 99, 235, 0.24));
}

.gauge-needle {
  filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.26));
}

.gauge-mark {
  stroke: #a8b8cc;
  stroke-width: 2;
  stroke-linecap: round;
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
  font-size: 0.95rem;
  color: var(--c-text-secondary);
  background: #f8fafc;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.95rem;
  width: 100%;
  max-width: 250px;
}

.gauge-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gauge-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gauge-zone-txt {
  font-size: 11px;
  fill: #7f93ab;
  font-weight: 700;
  font-family: inherit;
}

.gauge-value {
  font-size: 2.9rem;
  font-weight: 900;
  text-align: center;
  line-height: 1;
  margin-top: 0.1rem;
  letter-spacing: -0.04em;
  transition: color 0.4s ease;
}

.gauge-sub {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--c-text-muted);
  text-align: center;
  margin-bottom: 0.2rem;
}

.gauge-progress-list {
  width: 100%;
  max-width: 320px;
  background: #f8fafc;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.62rem;
  display: grid;
  gap: 0.45rem;
}

.gauge-progress-item {
  display: grid;
  gap: 0.2rem;
}

.gauge-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
}

.gauge-progress-label {
  font-size: 0.65rem;
  color: var(--c-text-secondary);
  font-weight: 700;
}

.gauge-progress-meta {
  font-size: 0.63rem;
  color: var(--c-text-muted);
  font-weight: 700;
}

.gauge-progress-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #e6edf6;
  overflow: hidden;
}

.gauge-progress-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.45s ease;
}

.gauge-progress-fill.success {
  background: linear-gradient(90deg, #16a34a, #22c55e);
}

.gauge-progress-fill.warning {
  background: linear-gradient(90deg, #d97706, #f59e0b);
}

.gauge-progress-fill.danger {
  background: linear-gradient(90deg, #dc2626, #ef4444);
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

  .priority-grid,
  .secondary-grid {
    grid-template-columns: 1fr;
  }

  .ranking-panel {
    grid-row: auto;
  }
}

@media (max-width: 680px) {
  .context-summary {
    padding: 0.5rem 0.55rem;
  }

  .dashboard-toolbar-filtros {
    width: 100%;
    justify-content: flex-start;
  }

  .dashboard-toolbar-filtros .combo-filtro {
    flex: 1 1 170px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.62rem 0.78rem;
    margin: -1rem -1rem 0;
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

  .direccion-vertical-chart {
    min-width: 560px;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 0.5rem;
  }

  .direccion-y-axis {
    font-size: 0.62rem;
  }

  .direccion-groups.vertical {
    grid-auto-columns: minmax(64px, 1fr);
    grid-auto-flow: column;
  }

  .direccion-group-bar-shell.vertical {
    width: 42px;
    height: 124px;
  }

  .direccion-stack-label {
    font-size: 0.52rem;
  }

  .direccion-group-label {
    font-size: 0.58rem;
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