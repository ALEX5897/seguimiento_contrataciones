<template>
  <div class="admin-actividades">
    <!-- Botón para agregar nueva actividad -->
    <div class="toolbar">
      <button class="btn-primary" @click="abrirFormularioNueva">
        ➕ Nuevo Proceso
      </button>
      <div class="buscador-container">
        <span class="buscador-icon">🔍</span>
        <input
          class="buscador-input"
          type="text"
          v-model="busqueda"
          placeholder="Buscar por nombre, código olympo, dirección o tipo..."
        />
        <button v-if="busqueda" class="buscador-clear" @click="busqueda = ''">✕</button>
      </div>
      <div class="filtros">
        <label>
          <input type="checkbox" v-model="mostrarSoloActivas" />
          Solo activas
        </label>
        <select class="select-orden" v-model="ordenarPor">
          <option value="id-asc">ID ↑</option>
          <option value="id-desc">ID ↓</option>
          <option value="nombre-asc">Nombre A-Z</option>
          <option value="nombre-desc">Nombre Z-A</option>
          <option value="presupuesto-desc">Presupuesto ↓</option>
          <option value="presupuesto-asc">Presupuesto ↑</option>
        </select>
      </div>
    </div>

    <!-- Error de carga de catálogos -->
    <div v-if="errorCargaCatalogos" class="catalogo-error">
      <span>⚠️ {{ errorCargaCatalogos }}</span>
    </div>

    <!-- Paginador (inicio) -->
    <div v-if="totalPaginasActs > 1" class="paginator">
      <button class="pag-btn" :disabled="paginaActual === 1" @click="paginaActual--">‹ Anterior</button>
      <span class="pag-info">Página {{ paginaActual }} de {{ totalPaginasActs }} · {{ actividadesFiltradas.length }} registros</span>
      <button class="pag-btn" :disabled="paginaActual >= totalPaginasActs" @click="paginaActual++">Siguiente ›</button>
    </div>

    <!-- Tabla de actividades -->
    <div class="tabla-container">
      <table class="tabla-actividades">
        <thead>
          <tr>
            <th @click="cambiarOrdenamiento('id-asc', 'id-desc')" class="header-ordenable">ID {{ indicadorOrdenamiento('id') }}</th>
            <th>Código Olympo</th>
            <th @click="cambiarOrdenamiento('nombre-asc', 'nombre-desc')" class="header-ordenable">Nombre {{ indicadorOrdenamiento('nombre') }}</th>
            <th @click="cambiarOrdenamiento('direccion-asc', 'direccion-desc')" class="header-ordenable">Dirección {{ indicadorOrdenamiento('direccion') }}</th>
            <th>Tipo Plan</th>
            <th>Número Reforma</th>
            <th @click="cambiarOrdenamiento('presupuesto-asc', 'presupuesto-desc')" class="header-ordenable">Presupuesto {{ indicadorOrdenamiento('presupuesto') }}</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="act in actividadesPaginadas" :key="act.id" :class="{ inactiva: estadoProcesoNumero(act.activo) === 0, desierta: estadoProcesoNumero(act.activo) === 2 }">
            <td>{{ act.id }}</td>
            <td>{{ act.codigoOlympo || 'N/A' }}</td>
            <td>{{ act.nombre }}</td>
            <td>{{ act.direccion || 'N/A' }}</td>
            <td>{{ act.tipoPlan }}</td>
            <td>{{ act.versionId || 'N/A' }}</td>
            <td>${{ formatearMontoMoneda(act.presupuesto || 0) }}</td>
            <td>
              <span :class="['badge', estadoProcesoBadgeClase(act.activo)]">
                {{ estadoProcesoLabel(act.activo) }}
              </span>
            </td>
            <td class="acciones">
              <button class="btn-small btn-ver" @click="verActividad(act)">👁️ Ver</button>
              <button class="btn-small btn-editar" @click="abrirFormularioEdicion(act)">✏️ Editar</button>
              <button class="btn-small btn-etapas" @click="abrirSelectorEtapas(act)">⚙️ Etapas</button>
              <select class="select-estado-rapido" :value="estadoProcesoNumero(act.activo)" @change="onEstadoProcesoRapidoChange(act, $event)">
                <option :value="1">Activo</option>
                <option :value="0">Inactivo</option>
                <option :value="2">Desierto</option>
              </select>
              <button class="btn-small btn-eliminar" @click="eliminarActividad(act)">🗑️ Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="actividadesFiltradas.length === 0" class="sin-datos">
        📭 No hay procesos para mostrar
      </div>
    </div>

    <!-- Paginador -->
    <div v-if="totalPaginasActs > 1" class="paginator">
      <button class="pag-btn" :disabled="paginaActual === 1" @click="paginaActual--">‹ Anterior</button>
      <span class="pag-info">Página {{ paginaActual }} de {{ totalPaginasActs }} · {{ actividadesFiltradas.length }} registros</span>
      <button class="pag-btn" :disabled="paginaActual >= totalPaginasActs" @click="paginaActual++">Siguiente ›</button>
    </div>

    <!-- Modal de Formulario Simplificado -->
    <div v-if="mostrarFormulario" class="modal-overlay" @click.self="cerrarFormulario">
      <div class="modal-content modal-form-simple" @click.stop>
        <div class="modal-header-simple">
          <h2>{{ modoEdicion ? '✏️ Editar Proceso' : '➕ Nuevo Proceso' }}</h2>
          <button class="btn-close-modal" @click="cerrarFormulario">✕</button>
        </div>

        <form @submit.prevent="guardarActividad" class="form-simple">
          <!-- Información Básica -->
          <div class="form-grupo">
            <label for="nombre">Nombre del Proceso *</label>
            <input
              id="nombre"
              v-model="formulario.nombre"
              type="text"
              required
              placeholder="Nombre del proceso o contrato"
            />
          </div>

          <div class="form-fila">
            <div class="form-grupo">
              <label for="codigoOlympo">Código Olympo *</label>
              <input
                id="codigoOlympo"
                v-model="formulario.codigoOlympo"
                type="text"
                required
                placeholder="Ej: 01.01.001.166.840107.000.009"
                :disabled="modoEdicion"
                :style="{ opacity: modoEdicion ? 0.6 : 1, cursor: modoEdicion ? 'not-allowed' : 'auto' }"
              />
              <small v-if="modoEdicion" class="field-help">No se puede editar el código Olympo</small>
            </div>
            <div class="form-grupo">
              <label for="direccion">Dirección *</label>
              <select id="direccion" v-model="formulario.direccion" required>
                <option value="">Seleccionar dirección...</option>
                <option
                  v-for="dir in direccionesCatalogo"
                  :key="dir.id"
                  :value="dir.nombre"
                >
                  {{ dir.nombre }}
                </option>
              </select>
            </div>
          </div>

          <!-- Plan y Presupuesto -->
          <div class="form-fila">
            <div class="form-grupo">
              <label for="tipoPlan">Tipo Plan *</label>
              <select id="tipoPlan" v-model="formulario.tipoPlan" required>
                <option value="PAC">PAC</option>
                <option value="No PAC">No PAC</option>
              </select>
            </div>
            <div class="form-grupo">
              <label for="presupuesto">Presupuesto</label>
              <input
                id="presupuesto"
                v-model="presupuestoTexto"
                type="text"
                inputmode="decimal"
                class="input-money"
                placeholder="Ej: 1.200,00"
                @input="onPresupuestoInput"
                @focus="onPresupuestoFocus"
                @blur="onPresupuestoBlur"
              />
            </div>
          </div>

          <!-- CPC y Partida -->
          <div class="form-fila">
            <div class="form-grupo">
              <label for="cpc">CPC *</label>
              <input
                id="cpc"
                v-model="formulario.cpc"
                type="text"
                required
                placeholder="Ej: 001"
              />
            </div>
            <div class="form-grupo">
              <label for="partidaPresupuestaria">Partida Presupuestaria</label>
              <input
                id="partidaPresupuestaria"
                v-model="formulario.partidaPresupuestaria"
                type="text"
                placeholder="Ej: 840107"
              />
            </div>
          </div>

          <!-- Financiamiento y Cuatrimestre -->
          <div class="form-fila">
            <div class="form-grupo">
              <label for="fuenteFinanciamiento">Fuente de Financiamiento</label>
              <input
                id="fuenteFinanciamiento"
                v-model="formulario.fuenteFinanciamiento"
                type="text"
                placeholder="Ej: Fondos Propios"
              />
            </div>
            <div class="form-grupo">
              <label for="cuatrimestre">Cuatrimestre *</label>
              <select id="cuatrimestre" v-model.number="formulario.cuatrimestre" required>
                <option :value="null">Seleccionar...</option>
                <option :value="1">1er Cuatrimestre</option>
                <option :value="2">2do Cuatrimestre</option>
                <option :value="3">3er Cuatrimestre</option>
              </select>
            </div>
          </div>

          <!-- Contratación -->
          <div class="form-grupo">
            <label for="tipoContratacion">Tipo de Contratación</label>
            <select id="tipoContratacion" v-model="formulario.tipoContratacion">
              <option value="">Seleccionar...</option>
              <option value="Compra de Bienes">Compra de Bienes</option>
              <option value="Prestación de Servicios">Prestación de Servicios</option>
              <option value="Ejecución de Obras">Ejecución de Obras</option>
              <option value="Consultoría">Consultoría</option>
              <option value="Arrendamiento">Arrendamiento</option>
            </select>
          </div>

          <!-- Versión -->
          <div class="form-grupo">
            <label for="versionId">Versión/Reforma</label>
            <input
              id="versionId"
              v-model.number="formulario.versionId"
              type="number"
              placeholder="ID de versión"
            />
          </div>

          <!-- Responsable (correo de seguimiento) -->
          <div class="form-grupo responsable-buscador">
            <label for="responsable">Responsable</label>
            <input
              id="responsable"
              v-model="responsableBusqueda"
              type="text"
              autocomplete="off"
              placeholder="Escribe para buscar un responsable..."
              @input="onResponsableBusquedaInput"
              @focus="mostrarSugerenciasResponsable = true"
              @blur="ocultarSugerenciasResponsableConDelay"
            />
            <button
              v-if="responsableBusqueda"
              type="button"
              class="btn-limpiar-responsable"
              @click="limpiarResponsable"
              title="Quitar responsable"
            >✕</button>
            <ul
              v-if="mostrarSugerenciasResponsable && responsableBusqueda && responsablesFiltrados.length > 0"
              class="lista-sugerencias-responsable"
            >
              <li
                v-for="r in responsablesFiltrados"
                :key="r.id"
                @mousedown.prevent="seleccionarResponsable(r)"
              >
                <span class="sugerencia-nombre">{{ r.nombre }}</span>
                <span v-if="r.email" class="sugerencia-email">{{ r.email }}</span>
              </li>
            </ul>
            <ul
              v-else-if="mostrarSugerenciasResponsable && responsableBusqueda && responsablesFiltrados.length === 0"
              class="lista-sugerencias-responsable"
            >
              <li class="sin-resultados">Sin coincidencias</li>
            </ul>
            <small class="field-help">A este responsable se le enviarán los correos de seguimiento del proceso.</small>
          </div>

          <!-- Botones -->
          <div class="botones-modal">
            <button type="submit" class="btn-primary">💾 Guardar</button>
            <button type="button" class="btn-secondary" @click="cerrarFormulario">❌ Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Selector de Etapas -->
    <div v-if="mostrarSelectorEtapas" class="modal-overlay" @click.self="cerrarSelectorEtapas">
      <div class="modal-content modal-etapas" @click.stop>
        <div class="modal-header-etapas">
          <div class="modal-header-copy">
            <p>{{ actividadSeleccionada?.nombre }}</p>
          </div>
          <button class="btn-close-modal" @click="cerrarSelectorEtapas">✕</button>
        </div>

        <div v-if="cargandoSelectorEtapas" class="loading-etapas-modal">
          Cargando etapas...
        </div>
        <template v-else>

        <div class="etapas-toolbar">
          <input
            v-model="busquedaEtapas"
            type="text"
            class="input-busqueda-etapas"
            placeholder="🔎 Buscar etapa..."
          />
          <div class="etapas-toolbar-actions">
            <button class="btn-toolbar" @click="marcarTodasEtapas">Marcar todas</button>
            <button class="btn-toolbar" @click="desmarcarTodasEtapas">Desmarcar todas</button>
          </div>
        </div>

        <div class="etapas-container">
          <div v-if="etapasFiltradas.length === 0" class="sin-etapas-encontradas">
            No hay etapas que coincidan con la búsqueda.
          </div>

          <!-- Acordeones por clasificación -->
          <div v-for="clasificacion in ['preparatoria', 'precontractual', 'contractual', 'sin_clasificar']" :key="clasificacion" class="etapas-accordion">
            <button
              class="accordion-header"
              :class="{ active: acordeoneAbiertos[clasificacion as keyof typeof acordeoneAbiertos] }"
              @click="acordeoneAbiertos[clasificacion as keyof typeof acordeoneAbiertos] = !acordeoneAbiertos[clasificacion as keyof typeof acordeoneAbiertos]"
            >
              <span class="accordion-icon">{{ acordeoneAbiertos[clasificacion as keyof typeof acordeoneAbiertos] ? '▼' : '▶' }}</span>
              <span class="accordion-label">
                {{ clasificacion === 'preparatoria' ? '🔵 Preparatoria' : clasificacion === 'precontractual' ? '🟢 Precontractual' : clasificacion === 'contractual' ? '🔴 Contractual' : '⚪ Sin Clasificar' }}
              </span>
              <span class="accordion-count">({{ (etapasAgrupadas[clasificacion] ?? []).length }})</span>
            </button>
            <div v-show="acordeoneAbiertos[clasificacion as keyof typeof acordeoneAbiertos]" class="accordion-content">
              <div v-if="(etapasAgrupadas[clasificacion] ?? []).length === 0" class="sin-etapas-categoria">
                No hay etapas en esta categoría
              </div>
              <div v-for="etapa in etapasAgrupadas[clasificacion]" :key="etapa.etapaId" class="etapa-item">
            <div class="etapa-checkbox">
              <label>

