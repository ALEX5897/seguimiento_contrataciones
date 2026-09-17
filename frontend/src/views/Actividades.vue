<template>
  <div class="actividades-view">
    <div v-if="!cargando" class="resumen-general-container">
      <div class="resumen-general-header">
        <h3 class="resumen-general-titulo">Resumen General</h3>
        <button
          type="button"
          class="btn-toggle-resumen"
          @click="resumenGeneralExpanded = !resumenGeneralExpanded"
        >
          <span class="toggle-icon">{{ resumenGeneralExpanded ? '▼' : '▶' }}</span>
          <span class="toggle-text">{{ resumenGeneralExpanded ? 'Contraer' : 'Expandir' }}</span>
        </button>
      </div>
      <section v-if="resumenGeneralExpanded" class="kpi-grid professional-kpi-grid actividades-resumen-grid">
        <article class="kpi-card kpi-total-procesos">
          <div class="kpi-header">
            <i class="ri-checkbox-circle-line kpi-icon"></i>
            <span class="kpi-title">Total de procesos</span>
          </div>
          <div class="kpi-donut-row">
            <strong class="kpi-value">{{ kpisProcesos.totalProcesos }}</strong>
            <div class="kpi-mini-donut" :style="{ '--value': `${kpisProcesos.porcentajeCumplimiento}%`, '--kpi-color': colorCumplimiento }">
              <span :style="{ color: colorCumplimiento }">{{ kpisProcesos.porcentajeCumplimiento }}%</span>
            </div>
          </div>
          <small class="kpi-foot">Cumplimiento general</small>
        </article>

        <article class="kpi-card kpi-monto-total">
          <div class="kpi-header">
            <i class="ri-money-dollar-circle-line kpi-icon"></i>
            <span class="kpi-title">Monto Total</span>
          </div>
          <div class="kpi-value-monto">{{ formatearMontoCabecera(montoTotal) }}</div>
          <small class="kpi-foot">Presupuesto total asignado</small>
        </article>

        <article class="kpi-card kpi-monto-pac">
          <div class="kpi-header">
            <i class="ri-wallet-3-line kpi-icon"></i>
            <span class="kpi-title">Monto PAC</span>
          </div>
          <div class="kpi-value-monto">{{ formatearMontoCabecera(montoPAC) }}</div>
          <small class="kpi-foot">Presupuesto en Plan Anual</small>
        </article>

        <article class="kpi-card kpi-monto-nopac">
          <div class="kpi-header">
            <i class="ri-wallet-line kpi-icon"></i>
            <span class="kpi-title">Monto NO PAC</span>
          </div>
          <div class="kpi-value-monto">{{ formatearMontoCabecera(montoNoPAC) }}</div>
          <small class="kpi-foot">Presupuesto fuera de Plan</small>
        </article>

        <article class="kpi-card kpi-procesos-pac" :class="{ 'kpi-card-active': filtrosKpiActivos.includes('pac') }" @click="toggleFiltroKpi('pac')" style="cursor: pointer;">
          <div class="kpi-header">
            <i class="ri-book-check-line kpi-icon"></i>
            <span class="kpi-title">Procesos PAC</span>
          </div>
          <div class="kpi-value">{{ procesosPAC }}</div>
          <small class="kpi-foot">Procesos en Plan Anual</small>
        </article>

        <article class="kpi-card kpi-procesos-nopac" :class="{ 'kpi-card-active': filtrosKpiActivos.includes('noPac') }" @click="toggleFiltroKpi('noPac')" style="cursor: pointer;">
          <div class="kpi-header">
            <i class="ri-alert-circle-line kpi-icon"></i>
            <span class="kpi-title">Procesos NO PAC</span>
          </div>
          <div class="kpi-value">{{ procesosNoPAC }}</div>
          <small class="kpi-foot">Procesos fuera de Plan</small>
        </article>

        <article class="kpi-card kpi-procesos-completos" :class="{ 'kpi-card-active': filtrosKpiActivos.includes('completos') }" @click="toggleFiltroKpi('completos')" style="cursor: pointer;">
          <div class="kpi-header">
            <i class="ri-checkbox-multiple-line kpi-icon"></i>
            <span class="kpi-title">Procesos completos</span>
          </div>
          <div class="kpi-value">{{ kpisProcesos.actividadesCompletadas }}</div>
          <small class="kpi-foot">Procesos completos: {{ kpisProcesos.actividadesCompletadas }} de {{ kpisProcesos.totalProcesos }}</small>
        </article>

        <article class="kpi-card kpi-procesos-retrasadas" :class="{ 'kpi-card-active': filtrosKpiActivos.includes('retrasadas') }" @click="toggleFiltroKpi('retrasadas')" style="cursor: pointer;">
          <div class="kpi-header">
            <i class="ri-time-fill kpi-icon"></i>
            <span class="kpi-title">Procesos con etapas retrasadas</span>
          </div>
          <div class="kpi-value">{{ kpisProcesos.atrasadas }}</div>
          <small class="kpi-foot">Procesos que tienen etapas fuera de fecha</small>
        </article>

        <article class="kpi-card kpi-procesos-riesgo" :class="{ 'kpi-card-active': filtrosKpiActivos.includes('riesgo') }" @click="toggleFiltroKpi('riesgo')" style="cursor: pointer;">
          <div class="kpi-header">
            <i class="ri-error-warning-fill kpi-icon"></i>
            <span class="kpi-title">Procesos en riesgo</span>
          </div>
          <div class="kpi-value">{{ procesosRiesgoKpi.length }}</div>
          <small class="kpi-foot">Procesos marcados con riesgo</small>
        </article>

        <article class="kpi-card kpi-procesos-desierto" :class="{ 'kpi-card-active': filtrosKpiActivos.includes('desierto') }" @click="toggleFiltroKpi('desierto')" style="cursor: pointer;">
          <div class="kpi-header">
            <i class="ri-shield-line kpi-icon"></i>
            <span class="kpi-title">Procesos desiertos</span>
          </div>
          <div class="kpi-value">{{ procesosDesiertosKpi.length }}</div>
          <small class="kpi-foot">Procesos con estado desierto</small>
        </article>
      </section>
    </div>

    <section v-if="!cargando" class="context-summary">
      <div class="filter-chips">
        <button
          v-if="filtroDireccion"
          class="filter-chip direccion-active"
          @click="filtroDireccion = ''"
        >
          📍 {{ filtroDireccion }} ✕
        </button>
        <button
          v-if="filtroTipoContratacion"
          class="filter-chip"
          @click="filtroTipoContratacion = ''"
        >
          {{ filtroTipoContratacionLabel }} ✕
        </button>
        <button
          v-for="filtro in filtrosKpiActivos"
          :key="filtro"
          class="filter-chip"
          @click="toggleFiltroKpi(filtro)"
        >
          {{ filtro }} ✕
        </button>
      </div>

      <div class="dashboard-toolbar">
        <div class="buscador-container">
          <i class="ri-search-line buscador-icon"></i>
          <input
            v-model="busquedaActividades"
            type="text"
            class="buscador-input"
            placeholder="Buscar por nombre, responsable o dirección..."
          />
        </div>
        <select
          v-model="filtroDireccion"
          class="combo-filtro"
        >
          <option value="">Todas las direcciones</option>
          <option v-for="dir in direccionesDisponibles" :key="dir.value" :value="dir.value">
            {{ dir.label }}
          </option>
        </select>
        <select
          v-model="filtroTipoContratacion"
          class="combo-filtro"
        >
          <option value="">Todos los tipos</option>
          <option v-for="tipo in tiposContratacionDisponibles" :key="tipo.value" :value="tipo.value">
            {{ tipo.label }}
          </option>
        </select>
        <button
          v-if="hayFiltrosActivos"
          type="button"
          class="btn-clear-filter"
          @click="limpiarFiltrosActividades"
        >
          🗑️ Limpiar filtros
        </button>
      </div>
    </section>

    <div v-if="errorCargaActividades" class="error-actividades">
      <p>{{ errorCargaActividades }}</p>
    </div>
    <div v-else-if="cargando" class="loading">Cargando procesos...</div>
    <div v-else class="actividades-grupos">
      <section
        v-for="grupo in actividadesAgrupadasPorCuatrimestre"
        :key="grupo.key"
        class="cuatrimestre-grupo"
      >
        <div class="cuatrimestre-separador">{{ grupo.titulo }}</div>

        <div class="actividades-grid">
          <div
            v-for="grupoItem in grupo.items"
            :key="grupoItem.nombre"
            :class="[
              'actividad-card',
              {
                'actividad-card-riesgo': normalizarProcesoEnRiesgo(grupoItem.representante),
                'actividad-card-desierto': obtenerEstadoProcesoValor(grupoItem.representante) === 2,
                'actividad-card-agrupada': grupoItem.cantidad > 1
              }
            ]"
            @click.stop="abrirDetalleActividad(grupoItem.representante)"
          >
        <span
          v-if="obtenerMarcaAguaProceso(grupoItem.representante)"
          :class="['actividad-watermark', obtenerClaseMarcaAguaProceso(grupoItem.representante)]"
          aria-hidden="true"
        >
          {{ obtenerMarcaAguaProceso(grupoItem.representante) }}
        </span>

        <div class="actividad-header">
          <h2>{{ grupoItem.nombre }}</h2>
        </div>

        <div class="actividad-meta-chips">
          <span
            :class="['actividad-meta-chip', 'pac-nopac-badge', obtenerPacNoPacCabecera(grupoItem.representante).toUpperCase().includes('NO') ? 'no-pac-chip' : 'pac-chip']"
          >
            {{ obtenerPacNoPacCabecera(grupoItem.representante).toUpperCase().includes('NO') ? 'No PAC' : 'PAC' }}
          </span>
          <span class="actividad-meta-chip reforma">Reforma {{ grupoItem.representante.numeroReforma || grupoItem.representante.numero_reforma || '0' }}</span>
          <button v-if="grupoItem.cantidad > 1" class="actividad-meta-chip badge-agrupados" @click.stop="toggleGrupo(grupoItem.nombre)">
            {{ grupoItem.cantidad }} procesos
          </button>
          <span v-if="procesoActivoSinPresupuesto(grupoItem.representante)" class="actividad-meta-chip warning-budget">Sin presupuesto</span>
          <button
            v-if="grupoItem.representante.tieneMultiplesPartidas"
            type="button"
            class="actividad-meta-chip partidas-btn"
            @click.stop="togglePartidas(grupoItem.representante.id)"
          >
            📋 {{ grupoItem.representante.partidas?.length || 0 }} partidas
          </button>
        </div>

        <div class="actividad-info">
          <p><strong>Tipo de contrato:</strong> {{ obtenerTipoContratacionCabecera(grupoItem.representante) }}</p>
          <p><strong>Dirección:</strong> {{ obtenerDireccion(grupoItem.representante) }}</p>
          <p><strong>Responsable:</strong> {{ obtenerResponsable(grupoItem.representante) }}</p>
          <p><strong>Cuatrimestre:</strong> {{ obtenerCuatrimestreTexto(grupoItem.representante) }}</p>
          <p v-if="grupoItem.cantidad > 1">
            <strong>Presupuesto:</strong>
            ${{ grupoItem.presupuestoTotal.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </p>
          <p v-else>
            <strong>Presupuesto:</strong>
            ${{ obtenerPresupuesto(grupoItem.representante).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            <span class="actividad-presupuesto-porcentaje">({{ porcentajePresupuesto(grupoItem.representante).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}%)</span>
          </p>
          <p class="actividad-ultima-actualizacion"><small>🕐 Última actualización: {{ obtenerUltimaActualizacionTextoTarjeta(grupoItem.representante) }}</small></p>
        </div>

        <div v-if="grupoItem.representante.tieneMultiplesPartidas && expandidosPartidas.has(grupoItem.representante.id)" class="partidas-expandidas">
          <div class="partidas-header">
            <strong>Partidas incluidas en este contrato:</strong>
          </div>
          <div class="partidas-table">
            <div class="partida-fila partida-header-row">
              <div class="partida-col codigo">Código</div>
              <div class="partida-col monto">Monto</div>
              <div class="partida-col direccion">Dirección</div>
            </div>
            <div
              v-for="partida in grupoItem.representante.partidas"
              :key="partida.id"
              class="partida-fila"
            >
              <div class="partida-col codigo">{{ partida.codigoOlympo }}</div>
              <div class="partida-col monto">${{ partida.presupuesto.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
              <div class="partida-col direccion">{{ partida.direccion }}</div>
            </div>
          </div>
        </div>

        <!-- Sección de procesos agrupados expandidos -->
        <div v-if="grupoItem.cantidad > 1 && gruposExpandidos.has(grupoItem.nombre)" class="procesos-expandidos">
          <div class="procesos-expandidos-header">
            <strong>{{ grupoItem.cantidad }} procesos agrupados:</strong>
          </div>
          <div class="procesos-lista">
            <div
              v-for="proceso in grupoItem.procesos"
              :key="proceso.id"
              class="proceso-item"
              @click.stop="abrirDetalleActividad(proceso)"
            >
              <div class="proceso-header-info">
                <span class="proceso-id"><strong>ID:</strong> {{ proceso.id }}</span>
                <span class="proceso-codigo"><strong>Código:</strong> {{ proceso.codigoOlympo || 'N/A' }}</span>
              </div>
              <div class="proceso-details">
                <span class="proceso-direccion"><strong>Dirección:</strong> {{ obtenerDireccion(proceso) }}</span>
                <span class="proceso-presupuesto"><strong>Presupuesto:</strong> ${{ obtenerPresupuesto(proceso).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="actividad-stats">
          <div class="stats-row-izq">
            <div class="stat retraso">
              <div class="stat-value">{{ diasMaximoRetrasoActividad(grupoItem.representante) > 0 ? diasMaximoRetrasoActividad(grupoItem.representante) + ' d' : '—' }}</div>
              <div class="stat-label">Retraso</div>
            </div>
          </div>
          <div :class="['actividad-meta-chip', 'fase-chip', 'fase-' + obtenerEstadoActividad(grupoItem.representante).toLowerCase().replace(/ /g, '-')]">
            {{ obtenerEstadoActividad(grupoItem.representante) }}
          </div>
          <div class="stat stat-avance-visual">
            <div
              class="actividad-mini-donut"
              :style="{ '--value': `${porcentajeAvance(grupoItem.representante)}%`, '--actividad-color': colorAvanceActividad(grupoItem.representante) }"
            >
              <span>{{ porcentajeAvance(grupoItem.representante) }}%</span>
            </div>
            <div class="stat-label">Avance</div>
          </div>
        </div>

        <div class="progress-bar-container">
          <div
            class="progress-bar-fill"
            :class="claseAvance(grupoItem.representante)"
            :style="{ width: porcentajeAvance(grupoItem.representante) + '%' }"
          ></div>
        </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="!cargando && actividadesActivas.length === 0" class="empty-state">
      <p>No hay procesos para los filtros actuales</p>
      <button type="button" class="btn-limpiar-filtros" @click="limpiarFiltrosActividades">Limpiar filtros</button>
    </div>

    <div v-if="actividadSeleccionada" class="modal-overlay" @click.self="cerrarDetalleActividad">
      <div class="modal-content modal-detalle-actividad" @click.stop>
        <!-- ENCABEZADO -->
        <div class="modal-header">
          <div class="modal-header-content">
            <h2>{{ actividadSeleccionada.nombre }}</h2>
            <div class="ultima-actualizacion-info">
              <span class="ultima-actualizacion-label">Última actualización:</span>
              <span class="seguimiento-contexto-chip ultima-actualizacion">
                🕐 {{ fechaUltimaActualizacionFormato }}
              </span>
            </div>
          </div>
          <div class="modal-header-status">
            <div class="riesgo-proceso-tools-header">
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

              <button
                v-if="auth.isAdmin"
                type="button"
                class="btn-editar-etapas"
                @click="abrirEditorEtapas"
              >
                ✏️ Editar etapas
              </button>

              <template v-if="procesoEnRiesgo">
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
            <span v-if="estadoGuardado === 'guardando'" class="estado-badge guardando">
              ⏳ Guardando...
            </span>
            <span v-else-if="estadoGuardado === 'guardado'" class="estado-badge guardado">
              ✓ Guardado
            </span>
          </div>
          <button type="button" class="btn-close" @click="cerrarDetalleActividad">✕</button>
        </div>

        <!-- INFORMACIÓN -->
        <div class="modal-informacion">
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
            <span v-if="resumenCabeceraActividad" class="seguimiento-contexto-chip last-activity">
              {{ resumenCabeceraActividad.ultimaNombre }} · {{ resumenCabeceraActividad.ultimaFecha }}
            </span>
            <span class="seguimiento-contexto-chip codigo-olympo">
              📋 {{ actividadSeleccionada?.codigoOlympo || '—' }}
            </span>
            <span v-if="grupoActividadActual && grupoActividadActual.cantidad > 1" class="seguimiento-contexto-chip procesos-asociados">
              🔗 {{ grupoActividadActual.cantidad }} procesos
            </span>
          </div>
          <div class="avance-general-card">
            <div class="tarjeta-icono-avance">📊</div>
            <div class="tarjeta-info-avance">
              <div class="tarjeta-label-avance">Avance General</div>
              <div class="tarjeta-valor-avance">{{ porcentajeAvanceGeneral }}%</div>
            </div>
          </div>
        </div>

        <!-- CUERPO -->
        <div class="modal-body modal-detalle-body" :class="{ 'timeline-expandida': !timelineContraida }">
          <div class="detalle-superior">
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

          <!-- Tabla única con todas las etapas -->
          <div v-if="etapasActividad.length" class="etapas-tabla-container">
            <table class="tabla-etapas-unica">
              <thead>
                <tr>
                  <th>Fase</th>
                  <th>Etapa</th>
                  <th v-if="verFechaReforma">Fecha Planificada</th>
                  <th v-if="verFechaReforma3">Fecha reforma 3</th>
                  <th v-if="verFechaCompleto">Fecha de completo</th>
                  <th v-if="verEstadoEtapa">Estado</th>
                  <th>Retraso</th>
                  <th>Seguimiento</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(etapasDelGrupo, grupoKey) in etapasAgrupadas" :key="grupoKey">
                  <tr
                    v-for="etapa in etapasDelGrupo"
                    :key="etapa.id || etapa.etapaId"
                    :class="['fila-etapa', `fila-${obtenerClasificacionEtapa(etapa)}`, { 'fila-etapa-destacada': esEtapaResaltada(etapa) }]"
                  >
                    <td><span class="etapa-fase-badge" :class="`fase-${obtenerClasificacionEtapa(etapa)}`">{{ obtenerEtiquetaClasificacion(etapa) }}</span></td>
                  <td>{{ etapa.etapaNombre || etapa.nombre }}</td>
                  <td v-if="verFechaLimite">{{ formatearFecha(etapa.fechaTentativa) }}</td>
                  <td v-if="verFechaReforma">
                    <input
                      :value="etapa.fechaPlanificada || etapa.fechaTentativa"
                      @input="etapa.fechaPlanificada = ($event.target as HTMLInputElement).value"
                      type="date"
                      class="estado-select-detalle"
                      :disabled="Boolean(estadoGuardado) || !editarFechaReforma"
                      @change="onFechaReformaChange(etapa)"
                    />
                  </td>
                  <td v-if="verFechaReforma3">
                    <input
                      v-model="etapa.fechaReforma3"
                      type="date"
                      class="estado-select-detalle"
                      :disabled="Boolean(estadoGuardado) || !editarFechaReforma3"
                      @change="onFechaReforma3Change(etapa)"
                    />
                  </td>
                  <td v-if="verFechaCompleto">
                    <input
                      v-if="estadoNormalizado(etapa.estado) === 'completado' && permiteEditarFechaCompletado && editarFechaCompleto"
                      v-model="etapa.fechaReal"
                      type="date"
                      class="estado-select-detalle"
                      :disabled="Boolean(estadoGuardado)"
                      @change="onFechaCompletadoChange(etapa)"
                    />
                    <span v-else-if="estadoNormalizado(etapa.estado) === 'completado' && etapa.fechaReal">
                      {{ formatearFecha(etapa.fechaReal) }}
                    </span>
                    <span v-else>-</span>
                  </td>
                  <td v-if="verEstadoEtapa">
                    <div class="estado-editor">
                      <select
                        v-model="etapa.estado"
                        :class="['estado-select-detalle', claseEstadoSemaforo(etapa)]"
                        :disabled="Boolean(estadoGuardado) || !editarEstadoEtapa"
                        @change="onEstadoEtapaChange(etapa)"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="completado">Completo</option>
                      </select>
                      <span v-if="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)" class="estado-saving">Guardando...</span>
                    </div>
                  </td>
                  <td>
                    <span
                      v-if="estadoNormalizado(etapa.estado) === 'completado' && etapa.fechaReal && (etapa.fechaPlanificada || etapa.fechaTentativa)"
                      :class="['cumplimiento-chip', diasRetrasoCompletado(etapa) === 0 ? 'a-tiempo' : 'con-retraso']"
                    >
                      {{ diasRetrasoCompletado(etapa) === 0 ? '✅ A tiempo' : `⚠️ ${diasRetrasoCompletado(etapa)} días tarde` }}
                    </span>
                    <span v-else-if="esEtapaAtrasada(etapa, actividadSeleccionada)" class="retraso-chip">⏰ {{ diasRetraso(etapa, actividadSeleccionada) }} días atrasada</span>
                    <span v-else>-</span>
                  </td>
                  <td>
                    <div class="seguimiento-cell">
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
                          v-if="obtenerIndicadorSeguimiento(etapa) > 0"
                          :class="['seguimiento-badge', etapaTieneAlertas(etapa) ? 'is-alert' : 'is-amber']"
                          title="Esta etapa tiene observaciones o alertas"
                        >{{ obtenerIndicadorSeguimiento(etapa) > 99 ? '99+' : obtenerIndicadorSeguimiento(etapa) }}</span>
                      </button>
                      <small class="seguimiento-last-update">{{ obtenerUltimaActualizacionTexto(etapa) }}</small>
                    </div>
                  </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>

    <!-- MODAL DE EDICIÓN DE ETAPAS -->
    <div v-if="modoEditarEtapas && actividadSeleccionada" class="modal-overlay" @click.self="modoEditarEtapas = false">
      <div class="modal-content modal-editar-etapas" @click.stop>
        <div class="modal-header-tabs">
          <h2>✏️ Editar Etapas: {{ actividadSeleccionada.nombre }}</h2>
          <button type="button" class="btn-close-modal" @click="modoEditarEtapas = false">✕</button>
        </div>

        <div class="etapas-editor-toolbar">
          <div class="busqueda-etapas-editor">
            <span class="buscador-icon">🔎</span>
            <input
              v-model="busquedaEtapasEditor"
              type="text"
              class="input-busqueda-etapas-editor"
              placeholder="Buscar etapa..."
            />
            <button v-if="busquedaEtapasEditor" type="button" class="btn-clear-busqueda" @click="busquedaEtapasEditor = ''">✕</button>
          </div>

          <div class="acciones-etapas-editor">
            <button type="button" class="btn-toolbar-small" @click="habilitarMultiples" :disabled="etapasSeleccionadas.size === 0">
              ✅ Habilitar ({{ etapasSeleccionadas.size }})
            </button>
            <button type="button" class="btn-toolbar-small" @click="deshabilitarMultiples" :disabled="etapasSeleccionadas.size === 0">
              ❌ Deshabilitar ({{ etapasSeleccionadas.size }})
            </button>
            <button type="button" class="btn-toolbar-small" @click="abrirFormularioNuevaEtapa">
              ➕ Nueva Etapa
            </button>
          </div>
        </div>

        <div class="etapas-editor-container">
          <div v-if="etapasFiltradas.length === 0" class="sin-etapas-editor">
            <p v-if="etapasActividad.length === 0">No hay etapas para este proceso</p>
            <p v-else>No hay etapas que coincidan con la búsqueda</p>
          </div>

          <table v-else class="tabla-etapas-edicion">
            <thead>
              <tr>
                <th style="width: 5%;">
                  <input
                    type="checkbox"
                    @change="toggleTodosEtapasEditor"
                    :checked="etapasFiltradas.length > 0 && etapasFiltradas.every((e: any) => etapasSeleccionadas.has(e.id || e.etapaId))"
                    :indeterminate="etapasSeleccionadas.size > 0 && !etapasFiltradas.every((e: any) => etapasSeleccionadas.has(e.id || e.etapaId))"
                  />
                </th>
                <th style="width: 5%;">#</th>
                <th style="width: 35%;">Etapa</th>
                <th style="width: 30%;">Fecha Planificada</th>
                <th style="width: 25%;">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(etapa, idx) in etapasFiltradas" :key="etapa.id || etapa.etapaId" class="etapa-fila-edicion">
                <td class="etapa-checkbox-col">
                  <input
                    type="checkbox"
                    @change="toggleEtapaSeleccionada(etapa.id || etapa.etapaId)"
                    :checked="etapasSeleccionadas.has(etapa.id || etapa.etapaId)"
                  />
                </td>
                <td class="etapa-numero-col">{{ idx + 1 }}</td>
                <td class="etapa-nombre-col">{{ etapa.etapaNombre }}</td>
                <td class="etapa-fecha-col">
                  <input
                    v-model="etapa.fechaPlanificada"
                    type="date"
                    class="input-fecha-tabla"
                  />
                </td>
                <td class="etapa-estado-col">
                  <select v-model.number="etapa.aplica" class="select-aplica">
                    <option :value="1">Habilitado</option>
                    <option :value="0">Deshabilitado</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="botones-modal">
          <button type="button" class="btn-primary" @click="guardarEdicionEtapas">
            ✓ Guardar Cambios
          </button>
          <button type="button" class="btn-secondary" @click="modoEditarEtapas = false">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DE NUEVA ETAPA PERSONALIZADA -->
    <div v-if="mostrarFormularioNuevaEtapa && actividadSeleccionada" class="modal-overlay" @click.self="mostrarFormularioNuevaEtapa = false">
      <div class="modal-content modal-nueva-etapa" @click.stop>
        <div class="modal-header-tabs">
          <h2>➕ Nueva Etapa Personalizada: {{ actividadSeleccionada.nombre }}</h2>
          <button type="button" class="btn-close-modal" @click="mostrarFormularioNuevaEtapa = false">✕</button>
        </div>

        <div class="formulario-nueva-etapa">
          <div class="form-grupo">
            <label for="nombreNuevaEtapa">Nombre de la Etapa *</label>
            <input
              id="nombreNuevaEtapa"
              v-model="nuevaEtapa.nombre"
              type="text"
              placeholder="Ej: Revisión de Documentos"
              class="input-nueva-etapa"
            />
          </div>

          <div class="form-grupo">
            <label for="clasificacionNuevaEtapa">Fase de la Etapa *</label>
            <select v-model="nuevaEtapa.clasificacion" class="input-nueva-etapa">
              <option value="">-- Seleccionar fase --</option>
              <option value="preparatoria">🔵 Preparatoria</option>
              <option value="precontractual">🟢 Precontractual</option>
              <option value="contractual">🔴 Contractual</option>
              <option value="sin_clasificar">⚪ Sin clasificar</option>
            </select>
          </div>

          <div class="form-grupo">
            <label for="fechaTentativaNuevaEtapa">Fecha Tentativa</label>
            <input
              id="fechaTentativaNuevaEtapa"
              v-model="nuevaEtapa.fechaTentativa"
              type="date"
              class="input-nueva-etapa"
            />
          </div>

          <div class="form-grupo">
            <label for="estadoNuevaEtapa">Estado</label>
            <select v-model="nuevaEtapa.estado" class="input-nueva-etapa">
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completo</option>
            </select>
          </div>
        </div>

        <div class="botones-modal">
          <button type="button" class="btn-primary" @click="guardarNuevaEtapa" :disabled="!nuevaEtapa.nombre.trim() || !nuevaEtapa.clasificacion">
            ✓ Crear Etapa
          </button>
          <button type="button" class="btn-secondary" @click="mostrarFormularioNuevaEtapa = false">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <div v-if="etapaSeguimiento" class="modal-overlay modal-seguimiento-overlay" @click.self="cerrarModalSeguimiento">
      <div class="modal-content modal-seguimiento" @click.stop>
        <div class="modal-header">
          <div class="modal-header-content" v-once>
            <h2>
              Seguimiento: {{ actividadSeleccionada?.nombre || 'Proceso' }}
              · {{ etapaSeguimiento.etapaNombre || etapaSeguimiento.nombre }}
            </h2>
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
            ref="textareaComentario"
            rows="3"
            class="textarea-comentario"
            placeholder="Agregar observación de seguimiento"
          ></textarea>
          <button type="button" class="btn-guardar" @click="guardarSeguimiento" :disabled="guardandoSeguimiento">
            {{ guardandoSeguimiento ? 'Guardando...' : 'Guardar seguimiento' }}
          </button>

          <div class="seguimientos-historial" v-if="seguimientosEtapa.length > 0">
            <h4>Historial</h4>
            <div v-for="item in seguimientosEtapa" :key="item.id" class="seguimiento-item">
              <div class="seguimiento-meta-row">
                <div class="seguimiento-meta">{{ item.createdAt || item.created_at || item.fecha }} · {{ item.responsableNombre || 'Sin responsable' }}</div>
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
              <div>{{ item.observaciones || item.comentario }}</div>
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
import api from '../services/api';
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
const filtroTipoContratacion = ref('');
const ordenPresupuesto = ref('presupuesto-desc');
const filtrosKpiActivos = ref<string[]>([]);
const catalogoEtapas = ref<Record<number, any>>({});
const resumenGeneralExpanded = ref(true);
const expandidosPartidas = ref<Set<number>>(new Set());
const gruposExpandidos = ref<Set<string>>(new Set());

const actividadesVisiblesBase = computed(() =>
  actividades.value.filter((actividad: any) => esProcesoVisible(actividad))
);
const direccionesDisponibles = computed(() => {
  const direcciones = [...new Set(actividadesVisiblesBase.value.map((actividad: any) => obtenerDireccion(actividad)))] as string[];
  return direcciones
    .filter((direccion) => direccion !== 'N/A')
    .sort((a, b) => a.localeCompare(b))
    .map((dir) => ({ value: dir, label: dir }));
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

const hayFiltrosActivos = computed(() =>
  Boolean(
    busquedaActividades.value
    || filtroDireccion.value
    || filtroTipoContratacion.value
    || filtrosKpiActivos.value.length > 0
  )
);
const actividadesActivas = computed(() => {
  let items = [...actividadesVisiblesBase.value];

  const q = normalizarTextoBusqueda(busquedaActividades.value);
  if (q) {
    items = items.filter((a: any) => {
      const direccion = obtenerDireccion(a);
      const responsable = obtenerResponsable(a);
      const codigoOlympo = a?.codigoOlympo || a?.codigo_olympo || '';
      return normalizarTextoBusqueda(
        `${a?.nombre || ''} ${direccion} ${responsable} ${codigoOlympo}`
      ).includes(q);
    });
  }

  if (filtroDireccion.value) {
    items = items.filter((a: any) => obtenerDireccion(a) === filtroDireccion.value);
  }

  if (filtroTipoContratacion.value) {
    items = items.filter((a: any) =>
      normalizarTextoBusqueda(obtenerTipoContratacionCabecera(a)) === filtroTipoContratacion.value
    );
  }

  if (filtrosKpiActivos.value.length > 0) {
    items = items.filter((a: any) => {
      return filtrosKpiActivos.value.every((filtro: string) => {
        if (filtro === 'pac') {
          const tipo = String(a?.pacNoPac || a?.pac_no_pac || a?.tipoPlan || '').toUpperCase();
          return tipo === 'PAC';
        } else if (filtro === 'noPac') {
          const tipo = String(a?.pacNoPac || a?.pac_no_pac || a?.tipoPlan || '').toUpperCase();
          return tipo === 'NO PAC';
        } else if (filtro === 'completos') {
          return tareasCompletadas(a) === totalTareas(a) && totalTareas(a) > 0;
        } else if (filtro === 'retrasadas') {
          return tareasConRetraso(a) > 0;
        } else if (filtro === 'riesgo') {
          return normalizarProcesoEnRiesgo(a);
        } else if (filtro === 'desierto') {
          return obtenerEstadoProcesoValor(a) === 2;
        } else if (filtro === 'desfinanciado') {
          return procesoActivoSinPresupuesto(a);
        }
        return true;
      });
    });
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

// Agrupar procesos por nombre exacto con suma de presupuestos
function agruparProcesosConNombreSimilar(actividades: any[]) {
  const mapaGrupos = new Map<string, any[]>();

  for (const act of actividades) {
    const nombre = (act.nombre || act.subtarea || '').trim();
    if (!mapaGrupos.has(nombre)) {
      mapaGrupos.set(nombre, []);
    }
    mapaGrupos.get(nombre)!.push(act);
  }

  return Array.from(mapaGrupos.entries()).map(([nombre, procesos]) => ({
    nombre,
    procesos,
    cantidad: procesos.length,
    presupuestoTotal: procesos.reduce((sum, p) => sum + (obtenerPresupuesto(p) || 0), 0),
    representante: procesos[0], // Usar el primero como representante
    expandido: procesos.length === 1 // Solo expandidos si hay uno solo
  }));
}

const actividadesAgrupadas = computed(() => {
  return agruparProcesosConNombreSimilar(actividadesActivas.value);
});

const actividadesAgrupadasPorCuatrimestre = computed(() => {
  const orden = [1, 2, 3];

  const grupos = orden
    .map((cuatrimestre) => ({
      key: `c${cuatrimestre}`,
      titulo: `Cuatrimestre ${cuatrimestre}`,
      items: actividadesAgrupadas.value.filter((grupo: any) => obtenerCuatrimestreOrden(grupo.representante) === cuatrimestre)
    }))
    .filter((grupo) => grupo.items.length > 0);

  const sinCuatrimestre = actividadesAgrupadas.value.filter((grupo: any) => obtenerCuatrimestreOrden(grupo.representante) > 3);
  if (sinCuatrimestre.length > 0) {
    grupos.push({
      key: 'otros',
      titulo: 'Sin cuatrimestre definido',
      items: sinCuatrimestre
    });
  }

  return grupos;
});

const actividadesKpiPrincipales = computed(() =>
  actividadesActivas.value.filter((actividad: any) =>
    procesoCuentaEnIndicadoresPrincipales(actividad) && totalTareas(actividad) > 0
  )
);

const kpisProcesos = computed(() => {
  const totalProcesos = actividadesKpiPrincipales.value.length;
  const actividadesCompletadas = actividadesKpiPrincipales.value.filter(
    (actividad: any) => tareasCompletadas(actividad) === totalTareas(actividad)
  ).length;
  const atrasadas = actividadesKpiPrincipales.value.filter((actividad: any) => tareasConRetraso(actividad) > 0).length;
  const porcentajeCumplimiento = totalProcesos
    ? Math.round((actividadesCompletadas / totalProcesos) * 100)
    : 0;

  return {
    totalProcesos,
    actividadesCompletadas,
    atrasadas,
    porcentajeCumplimiento
  };
});

const colorCumplimiento = computed(() => colorSemaforoPositivo(kpisProcesos.value.porcentajeCumplimiento));

const procesosRiesgoKpi = computed(() =>
  actividadesKpiPrincipales.value.filter((actividad: any) => normalizarProcesoEnRiesgo(actividad))
);

const procesosDesiertosKpi = computed(() =>
  actividadesActivas.value.filter((actividad: any) => obtenerEstadoProcesoValor(actividad) === 2)
);

const montoTotal = computed(() => {
  return actividadesKpiPrincipales.value.reduce((sum: number, actividad: any) =>
    sum + (obtenerPresupuesto(actividad) || 0), 0
  );
});

const porcentajePresupuesto = (actividad: any) => {
  const presupuesto = obtenerPresupuesto(actividad) || 0;
  const total = montoTotal.value || 0;
  return total ? (presupuesto / total) * 100 : 0;
};

const montoPAC = computed(() => {
  return actividadesKpiPrincipales.value
    .filter((actividad: any) => obtenerTipoPlanNormalizado(actividad) === 'PAC')
    .reduce((sum: number, actividad: any) => sum + (obtenerPresupuesto(actividad) || 0), 0);
});

const montoNoPAC = computed(() => {
  return actividadesKpiPrincipales.value
    .filter((actividad: any) => obtenerTipoPlanNormalizado(actividad) === 'NO PAC')
    .reduce((sum: number, actividad: any) => sum + (obtenerPresupuesto(actividad) || 0), 0);
});

const procesosPAC = computed(() =>
  actividadesKpiPrincipales.value.filter((actividad: any) => obtenerTipoPlanNormalizado(actividad) === 'PAC').length
);

const procesosNoPAC = computed(() =>
  actividadesKpiPrincipales.value.filter((actividad: any) => obtenerTipoPlanNormalizado(actividad) === 'NO PAC').length
);

const actividadSeleccionada = ref<any | null>(null);
const grupoActividadActual = computed(() => {
  if (!actividadSeleccionada.value) return null;
  return actividadesAgrupadas.value.find((g: any) => g.representante.id === actividadSeleccionada.value?.id);
});
const etapasActividad = ref<any[]>([]);
const etapaSeguimiento = ref<any | null>(null);
const seguimientosEtapa = ref<any[]>([]);
const nuevoComentario = ref('');
const textareaComentario = ref<HTMLTextAreaElement | null>(null);
const nuevoAlerta = ref(false);
const guardandoSeguimiento = ref(false);
const eliminandoSeguimientoId = ref<number | null>(null);
const guardandoEstadoEtapaId = ref<number | null>(null);
const estadoGuardado = ref<'guardando' | 'guardado' | null>(null);
const guardandoRiesgoProceso = ref(false);
const modoEditarEtapas = ref(false);
const busquedaEtapasEditor = ref('');
const etapasSeleccionadas = ref<Set<number>>(new Set());
const mostrarFormularioNuevaEtapa = ref(false);
const nuevaEtapa = ref({
  nombre: '',
  clasificacion: '',
  fechaTentativa: '',
  estado: 'pendiente'
});
const cargandoSeguimientos = ref(false);
const errorSeguimiento = ref('');
const errorRiesgoProceso = ref('');
const mensajeSeguimiento = ref<{ texto: string; tipo: 'success' | 'info' } | null>(null);
const mensajeRiesgoProceso = ref<{ texto: string; tipo: 'success' | 'info' } | null>(null);
const conteoSeguimientosPorEtapa = ref<Record<number, number>>({});
const alertasPorEtapa = ref<Record<number, boolean>>({});
const ultimaActualizacionPorEtapa = ref<Record<number, string | null>>({});
const etapaResaltadaId = ref<number | null>(null);
const timelineContraida = ref(false);
const procesoEnRiesgo = ref(false);
const procesoDesierto = ref(false);
const mostrarPanelRiesgo = ref(false);
const comentarioRiesgoProceso = ref('');
const procesoEnRiesgoGuardado = ref(false);
const comentarioRiesgoGuardado = ref('');
const estadoProcesoGuardado = ref<0 | 1 | 2>(1);
const permiteEditarFechaCompletado = UI_FLAGS.ALLOW_MANUAL_COMPLETION_DATE;
const GUAYAQUIL_TIMEZONE = 'America/Guayaquil';
const LIMITE_COMENTARIO_RIESGO = 500;
const longitudComentarioRiesgo = computed(() => comentarioRiesgoProceso.value.length);
const caracteresRestantesRiesgo = computed(() => LIMITE_COMENTARIO_RIESGO - longitudComentarioRiesgo.value);
const puedeVerDetalleRiesgo = computed(() =>
  procesoEnRiesgoGuardado.value && Boolean(comentarioRiesgoGuardado.value.trim())
);

const puedeEliminarSeguimientos = computed(() =>
  auth.isAdmin || auth.can('actividades', 'delete') || auth.can('admin_actividades', 'delete')
);

const ultimaActualizacionActividad = ref<string | null>(null);

// ID o código de subtarea para los endpoints API
const subtareaIdActiva = computed(() =>
  actividadSeleccionada.value?.subtareaIdOriginalResuelto ||
  actividadSeleccionada.value?.subtareaIdOriginal ||
  actividadSeleccionada.value?.id
);

const verFechaLimite = computed(() => false); // Oculta

const verFechaReforma = computed(() => true); // Siempre visible - fecha base planificada para comparación

const puedeEditarFechaPlani = ref(false); // Cargado desde configuración del servidor

const editarFechaReforma = computed(() => {
  if (auth.isAdmin) return true;
  if (auth.role === 'direccion') return puedeEditarFechaPlani.value;
  return false;
});

const verFechaReforma3 = computed(() => false); // Siempre oculta

const editarFechaReforma3 = computed(() => false); // Siempre no editable

const verFechaCompleto = computed(() => {
  if (auth.isAdmin) return true;
  const campos = auth.permisos?.campos || {};
  return campos.fecha_completo?.ver !== false;
});

const editarFechaCompleto = computed(() => {
  if (auth.isAdmin) return true;
  const campos = auth.permisos?.campos || {};
  return campos.fecha_completo?.editar !== false;
});

const verEstadoEtapa = computed(() => {
  if (auth.isAdmin) return true;
  const campos = auth.permisos?.campos || {};
  return campos.estado_etapa?.ver !== false;
});

const editarEstadoEtapa = computed(() => {
  if (auth.isAdmin) return true;
  const campos = auth.permisos?.campos || {};
  return campos.estado_etapa?.editar !== false;
});

const etapasOrdenadas = computed(() => {
  const copiaEtapas = [...etapasActividad.value];
  const ordenClasificacion = { preparatoria: 0, precontractual: 1, contractual: 2, sin_clasificar: 3 };

  return copiaEtapas.sort((a: any, b: any) => {
    const etapaIdA = a.etapaId || a.id;
    const etapaIdB = b.etapaId || b.id;
    // Primero intenta obtener la clasificación del objeto etapa, luego del catálogo
    let clasifA = a.clasificacion || catalogoEtapas.value[etapaIdA]?.clasificacion || 'sin_clasificar';
    let clasifB = b.clasificacion || catalogoEtapas.value[etapaIdB]?.clasificacion || 'sin_clasificar';

    // Normalizar a minúsculas
    clasifA = String(clasifA).toLowerCase();
    clasifB = String(clasifB).toLowerCase();

    const ordenA = ordenClasificacion[clasifA as keyof typeof ordenClasificacion] || 999;
    const ordenB = ordenClasificacion[clasifB as keyof typeof ordenClasificacion] || 999;
    return ordenA - ordenB;
  });
});

const etapasAgrupadas = computed(() => {
  const grupos: Record<string, any[]> = {
    preparatoria: [],
    precontractual: [],
    contractual: [],
    sin_clasificar: []
  };

  etapasOrdenadas.value.forEach((etapa: any) => {
    const etapaId = etapa.etapaId || etapa.id;
    let clasif = etapa.clasificacion || catalogoEtapas.value[etapaId]?.clasificacion || 'sin_clasificar';
    clasif = String(clasif).toLowerCase();

    if (clasif in grupos) {
      grupos[clasif]!.push(etapa);
    }
  });

  return grupos;
});

const etapasConFecha = computed(() =>
  etapasActividad.value
    .filter((e: any) => e?.fechaPlanificada || e?.fechaTentativa)
    .sort((a: any, b: any) => {
      const fechaA = new Date(a.fechaTentativa || '9999-12-31');
      const fechaB = new Date(b.fechaTentativa || '9999-12-31');
      return fechaA.getTime() - fechaB.getTime();
    })
);

const resumenCabeceraActividad = computed(() => {
  const etapas = etapasConFecha.value;
  if (!etapas.length) return null;

  const ultima = etapas[etapas.length - 1];

  return {
    ultimaFecha: formatearFecha(ultima?.fechaPlanificada || ultima?.fechaTentativa),
    ultimaNombre: String(ultima?.etapaNombre || ultima?.nombre || 'Ultima actividad')
  };
});

const porcentajeAvanceGeneral = computed(() => {
  const total = etapasConFecha.value.length;
  if (total === 0) return 0;
  const completadas = etapasConFecha.value.filter((etapa: any) =>
    estadoNormalizado(etapa.estado) === 'completado'
  ).length;
  return Math.round((completadas / total) * 100);
});

const etapasFiltradas = computed(() => {
  const q = normalizarTextoBusqueda(busquedaEtapasEditor.value);
  if (!q) return etapasActividad.value;
  return etapasActividad.value.filter((etapa: any) =>
    normalizarTextoBusqueda(String(etapa.etapaNombre || '')).includes(q)
  );
});

const fechaUltimaActualizacionFormato = computed(() => {
  if (!ultimaActualizacionActividad.value) {
    console.log('📅 Sin fecha de actualización');
    return 'Sin actualizaciones';
  }
  try {
    const fecha = new Date(ultimaActualizacionActividad.value);
    const formateada = new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(fecha);
    console.log('📅 Fecha formateada:', { original: ultimaActualizacionActividad.value, formateada });
    return formateada;
  } catch (e) {
    console.log('📅 Error al formatear fecha:', e);
    return ultimaActualizacionActividad.value;
  }
});

onMounted(async () => {
  window.addEventListener('keydown', manejarEscapeModales);
  // Realtime deshabilitado mientras se escribe - causa delay de 5 segundos
  // window.addEventListener('app:data-change', manejarCambioTiempoReal as EventListener);
  try {
    // Cargar catálogo de etapas con clasificaciones
    try {
      const catalogoResponse = await api.get('/catalogos/etapas');
      const catalogoData = Array.isArray(catalogoResponse.data)
        ? catalogoResponse.data
        : (catalogoResponse.data.value || []);
      catalogoEtapas.value = Object.fromEntries(
        catalogoData.map((e: any) => [e.id, { clasificacion: e.clasificacion, descripcion: e.descripcion }])
      );
    } catch (err) {
      console.warn('⚠️ No se pudo cargar el catálogo de etapas');
      catalogoEtapas.value = {};
    }

    // Cargar configuración de edición de fecha planificada (cacheada)
    try {
      const cached = localStorage.getItem('configFechaPlanificada');
      if (cached) {
        puedeEditarFechaPlani.value = cached === 'true';
      } else {
        const configResponse = await api.get('/configuracion/editar_fecha_planificada_direcciones');
        const valor = configResponse.data?.valor;
        puedeEditarFechaPlani.value = valor === true || valor === '1' || valor === 1;
        localStorage.setItem('configFechaPlanificada', String(puedeEditarFechaPlani.value));
      }
    } catch (err) {
      console.warn('⚠️  No se pudo cargar configuración de edición de fecha planificada');
      puedeEditarFechaPlani.value = false;
    }

    // Cargar todos los procesos (hasta 500)
    const responseInicial = await api.get('/subtareas', { params: { limit: 500, offset: 0 } });
    actividades.value = responseInicial.data;

    console.log('✅ Procesos cargados:', actividades.value.length);

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

// Watcher deshabilitado - las fechas ya se normalizan al cargar desde el servidor
// watch(
//   () => etapasActividad.value.length,
//   () => {
//     // Normalizar todas las fechas en todas las etapas solo cuando la longitud cambie
//     etapasActividad.value.forEach((etapa: any) => {
//       if (!esFormatoValido(etapa?.fechaTentativa)) {
//         etapa.fechaTentativa = normalizarFechaInput(etapa?.fechaTentativa);
//       }
//       if (!esFormatoValido(etapa?.fechaReforma)) {
//         etapa.fechaReforma = normalizarFechaInput(etapa?.fechaReforma);
//       }
//       if (!esFormatoValido(etapa?.fechaReforma3)) {
//         etapa.fechaReforma3 = normalizarFechaInput(etapa?.fechaReforma3);
//       }
//       if (!esFormatoValido(etapa?.fechaPlanificada)) {
//         etapa.fechaPlanificada = normalizarFechaInput(etapa?.fechaPlanificada);
//       }
//       if (!esFormatoValido(etapa?.fechaReal)) {
//         etapa.fechaReal = normalizarFechaInput(etapa?.fechaReal);
//       }
//     });
//   }
// );

function limpiarFiltrosActividades() {
  busquedaActividades.value = '';
  filtroDireccion.value = '';
  filtroTipoContratacion.value = '';
  filtrosKpiActivos.value = [];
}

function toggleFiltroKpi(filtro: string) {
  // Si el filtro ya está activo, lo removemos
  if (filtrosKpiActivos.value.includes(filtro)) {
    filtrosKpiActivos.value = filtrosKpiActivos.value.filter(f => f !== filtro);
    return;
  }

  // Lógica de exclusión: PAC y NO PAC no pueden estar activos simultáneamente
  if (filtro === 'pac') {
    filtrosKpiActivos.value = filtrosKpiActivos.value.filter(f => f !== 'noPac');
  } else if (filtro === 'noPac') {
    filtrosKpiActivos.value = filtrosKpiActivos.value.filter(f => f !== 'pac');
  }

  // Agregar el nuevo filtro
  filtrosKpiActivos.value.push(filtro);
}

function togglePartidas(actividadId: number) {
  if (expandidosPartidas.value.has(actividadId)) {
    expandidosPartidas.value.delete(actividadId);
  } else {
    expandidosPartidas.value.add(actividadId);
  }
}

function toggleGrupo(nombreGrupo: string) {
  if (gruposExpandidos.value.has(nombreGrupo)) {
    gruposExpandidos.value.delete(nombreGrupo);
  } else {
    gruposExpandidos.value.add(nombreGrupo);
  }
}

function obtenerDireccion(actividad: any) {
  return actividad?.direccion?.nombre
    || actividad?.direccionNombre
    || actividad?.direccion_encargada
    || actividad?.direccionEncargada
    || 'N/A';
}

function obtenerResponsable(actividad: any) {
  return actividad?.responsableNombre
    || actividad?.responsableDirectivo
    || actividad?.responsable_directivo
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
  // Prioridad: tipoContratacion > procedimientoSugerido (ignorando 'N/A')
  let valor = String(
    actividad?.tipoContratacion
    ?? actividad?.tipo_contratacion
    ?? ''
  ).trim();

  // Si tipoContratacion es vacío o N/A, revisar procedimiento
  if (!valor || valor === 'N/A') {
    valor = String(
      actividad?.procedimientoSugerido
      ?? actividad?.procedimiento_sugerido
      ?? actividad?.procedimiento
      ?? ''
    ).trim();
  }

  // Filtrar N/A y valores no válidos
  if (valor === 'N/A' || valor === '' || valor === 'null') {
    return 'No especificado';
  }

  return valor || 'No especificado';
}

function obtenerPacNoPacCabecera(actividad: any) {
  const valor = String(
    actividad?.pacNoPac
    ?? actividad?.pac_no_pac
    ?? actividad?.tipoPlan
    ?? ''
  ).trim().toUpperCase();

  // Interpretar valores de la BD
  if (valor.includes('PLAN ANUAL') || valor === 'PAC') {
    return 'PAC';
  } else if (valor.includes('NO PAC') || valor === '') {
    return 'NO PAC';
  }
  return valor || 'PAC/No PAC no definido';
}

function obtenerTipoPlanNormalizado(actividad: any) {
  return String(
    actividad?.pacNoPac
    ?? actividad?.pac_no_pac
    ?? actividad?.tipoPlan
    ?? ''
  ).toUpperCase().trim();
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

function colorSemaforoPositivo(valor: number) {
  if (valor >= 80) return '#22c55e';
  if (valor >= 50) return '#f59e0b';
  return '#ef4444';
}

function getEtapas(actividad: any) {
  const etapas = actividad?.etapas || actividad?.seguimientoEtapas || [];
  return etapas.map((etapa: any) => ({
    ...etapa,
    fechaTentativa: normalizarFechaInput(etapa?.fechaTentativa),
    fechaPlanificada: normalizarFechaInput(etapa?.fechaPlanificada),
    fechaReforma3: normalizarFechaInput(etapa?.fechaReforma3),
    fechaReal: normalizarFechaInput(etapa?.fechaReal),
    estado: estadoNormalizado(etapa?.estado) === 'completado' ? 'completado' : 'pendiente'
  }));
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
  const cuatrimestreMeses: Record<number, string> = {
    1: 'Enero - Marzo',
    2: 'Abril - Junio',
    3: 'Julio - Septiembre'
  };

  if (cuatrimestre >= 1 && cuatrimestre <= 3) {
    return cuatrimestreMeses[cuatrimestre];
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

function procesoCuentaEnIndicadoresPrincipales(actividad: any) {
  return obtenerEstadoProcesoValor(actividad) === 1 && !procesoActivoSinPresupuesto(actividad);
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

function obtenerMarcaAguaProceso(actividad: any) {
  if (obtenerEstadoProcesoValor(actividad) === 2) return 'DESIERTO';
  if (normalizarProcesoEnRiesgo(actividad)) return 'EN RIESGO';
  if (procesoActivoSinPresupuesto(actividad)) return 'SIN PRESUPUESTO';
  return '';
}

function obtenerClaseMarcaAguaProceso(actividad: any) {
  if (obtenerEstadoProcesoValor(actividad) === 2) return 'watermark-desierto';
  if (normalizarProcesoEnRiesgo(actividad)) return 'watermark-riesgo';
  if (procesoActivoSinPresupuesto(actividad)) return 'watermark-sin-presupuesto';
  return '';
}

function obtenerComentarioRiesgo(actividad: any) {
  return String(actividad?.riesgoComentario ?? actividad?.riesgo_comentario ?? '').trim();
}

function totalTareas(actividad: any) {
  return getEtapasConFecha(actividad).length;
}

function esEtapaAtrasada(etapa: any, _actividad?: any) {
  const estado = estadoNormalizado(etapa?.estado);
  if (estado === 'completado') return false;

  const fechaObj = parseFechaComparable(etapa?.fechaPlanificada || etapa?.fechaTentativa);
  const hoy = parseFechaComparable(obtenerFechaHoyGuayaquil());
  if (!fechaObj || !hoy) return false;

  return fechaObj < hoy;
}

function diasRetraso(etapa: any, _actividad?: any) {
  const fechaObj = parseFechaComparable(etapa?.fechaPlanificada || etapa?.fechaTentativa);
  const hoy = parseFechaComparable(obtenerFechaHoyGuayaquil());
  if (!fechaObj || !hoy) return 0;

  return Math.max(0, Math.floor((hoy.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24)));
}

function diasRetrasoCompletado(etapa: any) {
  // Usar diasRetraso del servidor directamente
  return etapa?.diasRetraso ?? 0;
}


function tareasCompletadas(actividad: any) {
  return getEtapasConFecha(actividad).filter((etapa: any) => estadoNormalizado(etapa.estado) === 'completado').length;
}

function tareasConRetraso(actividad: any) {
  if (!procesoCuentaEnReportesYAtrasos(actividad)) return 0;
  return getEtapasConFecha(actividad).filter((etapa: any) => esEtapaAtrasada(etapa, actividad) || estadoNormalizado(etapa.estado) === 'en_retraso').length;
}

function diasMaximoRetrasoActividad(actividad: any) {
  const etapas = actividad?.etapas || [];
  if (etapas.length === 0) return 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const etapasConRetraso = etapas.filter((e: any) => {
    const tieneFecha = e.fechaTentativa || e.fechaPlanificada;
    const noCompletada = e.estado !== 'completado' && e.estado !== 'Completado';
    const aplica = e.aplica === true || e.aplica === 1;
    return aplica && tieneFecha && noCompletada;
  });

  if (etapasConRetraso.length === 0) return 0;

  const diasRetrasosPorEtapa = etapasConRetraso.map((e: any) => {
    const fechaStr = e.fechaTentativa || e.fechaPlanificada;
    if (!fechaStr) return 0;

    // Parse fecha (puede ser YYYY-MM-DD o Date)
    let fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) {
      // Intentar parsear como YYYY-MM-DD
      const parts = String(fechaStr).split('-');
      if (parts.length === 3) {
        fecha = new Date(parseInt(parts[0]!), parseInt(parts[1]!) - 1, parseInt(parts[2]!));
      }
    }

    if (isNaN(fecha.getTime())) return 0;

    fecha.setHours(0, 0, 0, 0);
    const dias = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, dias);
  });

  return diasRetrasosPorEtapa.length > 0 ? Math.max(...diasRetrasosPorEtapa) : 0;
}

function obtenerEstadoActividad(actividad: any) {
  const etapas = actividad?.etapas || [];
  if (etapas.length === 0) return 'Sin clasificar';

  // Separar etapas por clasificación
  const preparatoria = etapas.filter((e: any) => e.clasificacion === 'preparatoria' && e.aplica);
  const precontractual = etapas.filter((e: any) => e.clasificacion === 'precontractual' && e.aplica);
  const contractual = etapas.filter((e: any) => e.clasificacion === 'contractual' && e.aplica);

  // Contar completadas por fase
  const prepCompletas = preparatoria.filter((e: any) => e.estado === 'completado').length;
  const preContCompletas = precontractual.filter((e: any) => e.estado === 'completado').length;
  const contCompletas = contractual.filter((e: any) => e.estado === 'completado').length;

  // Determinar la fase actual
  if (preparatoria.length > 0 && prepCompletas < preparatoria.length) {
    return 'Preparatoria';
  }
  if (precontractual.length > 0 && preContCompletas < precontractual.length) {
    return 'Precontractual';
  }
  if (contractual.length > 0 && contCompletas < contractual.length) {
    return 'Contractual';
  }
  if (preparatoria.length > 0 || precontractual.length > 0 || contractual.length > 0) {
    return 'Ejecución';
  }
  return 'Sin clasificar';
}

function porcentajeAvance(actividad: any) {
  const etapas = actividad?.etapas || [];
  const etapasAplicables = etapas.filter((e: any) => e.aplica);

  if (etapasAplicables.length === 0) return 0;

  const completadas = etapasAplicables.filter((e: any) => e.estado === 'completado').length;
  return Math.round((completadas / etapasAplicables.length) * 100);
}

function claseAvance(actividad: any) {
  return tareasConRetraso(actividad) > 0 ? 'avance-bajo' : 'avance-alto';
}

function colorAvanceActividad(actividad: any) {
  return claseAvance(actividad) === 'avance-alto' ? '#16a34a' : '#dc2626';
}

function claseEstadoSemaforo(etapa: any) {
  const estado = estadoNormalizado(etapa?.estado);
  if (estado === 'completado') return 'estado-semaforo-verde';
  return 'estado-semaforo-amarillo';
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

async function abrirEditorEtapas() {
  if (!actividadSeleccionada.value?.id) return;
  try {
    const response = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas/todas/todas`);
    etapasActividad.value = response.data || [];
    modoEditarEtapas.value = true;
  } catch (error) {
    console.error('Error cargando todas las etapas:', error);
    errorCargaActividades.value = 'Error al cargar las etapas para edición';
  }
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

async function guardarEdicionEtapas() {
  if (!actividadSeleccionada.value) return;

  try {
    guardandoRiesgoProceso.value = true;

    // Usar construirPayloadEtapas para consistencia con el modal principal
    const etapasActualizadas = construirPayloadEtapas();
    console.log('📤 Enviando etapas:', etapasActualizadas);

    // Enviar cambios al backend
    await api.put(`/subtareas/${actividadSeleccionada.value.id}/etapas`, {
      etapas: etapasActualizadas
    });

    // Recargar solo las etapas habilitadas para el modal de detalle
    const etapasHabilitadas = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas`);
    etapasActividad.value = etapasHabilitadas.data || [];

    // Limpiar selecciones
    etapasSeleccionadas.value.clear();
    busquedaEtapasEditor.value = '';

    // Cerrar modal
    modoEditarEtapas.value = false;

    // Mostrar mensaje de éxito
    mensajeSeguimiento.value = {
      tipo: 'success',
      texto: '✓ Cambios en etapas guardados correctamente'
    };
    setTimeout(() => {
      mensajeSeguimiento.value = null;
    }, 3000);

  } catch (error: any) {
    errorSeguimiento.value = error?.response?.data?.error || 'Error al guardar los cambios en etapas';
    console.error('Error guardando edición de etapas:', error);
  } finally {
    guardandoRiesgoProceso.value = false;
  }
}

function toggleEtapaSeleccionada(etapaId: number) {
  if (etapasSeleccionadas.value.has(etapaId)) {
    etapasSeleccionadas.value.delete(etapaId);
  } else {
    etapasSeleccionadas.value.add(etapaId);
  }
}

function toggleTodosEtapasEditor(event: Event) {
  const checkbox = event.target as HTMLInputElement;
  if (checkbox.checked) {
    etapasFiltradas.value.forEach((etapa: any) => {
      etapasSeleccionadas.value.add(etapa.id || etapa.etapaId);
    });
  } else {
    etapasFiltradas.value.forEach((etapa: any) => {
      etapasSeleccionadas.value.delete(etapa.id || etapa.etapaId);
    });
  }
}

function habilitarMultiples() {
  etapasActividad.value.forEach((etapa: any) => {
    if (etapasSeleccionadas.value.has(etapa.id || etapa.etapaId)) {
      etapa.aplica = 1;
    }
  });
}

function deshabilitarMultiples() {
  etapasActividad.value.forEach((etapa: any) => {
    if (etapasSeleccionadas.value.has(etapa.id || etapa.etapaId)) {
      etapa.aplica = 0;
    }
  });
}

function abrirFormularioNuevaEtapa() {
  nuevaEtapa.value = {
    nombre: '',
    clasificacion: '',
    fechaTentativa: '',
    estado: 'pendiente'
  };
  mostrarFormularioNuevaEtapa.value = true;
}

async function guardarNuevaEtapa() {
  if (!actividadSeleccionada.value || !nuevaEtapa.value.nombre.trim() || !nuevaEtapa.value.clasificacion) {
    errorSeguimiento.value = 'El nombre y la fase de la etapa son requeridos';
    return;
  }

  try {
    guardandoRiesgoProceso.value = true;

    const payload = {
      nombre: nuevaEtapa.value.nombre,
      clasificacion: nuevaEtapa.value.clasificacion,
      fechaTentativa: nuevaEtapa.value.fechaTentativa || null,
      estado: nuevaEtapa.value.estado,
      observaciones: ''
    };

    await api.post(`/subtareas/${actividadSeleccionada.value.id}/etapas`, payload);

    // Agregar automáticamente la etapa al catálogo global
    try {
      await api.post('/catalogos/etapas', {
        nombre: nuevaEtapa.value.nombre.trim(),
        clasificacion: nuevaEtapa.value.clasificacion
      });
      console.log('✅ Etapa agregada al catálogo global');
    } catch (catalogoError: any) {
      // No detener el flujo si el catálogo falla, solo registrar
      console.warn('⚠️ La etapa se creó pero no se agregó al catálogo:', catalogoError?.response?.data?.error);
    }

    // Recargar las etapas
    const etapasActualizadas = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas?all=true`);
    etapasActividad.value = etapasActualizadas.data || [];

    // Recargar catálogo de etapas para que incluya la nueva etapa
    try {
      const catalogoResponse = await api.get('/catalogos/etapas');
      const catalogoData = Array.isArray(catalogoResponse.data)
        ? catalogoResponse.data
        : (catalogoResponse.data.value || []);
      catalogoEtapas.value = Object.fromEntries(
        catalogoData.map((e: any) => [e.id, { clasificacion: e.clasificacion, descripcion: e.descripcion }])
      );
      console.log('✅ Catálogo de etapas actualizado');
    } catch (err) {
      console.warn('⚠️ No se pudo actualizar el catálogo de etapas:', err);
    }

    mostrarFormularioNuevaEtapa.value = false;

    mensajeSeguimiento.value = {
      tipo: 'success',
      texto: '✓ Etapa personalizada creada correctamente (agregada al catálogo global)'
    };
    setTimeout(() => {
      mensajeSeguimiento.value = null;
    }, 3000);
  } catch (error: any) {
    errorSeguimiento.value = error?.response?.data?.error || 'Error al crear la etapa';
    console.error('Error creando nueva etapa:', error);
  } finally {
    guardandoRiesgoProceso.value = false;
  }
}

function cerrarDetalleActividad() {
  actividadSeleccionada.value = null;
  etapasActividad.value = [];
  timelineContraida.value = true;
  etapaSeguimiento.value = null;
  seguimientosEtapa.value = [];
  conteoSeguimientosPorEtapa.value = {};
  alertasPorEtapa.value = {};
  ultimaActualizacionPorEtapa.value = {};
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
  const esRefrescoSilencioso = !actualizarRuta && Number(actividadSeleccionada.value?.id) === actividadId;

  actividadSeleccionada.value = actividad;

  if (!esRefrescoSilencioso) {
    etapasActividad.value = [];
    timelineContraida.value = false;
    etapaSeguimiento.value = null;
    seguimientosEtapa.value = [];
    conteoSeguimientosPorEtapa.value = {};
    alertasPorEtapa.value = {};
    ultimaActualizacionPorEtapa.value = {};
    cargandoSeguimientos.value = false;
    errorSeguimiento.value = '';
    cargarEstadoRiesgoProceso(actividad);
  }

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

  // Usar etapas que ya vienen del listado
  actividadSeleccionada.value = actividad;
  const etapas = actividad?.etapas || actividad?.seguimientoEtapas || [];
  etapasActividad.value = etapas;
  sincronizarActividadEnListado(actividadId, etapasActividad.value);

  // Cargar la fecha de última actualización del proceso
  console.log('📅 Actividad cargada:', { id: actividad?.id, updated_at: actividad?.updated_at });
  if (actividad?.updated_at) {
    ultimaActualizacionActividad.value = actividad.updated_at;
    console.log('📅 Fecha de actualización cargada:', ultimaActualizacionActividad.value);
  } else {
    ultimaActualizacionActividad.value = null;
  }

  // Cargar conteo de comentarios para todas las etapas
  await cargarConteoComentariosParaTodasEtapas(actividadId, etapas);
}

async function cargarConteoComentariosParaTodasEtapas(actividadId: number, etapas: any[]) {
  if (!etapas || etapas.length === 0) {
    return;
  }

  try {
    console.log(`📊 Cargando conteo de comentarios para proceso ${actividadId}`);

    // Usar endpoint de resumen para obtener conteos de todas las etapas de una vez
    const response = await api.get(`/subtareas/${actividadId}/seguimientos-resumen`);
    const resumen = response.data || [];

    console.log(`📊 Resumen obtenido:`, resumen);

    // Llenar el mapa de conteos desde el resumen
    if (resumen && resumen.length > 0) {
      for (const item of resumen) {
        const etapaId = item.etapaId || item.etapa_id;
        if (etapaId) {
          conteoSeguimientosPorEtapa.value[etapaId] = item.total || 0;
          console.log(`  - Etapa ${etapaId}: ${item.total} comentarios`);
        }
      }
    } else {
      console.log('📊 No hay comentarios en el resumen');
    }

    // NO sobrescribir ultimaActualizacionActividad - ya viene de la BD
    // La fecha se carga en abrirDetalleActividad desde actividad.updated_at
  } catch (error) {
    console.error('Error cargando conteo de comentarios:', error);
    // NO sobrescribir ultimaActualizacionActividad en caso de error
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
  ultimaActualizacionPorEtapa.value = {
    ...ultimaActualizacionPorEtapa.value,
    [etapaId]: obtenerUltimaFechaSeguimientos(items)
  };
  return items;
}

function obtenerFechaSeguimiento(item: any): string | null {
  const fecha = item?.createdAt
    || item?.created_at
    || item?.fechaComentario
    || item?.fecha_comentario
    || item?.fecha
    || null;
  return fecha ? String(fecha) : null;
}

function obtenerUltimaFechaSeguimientos(items: any[]): string | null {
  let ultima: Date | null = null;

  for (const item of items || []) {
    const candidata = obtenerFechaSeguimiento(item);
    if (!candidata) continue;
    const fecha = new Date(candidata);
    if (Number.isNaN(fecha.getTime())) continue;
    if (!ultima || fecha.getTime() > ultima.getTime()) {
      ultima = fecha;
    }
  }

  return ultima ? ultima.toISOString() : null;
}

function obtenerUltimaActualizacionTexto(etapa: any) {
  const etapaId = obtenerEtapaId(etapa);
  if (!etapaId) return 'Ultima actualizacion: nunca';
  const fecha = ultimaActualizacionPorEtapa.value[etapaId];
  if (!fecha) return 'Ultima actualizacion: nunca';
  return `Ultima actualizacion: ${formatearFecha(fecha)}`;
}

function obtenerUltimaActualizacionTextoTarjeta(proceso: any): string {
  if (!proceso?.updated_at) return '—';
  try {
    const fecha = new Date(proceso.updated_at);
    if (Number.isNaN(fecha.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatter.format(fecha);
  } catch {
    return '—';
  }
}

function construirPayloadEtapas() {
  const payload = etapasActividad.value.map((etapa: any) => {
    // Solo usar fechaTentativa del objeto etapa, NO usar fechaPlanificada como fallback
    const fechaTentativa = normalizarFechaInput(etapa?.fechaTentativa) || null;
    const fechaReal = estadoNormalizado(etapa?.estado) === 'completado' ? normalizarFechaInput(etapa?.fechaReal) : null;

    console.log(`[construirPayloadEtapas Etapa ${obtenerEtapaId(etapa)}] Input: fechaTentativa=${etapa?.fechaTentativa}, fechaReforma=${etapa?.fechaReforma}, fechaPlanificada=${etapa?.fechaPlanificada}`);

    return {
      etapaId: obtenerEtapaId(etapa),
      aplica: Boolean(Number(etapa?.aplica ?? 1)),
      fechaTentativa: fechaTentativa,
      fechaPlanificada: normalizarFechaInput(etapa?.fechaPlanificada) || null,
      fechaReforma3: normalizarFechaInput(etapa?.fechaReforma3) || null,
      estado: etapa?.estado || 'pendiente',
      fechaReal: fechaReal || null,
      observaciones: etapa?.observaciones || ''
    };
  }).filter((etapa: any) => Boolean(etapa.etapaId));

  console.log('[construirPayloadEtapas] Payload final:', JSON.stringify(payload, null, 2));
  return payload;
}

function onEstadoEtapaChange(etapa: any) {
  const nuevoEstado = estadoNormalizado(etapa?.estado) === 'completado' ? 'completado' : 'pendiente';

  // Validar que las etapas previas estén completas si se quiere marcar como completado
  if (nuevoEstado === 'completado') {
    const clasificacionEtapa = etapa.clasificacion;
    const etapas = etapasActividad.value || [];

    // Verificar restricciones según la fase
    if (clasificacionEtapa === 'precontractual') {
      const preparatoria = etapas.filter((e: any) => e.clasificacion === 'preparatoria' && e.aplica);
      const prepCompletas = preparatoria.filter((e: any) => e.estado === 'completado').length;
      if (preparatoria.length > 0 && prepCompletas < preparatoria.length) {
        errorSeguimiento.value = '⚠️ Debe completar todas las etapas de Preparatoria primero';
        etapa.estado = 'pendiente'; // Revertir cambio
        return;
      }
    }

    if (clasificacionEtapa === 'contractual') {
      const preparatoria = etapas.filter((e: any) => e.clasificacion === 'preparatoria' && e.aplica);
      const precontractual = etapas.filter((e: any) => e.clasificacion === 'precontractual' && e.aplica);
      const prepCompletas = preparatoria.filter((e: any) => e.estado === 'completado').length;
      const preContCompletas = precontractual.filter((e: any) => e.estado === 'completado').length;

      if (preparatoria.length > 0 && prepCompletas < preparatoria.length) {
        errorSeguimiento.value = '⚠️ Debe completar todas las etapas de Preparatoria primero';
        etapa.estado = 'pendiente';
        return;
      }
      if (precontractual.length > 0 && preContCompletas < precontractual.length) {
        errorSeguimiento.value = '⚠️ Debe completar todas las etapas de Precontractual primero';
        etapa.estado = 'pendiente';
        return;
      }
    }

    errorSeguimiento.value = '';
  }

  etapa.estado = nuevoEstado;
  if (etapa.estado === 'completado' && !etapa?.fechaReal) {
    // Asignar fecha de hoy en formato yyyy-MM-dd
    etapa.fechaReal = obtenerFechaHoyGuayaquil();
  }
  // Si el estado vuelve a pendiente, borrar la fecha real
  if (etapa.estado === 'pendiente') {
    etapa.fechaReal = null;
  }
  guardarEstadoEtapa();
}

function onFechaCompletadoChange(etapa: any) {
  if (!permiteEditarFechaCompletado) return;
  if (estadoNormalizado(etapa?.estado) !== 'completado') return;
  guardarEstadoEtapa();
}

function onFechaReformaChange(etapa: any) {
  etapa.fechaPlanificada = normalizarFechaInput(etapa?.fechaPlanificada);
  guardarEstadoEtapa();
}

function onFechaReforma3Change(etapa: any) {
  etapa.fechaReforma3 = normalizarFechaInput(etapa?.fechaReforma3);
  guardarEstadoEtapa();
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


async function guardarEstadoEtapa() {
  if (!actividadSeleccionada.value?.id) return;
  estadoGuardado.value = 'guardando';
  try {
    await api.put(`/subtareas/${subtareaIdActiva.value}/etapas`, {
      etapas: construirPayloadEtapas()
    });

    // Actualizar la fecha de última actualización del proceso
    const ahora = new Date().toISOString();
    ultimaActualizacionActividad.value = ahora;

    // Recargar el proceso completo después de guardar
    try {
      const response = await api.get(`/subtareas/${actividadSeleccionada.value.id}`);
      const procesoActualizado = response.data;
      if (procesoActualizado) {
        actividadSeleccionada.value = procesoActualizado;
        etapasActividad.value = procesoActualizado?.etapas || [];
        // NO sobrescribir la fecha: mantener el valor local que ya es correcto
        // El servidor actualizará la BD pero podría haber race condition
        actividadSeleccionada.value.updated_at = ahora;
        console.log('✅ Etapas recargadas:', etapasActividad.value.length);
      }
    } catch (refreshError) {
      console.warn('Error recargando proceso:', refreshError);
    }

    estadoGuardado.value = 'guardado';
    setTimeout(() => {
      estadoGuardado.value = null;
    }, 1500);
  } catch (error) {
    console.error('Error al guardar etapa:', error);
    estadoGuardado.value = null;
  }
}

async function seleccionarEtapaSeguimiento(etapa: any, actualizarRuta = true) {
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;
  nuevoComentario.value = '';
  nuevoAlerta.value = false;
  etapaSeguimiento.value = etapa;
  const etapaId = obtenerEtapaId(etapa);
  if (!actividadSeleccionada.value?.id) return;
  if (!etapaId) {
    seguimientosEtapa.value = [];
    mensajeSeguimiento.value = { texto: 'No se pudo identificar la etapa para cargar comentarios.', tipo: 'info' };
    return;
  }
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
  // Cargar en background sin esperar (lazy load)
  cargandoSeguimientos.value = true;
  cargarSeguimientosEtapa(etapaId).finally(() => {
    cargandoSeguimientos.value = false;
  });
}

async function cargarSeguimientosEtapa(etapaId: number) {
  if (!actividadSeleccionada.value?.id || !etapaId) return;
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await api.get(`/subtareas/${subtareaIdActiva.value}/etapas/${etapaId}/seguimientos`, {
      params: { dias: 365, limit: 50 }, // Últimos 365 días, máximo 50 registros
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('📥 Respuesta GET seguimientos:', response.data);
    const items = aplicarSeguimientosEtapa(etapaId, response.data);
    console.log('✅ Seguimientos normalizados:', items);
    if (!items.length) {
      mensajeSeguimiento.value = { texto: 'No hay seguimiento registrado todavía para esta etapa.', tipo: 'info' };
    }
  } catch (error: any) {
    if (error?.code !== 'ERR_CANCELED' && error?.response?.status !== 404) {
      errorSeguimiento.value = 'No se pudo cargar el historial de seguimiento';
    }
    seguimientosEtapa.value = [];
  }
}

async function guardarSeguimiento() {
  if (!actividadSeleccionada.value?.id || !etapaSeguimiento.value || !textareaComentario.value) return;
  const etapaId = obtenerEtapaId(etapaSeguimiento.value);
  if (!etapaId || !textareaComentario.value.value.trim()) return;

  guardandoSeguimiento.value = true;
  errorSeguimiento.value = '';
  mensajeSeguimiento.value = null;

  const subtareaRef = subtareaIdActiva.value;
  const datos = {
    fecha: new Date().toISOString().split('T')[0],
    comentario: textareaComentario.value.value.trim(),
    tiene_alerta: nuevoAlerta.value,
    responsable: 'Usuario'
  };

  try {
    console.log('📝 Guardando seguimiento:', { subtareaRef, etapaId, datos });

    // Guardar en el proceso actual (representante)
    const response = await api.post(
      `/subtareas/${subtareaRef}/etapas/${etapaId}/seguimientos`,
      datos
    );

    console.log('✅ Respuesta del servidor:', response.data);

    // Si el proceso es parte de un grupo agrupado, guardar en todos los del grupo (secuencialmente)
    const grupoDelProceso = actividadesAgrupadas.value.find((g: any) => g.representante.id === actividadSeleccionada.value?.id);
    let cantidad = 1;
    if (grupoDelProceso && grupoDelProceso.cantidad > 1) {
      cantidad = grupoDelProceso.cantidad;
      for (const p of grupoDelProceso.procesos) {
        if (p.id !== subtareaRef) {
          await api.post(`/subtareas/${p.id}/etapas/${etapaId}/seguimientos`, datos)
            .catch((err) => console.error(`❌ Error guardando seguimiento en proceso ${p.id}:`, err));
        }
      }
      console.log(`✅ Seguimiento aplicado a ${grupoDelProceso.cantidad} procesos agrupados`);
    }

    // No recargar - actualizar localmente con el nuevo seguimiento
    if (textareaComentario.value) textareaComentario.value.value = '';
    nuevoAlerta.value = false;
    const textoMsg = cantidad > 1 ? `Seguimiento guardado en ${cantidad} procesos agrupados.` : 'Seguimiento guardado correctamente.';
    mensajeSeguimiento.value = { texto: textoMsg, tipo: 'success' };

    // Actualizar la fecha de última actualización del proceso
    const ahora = new Date().toISOString();
    ultimaActualizacionActividad.value = ahora;
    if (actividadSeleccionada.value) {
      actividadSeleccionada.value.updated_at = ahora;
    }

    // Agregar el nuevo seguimiento a la lista local sin recargando toda
    console.log('📊 Datos de respuesta:', { seguimientos: response?.data?.seguimientos });
    if (response?.data?.seguimientos && Array.isArray(response.data.seguimientos)) {
      seguimientosEtapa.value = response.data.seguimientos.map((item: any) => ({
        ...item,
        etapaId: etapaId
      }));
      console.log('✅ Seguimientos actualizados localmente:', seguimientosEtapa.value.length, 'registros');
    } else {
      console.warn('⚠️  Sin seguimientos en respuesta, recargando desde servidor...');
      await cargarSeguimientosEtapa(etapaId);
    }

    // Recargar etapas y proceso para actualizar la tarjeta principal
    try {
      const etapasActualizadas = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas`);
      etapasActividad.value = etapasActualizadas.data || [];
      console.log('✅ Etapas recargadas para actualizar la tarjeta');
    } catch (err) {
      console.warn('⚠️ No se pudieron recargar las etapas:', err);
    }
  } catch (error: any) {
    console.error('❌ Error al guardar seguimiento:', error?.message);
    console.error('   Status:', error?.response?.status);
    console.error('   URL:', error?.config?.url);
    console.error('   Response:', error?.response?.data);
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
    const response = await api.delete(`/subtareas/${subtareaIdActiva.value}/etapas/${etapaId}/seguimientos/${seguimientoId}`);
    aplicarSeguimientosEtapa(etapaId, response.data);

    // Actualizar la fecha de última actualización del proceso
    const ahora = new Date().toISOString();
    ultimaActualizacionActividad.value = ahora;
    if (actividadSeleccionada.value) {
      actividadSeleccionada.value.updated_at = ahora;
    }

    // Si es un proceso agrupado, también eliminar en todos los del grupo
    const grupoDelProceso = actividadesAgrupadas.value.find((g: any) => g.representante.id === actividadSeleccionada.value?.id);
    if (grupoDelProceso && grupoDelProceso.cantidad > 1) {
      const promesasEliminar = grupoDelProceso.procesos
        .filter((p: any) => p.id !== subtareaIdActiva.value)
        .map((p: any) =>
          api.delete(`/subtareas/${p.id}/etapas/${etapaId}/seguimientos/${seguimientoId}`)
            .catch((err) => console.error(`Error eliminando seguimiento en proceso ${p.id}:`, err))
        );

      await Promise.all(promesasEliminar);
      console.log(`✅ Comentario eliminado de ${grupoDelProceso.cantidad} procesos agrupados`);
    }

    const cantidad = grupoDelProceso?.cantidad || 1;
    const textoMsg = cantidad > 1 ? `Comentario eliminado de ${cantidad} procesos agrupados.` : 'Comentario eliminado correctamente.';
    mensajeSeguimiento.value = { texto: textoMsg, tipo: 'success' };

    // Recargar etapas para actualizar la tarjeta principal
    try {
      const etapasActualizadas = await api.get(`/subtareas/${actividadSeleccionada.value.id}/etapas`);
      etapasActividad.value = etapasActualizadas.data || [];
      console.log('✅ Etapas recargadas después de eliminar seguimiento');
    } catch (err) {
      console.warn('⚠️ No se pudieron recargar las etapas:', err);
    }
  } catch (error) {
    console.error('Error al eliminar seguimiento:', error);
    errorSeguimiento.value = 'No se pudo eliminar el comentario';
  } finally {
    eliminandoSeguimientoId.value = null;
  }
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
    const response = await api.put(`/subtareas/${subtareaIdActiva.value}`, { activo });
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
    const response = await api.put(`/subtareas/${subtareaIdActiva.value}`, {
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

function obtenerClasificacionEtapa(etapa: any): string {
  const etapaId = etapa.etapaId || etapa.id;
  return catalogoEtapas.value[etapaId]?.clasificacion || 'sin_clasificar';
}

function obtenerEtiquetaClasificacion(etapa: any): string {
  const clasificacion = obtenerClasificacionEtapa(etapa);
  const etiquetas: Record<string, string> = {
    preparatoria: '🔵 Preparatoria',
    precontractual: '🟢 Precontractual',
    contractual: '🔴 Contractual',
    sin_clasificar: '⚪ Sin Clasificar'
  };
  return etiquetas[clasificacion] || '⚪ Sin Clasificar';
}
</script>

<style scoped>
.actividades-view {
  padding: 0 0.35rem 0.35rem;
  margin-top: -0.5rem;
}

.actividades-btn-filtros {
  position: sticky;
  top: 0;
  z-index: 45;
  display: flex;
  justify-content: flex-start;
  padding: 0.3rem 0 0 0;
  margin-bottom: 0.3rem;
  background: transparent;
}

.resumen-general-container {
  background: #fff;
  border: 1px solid #d9e2ea;
  border-radius: 8px;
  padding: 0.6rem 0.3rem;
  margin-bottom: 0.4rem;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.resumen-general-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
  padding: 0 0.3rem;
}

.resumen-general-titulo {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.2px;
}

.btn-toggle-resumen {
  background: none;
  border: 1px solid #e2e8f0;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 5px;
  transition: all 0.15s ease;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 400;
  white-space: nowrap;
}

.btn-toggle-resumen:hover {
  background-color: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.btn-toggle-resumen:active {
  transform: scale(0.98);
}

.toggle-icon {
  display: inline-block;
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.toggle-text {
  display: inline-block;
}

.actividades-resumen-grid {
  gap: 0.9rem;
  padding: 0.5rem 1rem 0.75rem;
}

.context-summary {
  background: #f9fafb;
  border: 1px solid #93c5fd;
  border-radius: 8px;
  padding: 0.08rem 0.12rem;
  margin-bottom: 0.08rem;
  box-shadow: none;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.15rem;
  align-items: center;
  margin-bottom: 0.1rem;
  min-height: 1rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  border: 1px solid #d9e2ea;
  background: #f8fafc;
  color: #475569;
  font-size: 0.65rem;
  font-weight: 500;
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
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.24rem 0.62rem;
  box-shadow: 0 1px 4px rgba(245, 158, 11, 0.3);
}

.filter-chip.riesgo-active {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  border-color: #f87171;
  color: #991b1b;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.24rem 0.62rem;
  box-shadow: 0 1px 4px rgba(239, 68, 68, 0.3);
}

.filter-chip.adjudicados-active {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border-color: #6ee7b7;
  color: #065f46;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.24rem 0.62rem;
  box-shadow: 0 1px 4px rgba(16, 185, 129, 0.3);
}

.btn-clear-filter {
  margin-left: auto;
  padding: 0.2rem 0.58rem;
  border-radius: 999px;
  border: 1px solid #fca5a5;
  background: #fef2f2;
  color: #dc2626;
  font-size: 0.69rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-clear-filter:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.btn-toggle-filtros {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.65rem;
  border-radius: 8px;
  border: 1px solid #3b82f6;
  background: linear-gradient(180deg, #3b82f6, #2563eb);
  color: #ffffff;
  font-size: 0.71rem;
  font-weight: 700;
  height: 1.72rem;
  line-height: 1.15;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-toggle-filtros:hover {
  background: linear-gradient(180deg, #2563eb, #1d4ed8);
  border-color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-toggle-filtros i {
  font-size: 0.8rem;
}

.dashboard-toolbar {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  padding: 0.4rem 0.5rem;
  background: #f9fafb;
  border-radius: 12px;
  box-shadow: none;
  margin-bottom: 0.5rem;
  border: none;
}

.toolbar-search-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1 0 auto;
  justify-content: flex-start;
}

.buscador-container {
  position: relative;
  min-width: 240px;
  width: clamp(240px, 30vw, 380px);
  flex: 1 1 auto;
}

.buscador-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  color: #94a3b8;
  pointer-events: none;
}

.buscador-input {
  border: 1px solid #e8e8e8;
  background: #fafafa;
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 500;
  padding: 0.3rem 0.5rem 0.3rem 1.8rem;
  border-radius: 6px;
  width: 100%;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.buscador-input::placeholder {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 400;
}

.buscador-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.dashboard-toolbar-filtros {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
}

.combo-filtro {
  border: 1px solid #e8e8e8;
  background: #fafafa;
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 500;
  border-radius: 6px;
  padding: 0.3rem 0.4rem;
  height: auto;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234b5563' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  padding-right: 1.8rem;
}
.combo-filtro:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.combo-filtro:hover {
  border-color: #cbd5e1;
}

.dashboard-toolbar-filtros .combo-filtro {
  border-top-color: #6366f1;
  color: #1e293b;
  width: clamp(140px, 15vw, 180px);
  max-width: 100%;
}
.dashboard-toolbar-filtros .combo-filtro:hover {
  border-top-color: #4f46e5;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  transform: translateY(-1px);
}
.dashboard-toolbar-filtros select.combo-filtro {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  text-align: left;
  padding-right: 1.8rem;
  text-align-last: left;
  background-image:
    linear-gradient(45deg, transparent 50%, #6366f1 50%),
    linear-gradient(135deg, #6366f1 50%, transparent 50%);
  background-position: calc(100% - 0.6rem) calc(50%), calc(100% - 0.3rem) calc(50%);
  background-size: 0.4rem 0.4rem, 0.4rem 0.4rem;
  background-repeat: no-repeat;
  background-color: unset;
}

.dashboard-toolbar-filtros select.combo-filtro option {
  text-align: left;
  padding: 0.5rem;
}

.dashboard-buscador-container .buscador-input.combo-filtro {
  background: #ffffff;
  border-top-color: #2563eb;
  color: #0f172a;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.1);
  padding-left: 2.4rem;
  padding-right: 0.85rem;
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
  width: 100%;
  font-size: 0.85rem;
  height: auto;
  line-height: 1;
}
.dashboard-buscador-container .buscador-input.combo-filtro::placeholder {
  color: #94a3b8;
  font-weight: 500;
}
.dashboard-buscador-container .buscador-input.combo-filtro:focus::placeholder {
  color: transparent;
}

.kpi-grid {
  display: grid;
  gap: 0.45rem;
}

.professional-kpi-grid {
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  align-items: stretch;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem 1.1rem;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  position: relative;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.kpi-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1);
  transform: translateY(-3px);
}

.kpi-card-active {
  background: #f0f4ff;
  border-color: #1e40af;
  box-shadow: 0 0 0 2px #1e40af, 0 10px 22px rgba(30, 64, 175, 0.15) !important;
}

.kpi-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  margin-bottom: 0.65rem;
}

.kpi-icon {
  width: 2rem;
  height: 2rem;
  font-size: 1.1rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.kpi-title {
  flex: 1;
  min-width: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.kpi-value {
  margin: 0;
  color: #0f172a;
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.5px;
}

.kpi-value-monto {
  margin: 0;
  color: #0f172a;
  font-size: 1.3rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.4px;
  word-break: break-word;
}

.kpi-foot {
  margin-top: auto;
  padding-top: 0.55rem;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.35;
}

.kpi-total-procesos .kpi-icon {
  background: #fef3c7;
  color: #b45309;
}

.kpi-total-procesos::before {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.kpi-monto-total .kpi-icon {
  background: #eef2ff;
  color: #4f46e5;
}

.kpi-monto-total::before {
  background: linear-gradient(90deg, #6366f1, #4f46e5);
}

.kpi-monto-pac .kpi-icon {
  background: #e0f2fe;
  color: #0369a1;
}

.kpi-monto-pac::before {
  background: linear-gradient(90deg, #0284c7, #0369a1);
}

.kpi-monto-nopac .kpi-icon {
  background: #dcfce7;
  color: #166534;
}

.kpi-monto-nopac::before {
  background: linear-gradient(90deg, #16a34a, #15803d);
}

.kpi-procesos-pac .kpi-icon {
  background: #dbeafe;
  color: #1e40af;
}

.kpi-procesos-pac::before {
  background: linear-gradient(90deg, #2563eb, #1d4ed8);
}

.kpi-procesos-nopac .kpi-icon {
  background: #fee2e2;
  color: #991b1b;
}

.kpi-procesos-nopac::before {
  background: linear-gradient(90deg, #dc2626, #991b1b);
}

.kpi-procesos-completos .kpi-icon {
  background: #dcfce7;
  color: #166534;
}

.kpi-procesos-completos::before {
  background: linear-gradient(90deg, #059669, #047857);
}

.kpi-procesos-retrasadas .kpi-icon {
  background: #fef3c7;
  color: #b45309;
}

.kpi-procesos-retrasadas::before {
  background: linear-gradient(90deg, #d97706, #b45309);
}

.kpi-procesos-riesgo {
  border-color: #fecaca;
}

.kpi-procesos-riesgo .kpi-icon {
  background: #fee2e2;
  color: #991b1b;
}

.kpi-procesos-riesgo::before {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.kpi-procesos-riesgo:hover {
  box-shadow: 0 10px 22px rgba(220, 38, 38, 0.15);
}

.kpi-procesos-desierto .kpi-icon {
  background: #f1f5f9;
  color: #475569;
}

.kpi-procesos-desierto::before {
  background: linear-gradient(90deg, #6b7280, #4b5563);
}

.kpi-donut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
}

.kpi-donut-row .kpi-value {
  margin: 0;
}

.kpi-mini-donut,
.actividad-mini-donut {
  --value: 0%;
  --kpi-color: #64748b;
  --actividad-color: var(--kpi-color);
  position: relative;
  width: 52px;
  height: 52px;
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
  inset: 7px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.kpi-mini-donut span,
.actividad-mini-donut span {
  position: relative;
  z-index: 1;
  font-size: 0.7rem;
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
  gap: 0.4rem !important;
}

.stat-avance-visual .actividad-mini-donut {
  width: 1.8rem !important;
  height: 1.8rem !important;
  font-size: 0.65rem !important;
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

.actividades-grupos {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.cuatrimestre-grupo {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.cuatrimestre-separador {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.cuatrimestre-separador::before,
.cuatrimestre-separador::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #cddcf5;
}

.actividad-card {
  position: relative;
  background: white;
  border-radius: 14px;
  border: 1px solid #d9e2ea;
  padding: 1rem;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
  overflow: hidden;
}

.actividad-card-riesgo {
  border-color: #fca5a5;
}

.actividad-card-desierto {
  border-color: #fdba74;
}

.actividad-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  font-size: clamp(1.9rem, 3.1vw, 2.9rem);
  font-weight: 900;
  letter-spacing: 0.16rem;
  color: rgba(185, 28, 28, 0.2);
  text-transform: uppercase;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  z-index: 60;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

.actividad-watermark.watermark-desierto {
  color: rgba(154, 52, 18, 0.2);
}

.actividad-watermark.watermark-sin-presupuesto {
  color: rgba(194, 65, 12, 0.22);
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

.actividad-ultima-actualizacion {
  margin: 0.5rem 0 0 0;
  font-size: 0.8rem;
  color: #64748b;
  font-style: italic;
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
  border: 1px solid #d9e2ea;
  border-radius: 999px;
  font-size: 0.71rem;
  font-weight: 600;
  color: #334155;
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

.actividad-meta-chip.pac-nopac {
  background: #dcfce7;
  border-color: #22c55e;
  color: #15803d;
  font-weight: 700;
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

.actividad-meta-chip.reforma {
  background: #e0e7ff;
  border-color: #6366f1;
  color: #3730a3;
  font-weight: 600;
}

.actividad-meta-chip.partidas-btn {
  background: #fef3c7;
  border-color: #fbbf24;
  color: #92400e;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.actividad-meta-chip.partidas-btn:hover {
  background: #fcd34d;
  border-color: #f59e0b;
  transform: scale(1.02);
}

.actividad-meta-chip.pac-nopac-badge {
  font-weight: 600;
}

.actividad-meta-chip.pac-chip {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1e40af;
}

.actividad-meta-chip.no-pac-chip {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.actividad-meta-chip.fase-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border: 1.5px solid #d1d5db;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.actividad-meta-chip.fase-preparatoria {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}

.actividad-meta-chip.fase-precontractual {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1e40af;
}

.actividad-meta-chip.fase-contractual {
  background: #e5e7eb;
  border-color: #9ca3af;
  color: #374151;
}

.actividad-meta-chip.fase-ejecución {
  background: #dcfce7;
  border-color: #22c55e;
  color: #15803d;
}

.partidas-expandidas {
  margin-top: 1rem;
  padding: 0.8rem;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
}

.partidas-header {
  font-size: 0.85rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.6rem;
}

.partidas-table {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.partida-fila {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1.2fr;
  gap: 0.6rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  font-size: 0.8rem;
}

.partida-header-row {
  background: #fed7aa;
  font-weight: 600;
  color: #92400e;
  border-radius: 4px;
  padding: 0.5rem 0.5rem;
}

.partida-fila:not(.partida-header-row) {
  background: #fffbeb;
  border-bottom: 1px solid #fcd34d;
  color: #b45309;
}

.partida-col {
  word-break: break-word;
}

.partida-col.codigo {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.75rem;
  font-weight: 600;
}

.partida-col.monto {
  text-align: right;
  font-weight: 600;
}

.actividad-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.stats-row-izq {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.stat {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border: 1.5px solid #d1d5db;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.stat:hover {
  border-color: #9ca3af;
  background: #f3f4f6;
}

.stat-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #3b82f6;
}

.stat-label {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 600;
}

.stat.retraso {
  background: #fef2f2;
  border-color: #fecaca;
  flex-shrink: 0;
  white-space: nowrap;
}

.stat.retraso .stat-value {
  color: #dc2626;
  min-width: 2rem;
  text-align: center;
}

.stat.retraso .stat-label {
  color: #991b1b;
}

.stat.estado {
  padding: 0 !important;
  border: none !important;
  background: none !important;
}

.stat.estado .stat-label {
  color: white;
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  margin: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.stat.estado .estado-preparatorio {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.stat.estado .estado-precontractual {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
}

.stat.estado .estado-contractual {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.stat.estado .estado-sin-clasificar {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  box-shadow: 0 2px 8px rgba(248, 113, 113, 0.3);
}

.stat.pac-nopac-badge {
  flex-direction: row !important;
  padding: 0.4rem 0.7rem !important;
  border-radius: 999px !important;
  transition: all 0.3s ease;
}

.stat.pac-nopac-badge.pac {
  background: #dbeafe !important;
  border: 1px solid #3b82f6 !important;
}

.stat.pac-nopac-badge.pac .stat-value {
  color: #1e40af;
  font-size: 0.9rem;
}

.stat.pac-nopac-badge.no-pac {
  background: #fef3c7 !important;
  border: 1px solid #f59e0b !important;
}

.stat.pac-nopac-badge.no-pac .stat-value {
  color: #b45309;
  font-size: 0.9rem;
}

.stat.pac-nopac-badge.pac .stat-label {
  color: #1e40af;
  font-weight: 600;
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
  background: #1D9E75;
  transition: width 0.3s;
}

.progress-bar-fill.avance-alto {
  background: #1D9E75;
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
  width: clamp(500px, 90vw, 1400px);
  max-height: 95vh;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #d9e2ea;
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
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
  background: #ffffff;
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
  flex-wrap: nowrap;
  gap: 0.6rem;
  overflow-x: auto;
  align-items: center;
  padding: 0.3rem 0;
}

.seguimiento-contexto-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.35rem 0.75rem 0.35rem 2.5rem;
  border-radius: 10px;
  border: 1px solid #d7dee8;
  background: #f8fafc;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
  white-space: nowrap;
  flex-shrink: 0;
}

.seguimiento-contexto-chip::before {
  content: '';
  position: absolute;
  left: 0.62rem;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  border: 1px solid #d7dee8;
  background: #eef2f7;
}

.seguimiento-contexto-chip::after {
  position: absolute;
  left: 1.07rem;
  font-size: 0.95rem;
  line-height: 1;
  color: #64748b;
}

.seguimiento-contexto-chip.neutral {
  border-color: #d7dee8;
  color: #334155;
}

.seguimiento-contexto-chip.neutral::before {
  background: #BA7517;
  border-color: #BA7517;
}

.seguimiento-contexto-chip.neutral::after {
  content: '•';
  color: #ffffff;
  left: 1.15rem;
  font-size: 1.05rem;
}

.seguimiento-contexto-chip.success {
  border-color: #d7dee8;
  color: #334155;
}

.seguimiento-contexto-chip.success::before {
  background: #eef2f7;
  border-color: #d7dee8;
}

.seguimiento-contexto-chip.success::after {
  content: '📅';
  color: #64748b;
}

.seguimiento-contexto-chip.quarter {
  border-color: #d7dee8;
  color: #334155;
}

.seguimiento-contexto-chip.quarter::before {
  background: #eef2f7;
  border-color: #d7dee8;
}

.seguimiento-contexto-chip.quarter::after {
  content: '🗓';
  color: #64748b;
}

.seguimiento-contexto-chip.amount {
  background: #f8fafc;
  border-color: #d7dee8;
  color: #334155;
}

.seguimiento-contexto-chip.amount::before {
  background: #eef2f7;
  border-color: #d7dee8;
}

.seguimiento-contexto-chip.amount::after {
  content: '$';
  font-weight: 900;
  color: #64748b;
}

.seguimiento-contexto-chip.last-activity {
  background: #f8fafc;
  border-color: #d7dee8;
  color: #334155;
}

.seguimiento-contexto-chip.last-activity::before {
  background: #eef2f7;
  border-color: #d7dee8;
}

.seguimiento-contexto-chip.last-activity::after {
  content: '✅';
  color: #64748b;
}

.seguimiento-contexto-chip.budget-warning {
  background: #fffaf2;
  border-color: #f3dcc2;
  color: #7c5a2a;
}

.seguimiento-contexto-chip.budget-warning::before {
  background: #fdf1df;
  border-color: #f3dcc2;
}

.seguimiento-contexto-chip.budget-warning::after {
  content: '!';
  font-weight: 900;
  color: #9a6a2f;
}

.seguimiento-contexto-chip.codigo-olympo {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0369a1;
}

.seguimiento-contexto-chip.codigo-olympo::before {
  background: #e0f2fe;
  border-color: #bae6fd;
}

.seguimiento-contexto-chip.procesos-asociados {
  background: #faf5ff;
  border-color: #e9d5ff;
  color: #7e22ce;
}

.seguimiento-contexto-chip.procesos-asociados::before {
  background: #f3e8ff;
  border-color: #e9d5ff;
}

.seguimiento-contexto-chip.ultima-actualizacion {
  background: #f5f3ff;
  border-color: #ddd6fe;
  color: #6366f1;
}

.seguimiento-contexto-chip.ultima-actualizacion::before {
  background: #ede9fe;
  border-color: #ddd6fe;
}

.ultima-actualizacion-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.95rem;
}

.ultima-actualizacion-label {
  color: #666;
  font-weight: 500;
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 0.5rem 1.2rem 1rem;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
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

.modal-detalle-actividad .modal-header,
.modal-seguimiento .modal-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
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
  justify-content: flex-start;
  gap: 0.6rem;
  flex-wrap: nowrap;
}

.riesgo-proceso-simple {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #9a3412;
  white-space: nowrap;
  border: 1px solid #fcd34d;
  background: #fffbeb;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
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

.btn-riesgo-icon {
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
  border-radius: 999px;
  border: 1px solid #86efac;
  background: #ecfdf3;
  color: #166534;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.18s ease;
  padding: 0.35rem 0.7rem;
}

.btn-editar-etapas {
  border-radius: 999px;
  border: 1px solid #93c5fd;
  background: #dbeafe;
  color: #1e40af;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.18s ease;
  padding: 0.35rem 0.7rem;
}

.botones-modal {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 120px;
}

.btn-primary {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.2);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: #e2e8f0;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #cbd5e1;
  border-color: #94a3b8;
  transform: translateY(-1px);
}

.btn-secondary:active {
  transform: translateY(0);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.modal-editar-etapas {
  width: 95%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-editar-etapas .modal-header-tabs {
  border-bottom: 1px solid #e2e8f0;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-editar-etapas .modal-header-tabs h2 {
  font-size: 1.25rem;
  margin: 0;
  color: #1e293b;
}

.etapas-editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.sin-etapas-editor {
  text-align: center;
  color: #94a3b8;
  padding: 3rem 2rem;
  font-style: italic;
}

.tabla-etapas-edicion {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.tabla-etapas-edicion thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.tabla-etapas-edicion th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
}

.tabla-etapas-edicion tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.2s ease;
}

.tabla-etapas-edicion tbody tr:hover {
  background: #f8fafc;
}

.etapa-fila-edicion td {
  padding: 1rem;
  vertical-align: middle;
}

.etapa-numero-col {
  text-align: center;
  font-weight: 600;
  color: #3b82f6;
}

.etapa-nombre-col {
  color: #1e293b;
  font-weight: 500;
}

.etapa-fecha-col {
  text-align: center;
}

.input-fecha-tabla {
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  width: 100%;
  box-sizing: border-box;
}

.input-fecha-tabla:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.etapa-estado-col {
  text-align: center;
}

.select-aplica,
.select-estado {
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-size: 0.85rem;
  width: 100%;
  box-sizing: border-box;
  background: white;
  cursor: pointer;
}

.select-aplica:focus,
.select-estado:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.etapas-editor-toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.busqueda-etapas-editor {
  flex: 1;
  min-width: 250px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  transition: all 0.2s ease;
}

.busqueda-etapas-editor:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.busqueda-etapas-editor .buscador-icon {
  font-size: 1rem;
  color: #94a3b8;
}

.input-busqueda-etapas-editor {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.9rem;
  color: #1e293b;
}

.input-busqueda-etapas-editor::placeholder {
  color: #cbd5e1;
}

.btn-clear-busqueda {
  padding: 0.3rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #cbd5e1;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-clear-busqueda:hover {
  color: #64748b;
  transform: scale(1.1);
}

.acciones-etapas-editor {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-toolbar-small {
  padding: 0.6rem 1rem;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-toolbar-small:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #1e293b;
}

.btn-toolbar-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f8fafc;
}

.etapa-checkbox-col {
  text-align: center;
  padding: 1rem !important;
}

.etapa-checkbox-col input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

.tabla-etapas-edicion th input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

.modal-nueva-etapa {
  width: 95%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-nueva-etapa .modal-header-tabs {
  border-bottom: 1px solid #e2e8f0;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-nueva-etapa .modal-header-tabs h2 {
  font-size: 1.25rem;
  margin: 0;
  color: #1e293b;
}

.formulario-nueva-etapa {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.formulario-nueva-etapa .form-grupo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.formulario-nueva-etapa .form-grupo label {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.9rem;
}

.input-nueva-etapa {
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #1e293b;
  font-family: inherit;
  transition: all 0.2s ease;
}

.input-nueva-etapa:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-nueva-etapa::placeholder {
  color: #cbd5e1;
}

.input-nueva-etapa textarea {
  resize: vertical;
  min-height: 80px;
}

.btn-riesgo-icon:hover,
.btn-riesgo-detalle:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(22, 101, 52, 0.14);
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

.timeline-horizontal {
  padding-bottom: 1rem;
}

.timeline-horizontal-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding: 0.35rem 0.2rem 0.1rem;
}

.timeline-step-horizontal {
  position: relative;
  min-width: 2.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.timeline-step-horizontal:not(:last-child) {
  flex: 1;
}

.timeline-step-line {
  position: absolute;
  top: 1rem;
  left: calc(50% + 0.85rem);
  right: calc(-50% + 0.85rem);
  height: 2px;
  background: #d6dee8;
}

.timeline-numero-actividad {
  position: relative;
  z-index: 1;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.timeline-numero-completo {
  background: #1D9E75;
  border-color: #1D9E75;
  color: #ffffff;
}

.timeline-numero-pendiente {
  background: #ffefe8;
  border-color: #fdbaaa;
  color: #9a3412;
}

.timeline-numero-atrasado {
  background: #E24B4A;
  border-color: #E24B4A;
  color: #ffffff;
}

.timeline-step-delay {
  font-size: 0.64rem;
  font-weight: 700;
  color: #991b1b;
  line-height: 1;
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
  background: #1D9E75;
}

.timeline-node.con_pendientes {
  background: #f59e0b;
}

.timeline-node.en_retraso {
  background: #E24B4A;
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
  background: #e2eefe;
}

.tabla-etapas thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #e2eefe;
}

.tabla-etapas th,
.tabla-etapas td {
  padding: 0.6rem;
  border-bottom: 1px solid #94a3b8;
  border-right: 1px solid #cbd5e1;
  text-align: left;
  vertical-align: top;
}

.tabla-etapas th:last-child,
.tabla-etapas td:last-child {
  border-right: none;
}

.fila-etapa-destacada {
  background: #eff6ff;
}

.fila-etapa-destacada td {
  border-bottom-color: #bfdbfe;
}

.etapas-accordion-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.etapas-accordion {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;

  .accordion-header {
    width: 100%;
    padding: 1rem;
    background: #f8fafc;
    border: none;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;
    color: #1e293b;
    transition: background 0.2s;

    &:hover {
      background: #f1f5f9;
    }

    &.active {
      background: #e0e7ff;
      color: #4f46e5;
    }

    .accordion-icon {
      display: inline-block;
      width: 1.2rem;
      text-align: center;
      font-size: 0.8rem;
    }

    .accordion-label {
      flex: 1;
    }

    .accordion-count {
      font-size: 0.85rem;
      color: #64748b;
    }
  }

  .accordion-content {
    background: white;
    padding: 0.75rem;
  }

  .sin-etapas-categoria {
    padding: 1rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.9rem;
  }
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
  background: #1D9E75;
  border-color: #1D9E75;
  color: #ffffff;
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
  color: #1D9E75;
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
  position: absolute;
  left: 50%;
  bottom: -0.26rem;
  transform: translateX(-50%);
}

.btn-seguimiento {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.seguimiento-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.seguimiento-last-update {
  font-size: 0.68rem;
  color: #475569;
  font-weight: 600;
}

.btn-seguimiento-icono {
  display: grid;
  place-items: center;
  width: 2.05rem;
  height: 2.05rem;
  border-radius: 999px;
  position: relative;
  padding: 0;
  gap: 0;
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
  background: #BA7517;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  border: 2px solid #ffffff;
}

.seguimiento-badge.is-amber {
  background: #BA7517;
}

.seguimiento-badge.is-alert {
  background: #E24B4A;
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
  z-index: 2100;
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

@media (max-width: 1100px) {
  .dashboard-toolbar-filtros {
    justify-content: center;
  }

  .dashboard-toolbar-filtros .combo-filtro {
    width: clamp(114px, 20vw, 156px);
  }
}

@media (max-width: 720px) {
  .professional-kpi-grid {
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

  .context-summary {
    padding: 0.28rem 0.38rem;
  }

  .dashboard-toolbar {
    align-items: stretch;
  }

  .toolbar-search-actions {
    width: 100%;
    justify-content: center;
  }

  .buscador-container {
    width: min(100%, 280px);
  }

  .dashboard-toolbar-filtros {
    width: 100%;
    gap: 0.24rem;
  }

  .dashboard-toolbar-filtros .combo-filtro {
    width: calc(50% - 0.12rem);
  }
}

@media (max-width: 520px) {
  .professional-kpi-grid {
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

  .dashboard-toolbar-filtros .combo-filtro {
    width: 100%;
  }
}

.modal-header-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  min-height: 32px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.riesgo-proceso-tools-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: nowrap;
}

/* Secciones del Modal */
.modal-informacion {
  padding: 0.9rem 1.2rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.avance-general-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  background: linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%);
  border: 1px solid #e9d5ff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(139, 92, 246, 0.08);
}

.tarjeta-icono-avance {
  font-size: 1.3rem;
  line-height: 1;
}

.tarjeta-info-avance {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.tarjeta-label-avance {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.tarjeta-valor-avance {
  font-size: 1.1rem;
  font-weight: 800;
  color: #8b5cf6;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
}

.estado-badge {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 500;
  white-space: nowrap;
}

.estado-badge.guardando {
  background: #fef3c7;
  color: #92400e;
  animation: pulse 1s infinite;
}

.estado-badge.guardado {
  background: #d1fae5;
  color: #065f46;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Tabla única de etapas */
.etapas-tabla-container {
  background: #ffffff;
  border: 1px solid #d9e2ea;
  border-radius: 10px;
  padding: 0.75rem;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  margin-bottom: 0.75rem;
  overflow-x: auto;
}

.tabla-etapas-unica {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  table-layout: auto;
}

.tabla-etapas-unica thead {
  background: #f8fafc;
  border-bottom: 2px solid #d9e2ea;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tabla-etapas-unica th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
}

.tabla-etapas-unica tbody tr {
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.15s ease;
}

.tabla-etapas-unica tbody tr:hover {
  background-color: #f8fafc;
}

.tabla-etapas-unica tbody tr.fila-preparatoria {
  border-left: 4px solid #3b82f6;
}

.tabla-etapas-unica tbody tr.fila-precontractual {
  border-left: 4px solid #10b981;
}

.tabla-etapas-unica tbody tr.fila-contractual {
  border-left: 4px solid #ef4444;
}

.tabla-etapas-unica tbody tr.fila-sin-clasificar {
  border-left: 4px solid #94a3b8;
}

.tabla-etapas-unica td {
  padding: 0.75rem;
  vertical-align: middle;
}

.etapa-fase-badge {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.etapa-fase-badge.fase-preparatoria {
  background: #dbeafe;
  color: #0c4a6e;
}

.etapa-fase-badge.fase-precontractual {
  background: #dcfce7;
  color: #14532d;
}

.etapa-fase-badge.fase-contractual {
  background: #fee2e2;
  color: #7f1d1d;
}

.etapa-fase-badge.fase-sin-clasificar {
  background: #e2e8f0;
  color: #1e293b;
}

.fila-etapa-destacada {
  background-color: #fef3c7 !important;
}

/* Estilos para procesos agrupados */
.badge-agrupados {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  cursor: pointer !important;
  transition: all 0.2s ease;
}

.badge-agrupados:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
  transform: scale(1.05);
}

.actividad-card-agrupada {
  cursor: pointer;
  transition: all 0.3s ease;
}

.actividad-card-agrupada:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 14px 30px rgba(15, 23, 42, 0.07);
}

.presupuesto-agrupado {
  margin: 0.8rem 0 0 0 !important;
  padding-top: 0.8rem;
  border-top: 2px solid #3b82f6;
  font-weight: 600;
}

.monto-total {
  display: block;
  font-size: 1.3rem;
  color: #3b82f6;
  font-weight: 700;
  margin-top: 0.3rem;
}

.procesos-expandidos {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f4f8;
  border-radius: 10px;
  border-left: 4px solid #3b82f6;
}

.procesos-expandidos-header {
  margin-bottom: 0.8rem;
  color: #1f2937;
  font-size: 0.9rem;
}

.procesos-lista {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.proceso-item {
  background: white;
  padding: 0.8rem;
  border-radius: 6px;
  border-left: 3px solid #10b981;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.proceso-item:hover {
  background: #f3f4f6;
  border-left-color: #059669;
  transform: translateX(2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.proceso-header-info {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.proceso-id {
  color: #6b7280;
  font-weight: 500;
}

.proceso-codigo {
  color: #6b7280;
  font-weight: 500;
}

.proceso-details {
  display: flex;
  gap: 1.5rem;
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.proceso-direccion {
  color: #4b5563;
  flex: 1;
  min-width: 150px;
}

.proceso-presupuesto {
  color: #059669;
  font-weight: 600;
  white-space: nowrap;
}

</style>
