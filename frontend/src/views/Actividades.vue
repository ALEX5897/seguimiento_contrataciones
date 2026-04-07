<template>
  <div class="actividades-view">
    <div class="actividades-header">
      <h1>Procesos</h1>
      <span v-if="!cargando" class="total-actividades">
        Total de procesos: <strong>{{ actividadesActivas.length }}</strong>
      </span>
    </div>

    <section class="context-summary" v-if="!cargando">
      <div class="filter-chips">
        <span class="filter-chip primary" v-if="busquedaActividades">Búsqueda: {{ busquedaActividades }}</span>
        <span class="filter-chip direccion-active" v-if="filtroDireccion">📂 {{ filtroDireccion }}</span>
        <span class="filter-chip" v-if="filtroPacNoPac">Plan: {{ filtroPacNoPac }}</span>
        <span class="filter-chip" v-if="filtroTipoContratacionLabel">Contratación: {{ filtroTipoContratacionLabel }}</span>
        <span class="filter-chip" v-if="filtroCuatrimestre">Cuatrimestre: {{ filtroCuatrimestre }}</span>
        <span class="filter-chip" v-if="filtroMonto">Monto: {{ filtroMonto }}</span>
        <span class="filter-chip riesgo-active" v-if="filtroRiesgo === 'riesgo'">⚠️ Solo en riesgo</span>
        <button v-if="hayFiltrosActivos" class="btn-clear-filter" @click="limpiarFiltrosActividades">
          Restablecer filtros
        </button>
      </div>

      <div class="dashboard-toolbar">
        <div class="buscador-container dashboard-buscador-container">
          <span class="buscador-icon">🔎</span>
          <input
            v-model="busquedaActividades"
            class="buscador-input combo-filtro"
            type="text"
            placeholder="Buscar por nombre, dirección o responsable..."
          />
        </div>

        <div class="dashboard-toolbar-filtros">
          <select v-model="filtroDireccion" class="combo-filtro">
            <option value="">Todas las direcciones</option>
            <option v-for="direccion in direccionesDisponibles" :key="direccion" :value="direccion">{{ direccion }}</option>
          </select>

          <select v-model="filtroPacNoPac" class="combo-filtro">
            <option value="">PAC y NO PAC</option>
            <option value="PAC">PAC</option>
            <option value="NO PAC">NO PAC</option>
          </select>

          <select v-model="filtroTipoContratacion" class="combo-filtro">
            <option value="">Todos los tipos de contratación</option>
            <option
              v-for="tipo in tiposContratacionDisponibles"
              :key="tipo.value"
              :value="tipo.value"
            >{{ tipo.label }}</option>
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

          <select v-model="filtroRiesgo" class="combo-filtro">
            <option value="">Todos los procesos</option>
            <option value="riesgo">⚠️ Solo en riesgo</option>
          </select>

          <select v-model="ordenPresupuesto" class="combo-filtro">
            <option value="todos">Ordenar por...</option>
            <option value="presupuesto-desc">Presupuesto: mayor a menor</option>
            <option value="presupuesto-asc">Presupuesto: menor a mayor</option>
          </select>
        </div>
      </div>
    </section>

    <div v-if="!cargando" class="kpis-lectura-rapida">
      <article class="kpi-card kpi-total">
        <div class="kpi-head">
          <p class="kpi-label">Total Etapas</p>
          <span class="kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="5" width="16" height="14" rx="2"></rect>
              <path d="M8 9h8M8 12h8M8 15h6"></path>
            </svg>
          </span>
        </div>
        <div class="kpi-donut-row">
          <p class="kpi-value">{{ kpiResumen.totalEtapas }}</p>
          <div class="kpi-mini-donut" :style="{ '--value': `${porcentajeEtapasVisibles}%`, '--kpi-color': '#64748b' }">
            <span>{{ porcentajeEtapasVisibles }}%</span>
          </div>
        </div>
        <small class="kpi-foot">Etapas visibles para el filtro actual</small>
      </article>
      <article class="kpi-card kpi-completadas">
        <div class="kpi-head">
          <p class="kpi-label">Etapas Completas</p>
          <span class="kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="m8.5 12 2.4 2.4 4.6-4.8"></path>
            </svg>
          </span>
        </div>
        <div class="kpi-donut-row">
          <p class="kpi-value">{{ kpiResumen.completadas }}</p>
          <div class="kpi-mini-donut" :style="{ '--value': `${porcentajeCompletadas}%`, '--kpi-color': '#16a34a' }">
            <span>{{ porcentajeCompletadas }}%</span>
          </div>
        </div>
        <small class="kpi-foot">{{ porcentajeCompletadas }}% del total de etapas</small>
      </article>
      <article class="kpi-card kpi-retraso">
        <div class="kpi-head">
          <p class="kpi-label">Con Retraso</p>
          <span class="kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 4 3.8 18.2a1 1 0 0 0 .9 1.5h14.6a1 1 0 0 0 .9-1.5L12 4Z"></path>
              <path d="M12 9.2v4.6"></path>
              <circle cx="12" cy="16.8" r=".8" fill="currentColor" stroke="none"></circle>
            </svg>
          </span>
        </div>
        <div class="kpi-donut-row">
          <p class="kpi-value">{{ kpiResumen.conRetraso }}</p>
          <div class="kpi-mini-donut" :style="{ '--value': `${porcentajeConRetraso}%`, '--kpi-color': '#dc2626' }">
            <span>{{ porcentajeConRetraso }}%</span>
          </div>
        </div>
        <small class="kpi-foot">{{ porcentajeConRetraso }}% de etapas presentan retraso</small>
      </article>
      <article class="kpi-card kpi-avance">
        <div class="kpi-head">
          <p class="kpi-label">Avance</p>
          <span class="kpi-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 15.5 10 10.5 13.5 14 19 8.5"></path>
              <path d="M15.5 8.5H19V12"></path>
            </svg>
          </span>
        </div>
        <div class="kpi-donut-row">
          <p class="kpi-value kpi-value-avance">{{ kpiResumen.avance }}%</p>
          <div class="kpi-mini-donut" :style="{ '--value': `${kpiResumen.avance}%`, '--kpi-color': colorAvanceKpi }">
            <span :style="{ color: colorAvanceKpi }">{{ kpiResumen.avance }}%</span>
          </div>
        </div>
        <small class="kpi-foot">Progreso general de las etapas</small>
        <div class="kpi-progress-track">
          <div
            class="kpi-progress-fill"
            :class="kpiResumen.avanceClass"
            :style="{ width: `${kpiResumen.avance}%` }"
          ></div>
        </div>
      </article>
    </div>

    <div v-if="errorCargaActividades" class="error-actividades">
      <p>{{ errorCargaActividades }}</p>
    </div>
    <div v-else-if="cargando" class="loading">Cargando procesos...</div>
    <div v-else class="actividades-grid">
      <div
        v-for="(actividad, index) in actividadesActivas"
        :key="actividad.id"
        class="actividad-card"
        @click.stop="abrirDetalleActividad(actividad)"
      >
        <div class="actividad-header">
          <h2>{{ actividad.nombre }}</h2>
          <div class="actividad-tags">
            <span class="badge">{{ actividad.tipoPlan }}</span>
            <span class="badge numero-badge">#{{ index + 1 }}</span>
          </div>
        </div>

        <div class="actividad-meta-chips">
          <span class="actividad-meta-chip neutral">{{ obtenerTipoContratacionCabecera(actividad) }}</span>
          <span class="actividad-meta-chip success">{{ obtenerPacNoPacCabecera(actividad) }}</span>
          <span class="actividad-meta-chip quarter">Cuatrimestre {{ obtenerCuatrimestreTexto(actividad) }}</span>
          <span v-if="procesoActivoSinPresupuesto(actividad)" class="actividad-meta-chip warning-budget">Sin presupuesto</span>
        </div>

        <div class="actividad-info">
          <p><strong>Dirección:</strong> {{ obtenerDireccion(actividad) }}</p>
          <p><strong>Responsable:</strong> {{ obtenerResponsable(actividad) }}</p>
          <p><strong>Cuatrimestre:</strong> {{ obtenerCuatrimestreTexto(actividad) }}</p>
          <p><strong>Presupuesto:</strong> ${{ obtenerPresupuesto(actividad).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
          <p><strong>Período:</strong> {{ formatearFecha(periodoActividad(actividad).desde) }} - {{ formatearFecha(periodoActividad(actividad).hasta) }}</p>
        </div>

        <div class="actividad-stats">
          <div class="stat">
            <div class="stat-value">{{ totalTareas(actividad) }}</div>
            <div class="stat-label">Total Etapas</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ tareasCompletadas(actividad) }}</div>
            <div class="stat-label">Completas</div>
          </div>
          <div class="stat retraso">
            <div class="stat-value">{{ tareasConRetraso(actividad) }}</div>
            <div class="stat-label">Con retraso</div>
          </div>
          <div class="stat stat-avance-visual">
            <div
              class="actividad-mini-donut"
              :style="{ '--value': `${porcentajeAvance(actividad)}%`, '--actividad-color': colorAvanceActividad(actividad) }"
            >
              <span>{{ porcentajeAvance(actividad) }}%</span>
            </div>
            <div class="stat-label">Avance</div>
          </div>
        </div>

        <div class="progress-bar-container">
          <div
            class="progress-bar-fill"
            :class="claseAvance(actividad)"
            :style="{ width: porcentajeAvance(actividad) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="!cargando && actividadesActivas.length === 0" class="empty-state">
      <p>No hay procesos para los filtros actuales</p>
      <button type="button" class="btn-limpiar-filtros" @click="limpiarFiltrosActividades">Limpiar filtros</button>
    </div>

    <div v-if="actividadSeleccionada" class="modal-overlay" @click.self="cerrarDetalleActividad">
      <div class="modal-content modal-detalle-actividad" @click.stop>
        <div class="modal-header">
          <div class="modal-header-content">
            <h2>{{ actividadSeleccionada.nombre }}</h2>
            <div class="seguimiento-contexto-header">
              <span class="seguimiento-contexto-chip neutral">
                Contratación: {{ obtenerTipoContratacionCabecera(actividadSeleccionada) }}
              </span>
              <span class="seguimiento-contexto-chip success">
                {{ obtenerPacNoPacCabecera(actividadSeleccionada) }}
              </span>
              <span class="seguimiento-contexto-chip quarter">
                Cuatrimestre {{ obtenerCuatrimestreTexto(actividadSeleccionada) }}
              </span>
              <span class="seguimiento-contexto-chip amount">
                {{ formatearMontoCabecera(obtenerPresupuesto(actividadSeleccionada)) }}
              </span>
              <span
                v-if="procesoActivoSinPresupuesto(actividadSeleccionada)"
                class="seguimiento-contexto-chip budget-warning"
              >
                Sin presupuesto
              </span>
            </div>
          </div>
          <button type="button" class="btn-close" @click="cerrarDetalleActividad">✕</button>
        </div>

        <div class="modal-body modal-detalle-body" :class="{ 'timeline-expandida': !timelineContraida }">
          <div class="detalle-superior">
          <div class="detalle-resumen-row">
            <div class="resumen-detalle">
              <span><strong>Total:</strong> {{ totalTareas(actividadSeleccionada) }}</span>
              <span><strong>Completas:</strong> {{ tareasCompletadas(actividadSeleccionada) }}</span>
              <span><strong>Con retraso:</strong> {{ tareasConRetraso(actividadSeleccionada) }}</span>
              <span :class="claseAvance(actividadSeleccionada)"><strong>Avance:</strong> {{ porcentajeAvance(actividadSeleccionada) }}%</span>
            </div>

            <div class="riesgo-proceso-tools">
              <label class="riesgo-proceso-simple">
                <input
                  v-model="procesoEnRiesgo"
                  type="checkbox"
                  :disabled="guardandoRiesgoProceso"
                  @change="onToggleRiesgoProceso"
                />
                <span>Proceso en riesgo</span>
              </label>

              <label class="riesgo-proceso-simple desierto">
                <input
                  v-model="procesoDesierto"
                  type="checkbox"
                  :disabled="guardandoRiesgoProceso"
                  @change="onToggleProcesoDesierto"
                />
                <span>Proceso desierto</span>
              </label>

              <template v-if="procesoEnRiesgo">
                <button
                  type="button"
                  class="btn-riesgo-icon"
                  :class="{ active: procesoEnRiesgo }"
                  :disabled="guardandoRiesgoProceso"
                  title="Abrir comentario de riesgo"
                  @click="abrirEditorRiesgo"
                >
                  ⚠️
                </button>

                <button
                  type="button"
                  class="btn-riesgo-detalle"
                  :disabled="!puedeVerDetalleRiesgo"
                  @click="toggleDetalleRiesgo"
                >
                  {{ mostrarPanelRiesgo ? 'Ocultar detalles' : 'Ver detalles' }}
                </button>
              </template>
            </div>
          </div>

          <div v-if="procesoEnRiesgo && mostrarPanelRiesgo" class="riesgo-proceso-panel">
            <div v-if="mensajeRiesgoProceso" :class="['seguimiento-msg', `seguimiento-msg-${mensajeRiesgoProceso.tipo}`]">
              {{ mensajeRiesgoProceso.texto }}
            </div>
            <div v-if="errorRiesgoProceso" class="seguimiento-error">{{ errorRiesgoProceso }}</div>

            <div class="riesgo-proceso-body">
              <textarea
                v-model="comentarioRiesgoProceso"
                rows="3"
                class="textarea-comentario riesgo-proceso-textarea"
                placeholder="Escribe el detalle del riesgo"
                :maxlength="LIMITE_COMENTARIO_RIESGO"
              ></textarea>
              <div
                class="contador-caracteres"
                :class="{
                  aviso: caracteresRestantesRiesgo <= 40 && caracteresRestantesRiesgo > 0,
                  limite: caracteresRestantesRiesgo <= 0
                }"
              >
                {{ longitudComentarioRiesgo }}/{{ LIMITE_COMENTARIO_RIESGO }} caracteres
              </div>
              <div class="riesgo-proceso-actions">
                <button
                  type="button"
                  class="btn-guardar"
                  @click="guardarRiesgoProceso"
                  :disabled="guardandoRiesgoProceso || !comentarioRiesgoProceso.trim() || longitudComentarioRiesgo > LIMITE_COMENTARIO_RIESGO"
                >
                  {{ guardandoRiesgoProceso ? 'Guardando...' : 'Guardar comentario' }}
                </button>
              </div>
            </div>
          </div>

          </div>

          <div v-if="etapasConFecha.length" class="tabla-etapas-wrap">
          <table class="tabla-etapas">
            <thead>
              <tr>
                <th>#</th>
                <th>Etapa</th>
                <th>Fecha límite</th>
                <th>Fecha reforma</th>
                <th>Fecha de completado</th>
                <th>Estado</th>
                <th>Retraso</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(etapa, index) in etapasConFecha"
                :key="etapa.id || etapa.etapaId"
                :class="{ 'fila-etapa-destacada': esEtapaResaltada(etapa) }"
              >
                <td><span class="etapa-numero-badge">{{ index + 1 }}</span></td>
                <td>{{ etapa.etapaNombre || etapa.nombre }}</td>
                <td>{{ formatearFecha(etapa.fechaPlanificada || etapa.fechaTentativa) }}</td>
                <td>
                  <input
                    v-model="etapa.fechaReforma"
                    type="date"
                    class="estado-select-detalle"
                    :disabled="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)"
                    @change="onFechaReformaChange(etapa)"
                  />
                </td>
                <td>
                  <input
                    v-if="estadoNormalizado(etapa.estado) === 'completado' && permiteEditarFechaCompletado"
                    v-model="etapa.fechaReal"
                    type="date"
                    class="estado-select-detalle"
                    :disabled="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)"
                    @change="onFechaCompletadoChange(etapa)"
                  />
                  <span v-else-if="estadoNormalizado(etapa.estado) === 'completado' && etapa.fechaReal">
                    {{ formatearFecha(etapa.fechaReal) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <div class="estado-editor">
                    <select
                      v-model="etapa.estado"
                      :class="['estado-select-detalle', claseEstadoSemaforo(etapa)]"
                      :disabled="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)"
                      @change="onEstadoEtapaChange(etapa)"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="completado">Completado</option>
                    </select>
                    <span v-if="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)" class="estado-saving">Guardando...</span>
                  </div>
                </td>
                <td>
                  <span
                    v-if="estadoNormalizado(etapa.estado) === 'completado' && etapa.fechaReal && (etapa.fechaPlanificada || etapa.fechaTentativa)"
                    :class="['cumplimiento-chip', etapaCompletadaATiempo(etapa, actividadSeleccionada) ? 'a-tiempo' : 'con-retraso']"
                  >
                    {{ etapaCompletadaATiempo(etapa, actividadSeleccionada) ? '✅ Completado' : `✅ ${diasRetrasoCompletado(etapa, actividadSeleccionada)} días tarde` }}
                  </span>
                  <span v-else-if="esEtapaAtrasada(etapa, actividadSeleccionada)" class="retraso-chip">⚠️ {{ diasRetraso(etapa, actividadSeleccionada) }} días tarde</span>
                  <span v-else>-</span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn-seguimiento btn-seguimiento-icono"
                    @click="seleccionarEtapaSeguimiento(etapa)"
                    :title="`Observaciones de ${etapa.etapaNombre || etapa.nombre}`"
                  >
                    <svg class="icono-mensaje" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.3 0-2.6-.3-3.8-.9L4 21l1.4-4.2A8.5 8.5 0 1 1 21 12Z" />
                      <path d="M8.5 11.5h7" />
                      <path d="M8.5 14.5h4.5" />
                    </svg>
                    <span
                      v-if="mostrarCargaSeguimiento(etapa)"
                      class="seguimiento-loading-dot"
                      title="Cargando observaciones"
                    ></span>
                    <span
                      v-if="obtenerIndicadorSeguimiento(etapa) > 0"
                      class="seguimiento-badge"
                      title="Esta etapa tiene observaciones o alertas"
                    >{{ obtenerIndicadorSeguimiento(etapa) > 99 ? '99+' : obtenerIndicadorSeguimiento(etapa) }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>

          <div class="timeline timeline-final" v-if="etapasConFecha.length">
            <div class="timeline-header">
              <h4>Línea de tiempo</h4>
              <button type="button" class="btn-toggle-timeline" @click="timelineContraida = !timelineContraida">
                {{ timelineContraida ? 'Ver línea de tiempo' : 'Ocultar línea de tiempo' }}
              </button>
            </div>

            <div v-if="timelineContraida" class="timeline-contraida-box">
              <div class="timeline-contraida-titulo">📌 Línea de tiempo contraída</div>
              <div class="timeline-contraida-texto">
                Hay {{ etapasConFecha.length }} etapas en la secuencia. Haz clic en <strong>Ver línea de tiempo</strong> para ver el detalle completo.
              </div>
            </div>

            <div v-if="!timelineContraida">
              <div
                v-for="(etapa, index) in etapasConFecha"
                :key="`timeline-${etapa.id || etapa.etapaId || index}`"
                class="timeline-item"
                :class="{ destacado: esEtapaResaltada(etapa) }"
              >
                <div class="timeline-node" :class="estadoVisual(etapa)"></div>
                <div v-if="index < etapasConFecha.length - 1" class="timeline-line"></div>
                <div class="timeline-content">
                  <div class="timeline-title">{{ etapa.etapaNombre || etapa.nombre }}</div>
                  <div class="timeline-date">
                    <span>{{ textoLeyendaTimeline(etapa) }}</span>
                    <span
                      v-if="badgeLeyendaTimeline(etapa)"
                      :class="['timeline-badge', claseBadgeLeyendaTimeline(etapa)]"
                    >
                      {{ badgeLeyendaTimeline(etapa) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <div v-if="etapaSeguimiento" class="modal-overlay modal-seguimiento-overlay" @click.self="cerrarModalSeguimiento">
      <div class="modal-content modal-seguimiento" @click.stop>
        <div class="modal-header">
          <div class="modal-header-content">
            <h2>
              Seguimiento: {{ actividadSeleccionada?.nombre || 'Proceso' }}
              · {{ etapaSeguimiento.etapaNombre || etapaSeguimiento.nombre }}
            </h2>
            <div class="seguimiento-contexto-header">
              <span class="seguimiento-contexto-chip neutral">
                Contratación: {{ obtenerTipoContratacionCabecera(actividadSeleccionada) }}
              </span>
              <span class="seguimiento-contexto-chip success">
                {{ obtenerPacNoPacCabecera(actividadSeleccionada) }}
              </span>
              <span class="seguimiento-contexto-chip quarter">
                Cuatrimestre {{ obtenerCuatrimestreTexto(actividadSeleccionada) }}
              </span>
              <span class="seguimiento-contexto-chip amount">
                {{ formatearMontoCabecera(obtenerPresupuesto(actividadSeleccionada)) }}
              </span>
              <span
                v-if="actividadSeleccionada && procesoActivoSinPresupuesto(actividadSeleccionada)"
                class="seguimiento-contexto-chip budget-warning"
              >
                Sin presupuesto
              </span>
            </div>
          </div>
          <button type="button" class="btn-close" @click="cerrarModalSeguimiento">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="cargandoSeguimientos" class="seguimiento-estado">Cargando historial...</div>
          <div v-if="errorSeguimiento" class="seguimiento-error">{{ errorSeguimiento }}</div>
          <div v-if="mensajeSeguimiento" :class="['seguimiento-msg', `seguimiento-msg-${mensajeSeguimiento.tipo}`]">
            {{ mensajeSeguimiento.texto }}
          </div>

          <textarea
            v-model="nuevoComentario"
            rows="3"
            class="textarea-comentario"
            placeholder="Agregar observación de seguimiento"
            :maxlength="LIMITE_COMENTARIO_SEGUIMIENTO"
          ></textarea>
          <div
            class="contador-caracteres"
            :class="{
              aviso: caracteresRestantesSeguimiento <= 40 && caracteresRestantesSeguimiento > 0,
              limite: caracteresRestantesSeguimiento <= 0
            }"
          >
            {{ longitudComentarioSeguimiento }}/{{ LIMITE_COMENTARIO_SEGUIMIENTO }} caracteres 
          </div>
          <label class="alerta-label">
            <input type="checkbox" v-model="nuevoAlerta" />
            Marcar alerta
          </label>
          <button type="button" class="btn-guardar" @click="guardarSeguimiento" :disabled="guardandoSeguimiento || cargandoSeguimientos || !nuevoComentario.trim() || longitudComentarioSeguimiento > LIMITE_COMENTARIO_SEGUIMIENTO">
            {{ guardandoSeguimiento ? 'Guardando...' : 'Guardar seguimiento' }}
          </button>

          <div class="seguimientos-historial">
            <h4>Historial</h4>
            <div v-if="seguimientosEtapa.length === 0">Sin observaciones registradas</div>
            <div v-for="item in seguimientosEtapa" :key="item.id" class="seguimiento-item">
              <div class="seguimiento-meta-row">
                <div class="seguimiento-meta">{{ formatearFechaConHora(item.createdAt || item.created_at || item.fecha) }} · {{ item.responsableNombre || 'Sin responsable' }}</div>
                <button
                  v-if="puedeEliminarSeguimientos"
                  type="button"
                  class="btn-eliminar-seguimiento"
                  @click="eliminarSeguimiento(item)"
                  :disabled="eliminandoSeguimientoId === Number(item.id)"
                >
                  {{ eliminandoSeguimientoId === Number(item.id) ? 'Eliminando...' : 'Eliminar' }}
                </button>
              </div>
              <div v-if="item.tieneAlerta" class="seguimiento-alerta">⚠️ Alerta activa</div>
              <div>{{ item.comentario }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api, { actividadesService } from '../services/api';
import { UI_FLAGS } from '../config/constants';
import { useAuthStore } from '../stores/auth';
import { normalizarTextoBusqueda } from '../utils/search';

const errorCargaActividades = ref('');

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cargando = ref(true);
const actividades = ref<any[]>([]);
const busquedaActividades = ref('');
const filtroDireccion = ref('');
const filtroPacNoPac = ref('');
const filtroTipoContratacion = ref('');
const filtroCuatrimestre = ref('');
const filtroMonto = ref('');
const filtroRiesgo = ref('');
const ordenPresupuesto = ref('todos');
const actividadesVisiblesBase = computed(() =>
  actividades.value.filter((actividad: any) => esProcesoVisible(actividad))
);
const actividadesContabilizadasBase = computed(() =>
  actividadesVisiblesBase.value.filter((actividad: any) => procesoCuentaEnReportesYAtrasos(actividad))
);
const direccionesDisponibles = computed(() => {
  const direcciones = [...new Set(actividadesVisiblesBase.value.map((actividad: any) => obtenerDireccion(actividad)))] as string[];
  return direcciones.filter((direccion) => direccion !== 'N/A').sort((a, b) => a.localeCompare(b));
});
const tiposContratacionDisponibles = computed(() => {
  const opciones = new Map<string, string>();

  for (const actividad of actividadesVisiblesBase.value) {
    const label = obtenerTipoContratacionCabecera(actividad);
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

const montosDisponibles = computed(() => {
  const rangos = [
    { label: '0-1,000', min: 0, max: 1000 },
    { label: '1,001-5,000', min: 1001, max: 5000 },
    { label: '5,001-10,000', min: 5001, max: 10000 },
    { label: '10,001+', min: 10001, max: Infinity }
  ];
  const usados = new Set<string>();
  for (const actividad of actividadesVisiblesBase.value) {
    const monto = obtenerPresupuesto(actividad);
    for (const r of rangos) {
      if (monto >= r.min && monto <= r.max) {
        usados.add(r.label);
        break;
      }
    }
  }
  return rangos.filter(r => usados.has(r.label)).map(r => r.label);
});

const hayFiltrosActivos = computed(() =>
  Boolean(
    busquedaActividades.value
    || filtroDireccion.value
    || filtroPacNoPac.value
    || filtroTipoContratacion.value
    || filtroCuatrimestre.value
    || filtroMonto.value
    || filtroRiesgo.value
  )
);
const actividadesActivas = computed(() => {
  let items = [...actividadesVisiblesBase.value];

  const q = normalizarTextoBusqueda(busquedaActividades.value);
  if (q) {
    items = items.filter((a: any) => {
      const direccion = obtenerDireccion(a);
      const responsable = obtenerResponsable(a);
      return normalizarTextoBusqueda(`${a?.nombre || ''} ${direccion} ${responsable}`).includes(q);
    });
  }

  if (filtroDireccion.value) {
    items = items.filter((a: any) => obtenerDireccion(a) === filtroDireccion.value);
  }

  if (filtroPacNoPac.value) {
    items = items.filter((a: any) => {
      const tipo = String(a?.pacNoPac || a?.pac_no_pac || a?.tipoPlan || '').toUpperCase();
      return tipo === filtroPacNoPac.value;
    });
  }

  if (filtroTipoContratacion.value) {
    items = items.filter((a: any) =>
      normalizarTextoBusqueda(obtenerTipoContratacionCabecera(a)) === filtroTipoContratacion.value
    );
  }

  if (filtroCuatrimestre.value) {
    items = items.filter((a: any) => String(obtenerCuatrimestreOrden(a)) === filtroCuatrimestre.value);
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
      items = items.filter((a: any) => {
        const monto = obtenerPresupuesto(a);
        return monto >= rango.min && monto <= rango.max;
      });
    }
  }

  if (filtroRiesgo.value === 'riesgo') {
    items = items.filter((a: any) => normalizarProcesoEnRiesgo(a));
  }

  if (ordenPresupuesto.value === 'presupuesto-desc') {
    items.sort((a: any, b: any) => obtenerPresupuesto(b) - obtenerPresupuesto(a));
  } else if (ordenPresupuesto.value === 'presupuesto-asc') {
    items.sort((a: any, b: any) => obtenerPresupuesto(a) - obtenerPresupuesto(b));
  } else if (ordenPresupuesto.value === 'fecha-fin-asc') {
    items.sort((a: any, b: any) => obtenerFechaFinOrden(a) - obtenerFechaFinOrden(b));
  } else if (ordenPresupuesto.value === 'fecha-fin-desc') {
    items.sort((a: any, b: any) => obtenerFechaFinOrden(b) - obtenerFechaFinOrden(a));
  }

  return items;
});

const actividadesContabilizadas = computed(() =>
  actividadesActivas.value.filter((actividad: any) => procesoCuentaEnReportesYAtrasos(actividad))
);

const kpiResumen = computed(() => {
  let totalEtapas = 0;
  let completadas = 0;
  let conRetraso = 0;

  for (const actividad of actividadesContabilizadas.value) {
    totalEtapas += totalTareas(actividad);
    completadas += tareasCompletadas(actividad);
    conRetraso += tareasConRetraso(actividad);
  }

  const avance = totalEtapas > 0
    ? Math.round((completadas / totalEtapas) * 100)
    : 0;

  let avanceClass = 'avance-bajo';
  if (avance >= 70) avanceClass = 'avance-alto';
  else if (avance >= 40) avanceClass = 'avance-medio';

  return {
    totalEtapas,
    completadas,
    conRetraso,
    avance,
    avanceClass
  };
});

const totalEtapasBase = computed(() =>
  actividadesContabilizadasBase.value.reduce((total, actividad) => total + totalTareas(actividad), 0)
);

const porcentajeEtapasVisibles = computed(() =>
  totalEtapasBase.value > 0
    ? Math.min(100, Math.round((kpiResumen.value.totalEtapas / totalEtapasBase.value) * 100))
    : 0
);

const porcentajeCompletadas = computed(() =>
  kpiResumen.value.totalEtapas > 0
    ? Math.round((kpiResumen.value.completadas / kpiResumen.value.totalEtapas) * 100)
    : 0
);

const porcentajeConRetraso = computed(() =>
  kpiResumen.value.totalEtapas > 0
    ? Math.round((kpiResumen.value.conRetraso / kpiResumen.value.totalEtapas) * 100)
    : 0
);

const colorAvanceKpi = computed(() => {
  if (kpiResumen.value.avanceClass === 'avance-alto') return '#16a34a';
  if (kpiResumen.value.avanceClass === 'avance-medio') return '#d97706';
  return '#dc2626';
});

const actividadSeleccionada = ref<any | null>(null);
const etapasActividad = ref<any[]>([]);
const etapaSeguimiento = ref<any | null>(null);
const seguimientosEtapa = ref<any[]>([]);
const nuevoComentario = ref('');
const nuevoAlerta = ref(false);
const guardandoSeguimiento = ref(false);
const eliminandoSeguimientoId = ref<number | null>(null);
const guardandoEstadoEtapaId = ref<number | null>(null);
const guardandoRiesgoProceso = ref(false);
const cargandoSeguimientos = ref(false);
const cargandoConteosSeguimientos = ref(false);
const errorSeguimiento = ref('');
const errorRiesgoProceso = ref('');
const mensajeSeguimiento = ref<{ texto: string; tipo: 'success' | 'info' } | null>(null);
const mensajeRiesgoProceso = ref<{ texto: string; tipo: 'success' | 'info' } | null>(null);
const conteoSeguimientosPorEtapa = ref<Record<number, number>>({});
const alertasPorEtapa = ref<Record<number, boolean>>({});
const etapaResaltadaId = ref<number | null>(null);
const timelineContraida = ref(true);
const procesoEnRiesgo = ref(false);
const procesoDesierto = ref(false);
const mostrarPanelRiesgo = ref(false);
const comentarioRiesgoProceso = ref('');
const procesoEnRiesgoGuardado = ref(false);
const comentarioRiesgoGuardado = ref('');
const estadoProcesoGuardado = ref<0 | 1 | 2>(1);
const permiteEditarFechaCompletado = UI_FLAGS.ALLOW_MANUAL_COMPLETION_DATE;
const GUAYAQUIL_TIMEZONE = 'America/Guayaquil';
const LIMITE_COMENTARIO_SEGUIMIENTO = 500;
const LIMITE_COMENTARIO_RIESGO = 500;
const longitudComentarioSeguimiento = computed(() => nuevoComentario.value.length);
const caracteresRestantesSeguimiento = computed(() => LIMITE_COMENTARIO_SEGUIMIENTO - longitudComentarioSeguimiento.value);
const longitudComentarioRiesgo = computed(() => comentarioRiesgoProceso.value.length);
const caracteresRestantesRiesgo = computed(() => LIMITE_COMENTARIO_RIESGO - longitudComentarioRiesgo.value);
const puedeVerDetalleRiesgo = computed(() =>
  procesoEnRiesgoGuardado.value && Boolean(comentarioRiesgoGuardado.value.trim())
);

const puedeEliminarSeguimientos = computed(() =>
  auth.isAdmin || auth.can('actividades', 'delete') || auth.can('admin_actividades', 'delete')
);

const etapasConFecha = computed(() =>
  etapasActividad.value
    .filter((e: any) => e?.fechaPlanificada || e?.fechaTentativa)
    .sort((a: any, b: any) => {
      const fechaA = new Date(a.fechaPlanificada || a.fechaTentativa);
      const fechaB = new Date(b.fechaPlanificada || b.fechaTentativa);
      return fechaA.getTime() - fechaB.getTime();
    })
);

onMounted(async () => {
  window.addEventListener('keydown', manejarEscapeModales);
  try {
    actividades.value = await actividadesService.getAll();
    await procesarActividadDesdeRuta();
  } catch (error: any) {
    if (error?.response?.status === 403) {
      // Mostrar mensaje visual y no error de consola
      errorCargaActividades.value = 'No tienes permisos para ver procesos de otras direcciones. Solo puedes ver tus propios procesos.';
    } else {
      console.error('Error cargando actividades:', error);
      errorCargaActividades.value = 'Ocurrió un error al cargar los procesos.';
    }
  } finally {
    cargando.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarEscapeModales);
});

watch(
  () => [route.query.actividadId, route.query.etapaId],
  async () => {
    if (!cargando.value) {
      await procesarActividadDesdeRuta();
    }
  }
);

// Función auxiliar para validar formato de fecha
function esFormatoValido(fecha: any): boolean {
  if (!fecha) return true;
  if (typeof fecha !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

// Watcher para garantizar que las fechas en etapasActividad siempre sean strings en formato yyyy-MM-dd
watch(
  () => etapasActividad.value.length,
  () => {
    // Normalizar todas las fechas en todas las etapas solo cuando la longitud cambie
    etapasActividad.value.forEach((etapa: any) => {
      if (!esFormatoValido(etapa?.fechaTentativa)) {
        etapa.fechaTentativa = normalizarFechaInput(etapa?.fechaTentativa);
      }
      if (!esFormatoValido(etapa?.fechaReforma)) {
        etapa.fechaReforma = normalizarFechaInput(etapa?.fechaReforma);
      }
      if (!esFormatoValido(etapa?.fechaPlanificada)) {
        etapa.fechaPlanificada = normalizarFechaInput(etapa?.fechaPlanificada);
      }
      if (!esFormatoValido(etapa?.fechaReal)) {
        etapa.fechaReal = normalizarFechaInput(etapa?.fechaReal);
      }
    });
  }
);

function limpiarFiltrosActividades() {
  busquedaActividades.value = '';
  filtroDireccion.value = '';
  filtroPacNoPac.value = '';
  filtroTipoContratacion.value = '';
  filtroCuatrimestre.value = '';
  filtroMonto.value = '';
  filtroRiesgo.value = '';
  ordenPresupuesto.value = 'todos';
}

function obtenerDireccion(actividad: any) {
  return actividad?.direccion?.nombre
    || actividad?.direccionNombre
    || actividad?.direccion_encargada
    || actividad?.direccionEncargada
    || 'N/A';
}

function obtenerResponsable(actividad: any) {
  return actividad?.responsableDirectivo
    || actividad?.responsable_directivo
    || actividad?.responsableNombre
    || actividad?.responsable?.nombre
    || actividad?.responsable
    || 'N/A';
}

function obtenerPresupuesto(actividad: any) {
  const valor = Number(
    actividad?.presupuesto
    ?? actividad?.presupuesto2026Inicial
    ?? actividad?.presupuesto_2026_inicial
    ?? 0
  );
  return Number.isFinite(valor) ? valor : 0;
}

function obtenerTipoContratacionCabecera(actividad: any) {
  const valor = String(
    actividad?.procedimientoSugerido
    ?? actividad?.procedimiento_sugerido
    ?? actividad?.tipoContratacion
    ?? actividad?.tipo_contratacion
    ?? actividad?.procedimiento
    ?? ''
  ).trim();

  return valor || 'Contratación sugerida no definida';
}

function obtenerPacNoPacCabecera(actividad: any) {
  const valor = String(
    actividad?.pacNoPac
    ?? actividad?.pac_no_pac
    ?? actividad?.tipoPlan
    ?? ''
  ).trim();

  return valor || 'PAC/No PAC no definido';
}

function formatearMontoCabecera(valor: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(valor || 0));
}

function obtenerFechaHoyGuayaquil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: GUAYAQUIL_TIMEZONE }).format(new Date());
}

function parseFechaComparable(value: any) {
  if (!value) return null;

  const normalizada = normalizarFechaInput(value) || String(value).trim();
  const match = String(normalizada).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
  }

  const parsed = new Date(normalizada);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function manejarEscapeModales(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (etapaSeguimiento.value) {
    cerrarModalSeguimiento();
    return;
  }
  if (actividadSeleccionada.value) {
    cerrarDetalleActividad();
  }
}

function formatearFecha(fecha: string | Date | undefined | null) {
  if (!fecha) return 'Sin fecha';
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [yyyy, mm, dd] = fecha.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yyyy = String(parsed.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function normalizarFechaInput(fecha?: string | null | Date) {
  if (!fecha) return null;
  
  // Si es un objeto Date, convertir a yyyy-MM-dd usando la fecha local de Guayaquil
  if (fecha instanceof Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: GUAYAQUIL_TIMEZONE }).format(fecha);
  }
  
  const fechaStr = String(fecha).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return fechaStr;
  }

  const soloFechaDesdeDateTime = fechaStr.match(/^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?$/);
  if (soloFechaDesdeDateTime?.[1]) {
    return soloFechaDesdeDateTime[1];
  }
  
  // Si es ISO format (contiene T), extraer la parte de fecha
  if (fechaStr.includes('T')) {
    const soloFecha = fechaStr.split('T')[0] || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(soloFecha) ? soloFecha : null;
  }
  
  // Intentar parseo general (GMT, RFC, etc.)
  try {
    const parsed = new Date(fechaStr);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: GUAYAQUIL_TIMEZONE }).format(parsed);
    }
  } catch {
    return null;
  }

  return null;
}

function estadoNormalizado(estado?: string | null) {
  return (estado || 'pendiente').toLowerCase();
}

function getEtapas(actividad: any) {
  const etapas = actividad?.etapas || actividad?.seguimientoEtapas || [];
  return etapas.map((etapa: any) => ({
    ...etapa,
    fechaTentativa: normalizarFechaInput(etapa?.fechaTentativa),
    fechaReforma: normalizarFechaInput(etapa?.fechaReforma),
    fechaPlanificada: normalizarFechaInput(etapa?.fechaPlanificada),
    fechaReal: normalizarFechaInput(etapa?.fechaReal),
    estado: estadoNormalizado(etapa?.estado) === 'completado' ? 'completado' : 'pendiente'
  }));
}

function fusionarEtapasPreservandoFechas(actuales: any[], recargadas: any[]) {
  const actualesNormalizadas = getEtapas({ etapas: actuales || [] });
  const recargadasNormalizadas = getEtapas({ etapas: recargadas || [] });
  const actualesPorId = new Map(
    actualesNormalizadas
      .map((etapa: any) => [obtenerEtapaId(etapa), etapa] as [number | null, any])
      .filter((item: [number | null, any]) => Boolean(item[0]))
  );

  return recargadasNormalizadas.map((etapa: any) => {
    const etapaId = obtenerEtapaId(etapa);
    const etapaActual: any = etapaId ? actualesPorId.get(etapaId) : null;
    if (!etapaActual) return etapa;

    return {
      ...etapa,
      fechaTentativa: etapa.fechaTentativa || etapa.fechaPlanificada || etapaActual.fechaTentativa || etapaActual.fechaPlanificada || null,
      fechaReforma: etapa.fechaReforma || etapaActual.fechaReforma || null,
      fechaPlanificada: etapa.fechaPlanificada || etapa.fechaTentativa || etapaActual.fechaPlanificada || etapaActual.fechaTentativa || null,
      fechaReal: etapa.fechaReal || etapaActual.fechaReal || null
    };
  });
}

function getEtapasConFecha(actividad: any) {
  return getEtapas(actividad).filter((e: any) => e?.fechaPlanificada || e?.fechaTentativa);
}

function periodoActividad(actividad: any) {
  const fechas = getEtapasConFecha(actividad)
    .map((etapa: any) => etapa?.fechaPlanificada || etapa?.fechaTentativa)
    .filter((fecha: any) => Boolean(fecha))
    .map((fecha: string) => new Date(fecha))
    .filter((fecha: Date) => !Number.isNaN(fecha.getTime()));

  if (!fechas.length) {
    return {
      desde: actividad?.fechaInicio || null,
      hasta: actividad?.fechaFin || null
    };
  }

  const minima = new Date(Math.min(...fechas.map((fecha: Date) => fecha.getTime())));
  const maxima = new Date(Math.max(...fechas.map((fecha: Date) => fecha.getTime())));

  return {
    desde: minima.toISOString(),
    hasta: maxima.toISOString()
  };
}

function obtenerFechaFinOrden(actividad: any) {
  const fechaHasta = periodoActividad(actividad).hasta;
  const timestamp = fechaHasta ? new Date(fechaHasta).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function obtenerCuatrimestreOrden(actividad: any) {
  const valor = Number(actividad?.cuatrimestre ?? actividad?.cuatrimestreNombre ?? 999);
  return Number.isFinite(valor) ? valor : 999;
}

function obtenerCuatrimestreTexto(actividad: any) {
  const cuatrimestre = obtenerCuatrimestreOrden(actividad);
  if (cuatrimestre >= 1 && cuatrimestre <= 4) {
    return String(cuatrimestre);
  }
  return 'Sin dato';
}

function obtenerEstadoProcesoValor(actividad: any): 0 | 1 | 2 {
  const valor = actividad?.activo;
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

function procesoActivoSinPresupuesto(actividad: any) {
  return obtenerEstadoProcesoValor(actividad) === 1 && obtenerPresupuesto(actividad) <= 0;
}

function procesoCuentaEnReportesYAtrasos(actividad: any) {
  return obtenerEstadoProcesoValor(actividad) !== 0 && !procesoActivoSinPresupuesto(actividad);
}

function esProcesoVisible(actividad: any) {
  return obtenerEstadoProcesoValor(actividad) !== 0;
}

function normalizarProcesoEnRiesgo(actividad: any) {
  const valor = actividad?.procesoEnRiesgo ?? actividad?.proceso_en_riesgo ?? false;
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  return String(valor).toLowerCase() === 'true';
}

function obtenerComentarioRiesgo(actividad: any) {
  return String(actividad?.riesgoComentario ?? actividad?.riesgo_comentario ?? '').trim();
}

function totalTareas(actividad: any) {
  return getEtapasConFecha(actividad).length;
}

function esEtapaAtrasada(etapa: any, actividad?: any) {
  if (actividad && !procesoCuentaEnReportesYAtrasos(actividad)) return false;

  const estado = estadoNormalizado(etapa?.estado);
  if (estado === 'completado') return false;

  const fechaObj = parseFechaComparable(etapa?.fechaPlanificada || etapa?.fechaTentativa);
  const hoy = parseFechaComparable(obtenerFechaHoyGuayaquil());
  if (!fechaObj || !hoy) return false;

  return fechaObj < hoy;
}

function diasRetraso(etapa: any, actividad?: any) {
  if (actividad && !procesoCuentaEnReportesYAtrasos(actividad)) return 0;

  const fechaObj = parseFechaComparable(etapa?.fechaPlanificada || etapa?.fechaTentativa);
  const hoy = parseFechaComparable(obtenerFechaHoyGuayaquil());
  if (!fechaObj || !hoy) return 0;

  return Math.max(0, Math.floor((hoy.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24)));
}

function diasRetrasoCompletado(etapa: any, actividad?: any) {
  if (actividad && !procesoCuentaEnReportesYAtrasos(actividad)) return 0;

  const fechaTentativaObj = parseFechaComparable(etapa?.fechaPlanificada || etapa?.fechaTentativa);
  const fechaRealObj = parseFechaComparable(etapa?.fechaReal);
  if (!fechaTentativaObj || !fechaRealObj) return 0;

  return Math.max(0, Math.floor((fechaRealObj.getTime() - fechaTentativaObj.getTime()) / (1000 * 60 * 60 * 24)));
}

function etapaCompletadaATiempo(etapa: any, actividad?: any) {
  return diasRetrasoCompletado(etapa, actividad) === 0;
}

function tareasCompletadas(actividad: any) {
  return getEtapasConFecha(actividad).filter((etapa: any) => estadoNormalizado(etapa.estado) === 'completado').length;
}

function tareasConRetraso(actividad: any) {
  if (!procesoCuentaEnReportesYAtrasos(actividad)) return 0;
  return getEtapasConFecha(actividad).filter((etapa: any) => esEtapaAtrasada(etapa, actividad) || estadoNormalizado(etapa.estado) === 'en_retraso').length;
}

function porcentajeAvance(actividad: any) {
  const total = totalTareas(actividad);
  if (total === 0) return 0;
  return Math.round((tareasCompletadas(actividad) / total) * 100);
}

function claseAvance(actividad: any) {
  return tareasConRetraso(actividad) > 0 ? 'avance-bajo' : 'avance-alto';
}

function colorAvanceActividad(actividad: any) {
  return claseAvance(actividad) === 'avance-alto' ? '#16a34a' : '#dc2626';
}

function estadoVisual(etapa: any) {
  if (esEtapaAtrasada(etapa, actividadSeleccionada.value)) return 'en_retraso';
  return estadoNormalizado(etapa.estado);
}

function claseEstadoSemaforo(etapa: any) {
  const estado = estadoNormalizado(etapa?.estado);
  if (estado === 'completado') return 'estado-semaforo-verde';
  return 'estado-semaforo-amarillo';
}

function textoLeyendaTimeline(etapa: any) {
  if (estadoNormalizado(etapa?.estado) === 'completado') {
    return 'Completado';
  }
  return `Pendiente hasta ${formatearFecha(etapa?.fechaPlanificada || etapa?.fechaTentativa)}`;
}

function badgeLeyendaTimeline(etapa: any) {
  if (estadoNormalizado(etapa?.estado) === 'completado') {
    const diasTarde = diasRetrasoCompletado(etapa, actividadSeleccionada.value);
    return diasTarde > 0 ? `${diasTarde}D` : '✓';
  }
  const diasTarde = diasRetraso(etapa, actividadSeleccionada.value);
  return diasTarde > 0 ? `${diasTarde}D` : '';
}

function claseBadgeLeyendaTimeline(etapa: any) {
  if (estadoNormalizado(etapa?.estado) === 'completado' && diasRetrasoCompletado(etapa, actividadSeleccionada.value) === 0) {
    return 'ok';
  }
  return 'late';
}

function formatearFechaConHora(fechaISO: string | undefined | null): string {
  if (!fechaISO) return 'Sin fecha';
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: GUAYAQUIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(fecha);
}

function limpiarQueryActividad() {
  if (!route.query.actividadId) return;
  const query = { ...route.query };
  delete query.actividadId;
  delete query.etapaId;
  router.replace({ query });
}

function limpiarQueryEtapa() {
  if (!route.query.etapaId) return;
  const query = { ...route.query };
  delete query.etapaId;
  router.replace({ query });
}

function buscarActividadPorId(id: number) {
  return actividades.value.find((actividad: any) => Number(actividad?.id) === id) || null;
}

function sincronizarActividadEnListado(actividadId: number, etapasActualizadas: any[]) {
  const index = actividades.value.findIndex((actividad: any) => Number(actividad?.id) === actividadId);
  if (index < 0) return;

  const actividadActual = actividades.value[index] || {};
  actividades.value[index] = {
    ...actividadActual,
    etapas: [...etapasActualizadas],
    seguimientoEtapas: [...etapasActualizadas]
  };
}

function sincronizarRiesgoActividadEnListado(actividadId: number, riesgo: { procesoEnRiesgo: boolean; riesgoComentario: string | null }) {
  const index = actividades.value.findIndex((actividad: any) => Number(actividad?.id) === actividadId);
  if (index < 0) return;

  actividades.value[index] = {
    ...actividades.value[index],
    procesoEnRiesgo: riesgo.procesoEnRiesgo,
    riesgoComentario: riesgo.riesgoComentario
  };
}

function sincronizarEstadoActividadEnListado(actividadId: number, activo: 0 | 1 | 2) {
  const index = actividades.value.findIndex((actividad: any) => Number(actividad?.id) === actividadId);
  if (index < 0) return;

  actividades.value[index] = {
    ...actividades.value[index],
    activo
  };
}

function cargarEstadoRiesgoProceso(actividad: any) {
  const activo = normalizarProcesoEnRiesgo(actividad);
  const comentario = obtenerComentarioRiesgo(actividad);
  const estadoProceso = obtenerEstadoProcesoValor(actividad);
  procesoEnRiesgo.value = activo;
  procesoDesierto.value = estadoProceso === 2;
  estadoProcesoGuardado.value = estadoProceso;
  mostrarPanelRiesgo.value = false;
  comentarioRiesgoProceso.value = comentario;
  procesoEnRiesgoGuardado.value = activo;
  comentarioRiesgoGuardado.value = comentario;
  errorRiesgoProceso.value = '';
  mensajeRiesgoProceso.value = null;
}

async function procesarActividadDesdeRuta() {
  const id = Number(route.query.actividadId);
  if (!Number.isFinite(id) || id <= 0) return;

  const actividadYaSeleccionada = Number(actividadSeleccionada.value?.id) === id;
  const actividad = actividadYaSeleccionada
    ? actividadSeleccionada.value
    : buscarActividadPorId(id);

  if (actividad) {
    if (!actividadYaSeleccionada) {
      await abrirDetalleActividad(actividad, false);
    }

    const etapaId = Number(route.query.etapaId);
    if (Number.isFinite(etapaId) && etapaId > 0) {
      etapaResaltadaId.value = etapaId;
      const etapaObjetivo = etapasActividad.value.find((etapa: any) => obtenerEtapaId(etapa) === etapaId);
      const etapaSeguimientoActualId = obtenerEtapaId(etapaSeguimiento.value);
      if (etapaObjetivo && etapaSeguimientoActualId !== etapaId) {
        await seleccionarEtapaSeguimiento(etapaObjetivo, false);
      }
    }
  }
}

function esEtapaResaltada(etapa: any) {
  return etapaResaltadaId.value !== null && obtenerEtapaId(etapa) === etapaResaltadaId.value;
}

function cerrarDetalleActividad() {
  actividadSeleccionada.value = null;
  etapasActividad.value = [];
  timelineContraida.value = true;
  etapaSeguimiento.value = null;
  seguimientosEtapa.value = [];
  conteoSeguimientosPorEtapa.value = {};
  alertasPorEtapa.value = {};
  cargandoSeguimientos.value = false;
  errorSeguimiento.value = '';
  nuevoComentario.value = '';
  nuevoAlerta.value = false;
  etapaResaltadaId.value = null;
  procesoEnRiesgo.value = false;
  procesoDesierto.value = false;
  mostrarPanelRiesgo.value = false;
  comentarioRiesgoProceso.value = '';
  procesoEnRiesgoGuardado.value = false;
  comentarioRiesgoGuardado.value = '';
  estadoProcesoGuardado.value = 1;
  guardandoRiesgoProceso.value = false;
  errorRiesgoProceso.value = '';
  mensajeRiesgoProceso.value = null;
  limpiarQueryActividad();
}

async function abrirDetalleActividad(actividad: any, actualizarRuta = true) {
  if (!actividad) return;
  const actividadId = Number(actividad.id);

  actividadSeleccionada.value = actividad;
  etapasActividad.value = getEtapas(actividad);
  timelineContraida.value = true;
  etapaSeguimiento.value = null;
  seguimientosEtapa.value = [];
  conteoSeguimientosPorEtapa.value = {};
  alertasPorEtapa.value = {};
  cargandoSeguimientos.value = false;
  errorSeguimiento.value = '';
  cargarEstadoRiesgoProceso(actividad);

  if (actualizarRuta) {
    try {
      await router.replace({
        query: {
          ...route.query,
          actividadId: String(actividad.id)
        }
      });
    } catch (error) {
      console.error('Error al actualizar ruta de actividad:', error);
    }
  }

  try {
    const response = await api.get(`/subtareas/${actividad.id}/etapas`);
    const etapasRecargadas = Array.isArray(response.data)
      ? response.data
      : (response.data?.value || []);

    etapasActividad.value = fusionarEtapasPreservandoFechas(etapasActividad.value, etapasRecargadas);
    sincronizarActividadEnListado(actividadId, etapasActividad.value);
    if (Number(actividadSeleccionada.value?.id) === actividadId) {
      actividadSeleccionada.value = {
        ...actividadSeleccionada.value,
        etapas: [...etapasActividad.value],
        seguimientoEtapas: [...etapasActividad.value]
      };
    }
  } catch (error) {
    console.error('Error al recargar etapas de la actividad:', error);
  }

  try {
    await cargarConteosSeguimientosEtapas();
  } catch (error) {
    console.error('Error al cargar conteos de seguimientos:', error);
  }
}

function cerrarModalSeguimiento() {
  etapaSeguimiento.value = null;
  seguimientosEtapa.value = [];
  nuevoComentario.value = '';
  nuevoAlerta.value = false;
  cargandoSeguimientos.value = false;
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;
  etapaResaltadaId.value = null;
  limpiarQueryEtapa();
}

function obtenerEtapaId(etapa: any): number | null {
  const id = Number(etapa?.etapaId ?? etapa?.etapa_id ?? etapa?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function mostrarCargaSeguimiento(etapa: any): boolean {
  if (!cargandoConteosSeguimientos.value) return false;
  const etapaId = obtenerEtapaId(etapa);
  if (!etapaId) return false;
  return !conteoSeguimientosPorEtapa.value[etapaId] && !alertasPorEtapa.value[etapaId];
}

function aplicarSeguimientosEtapa(etapaId: number, payload: any) {
  const items = normalizarSeguimientos(payload);
  seguimientosEtapa.value = items;
  conteoSeguimientosPorEtapa.value = {
    ...conteoSeguimientosPorEtapa.value,
    [etapaId]: items.length
  };
  alertasPorEtapa.value = {
    ...alertasPorEtapa.value,
    [etapaId]: items.some((item: any) => Boolean(item?.tieneAlerta))
  };
  return items;
}

function construirPayloadEtapas() {
  const payload = etapasActividad.value.map((etapa: any) => {
    const fechaTentativa = normalizarFechaInput(etapa?.fechaTentativa) || normalizarFechaInput(etapa?.fechaPlanificada);
    const fechaReal = estadoNormalizado(etapa?.estado) === 'completado' ? normalizarFechaInput(etapa?.fechaReal) : null;
    
    // Debug: log para ver qué está pasando
    if (etapa?.fechaTentativa && !fechaTentativa?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      console.warn(`[construirPayloadEtapas] fechaTentativa no normalizada: ${etapa?.fechaTentativa} -> ${fechaTentativa}`);
    }
    
    return {
      etapaId: obtenerEtapaId(etapa),
      aplica: Boolean(Number(etapa?.aplica ?? 1)),
      fechaTentativa: fechaTentativa || null,
      fechaReforma: normalizarFechaInput(etapa?.fechaReforma) || null,
      estado: etapa?.estado || 'pendiente',
      fechaReal: fechaReal || null,
      observaciones: etapa?.observaciones || ''
    };
  }).filter((etapa: any) => Boolean(etapa.etapaId));
  
  console.log('[construirPayloadEtapas] Payload final:', JSON.stringify(payload, null, 2));
  return payload;
}

function onEstadoEtapaChange(etapa: any) {
  etapa.estado = estadoNormalizado(etapa?.estado) === 'completado' ? 'completado' : 'pendiente';
  if (etapa.estado === 'completado' && !etapa?.fechaReal) {
    // Asignar fecha de hoy en formato yyyy-MM-dd
    etapa.fechaReal = obtenerFechaHoyGuayaquil();
  }
  // Si el estado vuelve a pendiente, borrar la fecha real
  if (etapa.estado === 'pendiente') {
    etapa.fechaReal = null;
  }
  guardarEstadoEtapa(etapa);
}

function onFechaCompletadoChange(etapa: any) {
  if (!permiteEditarFechaCompletado) return;
  if (estadoNormalizado(etapa?.estado) !== 'completado') return;
  guardarEstadoEtapa(etapa);
}

function onFechaReformaChange(etapa: any) {
  etapa.fechaReforma = normalizarFechaInput(etapa?.fechaReforma);
  guardarEstadoEtapa(etapa);
}

  function normalizarSeguimientos(payload: any): any[] {
    return Array.isArray(payload)
      ? payload
      : (payload?.seguimientos || payload || []);
  }

  function obtenerConteoSeguimientos(etapa: any): number {
    const etapaId = obtenerEtapaId(etapa);
    if (!etapaId) return 0;
    return conteoSeguimientosPorEtapa.value[etapaId] || 0;
  }

  function etapaTieneAlertas(etapa: any): boolean {
    const etapaId = obtenerEtapaId(etapa);
    if (!etapaId) return false;
    return Boolean(alertasPorEtapa.value[etapaId]);
  }

  function obtenerIndicadorSeguimiento(etapa: any): number {
    const conteo = obtenerConteoSeguimientos(etapa);
    if (conteo > 0) return conteo;
    return etapaTieneAlertas(etapa) ? 1 : 0;
  }

  async function cargarConteosSeguimientosEtapas() {
    if (!actividadSeleccionada.value?.id) return;
    cargandoConteosSeguimientos.value = true;

    const etapaIds = etapasActividad.value
      .map((etapa: any) => obtenerEtapaId(etapa))
      .filter((id: number | null): id is number => Boolean(id));

    const conteos: Record<number, number> = Object.fromEntries(etapaIds.map((id) => [id, 0]));
    const alertas: Record<number, boolean> = Object.fromEntries(etapaIds.map((id) => [id, false]));

    try {
      try {
        const response = await api.get(`/subtareas/${actividadSeleccionada.value.id}/seguimientos-resumen`, {
          params: { dias: 3650 }
        });
        const resumen = Array.isArray(response.data) ? response.data : [];
        for (const item of resumen) {
          const etapaId = Number(item?.etapaId ?? item?.etapa_id);
          if (!Number.isFinite(etapaId) || !etapaIds.includes(etapaId)) continue;
          conteos[etapaId] = Number(item?.total || 0);
          alertas[etapaId] = Boolean(item?.tieneAlerta ?? item?.tiene_alerta);
        }
      } catch {
        await Promise.all(
          etapaIds.map(async (etapaId: number) => {
            try {
              const response = await api.get(
                `/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos`,
                { params: { dias: 3650 } }
              );
              const items = normalizarSeguimientos(response.data);
              conteos[etapaId] = items.length;
              alertas[etapaId] = items.some((item: any) => Boolean(item?.tieneAlerta));
            } catch {
              conteos[etapaId] = 0;
              alertas[etapaId] = false;
            }
          })
        );
      }

      conteoSeguimientosPorEtapa.value = conteos;
      alertasPorEtapa.value = alertas;
    } finally {
      cargandoConteosSeguimientos.value = false;
    }
  }

async function guardarEstadoEtapa(etapa: any) {
  if (!actividadSeleccionada.value?.id) return;
  const filaId = Number(etapa?.id ?? etapa?.etapaId ?? 0);
  guardandoEstadoEtapaId.value = filaId || null;
  try {
    await api.put(`/subtareas/${actividadSeleccionada.value.id}/etapas`, {
      etapas: construirPayloadEtapas()
    });

    const recarga = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas`);
    const etapasRecargadas = Array.isArray(recarga.data)
      ? recarga.data
      : (recarga.data?.value || []);

    // Normalizar fechas al cargar desde el servidor
    etapasActividad.value = fusionarEtapasPreservandoFechas(etapasActividad.value, etapasRecargadas);
    const actividadId = Number(actividadSeleccionada.value?.id || 0);
    if (actividadId > 0) {
      sincronizarActividadEnListado(actividadId, etapasActividad.value);
    }
    actividadSeleccionada.value.etapas = [...etapasActividad.value];
    actividadSeleccionada.value.seguimientoEtapas = [...etapasActividad.value];
  } finally {
    guardandoEstadoEtapaId.value = null;
  }
}

async function seleccionarEtapaSeguimiento(etapa: any, actualizarRuta = true) {
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;
  nuevoComentario.value = '';
  nuevoAlerta.value = false;
  const etapaId = obtenerEtapaId(etapa);
  if (!actividadSeleccionada.value?.id || !etapaId) return;
  etapaResaltadaId.value = etapaId;
  if (actualizarRuta) {
    router.replace({
      query: {
        ...route.query,
        actividadId: String(actividadSeleccionada.value.id),
        etapaId: String(etapaId)
      }
    });
  }
  etapaSeguimiento.value = etapa;
  await cargarSeguimientosEtapa(etapaId);
}

async function cargarSeguimientosEtapa(etapaId: number) {
  if (!actividadSeleccionada.value?.id || !etapaId) return;
  cargandoSeguimientos.value = true;
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;
  try {
    const response = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos`, {
      params: { dias: 3650 }
    });
    const items = aplicarSeguimientosEtapa(etapaId, response.data);
    if (!items.length) {
      mensajeSeguimiento.value = { texto: 'No hay seguimiento registrado todavía para esta etapa.', tipo: 'info' };
    }
  } catch (error) {
    console.error('Error al cargar seguimientos:', error);
    errorSeguimiento.value = 'No se pudo cargar el historial de seguimiento';
    seguimientosEtapa.value = [];
  } finally {
    cargandoSeguimientos.value = false;
  }
}

async function guardarSeguimiento() {
  if (!actividadSeleccionada.value || !etapaSeguimiento.value) return;
  if (!nuevoComentario.value.trim()) return;
  if (nuevoComentario.value.length > LIMITE_COMENTARIO_SEGUIMIENTO) {
    errorSeguimiento.value = `La observación no puede superar ${LIMITE_COMENTARIO_SEGUIMIENTO} caracteres.`;
    return;
  }
  const etapaId = obtenerEtapaId(etapaSeguimiento.value);
  if (!etapaId) return;
  guardandoSeguimiento.value = true;
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;
  try {
    const response = await api.post(
      `/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos`,
      {
        comentario: nuevoComentario.value.trim(),
        tieneAlerta: nuevoAlerta.value,
        fecha: obtenerFechaHoyGuayaquil()
      }
    );
    nuevoComentario.value = '';
    nuevoAlerta.value = false;
    aplicarSeguimientosEtapa(etapaId, response.data);
    mensajeSeguimiento.value = { texto: 'Seguimiento guardado correctamente.', tipo: 'success' };
  } catch (error) {
    console.error('Error al guardar seguimiento:', error);
    errorSeguimiento.value = 'No se pudo guardar el seguimiento';
  } finally {
    guardandoSeguimiento.value = false;
  }
}

async function eliminarSeguimiento(item: any) {
  if (!puedeEliminarSeguimientos.value || !actividadSeleccionada.value || !etapaSeguimiento.value) return;
  const etapaId = obtenerEtapaId(etapaSeguimiento.value);
  const seguimientoId = Number(item?.id);
  if (!etapaId || !Number.isFinite(seguimientoId) || seguimientoId <= 0) return;
  if (!confirm('¿Eliminar este comentario de seguimiento?')) return;

  eliminandoSeguimientoId.value = seguimientoId;
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;
  try {
    const response = await api.delete(`/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos/${seguimientoId}`);
    aplicarSeguimientosEtapa(etapaId, response.data);
    mensajeSeguimiento.value = { texto: 'Comentario eliminado correctamente.', tipo: 'success' };
  } catch (error) {
    console.error('Error al eliminar seguimiento:', error);
    errorSeguimiento.value = 'No se pudo eliminar el comentario';
  } finally {
    eliminandoSeguimientoId.value = null;
  }
}

function abrirEditorRiesgo() {
  errorRiesgoProceso.value = '';
  mensajeRiesgoProceso.value = null;
  if (!procesoEnRiesgo.value) {
    procesoEnRiesgo.value = true;
  }
  if (!comentarioRiesgoProceso.value && comentarioRiesgoGuardado.value) {
    comentarioRiesgoProceso.value = comentarioRiesgoGuardado.value;
  }
  mostrarPanelRiesgo.value = true;
}

function toggleDetalleRiesgo() {
  if (!puedeVerDetalleRiesgo.value) return;
  if (mostrarPanelRiesgo.value) {
    mostrarPanelRiesgo.value = false;
    return;
  }
  comentarioRiesgoProceso.value = comentarioRiesgoGuardado.value;
  mostrarPanelRiesgo.value = true;
}

async function guardarEstadoProceso(activo: 0 | 1 | 2) {
  if (!actividadSeleccionada.value?.id) return;

  guardandoRiesgoProceso.value = true;
  errorRiesgoProceso.value = '';
  mensajeRiesgoProceso.value = null;

  try {
    const response = await api.put(`/subtareas/${actividadSeleccionada.value.id}`, { activo });
    const actividadActualizada = response.data || {};
    const estadoActualizado = obtenerEstadoProcesoValor({ activo: actividadActualizada?.activo ?? activo });

    procesoDesierto.value = estadoActualizado === 2;
    estadoProcesoGuardado.value = estadoActualizado;
    sincronizarEstadoActividadEnListado(Number(actividadSeleccionada.value.id), estadoActualizado);
    actividadSeleccionada.value = {
      ...actividadSeleccionada.value,
      activo: estadoActualizado
    };

    mensajeRiesgoProceso.value = {
      texto: estadoActualizado === 2
        ? 'Proceso marcado como desierto correctamente.'
        : estadoActualizado === 0
          ? 'Proceso marcado como inactivo.'
          : 'Proceso marcado como activo.',
      tipo: 'success'
    };
  } catch (error) {
    console.error('Error al actualizar estado del proceso:', error);
    procesoDesierto.value = estadoProcesoGuardado.value === 2;
    errorRiesgoProceso.value = 'No se pudo actualizar el estado del proceso';
  } finally {
    guardandoRiesgoProceso.value = false;
  }
}

async function guardarRiesgoProceso() {
  if (!actividadSeleccionada.value?.id) return;

  const comentario = comentarioRiesgoProceso.value.trim();
  if (procesoEnRiesgo.value && !comentario) {
    errorRiesgoProceso.value = 'Debes registrar un comentario para marcar el proceso en riesgo.';
    mensajeRiesgoProceso.value = null;
    return;
  }
  if (comentario.length > LIMITE_COMENTARIO_RIESGO) {
    errorRiesgoProceso.value = `El comentario no puede superar ${LIMITE_COMENTARIO_RIESGO} caracteres.`;
    mensajeRiesgoProceso.value = null;
    return;
  }

  guardandoRiesgoProceso.value = true;
  errorRiesgoProceso.value = '';
  mensajeRiesgoProceso.value = null;

  try {
    const response = await api.put(`/subtareas/${actividadSeleccionada.value.id}`, {
      procesoEnRiesgo: procesoEnRiesgo.value,
      riesgoComentario: procesoEnRiesgo.value ? comentario : null
    });

    const actividadActualizada = response.data || {};
    const riesgoActualizado = {
      procesoEnRiesgo: normalizarProcesoEnRiesgo(actividadActualizada) || procesoEnRiesgo.value,
      riesgoComentario: obtenerComentarioRiesgo(actividadActualizada) || (procesoEnRiesgo.value ? comentario : '')
    };

    procesoEnRiesgo.value = riesgoActualizado.procesoEnRiesgo;
    comentarioRiesgoProceso.value = riesgoActualizado.riesgoComentario;
    procesoEnRiesgoGuardado.value = riesgoActualizado.procesoEnRiesgo;
    comentarioRiesgoGuardado.value = riesgoActualizado.riesgoComentario;

    sincronizarRiesgoActividadEnListado(Number(actividadSeleccionada.value.id), {
      procesoEnRiesgo: riesgoActualizado.procesoEnRiesgo,
      riesgoComentario: riesgoActualizado.riesgoComentario || null
    });

    actividadSeleccionada.value = {
      ...actividadSeleccionada.value,
      procesoEnRiesgo: riesgoActualizado.procesoEnRiesgo,
      riesgoComentario: riesgoActualizado.riesgoComentario
    };

    mensajeRiesgoProceso.value = {
      texto: riesgoActualizado.procesoEnRiesgo
        ? 'Riesgo general guardado correctamente.'
        : 'El proceso ya no está marcado como riesgo.',
      tipo: 'success'
    };
    mostrarPanelRiesgo.value = false;
  } catch (error) {
    console.error('Error al guardar riesgo del proceso:', error);
    procesoEnRiesgo.value = procesoEnRiesgoGuardado.value;
    comentarioRiesgoProceso.value = comentarioRiesgoGuardado.value;
    errorRiesgoProceso.value = 'No se pudo guardar el riesgo general del proceso';
  } finally {
    guardandoRiesgoProceso.value = false;
  }
}

async function onToggleRiesgoProceso() {
  errorRiesgoProceso.value = '';
  mensajeRiesgoProceso.value = null;

  if (!procesoEnRiesgo.value) {
    mostrarPanelRiesgo.value = false;
    comentarioRiesgoProceso.value = '';
    await guardarRiesgoProceso();
    return;
  }

  if (!comentarioRiesgoProceso.value && comentarioRiesgoGuardado.value) {
    comentarioRiesgoProceso.value = comentarioRiesgoGuardado.value;
  }
  mostrarPanelRiesgo.value = true;
}

async function onToggleProcesoDesierto() {
  await guardarEstadoProceso(procesoDesierto.value ? 2 : 1);
}
</script>

<style scoped>
.actividades-view {
  padding: 0.35rem;
}

.actividades-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
  background: #fff;
  border: 1px solid #d9e2ea;
  border-radius: 14px;
  padding: 0.85rem 1rem;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.context-summary {
  position: sticky;
  top: 0.5rem;
  z-index: 40;
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: 14px;
  padding: 0.6rem 0.8rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.5rem;
  min-height: 1.5rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid #d9e2ea;
  background: #f8fafc;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 600;
}

.filter-chip.primary {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.filter-chip.direccion-active {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-color: #f59e0b;
  color: #92400e;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 0.35rem 0.85rem;
  box-shadow: 0 1px 4px rgba(245, 158, 11, 0.3);
}

.filter-chip.riesgo-active {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  border-color: #f87171;
  color: #991b1b;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 0.35rem 0.85rem;
  box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3);
}

.btn-clear-filter {
  margin-left: auto;
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  border: 1px solid #fca5a5;
  background: #fef2f2;
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-clear-filter:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.dashboard-toolbar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.buscador-container {
  position: relative;
  min-width: 260px;
  flex: 1;
}

.buscador-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: #94a3b8;
}

.dashboard-toolbar-filtros {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.combo-filtro {
  border: 1px solid #d9e2ea;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 0.38rem 0.7rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.combo-filtro:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  background: #ffffff;
}

.dashboard-toolbar-filtros .combo-filtro {
  border-color: #bfdbfe;
  color: #1e3a8a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.dashboard-toolbar-filtros .combo-filtro:hover {
  border-color: #93c5fd;
  background: linear-gradient(180deg, #ffffff, #eff6ff);
}
.dashboard-toolbar-filtros select.combo-filtro {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 1.8rem;
  background-image:
    linear-gradient(45deg, transparent 50%, #3b82f6 50%),
    linear-gradient(135deg, #3b82f6 50%, transparent 50%);
  background-position: calc(100% - 13px) calc(50% - 2px), calc(100% - 8px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  background-color: unset;
}

.dashboard-buscador-container .buscador-input.combo-filtro {
  background: linear-gradient(180deg, #ffffff, #eff6ff);
  border-color: #93c5fd;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(37, 99, 235, 0.08);
  padding-left: 2.2rem;
  padding-right: 0.9rem;
  width: 100%;
}
.dashboard-buscador-container .buscador-input.combo-filtro::placeholder {
  color: #64748b;
  font-weight: 600;
}

.kpis-lectura-rapida {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: 14px;
  padding: 0.8rem 0.9rem;
  min-height: 128px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.kpi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
}

.kpi-donut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.45rem;
}

.kpi-donut-row .kpi-value {
  margin: 0;
}

.kpi-foot {
  margin-top: 0.3rem;
  color: #64748b;
  font-size: 0.73rem;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-mini-donut,
.actividad-mini-donut {
  --value: 0%;
  --kpi-color: #64748b;
  --actividad-color: var(--kpi-color);
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: conic-gradient(var(--kpi-color, var(--actividad-color)) 0 var(--value), #e5e7eb var(--value) 100%);
}

.kpi-mini-donut::before,
.actividad-mini-donut::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.kpi-mini-donut span,
.actividad-mini-donut span {
  position: relative;
  z-index: 1;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f172a;
}

.actividad-mini-donut {
  --kpi-color: var(--actividad-color);
  width: 52px;
  height: 52px;
  margin: 0 auto;
}

.actividad-mini-donut::before {
  inset: 7px;
}

.stat-avance-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.kpi-label {
  margin: 0;
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.kpi-value {
  margin: 0.45rem 0 0;
  color: #020617;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
}

.kpi-icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
}

.kpi-icon svg {
  width: 1.28rem;
  height: 1.28rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.kpi-total {
  background: #ffffff;
  box-shadow: inset 4px 0 0 #64748b, 0 10px 28px rgba(15, 23, 42, 0.05);
}

.kpi-total .kpi-value {
  color: #0f172a;
}

.kpi-total .kpi-icon {
  color: #6b7280;
  background: #f1f5f9;
}

.kpi-completadas {
  background: #ffffff;
  box-shadow: inset 4px 0 0 #16a34a, 0 10px 28px rgba(15, 23, 42, 0.05);
}

.kpi-completadas .kpi-value {
  color: #166534;
}

.kpi-completadas .kpi-icon {
  color: #0b7a3d;
  background: #ecfdf3;
}

.kpi-retraso {
  background: #ffffff;
  box-shadow: inset 4px 0 0 #dc2626, 0 10px 28px rgba(15, 23, 42, 0.05);
}

.kpi-retraso .kpi-value {
  color: #7f1d1d;
}

.kpi-avance {
  background: #ffffff;
  box-shadow: inset 4px 0 0 #0f766e, 0 10px 28px rgba(15, 23, 42, 0.05);
}

.kpi-head-avance {
  align-items: center;
}

.kpi-value-avance {
  margin: 0;
  font-size: 2rem;
  color: #1f2937;
}

.kpi-progress-track {
  width: 100%;
  height: 0.5rem;
  margin-top: 0.8rem;
  border-radius: 999px;
  background: #d1d5db;
  overflow: hidden;
}

.kpi-progress-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.25s ease;
}

.kpi-progress-fill.avance-alto {
  background: #16a34a;
}

.kpi-progress-fill.avance-medio {
  background: #d97706;
}

.kpi-progress-fill.avance-bajo {
  background: #dc2626;
}

.cumplimiento-panel {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #fff;
  border: 1px solid #d9e2ea;
  border-radius: 14px;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.cumplimiento-dona-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
}

.cumplimiento-dona {
  width: 86px;
  height: 86px;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

.cumplimiento-dona-centro {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  display: grid;
  place-items: center;
  color: #1e3a8a;
  font-size: 0.95rem;
}

.cumplimiento-resumen h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: #1f2937;
}

.cumplimiento-resumen p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.filtro-select {
  min-width: 190px;
}

.actividades-header h1 {
  margin-bottom: 0;
  color: #1f2937;
}

.total-actividades {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #d9e2ea;
  border-radius: 20px;
  padding: 0.3rem 0.9rem;
  font-size: 0.9rem;
}

.total-actividades strong {
  font-size: 1rem;
}

h1 {
  margin-bottom: 2rem;
  color: #1f2937;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.btn-limpiar-filtros {
  margin-top: 0.8rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 8px;
  padding: 0.42rem 0.75rem;
  cursor: pointer;
}

.actividades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.actividad-card {
  background: white;
  border-radius: 14px;
  border: 1px solid #d9e2ea;
  padding: 1rem;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}

.actividad-card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.07);
}

.actividad-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.actividad-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
  flex: 1;
}

.actividad-tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #e0e7ff;
  color: #4338ca;
  white-space: nowrap;
}

.numero-badge {
  min-width: 2.5rem;
  text-align: center;
  background: #ecfdf3;
  color: #166534;
}

.actividad-info {
  margin-bottom: 1.5rem;
}

.actividad-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.85rem;
}

.actividad-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.24rem 0.62rem;
  border-radius: 999px;
  border: 1px solid #d9e2ea;
  background: #f8fafc;
  color: #334155;
  font-size: 0.71rem;
  font-weight: 700;
  line-height: 1.1;
}

.actividad-meta-chip.neutral {
  background: #f8fafc;
  color: #334155;
}

.actividad-meta-chip.success {
  background: #ecfdf3;
  border-color: #86efac;
  color: #166534;
}

.actividad-meta-chip.quarter {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.actividad-meta-chip.warning-budget {
  background: #fff7ed;
  border-color: #fdba74;
  color: #c2410c;
}

.actividad-info p {
  margin: 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.actividad-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat.retraso .stat-value {
  color: #dc2626;
}

.stat-value.avance-alto {
  color: #16a34a;
}

.stat-value.avance-medio {
  color: #d97706;
}

.stat-value.avance-bajo {
  color: #dc2626;
}

.progress-bar-container {
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #334155;
  transition: width 0.3s;
}

.progress-bar-fill.avance-alto {
  background: linear-gradient(90deg, #16a34a, #22c55e);
}

.progress-bar-fill.avance-medio {
  background: linear-gradient(90deg, #d97706, #f59e0b);
}

.progress-bar-fill.avance-bajo {
  background: linear-gradient(90deg, #dc2626, #ef4444);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-content {
  width: min(1160px, 97vw);
  max-height: 95vh;
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #d9e2ea;
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 5;
  background: #fff;
}

.modal-header-content {
  display: grid;
  gap: 0.55rem;
}

.modal-header-content h2 {
  margin: 0;
}

.seguimiento-contexto-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.seguimiento-contexto-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.26rem 0.68rem;
  border-radius: 999px;
  border: 1px solid #d9e2ea;
  background: #f8fafc;
  color: #334155;
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.1;
}

.seguimiento-contexto-chip.neutral {
  background: #f8fafc;
  color: #334155;
}

.seguimiento-contexto-chip.success {
  background: #ecfdf3;
  border-color: #86efac;
  color: #166534;
}

.seguimiento-contexto-chip.quarter {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.seguimiento-contexto-chip.amount {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.seguimiento-contexto-chip.budget-warning {
  background: #fff7ed;
  border-color: #fdba74;
  color: #c2410c;
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 1rem 1.2rem 1.2rem;
}

.modal-detalle-actividad {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 95vh;
}

.modal-detalle-actividad .modal-header h2,
.modal-seguimiento .modal-header h2 {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.3;
}

.modal-detalle-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  overflow: hidden;
}

.modal-detalle-body.timeline-expandida {
  overflow-y: auto;
  padding-right: 0.55rem;
}

.modal-detalle-body.timeline-expandida .tabla-etapas-wrap {
  flex: 0 0 auto;
}

.detalle-superior {
  flex: 0 0 auto;
}

.tabla-etapas-wrap {
  flex: 1 1 auto;
  min-height: 300px;
  max-height: 52vh;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
}

.resumen-detalle {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: #334155;
}

.detalle-resumen-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.riesgo-proceso-panel {
  border: 1px solid #fde68a;
  background: #fffbeb;
  border-radius: 12px;
  padding: 0.8rem;
  margin-bottom: 1rem;
}

.riesgo-proceso-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.riesgo-proceso-simple {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  color: #9a3412;
  white-space: nowrap;
  border: 1px solid #fcd34d;
  background: #fffbeb;
  border-radius: 999px;
  padding: 0.5rem 0.8rem;
}

.riesgo-proceso-simple.desierto {
  border-color: #fdba74;
  background: #fff7ed;
  color: #9a3412;
}

.riesgo-proceso-simple input {
  width: 1rem;
  height: 1rem;
  accent-color: #d97706;
}

.btn-riesgo-icon,
.btn-riesgo-detalle {
  border-radius: 999px;
  border: 1px solid #fcd34d;
  background: #fff7ed;
  color: #9a3412;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-riesgo-icon {
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.btn-riesgo-icon.active {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.btn-riesgo-detalle {
  padding: 0.5rem 0.8rem;
}

.btn-riesgo-icon:hover,
.btn-riesgo-detalle:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(217, 119, 6, 0.14);
}

.btn-riesgo-detalle:disabled,
.btn-riesgo-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.riesgo-proceso-body {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.riesgo-proceso-textarea {
  margin-bottom: 0;
  background: rgba(255, 255, 255, 0.92);
}

.riesgo-proceso-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.timeline {
  border: 1px solid #94a3b8;
  border-radius: 10px;
  padding: 0.8rem;
  margin-bottom: 1rem;
  box-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.08);
}

.timeline-final {
  margin-bottom: 0;
}

.timeline-contraida-box {
  border: 1px solid #bfdbfe;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 10px;
  padding: 0.85rem 0.95rem;
  color: #1e3a8a;
}

.timeline-contraida-titulo {
  font-size: 0.86rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.timeline-contraida-texto {
  font-size: 0.8rem;
  line-height: 1.4;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 0.55rem;
}

.timeline-header h4 {
  margin: 0;
  font-size: 0.92rem;
  color: #334155;
}

.btn-toggle-timeline {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #1d4ed8;
  border-radius: 8px;
  padding: 0.25rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.timeline-item {
  position: relative;
  padding-left: 1.5rem;
  padding-bottom: 0.8rem;
}

.timeline-item.destacado {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 0.55rem 0.7rem 0.8rem 1.8rem;
  margin-bottom: 0.35rem;
}

.timeline-node {
  position: absolute;
  left: 0;
  top: 0.2rem;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #9ca3af;
}

.timeline-node.completado {
  background: #16a34a;
}

.timeline-node.con_pendientes {
  background: #f59e0b;
}

.timeline-node.en_retraso {
  background: #dc2626;
}

.timeline-line {
  position: absolute;
  left: 4px;
  top: 0.85rem;
  width: 2px;
  height: calc(100% - 0.3rem);
  background: #cbd5e1;
}

.timeline-title {
  font-weight: 600;
}

.timeline-date {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  font-size: 0.82rem;
  color: #64748b;
}

.timeline-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.55rem;
  height: 1.35rem;
  padding: 0 0.38rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.timeline-badge.ok {
  color: #166534;
  background: #dcfce7;
  border: 1px solid #86efac;
}

.timeline-badge.late {
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fca5a5;
}

.tabla-etapas {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0;
  border: none;
  border-radius: 0;
  overflow: visible;
}

.tabla-etapas thead {
  background: #f8fafc;
}

.tabla-etapas thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8fafc;
}

.tabla-etapas th,
.tabla-etapas td {
  padding: 0.6rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}

.fila-etapa-destacada {
  background: #eff6ff;
}

.fila-etapa-destacada td {
  border-bottom-color: #bfdbfe;
}

.estado-editor {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.estado-select-detalle {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.3rem 0.45rem;
  font-size: 0.82rem;
}

.estado-select-detalle.estado-semaforo-verde {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
  font-weight: 700;
}

.estado-select-detalle.estado-semaforo-amarillo {
  background: #fef9c3;
  border-color: #facc15;
  color: #854d0e;
  font-weight: 700;
}

.estado-select-detalle.estado-semaforo-rojo {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #991b1b;
  font-weight: 700;
}

.estado-saving {
  font-size: 0.75rem;
  color: #0f766e;
  font-weight: 600;
}

.fecha-real-editor {
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.fecha-real-editor label {
  font-size: 0.75rem;
  color: #475569;
  font-weight: 600;
}

.retraso-chip {
  color: #b91c1c;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  text-shadow: none;
  box-shadow: none;
}

.cumplimiento-chip {
  border-radius: 0;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 700;
  border: none;
  background: transparent;
  white-space: nowrap;
  text-shadow: none;
  box-shadow: none;
}

.cumplimiento-chip.a-tiempo {
  color: #166534;
}

.cumplimiento-chip.con-retraso {
  color: #b91c1c;
}

.btn-seguimiento,
.btn-guardar {
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  font-weight: 600;
}

.seguimiento-alerta-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.2rem;
  font-size: 0.9rem;
  line-height: 1;
}

.seguimiento-loading-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.55);
  animation: seguimientoPulse 1s ease-in-out infinite;
}

.btn-seguimiento {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-seguimiento-icono {
  width: 2.05rem;
  height: 2.05rem;
  border-radius: 999px;
  justify-content: center;
  position: relative;
  padding: 0;
  background: #ffffff;
  border-color: #cbd5e1;
  color: #64748b;
  box-shadow: none;
}

.btn-seguimiento-icono:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  color: #334155;
}

.icono-mensaje {
  width: 1.1rem;
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  text-shadow: none;
}

.seguimiento-badge {
  position: absolute;
  top: -0.3rem;
  right: -0.4rem;
  min-width: 1.3rem;
  height: 1.3rem;
  padding: 0 0.28rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #dc2626;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  border: 2px solid #ffffff;
}

.btn-guardar:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.seguimiento-panel {
  border: 1px solid #d9e2ea;
  background: #ffffff;
  border-radius: 10px;
  padding: 0.8rem;
}

.textarea-comentario {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem;
  margin-bottom: 0.5rem;
  resize: vertical;
}

.contador-caracteres {
  margin: -0.2rem 0 0.5rem;
  font-size: 0.74rem;
  color: #64748b;
}

.contador-caracteres.aviso {
  color: #b45309;
}

.contador-caracteres.limite {
  color: #b91c1c;
  font-weight: 700;
}

.alerta-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
  color: #334155;
}

.seguimientos-historial {
  margin-top: 0.8rem;
}

.modal-seguimiento-overlay {
  z-index: 60;
}

.modal-seguimiento {
  width: min(760px, 96vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #d9e2ea;
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18);
}

.modal-seguimiento .modal-header {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #ffffff;
}

.modal-seguimiento .modal-header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.02rem;
}

.modal-seguimiento .modal-body {
  background: #f8fafc;
  overflow: auto;
}

.seguimientos-historial {
  margin-top: 0.9rem;
  border: 1px solid #d9e2ea;
  border-radius: 10px;
  background: #ffffff;
  padding: 0.65rem;
}

.etapa-numero-badge {
  display: inline-flex;
  width: 1.4rem;
  height: 1.4rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-size: 0.72rem;
  font-weight: 700;
}

.seguimiento-estado {
  font-size: 0.82rem;
  color: #475569;
  margin-bottom: 0.5rem;
}

.seguimiento-error {
  font-size: 0.82rem;
  color: #b91c1c;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.seguimiento-msg {
  border-radius: 8px;
  font-size: 0.82rem;
  padding: 0.55rem 0.65rem;
  margin-bottom: 0.55rem;
  border: 1px solid transparent;
}

.seguimiento-msg-success {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.seguimiento-msg-info {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.seguimiento-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  margin-top: 0.35rem;
  background: #fff;
}

.seguimiento-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.seguimiento-meta {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.btn-eliminar-seguimiento {
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
  border-radius: 7px;
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-eliminar-seguimiento:disabled {
  opacity: 0.65;
  cursor: wait;
}

.seguimiento-alerta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.seguimiento-count {
  min-width: 1.2rem;
  height: 1.2rem;
  border-radius: 999px;
  background: #fde047;
  color: #854d0e;
  border: 1px solid #facc15;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
}

@keyframes seguimientoPulse {
  0% {
    transform: scale(0.9);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.45);
    opacity: 0.8;
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(255, 255, 255, 0);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    opacity: 0.8;
  }
}

@media (max-width: 720px) {
  .kpis-lectura-rapida {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }

  .cumplimiento-panel {
    align-items: flex-start;
  }

  .cumplimiento-dona-wrap {
    min-width: 80px;
  }

  .cumplimiento-dona {
    width: 74px;
    height: 74px;
  }

  .cumplimiento-dona-centro {
    width: 50px;
    height: 50px;
    font-size: 0.85rem;
  }
}

@media (max-width: 520px) {
  .kpis-lectura-rapida {
    grid-template-columns: 1fr;
  }

  .modal-header {
    gap: 0.75rem;
  }

  .detalle-resumen-row {
    flex-direction: column;
  }

  .seguimiento-contexto-header {
    gap: 0.35rem;
  }

  .seguimiento-contexto-chip {
    font-size: 0.7rem;
  }
}
</style>