<input
  type="checkbox"
  v-model="etapa.aplica"
  @change="toggleEtapa(etapa, etapa.aplica)"
/>

                <span class="etapa-nombre">
                  {{ etapa.etapaNombre }}
                </span>
              </label>
            </div>
            <div v-if="etapa.aplica" class="etapa-fecha">
              <label>
                <span class="fecha-label">🗓️ Fecha reforma:</span>
                <input
                  type="date"
                  v-model="etapa.fechaReforma"
                  class="input-fecha"
                />
              </label>
              <label>
                <span class="fecha-label">📌 Estado:</span>
                <select
                  v-model="etapa.estado"
                  class="input-fecha"
                  @change="actualizarEstadoEtapa(etapa)"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="completado">Completo</option>
                </select>
              </label>
              <label v-if="normalizarEstadoEtapa(etapa.estado) === 'completado'">
                <span class="fecha-label">✅ Fecha completo:</span>
                <input
                  v-if="permiteEditarFechaCompletado"
                  type="date"
                  v-model="etapa.fechaReal"
                  class="input-fecha"
                  :disabled="etapaEstaGuardando(etapa)"
                  @change="actualizarFechaCompletado(etapa)"
                />
                <input
                  v-else
                  type="text"
                  :value="formatearFechaParaVista(etapa.fechaReal || '')"
                  class="input-fecha"
                  disabled
                />
              </label>
              <div
                v-if="normalizarEstadoEtapa(etapa.estado) === 'completado' && etapa.fechaTentativa && etapa.fechaReal"
                :class="['estado-entrega', claseComparacionEntrega(etapa)]"
              >
                {{ textoComparacionEntrega(etapa) }}
              </div>
              <span v-if="etapaEstaGuardando(etapa)" class="etapa-guardando">Guardando...</span>
            </div>
          </div>
            </div>
          </div>
        </div>

        <div class="botones-modal">
          <button class="btn-primary" @click="guardarEtapas" :disabled="guardandoEtapas">
            <span v-if="guardandoEtapas" class="spinner-btn"></span>
            <span>{{ guardandoEtapas ? 'Guardando...' : '💾 Guardar Etapas' }}</span>
          </button>
          <button class="btn-secondary" @click="cerrarSelectorEtapas" :disabled="guardandoEtapas">❌ Cancelar</button>
        </div>
        </template>
      </div>
    </div>

    <!-- Modal de Seguimientos Diarios -->
    <div v-if="mostrarSeguimientos" class="modal-overlay" @click.self="cerrarSeguimientosDiarios">
      <div class="modal-content modal-seguimientos" @click.stop>
        <div class="seguimientos-header">
          <h2>📋 Seguimiento Diario - {{ actividadSeleccionada?.nombre || 'Proceso' }} · {{ etapaActualSeguimiento?.etapaNombre }}</h2>
          <button class="btn-close" @click="cerrarSeguimientosDiarios">✕</button>
        </div>

        <div v-if="cargandoSeguimientosModal" class="loading-etapas-modal">
          Cargando seguimientos...
        </div>
        <div v-else class="seguimientos-content">
          <!-- Formulario para nuevo comentario -->
          <div class="nuevo-comentario-section">
            <h3>➕ Agregar Nuevo Comentario</h3>
            <div class="form-grupo">
              <label for="nuevoComentario">Comentario:</label>
              <textarea
                id="nuevoComentario"
                v-model="nuevoComentario"
                rows="3"
                placeholder="Describe el progreso o inconvenientes en esta etapa..."
                class="textarea-comentario"
              ></textarea>
            </div>
            <div class="form-grupo form-checkbox">
              <label class="alerta-checkbox">
                <input v-model="nuevoAlerta" type="checkbox" />
                <span class="alerta-label">🚨 Marcar como Alerta</span>
              </label>
            </div>
            <button class="btn-guardar-comentario" @click="guardarNuevoSeguimiento">
              💾 Guardar Comentario
            </button>
          </div>

          <!-- Lista de seguimientos -->
          <div class="seguimientos-list">
            <h3>📅 Historial completo de observaciones</h3>
            <div v-if="seguimientosDiarios.length === 0" class="sin-seguimientos">
              <p>📭 No hay seguimientos aún. ¡Comienza a registrar progreso!</p>
            </div>
            <div v-else class="seguimientos-items">
              <div
                v-for="seguimiento in seguimientosDiarios"
                :key="seguimiento.id"
                :class="['seguimiento-item', { 'con-alerta': seguimiento.tieneAlerta }]"
              >
                <div class="seguimiento-header">
                  <div class="seguimiento-fecha">
                    📅 {{ formatearFechaConHora(seguimiento.createdAt || seguimiento.created_at || seguimiento.fecha) }}
                  </div>
                  <div class="seguimiento-responsable">
                    👤 {{ seguimiento.responsableNombre || 'Sin responsable' }}
                  </div>
                  <button
                    class="btn-eliminar-seguimiento"
                    @click="eliminarSeguimiento(seguimiento.id)"
                    title="Eliminar seguimiento"
                  >
                    🗑️
                  </button>
                </div>
                <div class="seguimiento-contenido">
                  <p>{{ seguimiento.comentario }}</p>
                </div>
                <div v-if="seguimiento.tieneAlerta" class="alerta-badge">
                  🚨 ALERTA
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="botones-modal">
          <button class="btn-secondary" @click="cerrarSeguimientosDiarios">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Visualización -->
    <div v-if="mostrarVisualizacion" class="modal-overlay" @click.self="cerrarVisualizacion">
      <div class="modal-content modal-ver" @click.stop>
        <div class="ver-header">
          <div class="ver-header-copy">
            <p v-if="actividadVista">{{ actividadVista.nombre }}</p>
          </div>
          <button class="btn-close" @click="cerrarVisualizacion">✕</button>
        </div>

        <div v-if="cargandoVisualizacion" class="loading-etapas-modal">
          Cargando detalle del proceso...
        </div>

        <div v-else-if="actividadVista" class="ver-content">
          <!-- Información Principal -->
          <div class="ver-seccion ver-seccion-full">
            <h3 class="seccion-titulo">📌 Información General</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">ID:</span>
                <span class="info-valor">{{ actividadVista.id }}</span>
              </div>
              <div class="info-item full-width">
                <span class="info-label">Nombre:</span>
                <span class="info-valor">{{ actividadVista.nombre }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Código Olympo:</span>
                <span class="info-valor">{{ actividadVista.codigoOlympo || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Dirección:</span>
                <span class="info-valor">{{ actividadVista.direccion || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tipo Plan:</span>
                <span class="info-valor">{{ actividadVista.tipoPlan }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Activo:</span>
                <span :class="['badge', estadoProcesoBadgeClase(actividadVista.activo)]">
                  {{ estadoProcesoLabel(actividadVista.activo) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Información Presupuestaria -->
          <div class="ver-seccion">
            <h3 class="seccion-titulo">💰 Información Presupuestaria</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Presupuesto:</span>
                <span class="info-valor destacado">${{ formatearMontoMoneda(actividadVista.presupuesto || 0) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Partida Presupuestaria:</span>
                <span class="info-valor">{{ actividadVista.partidaPresupuestaria || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">CPC:</span>
                <span class="info-valor">{{ actividadVista.cpc || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fuente de Financiamiento:</span>
                <span class="info-valor">{{ actividadVista.fuenteFinanciamiento || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- Contratación -->
          <div class="ver-seccion">
            <h3 class="seccion-titulo">🛒 Información de Contratación</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Tipo de Contratación:</span>
                <span class="info-valor">{{ actividadVista.tipoContratacion || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Cuatrimestre:</span>
                <span class="info-valor">{{ actividadVista.cuatrimestre || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Versión/Reforma:</span>
                <span class="info-valor">{{ actividadVista.versionId || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- Riesgo y Auditoría -->
          <div class="ver-seccion">
            <h3 class="seccion-titulo">⚠️ Riesgo y Auditoría</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">En Riesgo:</span>
                <span :class="['badge', actividadVista.procesoEnRiesgo ? 'badge-riesgo' : 'badge-ok']">
                  {{ actividadVista.procesoEnRiesgo ? '⚠️ Sí' : '✅ No' }}
                </span>
              </div>
              <div v-if="actividadVista.riesgoComentario" class="info-item full-width">
                <span class="info-label">Detalle del Riesgo:</span>
                <span class="info-valor">{{ actividadVista.riesgoComentario }}</span>
              </div>
              <div v-if="actividadVista.createdAt" class="info-item">
                <span class="info-label">Creado:</span>
                <span class="info-valor">{{ new Date(actividadVista.createdAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>
              <div v-if="actividadVista.updatedAt" class="info-item">
                <span class="info-label">Última Actualización:</span>
                <span class="info-valor">{{ new Date(actividadVista.updatedAt).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="botones-modal">
          <button v-if="actividadVista" class="btn-primary" @click="editarDesdeVisualizacion">✏️ Editar</button>
          <button class="btn-secondary" @click="cerrarVisualizacion">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Toast de notificación -->
    <div v-if="notificacion.mensaje" :class="['toast', `toast-${notificacion.tipo}`]">
      {{ notificacion.mensaje }}
    </div>

    <!-- Modal de confirmación -->
    <div v-if="confirmar.activa" class="modal-overlay confirm-overlay" @click.self="confirmar.activa = false; confirmar.resolve(false)">
      <div class="confirm-modal" @click.stop>
        <div class="confirm-icon">⚠️</div>
        <h3 class="confirm-titulo">{{ confirmar.titulo }}</h3>
        <p class="confirm-msg">{{ confirmar.mensaje }}</p>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="confirmar.activa = false; confirmar.resolve(false)">Cancelar</button>
          <button class="btn-danger" @click="confirmar.activa = false; confirmar.resolve(true)">Sí, eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import api from '../services/api';
import { UI_FLAGS } from '../config/constants';
import { normalizarTextoBusqueda } from '../utils/search';

interface Actividad {
  id: number;
  nombre?: string;
  subtarea?: string;
  direccion?: string;
  direccionNombre?: string;
  responsableId?: number | null;
  responsableNombre?: string;
  responsableEmail?: string;
  codigoOlympo?: string;
  tipoPlan?: string;
  pacNoPac?: string;
  presupuesto?: number;
  cpc?: string;
  partidaPresupuestaria?: string;
  fuenteFinanciamiento?: string;
  cuatrimestre?: number | string | null;
  tipoContratacion?: string;
  activo?: boolean | number;
  versionId?: number | null;
  procesoEnRiesgo?: boolean | number;
  riesgoComentario?: string;
  createdAt?: string;
  updatedAt?: string;
  etapas?: any[];
}

interface Etapa {
  id?: number;
  etapaId?: number;
  etapaNombre?: string;
  nombre?: string;
  orden?: number;
  aplica: boolean;
  fechaTentativa?: string;
  fechaReforma?: string;
  fechaReal?: string;
  estado?: string;
  observaciones?: string;
  esPersonalizada?: boolean;
}

interface Responsable {
  id: number;
  nombre: string;
  direccionId?: number;
  direccionNombre?: string;
  email?: string;
}

interface DireccionCatalogo {
  id: number;
  nombre: string;
  activo: boolean;
}

// Estado
const actividades = ref<Actividad[]>([]);
const mostrarFormulario = ref(false);
const modoEdicion = ref(false);
const mostrarSelectorEtapas = ref(false);
const cargandoSelectorEtapas = ref(false);
const mostrarVisualizacion = ref(false);
const cargandoVisualizacion = ref(false);
const mostrarSoloActivas = ref(false);
const busqueda = ref('');
const ordenarPor = ref('id-asc');
const actividadSeleccionada = ref<Actividad | null>(null);
const actividadVista = ref<Actividad | null>(null);
const etapasDisponibles = ref<Etapa[]>([]);
const catalogoEtapas = ref<Record<number, any>>({});
const acordeoneAbiertos = ref({
  preparatoria: false,
  precontractual: false,
  contractual: false,
  sin_clasificar: false
});
const responsables = ref<Responsable[]>([]);
const direccionesCatalogo = ref<DireccionCatalogo[]>([]);
const errorCargaCatalogos = ref('');
const busquedaEtapas = ref('');
const responsableBusqueda = ref('');
const mostrarSugerenciasResponsable = ref(false);

// Pestañas del modal
// Seguimientos diarios
const mostrarSeguimientos = ref(false);
const cargandoSeguimientosModal = ref(false);
const etapaActualSeguimiento = ref<Etapa | null>(null);
const seguimientosDiarios = ref<any[]>([]);
const nuevoComentario = ref('');
const nuevoAlerta = ref(false);
const conteoSeguimientosEtapas = ref<Record<number, number>>({});
const guardandoEtapasPorId = ref<Record<number, boolean>>({});
const guardandoEtapas = ref(false);
const permiteEditarFechaCompletado = UI_FLAGS.ALLOW_MANUAL_COMPLETION_DATE;

function estadoProcesoNumero(value: unknown): 0 | 1 | 2 {
  if (value === undefined || value === null || value === '') return 1;
  if (typeof value === 'number') {
    if (value === 2) return 2;
    return value === 0 ? 0 : 1;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  const normalizado = String(value).trim().toLowerCase();
  if (['2', 'desierto'].includes(normalizado)) return 2;
  if (['0', 'false', 'inactivo'].includes(normalizado)) return 0;
  return 1;
}

function estadoProcesoLabel(value: unknown): string {
  switch (estadoProcesoNumero(value)) {
    case 2: return 'Desierto';
    case 0: return 'Inactivo';
    default: return 'Activo';
  }
}

function estadoProcesoBadgeClase(value: unknown): string {
  switch (estadoProcesoNumero(value)) {
    case 2: return 'badge-desierta';
    case 0: return 'badge-inactiva';
    default: return 'badge-activa';
  }
}

function getFormularioVacio(): Partial<Actividad> {
  return {
    nombre: '',
    codigoOlympo: '',
    direccion: '',
    tipoPlan: 'PAC',
    activo: 1,
    presupuesto: 0,
    cpc: '',
    partidaPresupuestaria: '',
    fuenteFinanciamiento: '',
    cuatrimestre: null,
    tipoContratacion: '',
    versionId: null,
    responsableId: null
  };
}

const formulario = ref<Partial<Actividad>>(getFormularioVacio());

const responsablesFiltrados = computed(() => {
  const texto = normalizarTextoBusqueda(responsableBusqueda.value.trim());
  if (!texto) return responsables.value.slice(0, 20);
  return responsables.value
    .filter((r) => normalizarTextoBusqueda(r.nombre || '').includes(texto))
    .slice(0, 20);
});

function seleccionarResponsable(r: Responsable) {
  formulario.value.responsableId = r.id;
  responsableBusqueda.value = r.nombre;
  mostrarSugerenciasResponsable.value = false;
}

function limpiarResponsable() {
  formulario.value.responsableId = null;
  responsableBusqueda.value = '';
  mostrarSugerenciasResponsable.value = false;
}

function onResponsableBusquedaInput() {
  // Si el texto ya no coincide con el responsable seleccionado, invalidar la selección
  formulario.value.responsableId = null;
  mostrarSugerenciasResponsable.value = true;
}

function ocultarSugerenciasResponsableConDelay() {
  setTimeout(() => { mostrarSugerenciasResponsable.value = false; }, 150);
}
const presupuestoTexto = ref('0,00');

const notificacion = ref<{ mensaje: string; tipo: 'success' | 'error' }>({ mensaje: '', tipo: 'success' });

// Modal de confirmación
const confirmar = ref({ activa: false, titulo: '', mensaje: '', resolve: (_: boolean) => {} });
function pedirConfirmacion(titulo: string, mensaje: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmar.value = { activa: true, titulo, mensaje, resolve };
  });
}

// Computed
const actividadesFiltradas = computed(() => {
  let resultado = actividades.value;
  if (mostrarSoloActivas.value) {
    resultado = resultado.filter(a => estadoProcesoNumero(a.activo) === 1);
  }
  if (busqueda.value.trim()) {
    const q = normalizarTextoBusqueda(busqueda.value);
    resultado = resultado.filter(a =>
      normalizarTextoBusqueda(a.nombre || '').includes(q) ||
      normalizarTextoBusqueda(a.codigoOlympo || '').includes(q) ||
      normalizarTextoBusqueda(a.direccionNombre || '').includes(q) ||
      normalizarTextoBusqueda(a.tipoPlan || '').includes(q)
    );
  }
  resultado = [...resultado].sort((a, b) => {
    switch (ordenarPor.value) {
      case 'nombre-asc':  return (a.nombre || '').localeCompare(b.nombre || '');
      case 'nombre-desc': return (b.nombre || '').localeCompare(a.nombre || '');
      case 'direccion-asc':  return (a.direccionNombre || '').localeCompare(b.direccionNombre || '');
      case 'direccion-desc': return (b.direccionNombre || '').localeCompare(a.direccionNombre || '');
      case 'presupuesto-asc':  return (a.presupuesto || 0) - (b.presupuesto || 0);
      case 'presupuesto-desc': return (b.presupuesto || 0) - (a.presupuesto || 0);
      case 'id-desc': return (b.id || 0) - (a.id || 0);
      default:            return (a.id || 0) - (b.id || 0);
    }
  });
  return resultado;
});

// Paginación
const paginaActual = ref(1);
const itemsPorPagina = 15;
const totalPaginasActs = computed(() => Math.ceil(actividadesFiltradas.value.length / itemsPorPagina));
const actividadesPaginadas = computed(() => {
  const start = (paginaActual.value - 1) * itemsPorPagina;
  return actividadesFiltradas.value.slice(start, start + itemsPorPagina);
});
watch([busqueda, mostrarSoloActivas, ordenarPor], () => { paginaActual.value = 1; });

const etapasFiltradas = computed(() => {
  const q = normalizarBusquedaEtapas(busquedaEtapas.value);
  if (!q) return etapasDisponibles.value;

  return etapasDisponibles.value.filter((etapa) =>
    normalizarBusquedaEtapas(String(etapa.etapaNombre || '')).includes(q)
  );
});

const etapasAgrupadas = computed(() => {
  const grupos: Record<string, any[]> = {
    preparatoria: [],
    precontractual: [],
    contractual: [],
    sin_clasificar: []
  };

  etapasFiltradas.value.forEach((etapa: any) => {
    const clasificacion = catalogoEtapas.value[etapa.etapaId]?.clasificacion || 'sin_clasificar';
    if (grupos[clasificacion]) {
      grupos[clasificacion]!.push(etapa);
    } else {
      grupos.sin_clasificar!.push(etapa);
    }
  });

  return grupos;
});

// Métodos
// Helper para convertir fecha ISO a formato yyyy-MM-dd para input date
function formatearFechaParaInput(fechaISO: string | Date | undefined | null): string {
  if (!fechaISO) return '';
  // Si ya es yyyy-MM-dd, devolver tal cual
  if (typeof fechaISO === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
    return fechaISO;
  }
  try {
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) return '';
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    console.error('Error al formatear fecha:', fechaISO);
    return '';
  }
}

// Helper para convertir fecha de input a formato ISO para la API
function formatearFechaParaAPI(fecha: string | undefined | null): string | null {
  if (!fecha) return null;
  try {
    // Si ya tiene formato ISO completo, devolverlo tal cual
    if (fecha.includes('T')) return fecha;
    // Si es solo fecha (yyyy-MM-dd), devolver tal cual para que el backend lo maneje
    return fecha;
  } catch (e) {
    console.error('Error al formatear fecha para API:', e);
    return null;
  }
}

function normalizarMontoMoneda(valor: string | number | undefined | null): number {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }

  const limpio = String(valor ?? '')
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!limpio) return 0;

  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');
  let normalizado = limpio;

  if (ultimaComa > -1 && ultimoPunto > -1) {
    const separadorDecimal = ultimaComa > ultimoPunto ? ',' : '.';
    const separadorMiles = separadorDecimal === ',' ? /\./g : /,/g;
    normalizado = limpio.replace(separadorMiles, '').replace(separadorDecimal, '.');
  } else if (ultimaComa > -1) {
    const decimales = limpio.length - ultimaComa - 1;
    normalizado = decimales === 3 ? limpio.replace(/,/g, '') : limpio.replace(',', '.');
  } else if (ultimoPunto > -1) {
    const decimales = limpio.length - ultimoPunto - 1;
    normalizado = decimales === 3 ? limpio.replace(/\./g, '') : limpio;
  }

  const monto = Number(normalizado);
  return Number.isFinite(monto) ? Math.max(0, monto) : 0;
}

function formatearMontoMoneda(valor: string | number | undefined | null): string {
  const monto = normalizarMontoMoneda(valor);
  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(monto);
}

function sincronizarPresupuestoTexto(valor: string | number | undefined | null) {
  const monto = normalizarMontoMoneda(valor);
  formulario.value.presupuesto = monto;
  presupuestoTexto.value = formatearMontoMoneda(monto);
}

function onPresupuestoInput() {
  formulario.value.presupuesto = normalizarMontoMoneda(presupuestoTexto.value);
}

function onPresupuestoBlur() {
  sincronizarPresupuestoTexto(presupuestoTexto.value);
}

function onPresupuestoFocus(event: Event) {
  (event.target as HTMLInputElement | null)?.select();
}

// Configuración del sistema
const editarFechaPlanificadaDirecciones = ref(false);
const configuracionCargada = ref(false);

async function cargarConfiguracion() {
  try {
    const response = await api.get('/configuracion/editar_fecha_planificada_direcciones');
    const valor = response.data?.valor;
    editarFechaPlanificadaDirecciones.value = valor === true || valor === '1' || valor === 1;
    configuracionCargada.value = true;
  } catch (error) {
    console.warn('No se pudo cargar configuración:', error);
    editarFechaPlanificadaDirecciones.value = false;
    configuracionCargada.value = true;
  }
}


onMounted(async () => {
  window.addEventListener('keydown', manejarEscapeModales);
  console.log('AdminActividades: montada');
  await Promise.all([cargarActividades(), cargarResponsables(), cargarDireccionesCatalogo(), cargarConfiguracion()]);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarEscapeModales);
});

function manejarEscapeModales(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;

  if (confirmar.value.activa) {
    confirmar.value.activa = false;
    confirmar.value.resolve(false);
    return;
  }
  if (mostrarSeguimientos.value) {
    cerrarSeguimientosDiarios();
    return;
  }
  if (mostrarSelectorEtapas.value) {
    cerrarSelectorEtapas();
    return;
  }
  if (mostrarFormulario.value) {
    cerrarFormulario();
    return;
  }
  if (mostrarVisualizacion.value) {
    cerrarVisualizacion();
  }
}

async function cargarActividades() {
  try {
    const response = await api.get('/subtareas', { params: { limit: 500, offset: 0 } });
    // Manejar respuesta que puede ser array o objeto con value/Count
    const datos = Array.isArray(response.data)
      ? response.data
      : (response.data.value || []);

    // Mapear campos del API al formato esperado por el componente
    actividades.value = datos.map((item: any) => mapearDatosDelBackend(item));

    console.log('Actividades cargadas:', actividades.value.length, 'procesos');
  } catch (error: any) {
    console.error('Error al cargar actividades:', error);
    mostrarNotificacion('Error al cargar actividades: ' + (error?.message || 'Desconocido'), 'error');
  }
}

async function cargarResponsables() {
  try {
    const response = await api.get('/catalogos/responsables');
    const rows = Array.isArray(response.data) ? response.data : (response.data.value || []);
    responsables.value = rows.filter((item: any) => item.activo !== false);
  } catch (error: any) {
    console.error('Error al cargar responsables:', error);
    if (error?.response?.status === 403) {
      errorCargaCatalogos.value = 'No tienes permisos para ver el catálogo de responsables.';
    } else {
      mostrarNotificacion('Error al cargar responsables', 'error');
    }
  }
}

async function cargarDireccionesCatalogo() {
  try {
    const response = await api.get('/catalogos/direcciones');
    const rows = Array.isArray(response.data) ? response.data : (response.data.value || []);
    direccionesCatalogo.value = rows.filter((item: any) => item.activo !== false);
  } catch (error: any) {
    console.error('Error al cargar direcciones del catálogo:', error);
    if (error?.response?.status === 403) {
      errorCargaCatalogos.value = 'No tienes permisos para ver el catálogo de direcciones.';
    } else {
      mostrarNotificacion('Error al cargar direcciones', 'error');
    }
  }
}

function abrirFormularioNueva() {
  modoEdicion.value = false;
  formulario.value = getFormularioVacio();
  responsableBusqueda.value = '';
  sincronizarPresupuestoTexto(formulario.value.presupuesto);
  mostrarFormulario.value = true;
}

async function abrirFormularioEdicion(actividad: Actividad) {
  modoEdicion.value = true;

  try {
    // Obtener datos completos del servidor para asegurar que tenemos todos los campos
    const response = await api.get(`/subtareas/${actividad.id}`);
    const actividadCompleta = mapearDatosDelBackend(response.data);

    console.log('📥 Datos recuperados del servidor:', {
      cpcDelServidor: response.data.cpc,
      versionIdDelServidor: response.data.versionId,
      tipoContratacionDelServidor: response.data.tipoContratacion,
      tipoPlanDelServidor: response.data.tipoPlan,
      datosCompletosDelBackend: actividadCompleta
    });

    // Crear un objeto con todos los campos del formulario
    const actividadNormalizada: Partial<Actividad> = {
      id: actividadCompleta.id,
      nombre: actividadCompleta.nombre || actividadCompleta.subtarea || '',
      codigoOlympo: actividadCompleta.codigoOlympo || '',
      direccion: actividadCompleta.direccion || '',
      tipoPlan: String(actividadCompleta.tipoPlan || 'PAC'),
      presupuesto: Number(actividadCompleta.presupuesto || 0),
      cpc: String(actividadCompleta.cpc || ''),
      partidaPresupuestaria: String(actividadCompleta.partidaPresupuestaria || ''),
      fuenteFinanciamiento: String(actividadCompleta.fuenteFinanciamiento || ''),
      cuatrimestre: actividadCompleta.cuatrimestre ? Number(actividadCompleta.cuatrimestre) : null,
      tipoContratacion: String(actividadCompleta.tipoContratacion || ''),
      activo: actividadCompleta.activo ? Number(actividadCompleta.activo) : 1,
      versionId: actividadCompleta.versionId || undefined,
      responsableId: actividadCompleta.responsableId || null
    };

    console.log('📝 Formulario normalizado:', actividadNormalizada);

    formulario.value = actividadNormalizada;
    responsableBusqueda.value = actividadCompleta.responsableId ? (actividadCompleta.responsableNombre || '') : '';
    sincronizarPresupuestoTexto(formulario.value.presupuesto);
    mostrarFormulario.value = true;
  } catch (error: any) {
    console.error('Error al cargar datos para editar:', error);
    mostrarNotificacion('❌ Error al cargar los datos del proceso', 'error');
    modoEdicion.value = false;
  }
}

function cerrarFormulario() {
  mostrarFormulario.value = false;
  formulario.value = getFormularioVacio();
  responsableBusqueda.value = '';
  sincronizarPresupuestoTexto(0);
}

async function guardarActividad() {
  try {
    // Validar campos requeridos
    if (!formulario.value.nombre || !formulario.value.nombre.trim()) {
      mostrarNotificacion('⚠️ El nombre del proceso es requerido', 'error');
      return;
    }
    if (!formulario.value.codigoOlympo || !formulario.value.codigoOlympo.trim()) {
      mostrarNotificacion('⚠️ El código Olympo es requerido', 'error');
      return;
    }
    if (!formulario.value.direccion || !formulario.value.direccion.trim()) {
      mostrarNotificacion('⚠️ La dirección es requerida', 'error');
      return;
    }
    if (!formulario.value.tipoPlan) {
      mostrarNotificacion('⚠️ El tipo de plan es requerido', 'error');
      return;
    }
    if (!formulario.value.cpc || !formulario.value.cpc.trim()) {
      mostrarNotificacion('⚠️ El CPC es requerido', 'error');
      return;
    }
    if (!formulario.value.cuatrimestre) {
      mostrarNotificacion('⚠️ El cuatrimestre es requerido', 'error');
      return;
    }

    const presupuestoNormalizado = normalizarMontoMoneda(presupuestoTexto.value);
    formulario.value.presupuesto = presupuestoNormalizado;
    presupuestoTexto.value = formatearMontoMoneda(presupuestoNormalizado);

    const payload = {
      nombre: formulario.value.nombre,
      subtarea: formulario.value.nombre,
      codigoOlympo: formulario.value.codigoOlympo,
      direccion: formulario.value.direccion,
      tipoPlan: formulario.value.tipoPlan,
      presupuesto: presupuestoNormalizado,
      cpc: formulario.value.cpc,
      partidaPresupuestaria: formulario.value.partidaPresupuestaria,
      fuenteFinanciamiento: formulario.value.fuenteFinanciamiento || null,
      cuatrimestre: formulario.value.cuatrimestre ? Number(formulario.value.cuatrimestre) : null,
      tipoContratacion: formulario.value.tipoContratacion,
      activo: formulario.value.activo ? 1 : 0,
      versionId: formulario.value.versionId || null,
      responsableId: formulario.value.responsableId || null
    };

    console.log('📤 Payload enviado:', {
      cpc: payload.cpc,
      versionId: payload.versionId,
      tipoContratacion: payload.tipoContratacion,
      tipoPlan: payload.tipoPlan,
      completo: payload
    });

    if (modoEdicion.value && formulario.value.id) {
      await api.put(`/subtareas/${formulario.value.id}`, payload);
      mostrarNotificacion('✅ Proceso actualizado correctamente', 'success');
    } else {
      await api.post('/subtareas', payload);
      mostrarNotificacion('✅ Proceso creado correctamente', 'success');
    }
    cerrarFormulario();
    await cargarActividades();
  } catch (error: any) {
    console.error('Error al guardar:', error);
    const mensajeError = error?.response?.data?.error || error?.message || 'Desconocido';
    mostrarNotificacion(`❌ Error al guardar: ${mensajeError}`, 'error');
  }
}

async function onEstadoProcesoRapidoChange(actividad: Actividad, event: Event) {
  const target = event.target as HTMLSelectElement | null;
  const nuevoEstado = estadoProcesoNumero(target?.value);
  const estadoAnterior = estadoProcesoNumero(actividad.activo);
  if (nuevoEstado === estadoAnterior) return;

  try {
    await api.put(`/subtareas/${actividad.id}`, {
      activo: nuevoEstado
    });
    actividad.activo = nuevoEstado;
    if (actividadVista.value?.id === actividad.id) {
      actividadVista.value = { ...actividadVista.value, activo: nuevoEstado };
    }
    mostrarNotificacion(`Proceso actualizado a estado ${estadoProcesoLabel(nuevoEstado)}`, 'success');
  } catch (error: any) {
    if (target) target.value = String(estadoAnterior);
    mostrarNotificacion('Error al cambiar el estado: ' + (error?.message || 'Desconocido'), 'error');
  }
}

async function eliminarActividad(actividad: Actividad) {
  if (!await pedirConfirmacion('Eliminar proceso', `¿Estás seguro de que deseas eliminar "${actividad.nombre}"?`)) {
    return;
  }

  try {
    await api.delete(`/subtareas/${actividad.id}`);
    mostrarNotificacion('Proceso eliminado correctamente', 'success');
    await cargarActividades();
  } catch (error: any) {
    mostrarNotificacion('Error al eliminar: ' + (error?.message || 'Desconocido'), 'error');
  }
}

function mapearDatosDelBackend(data: any): Actividad {
  // El API ya devuelve datos en camelCase, solo normalizamos tipos
  return {
    id: data.id,
    nombre: data.nombre || data.subtarea || '',
    subtarea: data.subtarea,
    direccion: data.direccion || '',
    codigoOlympo: data.codigoOlympo || '',
    tipoPlan: String(data.tipoPlan || data.pacNoPac || 'PAC'),
    pacNoPac: String(data.pacNoPac || data.tipoPlan || 'PAC'),
    presupuesto: Number(data.presupuesto || 0),
    cpc: String(data.cpc || ''),
    partidaPresupuestaria: String(data.partidaPresupuestaria || ''),
    fuenteFinanciamiento: String(data.fuenteFinanciamiento || ''),
    cuatrimestre: data.cuatrimestre ? Number(data.cuatrimestre) : null,
    tipoContratacion: String(data.tipoContratacion || ''),
    activo: data.activo ? 1 : 0,
    versionId: data.versionId ? Number(data.versionId) : null,
    responsableId: data.responsableId ? Number(data.responsableId) : null,
    responsableNombre: data.responsableNombre || '',
    responsableEmail: data.responsableEmail || '',
    procesoEnRiesgo: data.procesoEnRiesgo ? 1 : 0,
    riesgoComentario: data.riesgoComentario || '',
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
    etapas: data.etapas || []
  };
}

async function verActividad(actividad: Actividad) {
  mostrarVisualizacion.value = true;
  cargandoVisualizacion.value = true;
  actividadVista.value = actividad as any;

  try {
    // Cargar actividad completa con etapas
    const response = await api.get(`/subtareas/${actividad.id}`);
    actividadVista.value = mapearDatosDelBackend(response.data);
    
    // Cargar las etapas si existen
    if (actividadVista.value) {
      try {
        const etapasResponse = await api.get(`/subtareas/${actividad.id}/etapas`);
        actividadVista.value.etapas = etapasResponse.data;
      } catch (err) {
        console.log('No hay etapas para esta actividad');
      }
    }
    
  } catch (error: any) {
    mostrarNotificacion('Error al cargar el proceso: ' + (error?.message || 'Desconocido'), 'error');
  } finally {
    cargandoVisualizacion.value = false;
  }
}

function editarDesdeVisualizacion() {
  if (actividadVista.value) {
    cerrarVisualizacion();
    abrirFormularioEdicion(actividadVista.value);
  }
}

function cerrarVisualizacion() {
  mostrarVisualizacion.value = false;
  cargandoVisualizacion.value = false;
  actividadVista.value = null;
}

function parseFechaAdmin(fecha: string | Date | undefined | null): Date | null {
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

function obtenerFechaHoyAdmin() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
}

function formatearFechaParaVista(fecha: string | undefined | null): string {
  const fechaObj = parseFechaAdmin(fecha);
  if (!fechaObj) return 'No definida';
  return fechaObj.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
}

function obtenerMensajeError(error: any, fallback = 'Ocurrió un error inesperado') {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;
}

function obtenerEtapaId(etapa: Etapa | null | undefined): number | null {
  const valor = Number(etapa?.etapaId ?? etapa?.id);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function normalizarSeguimientos(payload: any): any[] {
  return Array.isArray(payload)
    ? payload
    : (payload?.seguimientos || payload || []);
}

function etapaEstaGuardando(etapa: Etapa): boolean {
  const etapaId = obtenerEtapaId(etapa);
  if (!etapaId) return false;
  return Boolean(guardandoEtapasPorId.value[etapaId]);
}

function diasRetrasoCompletado(etapa: Etapa): number {
  const fechaTentativaObj = parseFechaAdmin(etapa?.fechaTentativa);
  const fechaRealObj = parseFechaAdmin(etapa?.fechaReal);
  if (!fechaTentativaObj || !fechaRealObj) return 0;

  return Math.max(0, Math.floor((fechaRealObj.getTime() - fechaTentativaObj.getTime()) / (1000 * 60 * 60 * 24)));
}

function textoComparacionEntrega(etapa: Etapa): string {
  const dias = diasRetrasoCompletado(etapa);
  if (dias === 0) return '✅ A tiempo';
  return `⚠️ Con retraso (${dias} ${dias === 1 ? 'día' : 'días'})`;
}

function claseComparacionEntrega(etapa: Etapa): string {
  return diasRetrasoCompletado(etapa) === 0 ? 'a-tiempo' : 'con-retraso';
}

async function abrirSelectorEtapas(actividad: Actividad) {
  actividadSeleccionada.value = actividad;
  mostrarSelectorEtapas.value = true;
  cargandoSelectorEtapas.value = true;

  try {
    // 0. Cargar catálogo de etapas con clasificaciones
    console.log('📚 Cargando catálogo de etapas...');
    try {
      const catalogoResponse = await api.get('/catalogos/etapas');
      const catalogoData = Array.isArray(catalogoResponse.data)
        ? catalogoResponse.data
        : (catalogoResponse.data.value || []);
      catalogoEtapas.value = Object.fromEntries(
        catalogoData.map((e: any) => [e.id, { clasificacion: e.clasificacion, descripcion: e.descripcion }])
      );
      console.log('✅ Catálogo cargado:', Object.keys(catalogoEtapas.value).length, 'etapas');
    } catch (catalogoErr: any) {
      console.error('❌ Error cargando catálogo:', catalogoErr.message);
      catalogoEtapas.value = {};
    }

    // 1. Cargar TODAS las etapas disponibles del catálogo
    console.log('📋 Cargando etapas disponibles...');
    const todasEtapasResponse = await api.get('/subtareas/admin/etapas-disponibles');
    const todasEtapas = Array.isArray(todasEtapasResponse.data)
      ? todasEtapasResponse.data
      : (todasEtapasResponse.data.value || []);
    console.log('✅ Etapas disponibles cargadas:', todasEtapas.length, 'etapas');
    
    // 2. Cargar las asignaciones específicas de esta actividad
    let etapasAsignadas = [];
    try {
      const asignacionesResponse = await api.get(`/subtareas/${actividad.id}/etapas`);
      etapasAsignadas = Array.isArray(asignacionesResponse.data)
        ? asignacionesResponse.data
        : (asignacionesResponse.data.value || []);
      console.log('ETAPAS ASIGNADAS RAW:', JSON.stringify(etapasAsignadas, null, 2));
    } catch (err) {
      // Si no hay etapas asignadas aún (actividad nueva), es normal
      console.log('No hay etapas asignadas todavía');
    }

    // 3. Combinar: todas las etapas con sus asignaciones
    // Soporta distintas variantes de payload (camelCase/snake_case)
    etapasDisponibles.value = todasEtapas.map((etapa: any) => {
      const etapaId = Number(etapa.id ?? etapa.etapaId);
      // Buscar la asignación por etapaId
      const asignada = etapasAsignadas.find((a: any) => {
        const asignadaEtapaId = Number(a.etapaId ?? a.etapa_id ?? a.id);
        return asignadaEtapaId === etapaId;
      });

      // Si hay asignada, usar su fecha; si no, dejar undefined
      let fechaTentativa = "";
      let fechaReforma = "";

      // Buscar fechaReforma (que viene como fechaPlanificada del backend)
      if (asignada && (asignada.fechaReforma !== undefined && asignada.fechaReforma !== null)) {
        console.log(`[ETAPA ${etapaId}] fechaReforma directa:`, asignada.fechaReforma);
        fechaReforma = formatearFechaParaInput(asignada.fechaReforma);
      } else if (asignada && asignada.fecha_reforma) {
        console.log(`[ETAPA ${etapaId}] fecha_reforma snake_case:`, asignada.fecha_reforma);
        fechaReforma = formatearFechaParaInput(asignada.fecha_reforma);
      } else if (asignada && (asignada.fechaPlanificada !== undefined && asignada.fechaPlanificada !== null)) {
        console.log(`[ETAPA ${etapaId}] fechaPlanificada camelCase (→ fechaReforma):`, asignada.fechaPlanificada);
        fechaReforma = formatearFechaParaInput(asignada.fechaPlanificada);
      } else if (asignada && (asignada.fecha_planificada !== undefined && asignada.fecha_planificada !== null)) {
        console.log(`[ETAPA ${etapaId}] fecha_planificada snake_case (→ fechaReforma):`, asignada.fecha_planificada);
        fechaReforma = formatearFechaParaInput(asignada.fecha_planificada);
      } else {
        console.log(`[ETAPA ${etapaId}] Sin fecha asignada, se usará por defecto`);
      }

      const fechaRealAsignada = asignada?.fechaReal ?? asignada?.fecha_real ?? null;
      const estadoAsignado = asignada?.estado ?? 'pendiente';
      const observacionesAsignadas = asignada?.observaciones ?? '';
      console.log(`[ETAPA ${etapaId}] fechaReforma final para input:`, fechaReforma);
      return {
        etapaId,
        etapaNombre: etapa.nombre,
        aplica: Boolean(Number(asignada?.aplica)),
        fechaTentativa,
        fechaReforma,
        fechaReal: formatearFechaParaInput(fechaRealAsignada) || '',
        estado: estadoAsignado,
        observaciones: observacionesAsignadas,
        esPersonalizada: Boolean(Number(etapa.esPersonalizada ?? etapa.es_personalizada ?? 0))
      };
    });

    console.log('✅ Etapas procesadas:', etapasDisponibles.value.length, 'etapas');

    // Los conteos se cargan bajo demanda cuando el usuario abre seguimientos
    // (no hacer 67 requests al abrir el modal)
  } catch (error: any) {
    console.error('❌ Error al cargar etapas:', error);
    console.error('   Detalles:', error.message, error.response?.data);
    mostrarNotificacion('Error al cargar las etapas: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  } finally {
    cargandoSelectorEtapas.value = false;
    console.log('🎉 Modal de etapas listo');
  }

  
}

function cerrarSelectorEtapas() {
  mostrarSelectorEtapas.value = false;
  cargandoSelectorEtapas.value = false;
  actividadSeleccionada.value = null;
  etapasDisponibles.value = [];
  catalogoEtapas.value = {};
  conteoSeguimientosEtapas.value = {};
  busquedaEtapas.value = '';
}

function normalizarBusquedaEtapas(value: string) {
  return normalizarTextoBusqueda(value);
}

function marcarTodasEtapas() {
  etapasFiltradas.value.forEach((etapa) => {
    toggleEtapa(etapa, true);
  });
}

function desmarcarTodasEtapas() {
  etapasFiltradas.value.forEach((etapa) => {
    toggleEtapa(etapa, false);
  });
}

function toggleEtapa(etapa: Etapa, valor: boolean) {
  etapa.aplica = valor;
  // Si se desmarca, limpiar fecha tentativa
  if (!valor) {
    etapa.fechaReforma = '';
    etapa.estado = 'pendiente';
  }
}

async function guardarEtapas() {
  if (!actividadSeleccionada.value || guardandoEtapas.value) return;

  guardandoEtapas.value = true;
  try {
    await api.put(`/subtareas/${actividadSeleccionada.value.id}/etapas`, {
      etapas: construirPayloadEtapas()
    });
    mostrarNotificacion('Etapas guardadas correctamente', 'success');
    cerrarSelectorEtapas();
  } catch (error: any) {
    mostrarNotificacion('Error al guardar las etapas: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  } finally {
    guardandoEtapas.value = false;
  }
}

function construirPayloadEtapas() {
  return etapasDisponibles.value.map(e => {
    const fechaReformaFormateada = formatearFechaParaAPI(e.fechaReforma);

    return {
      etapaId: e.etapaId || e.id,
      aplica: e.aplica,
      fechaPlanificada: fechaReformaFormateada || '',
      estado: e.aplica ? normalizarEstadoEtapa(e.estado) : 'pendiente',
      fechaReal: e.aplica && normalizarEstadoEtapa(e.estado) === 'completado'
        ? formatearFechaParaAPI(e.fechaReal)
        : null,
      observaciones: e.aplica ? (e.observaciones || '') : ''
    };
  });
}

function normalizarEstadoEtapa(estado?: string | null) {
  return estado === 'completado' ? 'completado' : 'pendiente';
}

async function actualizarEstadoEtapa(etapa: Etapa) {
  if (!actividadSeleccionada.value) return;

  const etapaId = obtenerEtapaId(etapa);
  if (etapaId) {
    guardandoEtapasPorId.value[etapaId] = true;
  }

  etapa.estado = normalizarEstadoEtapa(etapa.estado);

  if (etapa.estado === 'completado' && !etapa.fechaReal) {
    etapa.fechaReal = obtenerFechaHoyAdmin();
  } else if (etapa.estado === 'pendiente') {
    etapa.fechaReal = '';
  }

  try {
    await api.put(`/subtareas/${actividadSeleccionada.value.id}/etapas`, {
      etapas: construirPayloadEtapas()
    });
  } catch (error: any) {
    mostrarNotificacion('Error al actualizar estado de etapa: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  } finally {
    if (etapaId) {
      guardandoEtapasPorId.value[etapaId] = false;
    }
  }
}

async function actualizarFechaCompletado(etapa: Etapa) {
  if (!permiteEditarFechaCompletado) return;
  if (normalizarEstadoEtapa(etapa.estado) !== 'completado') return;
  await actualizarEstadoEtapa(etapa);
}

function mostrarNotificacion(mensaje: string, tipo: 'success' | 'error') {
  notificacion.value = { mensaje, tipo };
  setTimeout(() => {
    notificacion.value = { mensaje: '', tipo: 'success' };
  }, 3000);
}

// ============ SEGUIMIENTOS DIARIOS ============

function cerrarSeguimientosDiarios() {
  mostrarSeguimientos.value = false;
  cargandoSeguimientosModal.value = false;
  etapaActualSeguimiento.value = null;
  seguimientosDiarios.value = [];
  nuevoComentario.value = '';
  nuevoAlerta.value = false;
}

async function guardarNuevoSeguimiento() {
  if (!actividadSeleccionada.value || !etapaActualSeguimiento.value) return;
  if (!nuevoComentario.value.trim()) {
    mostrarNotificacion('Ingresa un comentario', 'error');
    return;
  }

  try {
    const etapaId = obtenerEtapaId(etapaActualSeguimiento.value);
    if (!etapaId) {
      throw new Error('No se pudo identificar la etapa seleccionada');
    }

    const response = await api.post(
      `/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos`,
      {
        comentario: nuevoComentario.value.trim(),
        tieneAlerta: nuevoAlerta.value,
        responsableId: actividadSeleccionada.value.responsableId,
        fecha: obtenerFechaHoyAdmin()
      }
    );

    seguimientosDiarios.value = normalizarSeguimientos(response.data);
    conteoSeguimientosEtapas.value[etapaId] = seguimientosDiarios.value.length;
    nuevoComentario.value = '';
    nuevoAlerta.value = false;
    mostrarNotificacion('Seguimiento guardado', 'success');
  } catch (error: any) {
    console.error('Error al guardar seguimiento:', error);
    mostrarNotificacion('Error al guardar seguimiento: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  }
}

async function eliminarSeguimiento(seguimientoId: number) {
  if (!await pedirConfirmacion('Eliminar seguimiento', '¿Estás seguro de que deseas eliminar este seguimiento?')) return;

  if (!actividadSeleccionada.value || !etapaActualSeguimiento.value) return;

  try {
    const etapaId = obtenerEtapaId(etapaActualSeguimiento.value);
    if (!etapaId) {
      throw new Error('No se pudo identificar la etapa seleccionada');
    }

    const response = await api.delete(
      `/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos/${seguimientoId}`
    );

    seguimientosDiarios.value = normalizarSeguimientos(response.data);
    conteoSeguimientosEtapas.value[etapaId] = seguimientosDiarios.value.length;
    mostrarNotificacion('Seguimiento eliminado', 'success');
  } catch (error: any) {
    console.error('Error al eliminar seguimiento:', error);
    mostrarNotificacion('Error al eliminar seguimiento: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  }
}

function formatearFechaConHora(fechaISO: string | undefined | null): string {
  if (!fechaISO) return 'Sin fecha';
  try {
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) return 'Fecha invalida';
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yyyy = String(fecha.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return 'Fecha invalida';
  }
}

function cambiarOrdenamiento(ascendente: string, descendente: string) {
  if (ordenarPor.value === ascendente) {
    ordenarPor.value = descendente;
  } else {
    ordenarPor.value = ascendente;
  }
}

function indicadorOrdenamiento(campo: string): string {
  const orden = ordenarPor.value;
  if (orden.startsWith(campo)) {
    return orden.endsWith('asc') ? '↑' : '↓';
  }
  return '';
}

</script>

<style scoped lang="scss">
.admin-actividades {
  padding: 0.25rem;
  max-width: 1400px;
  margin: 0 auto;
  background: transparent;
  min-height: auto;

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
    flex-wrap: wrap;
    background: #fff;
    border: 1px solid #d9e2ea;
    border-radius: 14px;
    padding: 0.75rem;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);

    .buscador-container {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 220px;
      max-width: 380px;

      .buscador-icon {
        position: absolute;
        left: 0.65rem;
        font-size: 0.9rem;
        pointer-events: none;
        color: #6b7280;
      }

      .buscador-input {
        width: 100%;
        padding: 0.5rem 2rem 0.5rem 2.1rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.2s;

        &:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }
      }

      .buscador-clear {
        position: absolute;
        right: 0.5rem;
        background: none;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        font-size: 0.85rem;
        padding: 0 0.2rem;
        &:hover { color: #374151; }
      }
    }

    .filtros {
      display: flex;
      gap: 1rem;
      align-items: center;

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 500;

        input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
        }
      }

      .select-orden {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.9rem;
        cursor: pointer;
        outline: none;
        &:focus { border-color: #3b82f6; }
      }
    }
  }

  .config-panel {
    margin-bottom: 1rem;
    background: #f8fafc;
    border: 1px solid #d9e2ea;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);

    details {
      &[open] {
        summary {
          border-bottom: 1px solid #d9e2ea;
        }
      }
    }

    .config-summary {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s;
      list-style: none;

      &:hover {
        background-color: #eef2f7;
      }

      .config-icon {
        font-size: 1.2rem;
      }

      .config-title {
        font-weight: 600;
        color: #334155;
        flex: 1;
      }

      .config-status {
        font-size: 0.85rem;
        color: #64748b;
      }
    }

    .config-content {
      padding: 1.5rem;
      background: white;
    }

    .config-item {
      .config-label {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        cursor: pointer;
        user-select: none;
        margin-bottom: 1rem;

        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          margin-top: 0.25rem;
          cursor: pointer;
          accent-color: #3b82f6;
        }

        .label-text {
          font-weight: 500;
          color: #1f2937;
          padding-top: 0.25rem;
        }
      }

      .config-description {
        margin: 0 0 1rem 2.5rem;
        font-size: 0.9rem;
        color: #64748b;
        line-height: 1.5;
      }

      .config-message {
        margin-left: 2.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        animation: slideInDown 0.3s ease;

        &.config-message-success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        &.config-message-error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
      }
    }
  }

  .tabla-container {
    background: white;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #d9e2ea;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
  }

  .tabla-actividades {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;

    thead {
      background: #f8fafc;
      color: #334155;
      font-weight: 600;

      th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #f8fafc;

        &.header-ordenable {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.15s ease, color 0.15s ease;

          &:hover {
            background-color: #e2e8f0;
            color: #1e293b;
          }

          &:active {
            background-color: #cbd5e1;
          }
        }
      }
    }

    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #eee;

      &:last-child {
        border-right: none;
      }
    }

    tbody tr {
      transition: background-color 0.2s;

      &:hover {
        background-color: #f8fafc;
      }

      &.inactiva {
        opacity: 0.72;
        background-color: #f8fafc;
      }

      &.desierta {
        background-color: #fff7ed;
      }
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;

      &.badge-activa {
        background-color: #d4edda;
        color: #155724;
      }

      &.badge-inactiva {
        background-color: #f8d7da;
        color: #721c24;
      }

      &.badge-desierta {
        background-color: #ffedd5;
        color: #9a3412;
      }
    }

    .acciones {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      align-items: center;
      padding: 0.25rem;

      .btn-small {
        flex-shrink: 0;
      }

      .select-estado-rapido {
        flex-shrink: 0;
        padding: 0.45rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background-color: #ffffff;
        color: #374151;
        cursor: pointer;
        transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

        &:hover {
          border-color: #9ca3af;
          background-color: #f9fafb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        &:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
      }
    }
  }

  .sin-datos {
    padding: 3rem;
    text-align: center;
    color: #999;
    font-size: 1.1rem;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal-content {
    background: white;
    border-radius: 14px;
    border: 1px solid #d9e2ea;
    padding: 0;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 56px rgba(15, 23, 42, 0.18);

    &.modal-with-tabs {
      max-width: 850px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;

      .modal-header-tabs {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;

        h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #1e293b;
          font-weight: 700;
        }

        .btn-close-modal {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;

          &:hover {
            background: rgba(0, 0, 0, 0.05);
            color: #1e293b;
          }
        }
      }

      .tabs-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .tabs-nav {
        padding: 0.5rem 2rem 0 2rem;
        gap: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        background: white !important;
        flex-wrap: wrap;
        box-shadow: none !important;

        .tab-btn {
          padding: 0.8rem 1.2rem;
          font-size: 0.95rem;
          font-weight: 500;
          background: transparent;
          color: #64748b;
          border: none;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          position: relative;
          bottom: -2px;
          white-space: nowrap;

          &:hover:not(.tab-active) {
            color: #475569;
            background: rgba(100, 116, 139, 0.05);
            border-bottom-color: #cbd5e1;
          }

          &.tab-active {
            color: #3b82f6;
            font-weight: 600;
            background: transparent;
            border-bottom-color: #3b82f6;
            box-shadow: none;
          }
        }
      }

      .tabs-content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        padding-bottom: 1rem;

        &::-webkit-scrollbar {
          width: 8px;
        }

        &::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        &::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;

          &:hover {
            background: #94a3b8;
          }
        }

        .tab-pane {
          animation: fadeIn 0.2s ease-out;
        }

        .form-grupo {
          margin-bottom: 1.3rem;

          label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1e293b;
            font-size: 0.95rem;
          }

          input[type="text"],
          input[type="number"],
          input[type="date"],
          select,
          textarea {
            width: 100%;
            padding: 0.75rem 0.9rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: inherit;
            transition: all 0.2s;
            background: white;

            &:hover {
              border-color: #cbd5e1;
            }

            &:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
              background: #f0f9ff;
            }
          }

          .field-help {
            display: block;
            margin-top: 0.35rem;
            color: #64748b;
            font-size: 0.8rem;
            line-height: 1.4;
          }
        }

        .form-fila {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;

          .form-grupo {
            margin-bottom: 0;
          }

          &.full-width {
            grid-template-columns: 1fr;
          }
        }
      }

      .botones-modal {
        padding: 1.2rem 2rem;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;

        button {
          padding: 0.8rem 1.8rem;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          flex-shrink: 0;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }

          &:active {
            transform: translateY(0);
          }
        }

        .btn-secondary {
          background: white;
          color: #64748b;
          border: 2px solid #e2e8f0;

          &:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #1e293b;
          }
        }
      }
    }

    &.modal-form-simple {
      max-width: 700px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;

      .modal-header-simple {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;

        h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #1e293b;
          font-weight: 700;
        }

        .btn-close-modal {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;

          &:hover {
            background: rgba(0, 0, 0, 0.05);
            color: #1e293b;
          }
        }
      }

      .form-simple {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
        background: white;

        .form-grupo {
          margin-bottom: 1.3rem;

          label {
            display: block;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1e293b;
            font-size: 0.95rem;

            input[type="checkbox"] {
              margin-right: 0.5rem;
              cursor: pointer;
            }
          }

          input[type="text"],
          input[type="number"],
          input[type="date"],
          select,
          textarea {
            width: 100%;
            padding: 0.75rem 0.9rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: inherit;
            transition: all 0.2s;
            background: white;

            &:hover {
              border-color: #cbd5e1;
            }

            &:focus {
              outline: none;
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
              background: #f0f9ff;
            }
          }

          textarea {
            resize: vertical;
            min-height: 80px;
          }
        }

        .form-fila {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;

          .form-grupo {
            margin-bottom: 0;
          }
        }

        .botones-modal {
          display: flex;
          gap: 0.8rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;

          button {
            flex: 1;
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;

            &.btn-primary {
              background: #3b82f6;
              color: white;

              &:hover {
                background: #2563eb;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
              }

              &:active {
                transform: scale(0.98);
              }
            }

            &.btn-secondary {
              background: #e2e8f0;
              color: #1e293b;

              &:hover {
                background: #cbd5e1;
              }

              &:active {
                transform: scale(0.98);
              }
            }
          }
        }
      }
    }

    &.modal-etapas {
      max-width: 750px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);

      .modal-header-etapas {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.5rem 1.75rem;
        border-bottom: 1px solid #cbd5e1;
        background: linear-gradient(135deg, #1f3a70 0%, #2d4a7f 50%, #1f3a70 100%);
        color: white;
        flex-shrink: 0;

        .modal-header-copy {
          min-width: 0;

          p {
            margin: 0;
            color: #e0f2fe;
            font-size: 1rem;
            line-height: 1.5;
            word-break: break-word;
            font-weight: 500;
          }
        }

        .btn-close-modal {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.2s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            background: rgba(255, 255, 255, 0.25);
            border-color: rgba(255, 255, 255, 0.4);
            transform: scale(1.05);
          }

          &:active {
            transform: scale(0.95);
          }
        }
      }

      h2 {
        display: none;
      }

      .etapas-toolbar {
        margin-bottom: 0.75rem;
        padding: 0 1.5rem;
        padding-top: 1rem;
      }

      .etapas-container {
        flex: 1;
        min-height: 0;
        max-height: none;
        margin-bottom: 0;
        padding: 0 1.5rem;
        overflow-y: auto;
      }

      .botones-modal {
        position: sticky;
        bottom: 0;
        margin-top: 1rem;
        padding: 1.25rem 1.75rem;
        background: linear-gradient(to bottom, white 0%, #f8fafc 100%);
        border-top: 1px solid #e1e8f2;
        z-index: 2;
        display: flex;
        gap: 1rem;
        justify-content: flex-start;
      }
    }

    h2 {
      margin: 0 0 1.5rem 0;
      color: #2c3e50;
      font-size: 1.5rem;
    }

    h3 {
      margin: 0 0 1rem 0;
      color: #667eea;
      font-size: 1.1rem;
    }

    .etapas-accordion {
      margin-bottom: 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;

      .accordion-header {
        width: 100%;
        padding: 1.1rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%);
        border: 1px solid #e2e8f0;
        text-align: left;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        color: #1e293b;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 8px;

        &:hover {
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }

        &.active {
          background: linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%);
          color: #1e40af;
          border-color: #a5b4fc;
        }

        .accordion-icon {
          display: inline-block;
          width: 1.2rem;
          text-align: center;
          font-size: 0.8rem;
          transition: transform 0.2s;
        }

        .accordion-label {
          flex: 1;
        }

        .accordion-count {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
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

    .etapas-container {
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 1.5rem;
      padding-right: 0.5rem;

      &::-webkit-scrollbar {
        width: 8px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }

      &::-webkit-scrollbar-thumb {
        background: #667eea;
        border-radius: 10px;

        &:hover {
          background: #5568d3;
        }
      }

      .etapa-item {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.1rem;
        margin-bottom: 0.75rem;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);

        &:hover {
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
          border-color: #cbd5e1;
          transform: translateY(-2px);
        }

        .etapa-checkbox {
          margin-bottom: 0.75rem;

          label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;

            input[type="checkbox"] {
              cursor: pointer;
              width: 18px;
              height: 18px;
              accent-color: #667eea;
            }

            .etapa-nombre {
              font-weight: 500;
              color: #2c3e50;
              display: flex;
              align-items: center;
              gap: 0.5rem;
              flex: 1;
            }
          }
        }

        .etapa-fecha {
          padding-left: 1.75rem;
          animation: slideDown 0.3s ease-out;

          .etapa-guardando {
            display: inline-block;
            margin-top: 0.35rem;
            color: #667eea;
            font-size: 0.85rem;
            font-weight: 600;
          }

          .estado-entrega {
            margin-top: 0.25rem;
            font-size: 0.82rem;
            font-weight: 600;

            &.a-tiempo {
              color: #166534;
            }

            &.con-retraso {
              color: #b91c1c;
            }
          }

          label {
            display: flex;
            align-items: center;
            gap: 0.75rem;

            .fecha-label {
              font-size: 0.9rem;
              color: #666;
              font-weight: 500;
              white-space: nowrap;
            }

            .input-fecha {
              padding: 0.5rem;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 0.95rem;
              font-family: inherit;
              transition: border-color 0.2s;
              flex: 1;

              &:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
              }
            }
          }
        }
      }
    }

    .etapas-toolbar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;

      .input-busqueda-etapas {
        flex: 1;
        padding: 0.55rem 0.7rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.92rem;

        &:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      }

      .etapas-toolbar-actions {
        display: flex;
        gap: 0.5rem;
      }

      .btn-toolbar {
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #334155;
        border-radius: 8px;
        padding: 0.5rem 0.7rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;

        &:hover {
          border-color: #93c5fd;
          background: #eff6ff;
          color: #1d4ed8;
        }
      }
    }

    .sin-etapas-encontradas {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
      color: #64748b;
      text-align: center;
      background: #f8fafc;
    }

    .form-grupo {
      margin-bottom: 1.5rem;

      label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #2c3e50;
      }

      input[type="text"],
      input[type="number"],
      input[type="date"],
      select,
      textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
        font-family: inherit;
        transition: border-color 0.2s;

        &:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      }

      .input-money {
        text-align: right;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
      }

      .textarea-observaciones-proceso {
        min-height: 140px;
        resize: vertical;
        background: #f8fafc;
        line-height: 1.6;
        font-size: 0.95rem;
        padding: 0.85rem;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #3b82f6;
          background: #f0f9ff;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        &:hover:not(:focus) {
          border-color: #cbd5e1;
        }
      }

      .field-help {
        display: block;
        margin-top: 0.4rem;
        color: #64748b;
        font-size: 0.82rem;
        line-height: 1.35;
      }

      &.responsable-buscador {
        position: relative;

        .btn-limpiar-responsable {
          position: absolute;
          right: 0.6rem;
          top: 2.55rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.95rem;
          line-height: 1;
          padding: 0.2rem;

          &:hover {
            color: #ef4444;
          }
        }

        .lista-sugerencias-responsable {
          position: absolute;
          left: 0;
          right: 0;
          top: 100%;
          z-index: 30;
          margin: 0.25rem 0 0;
          padding: 0.25rem 0;
          list-style: none;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
          max-height: 220px;
          overflow-y: auto;

          li {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 0.75rem;
            padding: 0.5rem 0.85rem;
            cursor: pointer;
            font-size: 0.9rem;

            &:hover {
              background: #f0f4ff;
            }

            &.sin-resultados {
              color: #94a3b8;
              cursor: default;
              font-style: italic;

              &:hover {
                background: none;
              }
            }
          }

          .sugerencia-nombre {
            color: #1e293b;
            font-weight: 500;
          }

          .sugerencia-email {
            color: #94a3b8;
            font-size: 0.78rem;
            white-space: nowrap;
          }
        }
      }

      &.form-checkbox label {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
      }
    }

    .form-fila {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      .form-grupo {
        margin-bottom: 0;
      }
    }

    .botones-modal {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;

      button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }

  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 6px;
    font-weight: 600;
    animation: slideIn 0.3s ease-out;
    z-index: 1001;

    &.toast-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    &.toast-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideDown {
    from {
      max-height: 0;
      opacity: 0;
      margin-top: 0;
    }
    to {
      max-height: 100px;
      opacity: 1;
      margin-top: 0.75rem;
    }
  }

  @keyframes slideInDown {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
}

// Estilos para botones
.btn-primary,
.btn-secondary,
.btn-small,
.btn-editar,
.btn-etapas,
.btn-desactivar,
.btn-activar,
.btn-eliminar {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  font-size: 0.95rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.14);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-primary {
  background: #2563eb;
  border: 1px solid #1d4ed8;
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    transform: none !important;
  }
}

.btn-secondary {
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none !important;
  }
}

.spinner-btn {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin-btn 0.65s linear infinite;
  flex-shrink: 0;
}

@keyframes spin-btn {
  to { transform: rotate(360deg); }
}

.btn-secondary {
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;

  &:hover {
    background-color: #f1f5f9;
  }
}

.btn-small {
  padding: 0.45rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #3b82f6;
  border: 1px solid #2563eb;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background-color: #2563eb;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-editar {
  background-color: #2563eb;
  border-color: #1d4ed8;

  &:hover {
    background-color: #1d4ed8;
  }
}

.btn-etapas {
  background-color: #0891b2;
  border-color: #0e7490;

  &:hover {
    background-color: #0e7490;
  }
}

.btn-desactivar {
  background-color: #f97316;
  border-color: #ea580c;

  &:hover {
    background-color: #ea580c;
  }
}

.btn-activar {
  background-color: #16a34a;
  border-color: #15803d;

  &:hover {
    background-color: #15803d;
  }
}

.btn-eliminar {
  background-color: #ef4444;
  border-color: #dc2626;

  &:hover {
    background-color: #dc2626;
  }
}

.btn-ver {
  background-color: #64748b;
  border-color: #475569;
  color: white;

  &:hover {
    background-color: #475569;
  }
}

.btn-close {
  background: #f8fafc;
  color: #64748b;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background-color: #e2e8f0;
    color: #0f172a;
    transform: none;
  }
}

// Modal de Visualización
.admin-actividades .modal-content.modal-ver {
  width: min(99vw, 1500px) !important;
  max-width: 1500px !important;
  max-height: 94vh;
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;

  .ver-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem 1.75rem;
    border-bottom: 1px solid #cbd5e1;
    background: linear-gradient(135deg, #1f3a70 0%, #2d4a7f 50%, #1f3a70 100%);
    color: white;
    position: sticky;
    top: 0;
    z-index: 10;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 2px 8px rgba(31, 58, 112, 0.15);

    .ver-header-copy {
      min-width: 0;

      h2 {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 700;
        letter-spacing: -0.5px;
      }

      p {
        margin: 0.5rem 0 0;
        color: #e0f2fe;
        font-size: 0.95rem;
        line-height: 1.5;
        word-break: break-word;
        font-weight: 500;
      }
    }

    .btn-close {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.2s;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.4);
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }

  .ver-content {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%);
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
    align-items: start;
  }

  .ver-seccion {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 0;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5);
      transform: translateY(-3px);
      border-color: #cbd5e1;
    }

    .seccion-titulo {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 1.35rem 0;
      padding-bottom: 0.85rem;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
  }

  .ver-seccion-full {
    grid-column: 1 / -1;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.9rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    &.full-width {
      grid-column: 1 / -1;
    }

    .info-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .info-valor {
      font-size: 1.05rem;
      color: #1e293b;
      font-weight: 600;
      padding: 0.65rem 0.95rem;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      transition: all 0.2s;

      &:hover {
        background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
        transform: translateX(2px);
      }

      &.destacado {
        font-size: 1.3rem;
        font-weight: 800;
        color: #059669;
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
        border-left-color: #059669;
      }
    }
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &.badge-activa {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    &.badge-inactiva {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      color: #4b5563;
      border: 1px solid #d1d5db;
    }

    &.badge-desierta {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #7f1d1d;
      border: 1px solid #fca5a5;
    }

    &.badge-riesgo {
      background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
      color: #7f1d1d;
      border: 1px solid #f87171;
    }

    &.badge-ok {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
  }

  .badge-estado {
    display: inline-block;
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    &.estado-pendiente {
      background: #fef3c7;
      color: #7c5000;
    }

    &.estado-en_proceso {
      background: #dbeafe;
      color: #1d4ed8;
    }

    &.estado-completado {
      background: #dcfce7;
      color: #166534;
    }
  }

  .progreso-container {
    display: flex;
    align-items: center;
    gap: 1rem;

    .progreso-barra {
      flex: 1;
      height: 24px;
      background: #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);

      .progreso-fill {
        height: 100%;
        background: #334155;
        border-radius: 12px;
        transition: width 0.4s ease;
        box-shadow: none;
      }
    }

    .progreso-texto {
      font-weight: 700;
      color: #667eea;
      font-size: 1rem;
      min-width: 45px;
      text-align: right;
    }
  }

  .observaciones-texto {
    padding: 1rem 1.1rem;
    background: #f8fafc;
    border-radius: 10px;
    border-left: 4px solid #64748b;
    font-size: 1rem;
    line-height: 1.7;
    color: #2c3e50;
    white-space: pre-wrap;
  }

  .etapas-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;

    .etapa-card {
      background: #ffffff;
      border: 1px solid #d9e2ea;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.2s;

      &:hover {
        border-color: #cbd5e1;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        transform: translateY(-2px);
      }

      .etapa-nombre-vista {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
      }

      .etapa-fecha-vista {
        font-size: 0.85rem;
        color: #666;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .estado-entrega-vista {
        font-weight: 600;

        &.a-tiempo {
          color: #166534;
        }

        &.con-retraso {
          color: #b91c1c;
        }
      }
    }
  }

  .botones-modal {
    padding: 1.25rem 1.75rem;
    background: linear-gradient(to bottom, white 0%, #f8fafc 100%);
    border-top: 1px solid #e1e8f2;
    position: sticky;
    bottom: 0;
    border-radius: 0 0 12px 12px;
    display: flex;
    gap: 1rem;
    justify-content: flex-start;

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .btn-primary {
      background: linear-gradient(135deg, #1f3a70 0%, #2d4a7f 100%);
      color: white;
      border: 1px solid #1a2f5a;

      &:hover {
        background: linear-gradient(135deg, #1a2f5a 0%, #243e6b 100%);
      }
    }

    .btn-secondary {
      background: linear-gradient(135deg, #e1e8f2 0%, #cbd5e1 100%);
      color: #1f3a70;
      border: 1px solid #cbd5e1;

      &:hover {
        background: linear-gradient(135deg, #cbd5e1 0%, #b0bcd4 100%);
        color: #0f2f55;
      }
    }
  }
}

@media (max-width: 980px) {
  .admin-actividades .modal-content.modal-ver {
    width: 98vw !important;
    max-width: 98vw !important;
    max-height: 96vh;

    .ver-content {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
  }

  // Estilos para modal de seguimientos diarios
  .modal-seguimientos {
    max-width: 600px !important;
    max-height: 80vh !important;
    display: flex;
    flex-direction: column;
    overflow: hidden !important;
  }

  .seguimientos-header {
    position: sticky;
    top: 0;
    z-index: 3;
    background: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #d9e2ea;

    h2 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.3rem;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: #333;
      }
    }
  }

  .seguimientos-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .nuevo-comentario-section {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #d9e2ea;

    h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1rem;
    }

    .textarea-comentario {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 0.95rem;
      resize: vertical;

      &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
    }

    .form-checkbox {
      margin: 1rem 0;

      .alerta-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-weight: 500;

        input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
          accent-color: #e74c3c;
        }

        .alerta-label {
          color: #e74c3c;
        }
      }
    }

    .btn-guardar-comentario {
      width: 100%;
      padding: 0.75rem;
      background: #1d4ed8;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 24px rgba(29, 78, 216, 0.22);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  .seguimientos-list {
    h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1rem;
    }

    .sin-seguimientos {
      text-align: center;
      padding: 2rem;
      background: #f9f9f9;
      border-radius: 8px;
      color: #999;
      border: 2px dashed #ddd;
    }
  }

  .seguimientos-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .seguimiento-item {
    background: white;
    border: 1px solid #d9e2ea;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s;

    &:hover {
      border-color: #cbd5e1;
      background: #f9f9fa;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
    }

    &.con-alerta {
      border-left: 4px solid #e74c3c;
      background: #fffafa;
    }

    .seguimiento-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;

      .seguimiento-fecha {
        font-size: 0.85rem;
        color: #667eea;
        font-weight: 600;
      }

      .seguimiento-responsable {
        font-size: 0.85rem;
        color: #666;
      }

      .btn-eliminar-seguimiento {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        padding: 0.25rem 0.5rem;
        opacity: 0.6;
        transition: opacity 0.2s;

        &:hover {
          opacity: 1;
        }
      }
    }

    .seguimiento-contenido {
      margin-bottom: 0.75rem;

      p {
        margin: 0;
        color: #2c3e50;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
    }

    .alerta-badge {
      display: inline-block;
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  .btn-seguimiento-diario {
    margin-top: 0.75rem;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2);
    }
  }

  .seguimiento-count {
    min-width: 1.4rem;
    height: 1.4rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.24);
    border: 1px solid rgba(255, 255, 255, 0.5);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1;
    padding: 0 0.25rem;
  }

  .etapa-fecha-real-vista {
    color: #1e8449;
    font-weight: 600;
  }
}

/* Paginador */
 paginator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-top: 0.6rem;
}

.pag-btn {
  padding: 0.4rem 1rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #1d4ed8;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.pag-btn:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #93c5fd;
}

.pag-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pag-info {
  font-size: 0.83rem;
  color: #64748b;
  min-width: 14ch;
  text-align: center;
}

/* Modal de confirmación */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

.confirm-modal {
  background: #fff;
  border-radius: 14px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
}

.confirm-icon {
  font-size: 2.4rem;
  margin-bottom: 0.6rem;
}

.confirm-titulo {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  color: #0f172a;
}

.confirm-msg {
  margin: 0 0 1.4rem;
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn-danger {
  padding: 0.5rem 1.2rem;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-danger:hover {
  background: #b91c1c;
}

/* Pulido visual final */
.admin-actividades .toolbar,
.admin-actividades .tabla-container,
.admin-actividades .paginator {
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.admin-actividades .tabla-actividades tbody tr {
  transition: background-color 0.16s ease;
}

.admin-actividades .tabla-actividades tbody tr:hover {
  background: #f8fafc;
}

.admin-actividades .buscador-input:focus,
.admin-actividades .select-orden:focus,
.admin-actividades input:focus,
.admin-actividades select:focus,
.admin-actividades textarea:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.admin-actividades .btn-small,
.admin-actividades .btn-primary,
.admin-actividades .btn-secondary {
  border-radius: 8px;
}

.admin-actividades .btn-small:focus-visible,
.admin-actividades .btn-primary:focus-visible,
.admin-actividades .btn-secondary:focus-visible,
.admin-actividades .pag-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.admin-actividades .modal-content,
.admin-actividades .confirm-modal {
  border: 1px solid #e2e8f0;
}

@media (max-width: 768px) {
  .admin-actividades .modal-content.modal-etapas {
    width: 95%;
    max-height: 92vh;
    padding: 1rem;
  }

  .admin-actividades .modal-content.modal-etapas .etapas-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-actividades .modal-content.modal-etapas .etapas-toolbar-actions {
    display: flex;
    width: 100%;
  }

  .admin-actividades .modal-content.modal-etapas .btn-toolbar {
    flex: 1;
    text-align: center;
  }

  .admin-actividades .modal-content.modal-etapas .botones-modal {
    flex-direction: column;
    gap: 0.6rem;
    padding-top: 0.75rem;
    padding-bottom: 0.25rem;
  }

  .admin-actividades .modal-content.modal-etapas .botones-modal button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .admin-actividades .modal-content.modal-etapas {
    width: 98%;
    padding: 0.8rem;
  }

  .admin-actividades .modal-content.modal-etapas h2 {
    font-size: 1.1rem;
  }

  /* Modal con Pestañas */
  .modal-content.modal-with-tabs {
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    padding: 0;

    .modal-header-tabs {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.75rem 2rem;
      border-bottom: 2px solid #cbd5e1;
      background: linear-gradient(135deg, #f8fafc 0%, #eef4ff 100%);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      h2 {
        margin: 0;
        color: #0f2f55;
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.5px;
      }

      .btn-close-modal {
        background: rgba(100, 116, 139, 0.1);
        border: 2px solid transparent;
        font-size: 1.5rem;
        cursor: pointer;
        color: #64748b;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s ease;
        font-weight: bold;

        &:hover {
          background: #e2e8f0;
          color: #1e293b;
          border-color: #cbd5e1;
        }

        &:active {
          background: #cbd5e1;
        }
      }
    }

    .tabs-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    .tabs-nav {
      display: flex;
      gap: 0.25rem;
      padding: 1rem;
      background: linear-gradient(to right, #f8fafc, #eef4ff);
      border-bottom: 2px solid #cbd5e1;
      flex-wrap: wrap;
      align-items: center;
      box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.05);

      .tab-btn {
        padding: 0.7rem 1.3rem;
        border: none;
        background: rgba(100, 116, 139, 0.08);
        color: #64748b;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        border-radius: 8px;
        transition: all 0.2s ease;
        white-space: nowrap;
        position: relative;

        &:hover {
          background: rgba(59, 130, 246, 0.1);
          color: #0f2f55;
        }

        &.tab-active {
          color: white;
          background: linear-gradient(135deg, #3b82f6, #0ea5e9);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }
      }
    }

    .tabs-content {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;

      .tab-pane {
        animation: fadeIn 0.2s ease-out;
      }

      .form-grupo {
        margin-bottom: 1.5rem;

        label {
          display: block;
          margin-bottom: 0.6rem;
          color: #1e293b;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.3px;
        }

        input[type="text"],
        input[type="date"],
        input[type="range"],
        select,
        textarea {
          width: 100%;
          padding: 0.75rem 0.9rem;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          font-family: inherit;
          transition: all 0.2s ease;
          background: #fafbfc;

          &:hover {
            border-color: #94a3b8;
            background: white;
          }

          &:focus {
            outline: none;
            border-color: #3b82f6;
            background: white;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), inset 0 0 0 1px rgba(59, 130, 246, 0.2);
          }

          &:disabled {
            background: #f1f5f9;
            color: #94a3b8;
            cursor: not-allowed;
            border-color: #e2e8f0;
          }
        }

        textarea {
          resize: vertical;
          min-height: 120px;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        .field-help {
          display: block;
          margin-top: 0.6rem;
          color: #64748b;
          font-size: 0.85rem;
          font-style: italic;
        }
      }

      .form-fila {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 0.5rem;

        .form-grupo {
          margin-bottom: 0;
        }
      }

      .input-money {
        font-family: 'Courier New', monospace;
      }

      .avance-input-group {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
        padding: 1.2rem;
        background: #f0f9ff;
        border-radius: 8px;
        border: 2px solid #e0f2fe;

        .input-range-avance {
          flex: 1;
          height: 8px;
          border-radius: 4px;
          outline: none;
          accent-color: #3b82f6;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
          background: #e2e8f0;

          &::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            border: 2px solid white;
            transition: all 0.2s;

            &:hover {
              transform: scale(1.15);
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
          }

          &::-moz-range-thumb {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            border: 2px solid white;
            transition: all 0.2s;

            &:hover {
              transform: scale(1.15);
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            }
          }

          &::-webkit-slider-runnable-track {
            background: #e2e8f0;
            height: 8px;
            border-radius: 4px;
          }

          &::-moz-range-track {
            background: transparent;
            border: none;
          }
        }

        .avance-value {
          min-width: 60px;
          text-align: right;
          font-weight: 700;
          color: #3b82f6;
          font-size: 1.25rem;
          padding: 0.5rem 1rem;
          background: white;
          border-radius: 6px;
          border: 2px solid #3b82f6;
        }
      }

      .progreso-barra-formulario {
        width: 100%;
        height: 10px;
        background: #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);

        .progreso-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #0ea5e9);
          transition: width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
        }
      }

      .botones-modal {
        display: flex;
        gap: 1.2rem;
        margin-top: 2rem;
        padding: 1.5rem;
        border-top: 2px solid #cbd5e1;
        justify-content: flex-end;
        position: sticky;
        bottom: 0;
        background: linear-gradient(to top, white 80%, rgba(255, 255, 255, 0.7));
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);

        button {
          padding: 0.85rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          min-width: 140px;

          &.btn-primary {
            background: linear-gradient(135deg, #3b82f6, #0ea5e9);
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
            }

            &:active {
              transform: translateY(0);
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
            }
          }

          &.btn-secondary {
            background: #e2e8f0;
            color: #334155;
            border: 2px solid transparent;

            &:hover {
              background: #cbd5e1;
              transform: translateY(-1px);
            }

            &:active {
              background: #cbd5e1;
              transform: translateY(0);
            }
          }
        }
      }
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 900px) {
  .admin-actividades {
    padding: 0.1rem;
    .toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
      .buscador-container { max-width: 100%; min-width: 0; }
    }
    .tabla-container {
      border-radius: 0;
      box-shadow: none;
      border: none;
    }
    .tabla-actividades {
      font-size: 0.92rem;
      th, td { padding: 0.6rem; }
    }
  }
}

@media (max-width: 600px) {
  .admin-actividades {
    padding: 0;
    .toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 0.3rem;
      padding: 0.5rem 0.2rem;
      .buscador-container { max-width: 100%; min-width: 0; }
    }
    .tabla-container {
      border-radius: 0;
      box-shadow: none;
      border: none;
      overflow-x: auto;
    }
    .tabla-actividades {
      min-width: 420px;
      font-size: 0.85rem;
      th, td { padding: 0.45rem; }
    }
    .modal-content {
      padding: 0.7rem;
      max-width: 99vw;
    }
    .modal-content.modal-etapas {
      padding: 0.5rem;
      max-width: 99vw;
    }

    .modal-content.modal-with-tabs {
      max-width: 98vw;
      width: 100% !important;
      max-height: 95vh;

      .modal-header-tabs {
        padding: 1rem 1rem;

        h2 {
          font-size: 1.15rem;
        }
      }

      .tabs-nav {
        padding: 0.5rem 0.5rem;
        gap: 0.25rem;

        .tab-btn {
          padding: 0.5rem 0.8rem;
          font-size: 0.85rem;
        }
      }

      .tabs-content {
        padding: 1.2rem;

        .form-fila {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }
    }

    .modal-partidas {
      .modal-header-partidas {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #fcd34d;

        h2 {
          font-size: 1.15rem;
          margin: 0;
          color: #1e293b;
        }

        p {
          font-size: 0.9rem;
          color: #666;
          margin: 0.3rem 0 0;
        }

        .btn-close-modal {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 1.8rem;
          height: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;

          &:hover {
            background-color: #fef3c7;
            color: #b45309;
          }
        }
      }

      .partidas-content {
        margin-bottom: 1rem;
      }

      .partidas-resumen {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.8rem;
        background-color: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.9rem;

        strong {
          color: #92400e;
        }
      }

      .partidas-tabla {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        thead {
          background-color: #fed7aa;
          color: #92400e;
        }

        th {
          padding: 0.6rem;
          text-align: left;
          font-weight: 600;
          border: 1px solid #fcd34d;
        }

        td {
          padding: 0.6rem;
          border: 1px solid #fcd34d;
          background-color: #fffbeb;
          color: #b45309;

          &.codigo-cell {
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 0.75rem;
            font-weight: 600;
          }

          &.monto-cell {
            text-align: right;
            font-weight: 600;
          }
        }

        tbody tr:hover {
          background-color: #fef3c7;
        }
      }
    }
  }

  .btn-partidas-admin {
    background-color: #fef3c7;
    border: 1px solid #fbbf24;
    color: #92400e;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      background-color: #fcd34d;
      border-color: #f59e0b;
      transform: scale(1.02);
    }

    &:active {
      transform: scale(0.98);
    }
  }

  .partidas-unica {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    background-color: #ecfdf3;
    border: 1px solid #86efac;
    border-radius: 4px;
    color: #166534;
    font-size: 0.85rem;
    font-weight: 600;
  }
}
</style>
