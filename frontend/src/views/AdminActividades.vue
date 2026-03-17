<template>
  <div class="admin-actividades">
    <div class="header">
      <h1>📋 Administración de Procesos</h1>
      <p class="subtitle">Gestiona procesos, habilita/deshabilita y configura etapas aplicables</p>
    </div>

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
          placeholder="Buscar por nombre, dirección o tipo..."
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
            <th>ID</th>
            <th>Nombre</th>
            <th>Dirección</th>
            <th>Tipo Plan</th>
            <th>Presupuesto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="act in actividadesPaginadas" :key="act.id" :class="{ inactiva: !act.activo }">
            <td>{{ act.id }}</td>
            <td>{{ act.nombre }}</td>
            <td>{{ act.direccionNombre || 'N/A' }}</td>
            <td>{{ act.tipoPlan }}</td>
            <td>${{ (act.presupuesto || 0).toLocaleString() }}</td>
            <td>
              <span :class="['badge', act.activo ? 'badge-activa' : 'badge-inactiva']">
                {{ act.activo ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="acciones">
              <button class="btn-small btn-ver" @click="verActividad(act)">👁️ Ver</button>
              <button class="btn-small btn-editar" @click="abrirFormularioEdicion(act)">✏️ Editar</button>
              <button class="btn-small btn-etapas" @click="abrirSelectorEtapas(act)">⚙️ Etapas</button>
              <button
                class="btn-small"
                :class="act.activo ? 'btn-desactivar' : 'btn-activar'"
                @click="toggleActividad(act)"
              >
                {{ act.activo ? '❌ Desactivar' : '✅ Activar' }}
              </button>
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

    <!-- Modal de Formulario -->
    <div v-if="mostrarFormulario" class="modal-overlay" @click="cerrarFormulario">
      <div class="modal-content" @click.stop>
        <h2>{{ modoEdicion ? '✏️ Editar Proceso' : '➕ Nuevo Proceso' }}</h2>
        
        <form @submit.prevent="guardarActividad">
          <div class="form-grupo">
            <label for="nombre">Nombre *</label>
            <input
              id="nombre"
              v-model="formulario.nombre"
              type="text"
              required
              placeholder="Nombre del proceso"
            />
          </div>

          <div class="form-fila">
            <div class="form-grupo">
              <label for="codigoOlympo">Código Olympo</label>
              <input
                id="codigoOlympo"
                v-model="formulario.codigoOlympo"
                type="text"
                placeholder="Ej: 01.01.001.166.840107.000.009"
              />
            </div>
            <div class="form-grupo">
              <label for="responsableId">Responsable</label>
              <select id="responsableId" v-model="formulario.responsableId">
                <option :value="null">Sin responsable</option>
                <option
                  v-for="responsable in responsablesFiltrados"
                  :key="responsable.id"
                  :value="responsable.id"
                >
                  {{ responsable.nombre }}
                  <template v-if="responsable.direccionNombre">
                    - {{ responsable.direccionNombre }}
                  </template>
                </option>
              </select>
            </div>
          </div>

          <div class="form-grupo">
            <label for="direccionId">Dirección</label>
            <select id="direccionId" v-model.number="formulario.direccionId">
              <option :value="undefined">Sin dirección</option>
              <option
                v-for="direccion in direccionesCatalogo"
                :key="direccion.id"
                :value="direccion.id"
              >
                {{ direccion.nombre }}
              </option>
            </select>
          </div>

          <div class="form-grupo">
            <label for="tipoPlan">Tipo Plan</label>
            <input
              id="tipoPlan"
              v-model="formulario.tipoPlan"
              type="text"
              placeholder="Ej: Plan Anual de Contrataciones"
            />
          </div>

          <div class="form-fila">
            <div class="form-grupo">
              <label for="partidaPresupuestaria">Partida Presupuestaria</label>
              <input
                id="partidaPresupuestaria"
                v-model="formulario.partidaPresupuestaria"
                type="text"
                placeholder="Ej: 840107"
              />
            </div>
            <div class="form-grupo">
              <label for="fuenteFinanciamiento">Fuente Financiamiento</label>
              <input
                id="fuenteFinanciamiento"
                v-model="formulario.fuenteFinanciamiento"
                type="text"
                placeholder="Ej: Fondos Propios"
              />
            </div>
          </div>

          <div class="form-grupo">
            <label for="presupuesto">Presupuesto</label>
            <input
              id="presupuesto"
              v-model.number="formulario.presupuesto"
              type="number"
              min="0"
              step="0.01"
            />
          </div>

          <div class="form-fila">
            <div class="form-grupo">
              <label for="costoReforma2">Costo Reforma 2</label>
              <input
                id="costoReforma2"
                v-model.number="formulario.costoReforma2"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <div class="form-grupo">
              <label for="avanceGeneral">Avance General (%)</label>
              <input
                id="avanceGeneral"
                v-model.number="formulario.avanceGeneral"
                type="number"
                min="0"
                max="100"
                step="1"
              />
            </div>
          </div>

          <div class="form-grupo">
            <label for="estado">Estado</label>
            <select id="estado" v-model="formulario.estado">
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="completado">Completado</option>
            </select>
          </div>

          <div class="form-fila">
            <div class="form-grupo">
              <label for="fechaInicio">Fecha Inicio</label>
              <input id="fechaInicio" v-model="formulario.fechaInicio" type="date" />
            </div>
            <div class="form-grupo">
              <label for="fechaFin">Fecha Fin</label>
              <input id="fechaFin" v-model="formulario.fechaFin" type="date" />
            </div>
          </div>

          <div class="form-grupo form-checkbox">
            <label>
              <input v-model="formulario.activo" type="checkbox" />
              Proceso activo
            </label>
          </div>

          <div class="form-grupo">
            <label for="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              v-model="formulario.observaciones"
              rows="3"
              placeholder="Notas u observaciones"
            />
          </div>

          <div class="botones-modal">
            <button type="submit" class="btn-primary">💾 Guardar</button>
            <button type="button" class="btn-secondary" @click="cerrarFormulario">❌ Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Selector de Etapas -->
    <div v-if="mostrarSelectorEtapas" class="modal-overlay" @click="cerrarSelectorEtapas">
      <div class="modal-content modal-etapas" @click.stop>
        <h2>⚙️ Configurar Etapas - {{ actividadSeleccionada?.nombre }}</h2>
        
        <!-- Formulario para agregar nueva etapa -->
        <div class="nueva-etapa-form">
          <h3>➕ Agregar Nueva Etapa</h3>
          <div class="form-fila">
            <input 
              v-model="nuevaEtapaNombre"
              type="text" 
              placeholder="Nombre de la nueva etapa"
              class="input-nueva-etapa"
              @keyup.enter="agregarNuevaEtapa"
            />
            <button 
              class="btn-agregar-etapa" 
              @click="agregarNuevaEtapa"
              :disabled="!nuevaEtapaNombre.trim()"
            >
              ➕ Agregar
            </button>
          </div>
        </div>

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
          <div v-for="etapa in etapasFiltradas" :key="etapa.etapaId" class="etapa-item">
            <div class="etapa-checkbox">
              <label>
                <input
                  type="checkbox"
                  :checked="etapa.aplica"
                  @change="(e) => toggleEtapa(etapa, (e.target as HTMLInputElement).checked)"
                />
                <span class="etapa-nombre">
                  {{ etapa.etapaNombre }}
                </span>
              </label>
            </div>
            <div v-if="etapa.aplica" class="etapa-fecha">
              <label>
                <span class="fecha-label">📅 Fecha tentativa:</span>
                <input
                  type="date"
                  v-model="etapa.fechaTentativa"
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
                  <option value="completado">Completado</option>
                </select>
              </label>
              <label v-if="normalizarEstadoEtapa(etapa.estado) === 'completado'">
                <span class="fecha-label">✅ Fecha completado:</span>
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
              <label class="etapa-observacion">
                <span class="fecha-label">📝 Observación:</span>
                <textarea
                  v-model="etapa.observaciones"
                  class="input-observacion-etapa"
                  rows="2"
                  placeholder="Observaciones de esta etapa"
                ></textarea>
              </label>
              <button
                class="btn-seguimiento-diario"
                @click="abrirSeguimientosDiarios(etapa)"
              >
                <span>📋 Ver Seguimiento Diario</span>
                <span class="seguimiento-count">{{ obtenerConteoSeguimientosEtapa(etapa) }}</span>
              </button>
              <span v-if="etapaEstaGuardando(etapa)" class="etapa-guardando">Guardando...</span>
            </div>
          </div>
        </div>

        <div class="botones-modal">
          <button class="btn-primary" @click="guardarEtapas">💾 Guardar Etapas</button>
          <button class="btn-secondary" @click="cerrarSelectorEtapas">❌ Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Seguimientos Diarios -->
    <div v-if="mostrarSeguimientos" class="modal-overlay" @click="cerrarSeguimientosDiarios">
      <div class="modal-content modal-seguimientos" @click.stop>
        <div class="seguimientos-header">
          <h2>📋 Seguimiento Diario - {{ etapaActualSeguimiento?.etapaNombre }}</h2>
          <button class="btn-close" @click="cerrarSeguimientosDiarios">✕</button>
        </div>

        <div class="seguimientos-content">
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
                    📅 {{ formatearFechaConHora(seguimiento.fecha) }}
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
    <div v-if="mostrarVisualizacion" class="modal-overlay" @click="cerrarVisualizacion">
      <div class="modal-content modal-ver" @click.stop>
        <div class="ver-header">
          <h2>👁️ Detalle de Proceso</h2>
          <button class="btn-close" @click="cerrarVisualizacion">✕</button>
        </div>

        <div v-if="actividadVista" class="ver-content">
          <!-- Información Principal -->
          <div class="ver-seccion">
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
                <span class="info-label">Dirección:</span>
                <span class="info-valor">{{ actividadVista.direccionNombre || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tipo Plan:</span>
                <span class="info-valor">{{ actividadVista.tipoPlan }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Estado:</span>
                <span :class="['badge', actividadVista.activo ? 'badge-activa' : 'badge-inactiva']">
                  {{ actividadVista.activo ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Información Presupuestaria -->
          <div class="ver-seccion">
            <h3 class="seccion-titulo">💰 Información Presupuestaria</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Código Olympo:</span>
                <span class="info-valor">{{ actividadVista.codigoOlympo || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Responsable:</span>
                <span class="info-valor">{{ actividadVista.responsableNombre || 'Sin responsable' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Partida Presupuestaria:</span>
                <span class="info-valor">{{ actividadVista.partidaPresupuestaria || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fuente Financiamiento:</span>
                <span class="info-valor">{{ actividadVista.fuenteFinanciamiento || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Presupuesto:</span>
                <span class="info-valor destacado">${{ (actividadVista.presupuesto || 0).toLocaleString() }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Costo Reforma 2:</span>
                <span class="info-valor">${{ (actividadVista.costoReforma2 || 0).toLocaleString() }}</span>
              </div>
            </div>
          </div>

          <!-- Cronograma y Avance -->
          <div class="ver-seccion">
            <h3 class="seccion-titulo">📅 Cronograma y Avance</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Fecha Inicio:</span>
                <span class="info-valor">{{ formatearFechaParaVista(actividadVista.fechaInicio) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fecha Fin:</span>
                <span class="info-valor">{{ formatearFechaParaVista(actividadVista.fechaFin) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-valor">
                  <span :class="['badge-estado', `estado-${actividadVista.estado || 'pendiente'}`]">
                    {{ formatearEstado(actividadVista.estado) }}
                  </span>
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Avance General:</span>
                <div class="progreso-container">
                  <div class="progreso-barra">
                    <div class="progreso-fill" :style="{ width: (actividadVista.avanceGeneral || 0) + '%' }"></div>
                  </div>
                  <span class="progreso-texto">{{ actividadVista.avanceGeneral || 0 }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div v-if="actividadVista.observaciones" class="ver-seccion">
            <h3 class="seccion-titulo">📝 Observaciones</h3>
            <div class="observaciones-texto">
              {{ actividadVista.observaciones }}
            </div>
          </div>

          <!-- Etapas Asignadas -->
          <div v-if="actividadVista.etapas && actividadVista.etapas.length > 0" class="ver-seccion">
            <h3 class="seccion-titulo">⚙️ Etapas Asignadas ({{ actividadVista.etapas.filter(e => e.aplica).length }})</h3>
            <div class="etapas-lista">
              <div v-for="etapa in actividadVista.etapas.filter(e => e.aplica)" :key="etapa.id" class="etapa-card">
                <div class="etapa-nombre-vista">{{ etapa.nombre || etapa.etapaNombre }}</div>
                <div v-if="etapa.estado" class="etapa-estado-vista">
                  Estado: {{ formatearEstado(etapa.estado) }}
                </div>
                <div v-if="etapa.fechaTentativa" class="etapa-fecha-vista">
                  📅 {{ formatearFechaParaVista(etapa.fechaTentativa) }}
                </div>
                <div v-if="etapa.fechaReal" class="etapa-fecha-vista etapa-fecha-real-vista">
                  ✅ Completado: {{ formatearFechaParaVista(etapa.fechaReal) }}
                </div>
                <div
                  v-if="etapa.estado === 'completado' && etapa.fechaTentativa && etapa.fechaReal"
                  :class="['etapa-fecha-vista', 'estado-entrega-vista', claseComparacionEntrega(etapa)]"
                >
                  {{ textoComparacionEntrega(etapa) }}
                </div>
                <div v-if="etapa.observaciones" class="etapa-observacion-vista">
                  📝 {{ etapa.observaciones }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="botones-modal">
          <button v-if="actividadVista" class="btn-primary" @click="abrirFormularioEdicion(actividadVista)">✏️ Editar</button>
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
  nombre: string;
  direccionId: number;
  direccionNombre?: string;
  tipoPlan: string;
  codigoOlympo?: string;
  responsableId?: number | null;
  responsableNombre?: string;
  partidaPresupuestaria?: string;
  fuenteFinanciamiento?: string;
  presupuesto: number;
  costoReforma2?: number;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  avanceGeneral?: number;
  activo: boolean;
  observaciones?: string;
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
const mostrarVisualizacion = ref(false);
const mostrarSoloActivas = ref(false);
const busqueda = ref('');
const ordenarPor = ref('id-asc');
const actividadSeleccionada = ref<Actividad | null>(null);
const actividadVista = ref<Actividad | null>(null);
const etapasDisponibles = ref<Etapa[]>([]);
const responsables = ref<Responsable[]>([]);
const direccionesCatalogo = ref<DireccionCatalogo[]>([]);
const nuevaEtapaNombre = ref('');
const busquedaEtapas = ref('');

// Seguimientos diarios
const mostrarSeguimientos = ref(false);
const etapaActualSeguimiento = ref<Etapa | null>(null);
const seguimientosDiarios = ref<any[]>([]);
const nuevoComentario = ref('');
const nuevoAlerta = ref(false);
const conteoSeguimientosEtapas = ref<Record<number, number>>({});
const guardandoEtapasPorId = ref<Record<number, boolean>>({});
const permiteEditarFechaCompletado = UI_FLAGS.ALLOW_MANUAL_COMPLETION_DATE;

function getFormularioVacio(): Partial<Actividad> {
  return {
    nombre: '',
    direccionId: undefined,
    tipoPlan: 'PAC',
    codigoOlympo: '',
    responsableId: undefined,
    partidaPresupuestaria: '',
    fuenteFinanciamiento: '',
    presupuesto: 0,
    costoReforma2: 0,
    fechaInicio: '',
    fechaFin: '',
    estado: 'pendiente',
    avanceGeneral: 0,
    activo: true,
    observaciones: ''
  };
}

const formulario = ref<Partial<Actividad>>(getFormularioVacio());

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
    resultado = resultado.filter(a => a.activo);
  }
  if (busqueda.value.trim()) {
    const q = normalizarTextoBusqueda(busqueda.value);
    resultado = resultado.filter(a =>
      normalizarTextoBusqueda(a.nombre || '').includes(q) ||
      normalizarTextoBusqueda(a.direccionNombre || '').includes(q) ||
      normalizarTextoBusqueda(a.tipoPlan || '').includes(q)
    );
  }
  resultado = [...resultado].sort((a, b) => {
    switch (ordenarPor.value) {
      case 'nombre-asc':  return (a.nombre || '').localeCompare(b.nombre || '');
      case 'nombre-desc': return (b.nombre || '').localeCompare(a.nombre || '');
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

const responsablesFiltrados = computed(() => {
  const direccionId = Number(formulario.value.direccionId) || 0;
  if (!direccionId) return responsables.value;

  const filtrados = responsables.value.filter(r => r.direccionId === direccionId);
  return filtrados.length ? filtrados : responsables.value;
});

const etapasFiltradas = computed(() => {
  const q = normalizarBusquedaEtapas(busquedaEtapas.value);
  if (!q) return etapasDisponibles.value;

  return etapasDisponibles.value.filter((etapa) =>
    normalizarBusquedaEtapas(String(etapa.etapaNombre || '')).includes(q)
  );
});

// Métodos
// Helper para convertir fecha ISO a formato yyyy-MM-dd para input date
function formatearFechaParaInput(fechaISO: string | undefined | null): string | undefined {
  if (!fechaISO) return undefined;
  try {
    // Tomar solo la parte de la fecha (yyyy-MM-dd)
    return fechaISO.split('T')[0];
  } catch (e) {
    console.error('Error al formatear fecha:', e);
    return undefined;
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

onMounted(async () => {
  window.addEventListener('keydown', manejarEscapeModales);
  console.log('AdminActividades: montada');
  await Promise.all([cargarActividades(), cargarResponsables(), cargarDireccionesCatalogo()]);
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
    const response = await api.get('/subtareas');
    // Manejar respuesta que puede ser array o objeto con value/Count
    actividades.value = Array.isArray(response.data) 
      ? response.data 
      : (response.data.value || []);
    console.log('Actividades cargadas:', actividades.value);
  } catch (error: any) {
    console.error('Error al cargar actividades:', error);
    mostrarNotificacion('Error al cargar actividades: ' + (error?.message || 'Desconocido'), 'error');
  }
}

async function cargarResponsables() {
  try {
    const response = await api.get('/subtareas/admin/responsables');
    responsables.value = Array.isArray(response.data)
      ? response.data
      : (response.data.value || []);
  } catch (error: any) {
    console.error('Error al cargar responsables:', error);
    mostrarNotificacion('Error al cargar responsables', 'error');
  }
}

async function cargarDireccionesCatalogo() {
  try {
    const response = await api.get('/catalogos/direcciones');
    const rows = Array.isArray(response.data) ? response.data : (response.data.value || []);
    direccionesCatalogo.value = rows.filter((item: any) => item.activo !== false);
  } catch (error: any) {
    console.error('Error al cargar direcciones del catálogo:', error);
    mostrarNotificacion('Error al cargar direcciones', 'error');
  }
}

function abrirFormularioNueva() {
  modoEdicion.value = false;
  formulario.value = getFormularioVacio();
  mostrarFormulario.value = true;
}

function abrirFormularioEdicion(actividad: Actividad) {
  modoEdicion.value = true;
  // Convertir fechas ISO a formato YYYY-MM-DD
  const actividadCopia = { ...actividad };
  if (actividadCopia.fechaInicio) {
    actividadCopia.fechaInicio = actividadCopia.fechaInicio.split('T')[0];
  }
  if (actividadCopia.fechaFin) {
    actividadCopia.fechaFin = actividadCopia.fechaFin.split('T')[0];
  }
  // Convertir activo de 1/0 a boolean
  actividadCopia.activo = Boolean(actividadCopia.activo);
  formulario.value = actividadCopia;
  mostrarFormulario.value = true;
}

function cerrarFormulario() {
  mostrarFormulario.value = false;
  formulario.value = getFormularioVacio();
}

async function guardarActividad() {
  try {
    if (!formulario.value.nombre) {
      mostrarNotificacion('El nombre es requerido', 'error');
      return;
    }

    const payload = {
      ...formulario.value,
      responsableId: formulario.value.responsableId ? Number(formulario.value.responsableId) : null,
      responsableNombre: responsables.value.find(r => r.id === Number(formulario.value.responsableId))?.nombre || null,
      fechaInicio: formatearFechaParaAPI(formulario.value.fechaInicio),
      fechaFin: formatearFechaParaAPI(formulario.value.fechaFin)
    };
    
    if (modoEdicion.value && formulario.value.id) {
      await api.put(`/subtareas/${formulario.value.id}`, payload);
      mostrarNotificacion('Proceso actualizado correctamente', 'success');
    } else {
      await api.post('/subtareas', payload);
      mostrarNotificacion('Proceso creado correctamente', 'success');
    }
    cerrarFormulario();
    await cargarActividades();
  } catch (error: any) {
    console.error('Error al guardar:', error);
    mostrarNotificacion('Error al guardar: ' + (error?.response?.data?.error || error?.message || 'Desconocido'), 'error');
  }
}

async function toggleActividad(actividad: Actividad) {
  try {
    await api.put(`/subtareas/${actividad.id}`, {
      activo: !actividad.activo
    });
    actividad.activo = !actividad.activo;
    mostrarNotificacion(
      `Proceso ${actividad.activo ? 'activado' : 'desactivado'}`,
      'success'
    );
  } catch (error: any) {
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

async function verActividad(actividad: Actividad) {
  try {
    // Cargar actividad completa con etapas
    const response = await api.get(`/subtareas/${actividad.id}`);
    actividadVista.value = response.data;
    
    // Cargar las etapas si existen
    if (actividadVista.value) {
      try {
        const etapasResponse = await api.get(`/subtareas/${actividad.id}/etapas`);
        actividadVista.value.etapas = etapasResponse.data;
      } catch (err) {
        console.log('No hay etapas para esta actividad');
      }
    }
    
    mostrarVisualizacion.value = true;
  } catch (error: any) {
    mostrarNotificacion('Error al cargar el proceso: ' + (error?.message || 'Desconocido'), 'error');
  }
}

function cerrarVisualizacion() {
  mostrarVisualizacion.value = false;
  actividadVista.value = null;
}

function formatearFechaParaVista(fecha: string | undefined | null): string {
  if (!fecha) return 'No definida';
  try {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return 'Fecha inválida';
  }
}

function formatearEstado(estado: string | undefined): string {
  if (!estado) return 'Pendiente';
  const estados: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'con_pendientes': 'Con pendientes',
    'en_retraso': 'En retraso',
    'completado': 'Completado'
  };
  return estados[estado] || estado;
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

function obtenerConteoSeguimientosEtapa(etapa: Etapa): number {
  const etapaId = obtenerEtapaId(etapa);
  if (!etapaId) return 0;
  return conteoSeguimientosEtapas.value[etapaId] || 0;
}

function etapaEstaGuardando(etapa: Etapa): boolean {
  const etapaId = obtenerEtapaId(etapa);
  if (!etapaId) return false;
  return Boolean(guardandoEtapasPorId.value[etapaId]);
}

function diasRetrasoCompletado(etapa: Etapa): number {
  const fechaTentativa = etapa?.fechaTentativa;
  const fechaReal = etapa?.fechaReal;
  if (!fechaTentativa || !fechaReal) return 0;

  const fechaTentativaObj = new Date(fechaTentativa);
  const fechaRealObj = new Date(fechaReal);
  fechaTentativaObj.setHours(0, 0, 0, 0);
  fechaRealObj.setHours(0, 0, 0, 0);

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

async function cargarConteosSeguimientosEtapas() {
  if (!actividadSeleccionada.value) return;

  const etapaIds = etapasDisponibles.value
    .map(etapa => obtenerEtapaId(etapa))
    .filter((id): id is number => Boolean(id));

  const conteos: Record<number, number> = {};

  await Promise.all(
    etapaIds.map(async (etapaId) => {
      try {
        const response = await api.get(
          `/subtareas/${actividadSeleccionada.value?.id}/etapas/${etapaId}/seguimientos`,
          { params: { dias: 3650 } }
        );
        conteos[etapaId] = normalizarSeguimientos(response.data).length;
      } catch {
        conteos[etapaId] = 0;
      }
    })
  );

  conteoSeguimientosEtapas.value = conteos;
}

async function abrirSelectorEtapas(actividad: Actividad) {
  actividadSeleccionada.value = actividad;
  try {
    // 1. Cargar TODAS las etapas disponibles del catálogo
    const todasEtapasResponse = await api.get('/subtareas/admin/etapas-disponibles');
    const todasEtapas = Array.isArray(todasEtapasResponse.data) 
      ? todasEtapasResponse.data 
      : (todasEtapasResponse.data.value || []);
    
    // 2. Cargar las asignaciones específicas de esta actividad
    let etapasAsignadas = [];
    try {
      const asignacionesResponse = await api.get(`/subtareas/${actividad.id}/etapas`);
      etapasAsignadas = Array.isArray(asignacionesResponse.data)
        ? asignacionesResponse.data
        : (asignacionesResponse.data.value || []);
    } catch (err) {
      // Si no hay etapas asignadas aún (actividad nueva), es normal
      console.log('No hay etapas asignadas todavía');
    }
    
    // 3. Combinar: todas las etapas con sus asignaciones
    // Soporta distintas variantes de payload (camelCase/snake_case)
    etapasDisponibles.value = todasEtapas.map((etapa: any) => {
      const etapaId = Number(etapa.id ?? etapa.etapaId);
      const asignada = etapasAsignadas.find((a: any) => {
        const asignadaEtapaId = Number(a.etapaId ?? a.etapa_id ?? a.id);
        return asignadaEtapaId === etapaId;
      });

      const fechaAsignada = asignada?.fechaTentativa ?? asignada?.fecha_tentativa ?? asignada?.fechaPlanificada;
      const fechaRealAsignada = asignada?.fechaReal ?? asignada?.fecha_real ?? null;
      const estadoAsignado = asignada?.estado ?? 'pendiente';
      const observacionesAsignadas = asignada?.observaciones ?? '';

      return {
        etapaId,
        etapaNombre: etapa.nombre,
        aplica: Boolean(Number(asignada?.aplica ?? 0)),
        fechaTentativa: formatearFechaParaInput(fechaAsignada),
        fechaReal: formatearFechaParaInput(fechaRealAsignada),
        estado: estadoAsignado,
        observaciones: observacionesAsignadas,
        esPersonalizada: Boolean(Number(etapa.esPersonalizada ?? etapa.es_personalizada ?? 0))
      };
    });
    
    console.log('Etapas cargadas:', etapasDisponibles.value);
    await cargarConteosSeguimientosEtapas();
  } catch (error: any) {
    console.error('Error al cargar etapas:', error);
    mostrarNotificacion('Error al cargar las etapas: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  }
  mostrarSelectorEtapas.value = true;
}

function cerrarSelectorEtapas() {
  mostrarSelectorEtapas.value = false;
  actividadSeleccionada.value = null;
  etapasDisponibles.value = [];
  conteoSeguimientosEtapas.value = {};
  nuevaEtapaNombre.value = '';
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
    etapa.fechaTentativa = undefined;
    etapa.estado = 'pendiente';
    etapa.observaciones = '';
  }
}

async function agregarNuevaEtapa() {
  if (!nuevaEtapaNombre.value.trim()) return;

  try {
    const response = await api.post('/subtareas/admin/etapas', {
      nombre: nuevaEtapaNombre.value.trim()
    });
    
    const nuevaEtapa = response.data;
    
    // Agregar la nueva etapa a la lista
    etapasDisponibles.value.push({
      etapaId: nuevaEtapa.id,
      etapaNombre: nuevaEtapa.nombre,
      aplica: true,
      esPersonalizada: true,
      fechaTentativa: undefined,
      estado: 'pendiente',
      observaciones: ''
    });
    
    nuevaEtapaNombre.value = '';
    mostrarNotificacion('Etapa creada correctamente', 'success');
  } catch (error: any) {
    console.error('Error al crear etapa:', error);
    mostrarNotificacion('Error al crear etapa: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  }
}

async function guardarEtapas() {
  if (!actividadSeleccionada.value) return;

  try {
    await api.put(`/subtareas/${actividadSeleccionada.value.id}/etapas`, {
      etapas: construirPayloadEtapas()
    });
    mostrarNotificacion('Etapas guardadas correctamente', 'success');
    cerrarSelectorEtapas();
    await cargarActividades();
  } catch (error: any) {
    mostrarNotificacion('Error al guardar las etapas: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  }
}

function construirPayloadEtapas() {
  return etapasDisponibles.value.map(e => ({
    etapaId: e.etapaId || e.id,
    aplica: e.aplica,
    fechaTentativa: formatearFechaParaAPI(e.fechaTentativa),
    estado: e.aplica ? normalizarEstadoEtapa(e.estado) : 'pendiente',
    fechaReal: e.aplica && normalizarEstadoEtapa(e.estado) === 'completado'
      ? formatearFechaParaAPI(e.fechaReal)
      : null,
    observaciones: e.aplica ? (e.observaciones || '') : ''
  }));
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
    etapa.fechaReal = new Date().toISOString().split('T')[0];
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

async function abrirSeguimientosDiarios(etapa: Etapa) {
  if (!actividadSeleccionada.value) return;

  etapaActualSeguimiento.value = etapa;
  try {
    const etapaId = obtenerEtapaId(etapa);
    if (!etapaId) {
      throw new Error('No se pudo identificar la etapa seleccionada');
    }

    const response = await api.get(
      `/subtareas/${actividadSeleccionada.value.id}/etapas/${etapaId}/seguimientos`,
      { params: { dias: 3650 } }
    );
    seguimientosDiarios.value = normalizarSeguimientos(response.data);
    conteoSeguimientosEtapas.value[etapaId] = seguimientosDiarios.value.length;
    
    mostrarSeguimientos.value = true;
    nuevoComentario.value = '';
    nuevoAlerta.value = false;
  } catch (error: any) {
    console.error('Error al cargar seguimientos:', error);
    mostrarNotificacion('Error al cargar seguimientos diarios: ' + obtenerMensajeError(error, 'Desconocido'), 'error');
  }
}

function cerrarSeguimientosDiarios() {
  mostrarSeguimientos.value = false;
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
        fecha: new Date().toISOString().split('T')[0]
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
    return fecha.toLocaleDateString('es-EC', { 
      year: 'numeric', 
      month:'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Fecha inválida';
  }
}
</script>

<style scoped lang="scss">
.admin-actividades {
  padding: 0.25rem;
  max-width: 1400px;
  margin: 0 auto;
  background: transparent;
  min-height: auto;

  .header {
    margin-bottom: 1rem;
    text-align: left;
    background: linear-gradient(135deg, #0f172a, #1d4ed8);
    border-radius: 12px;
    padding: 1rem 1.1rem;

    h1 {
      font-size: 1.55rem;
      color: #f8fafc;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #cbd5e1;
      font-size: 0.88rem;
      margin: 0;
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 1rem;
    flex-wrap: wrap;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 0.75rem;

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

  .tabla-container {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
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
    }

    .acciones {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;

      .btn-small {
        padding: 0.4rem 0.7rem;
        font-size: 0.8rem;
        white-space: nowrap;
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
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    border: 1px solid #dbeafe;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);

    &.modal-etapas {
      max-width: 700px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      h2 {
        margin-bottom: 1rem;
      }

      .nueva-etapa-form {
        margin-bottom: 1rem;
      }

      .etapas-toolbar {
        margin-bottom: 0.75rem;
      }

      .etapas-container {
        flex: 1;
        min-height: 0;
        max-height: none;
        margin-bottom: 0;
      }

      .botones-modal {
        position: sticky;
        bottom: 0;
        margin-top: 1rem;
        padding-top: 0.9rem;
        background: white;
        border-top: 1px solid #e2e8f0;
        z-index: 2;
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

    .nueva-etapa-form {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;

      h3 {
        color: white;
        margin-bottom: 1rem;
      }

      .form-fila {
        display: flex;
        gap: 0.75rem;

        .input-nueva-etapa {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.95);

          &:focus {
            outline: none;
            border-color: white;
            background: white;
          }
        }

        .btn-agregar-etapa {
          padding: 0.75rem 1.5rem;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;

          &:hover:not(:disabled) {
            background: #f0f0f0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
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
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: white;
        transition: all 0.2s;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-color: #667eea;
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
      select {
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

  &:hover {
    background: #1d4ed8;
  }
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
  padding: 0.4rem 0.7rem;
  font-size: 0.8rem;
  background-color: #3b82f6;
  border: 1px solid #2563eb;
  color: white;

  &:hover {
    background-color: #2563eb;
  }
}

.btn-editar {
  background-color: #2563eb;

  &:hover {
    background-color: #1d4ed8;
  }
}

.btn-etapas {
  background-color: #17a2b8;

  &:hover {
    background-color: #138496;
  }
}

.btn-desactivar {
  background-color: #ff9800;

  &:hover {
    background-color: #e68900;
  }
}

.btn-activar {
  background-color: #28a745;

  &:hover {
    background-color: #218838;
  }
}

.btn-eliminar {
  background-color: #dc3545;

  &:hover {
    background-color: #c82333;
  }
}

.btn-ver {
  background-color: #6c757d;
  color: white;

  &:hover {
    background-color: #5a6268;
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
.modal-ver {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0;

  .ver-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid #f0f0f0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    position: sticky;
    top: 0;
    z-index: 10;
    border-radius: 12px 12px 0 0;

    h2 {
      margin: 0;
      font-size: 1.6rem;
    }
  }

  .ver-content {
    padding: 2rem;
    background: #fafbfc;
  }

  .ver-seccion {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    .seccion-titulo {
      font-size: 1.2rem;
      font-weight: 700;
      color: #2c3e50;
      margin: 0 0 1.25rem 0;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid #667eea;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    &.full-width {
      grid-column: 1 / -1;
    }

    .info-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-valor {
      font-size: 1rem;
      color: #2c3e50;
      font-weight: 500;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #667eea;

      &.destacado {
        font-size: 1.2rem;
        font-weight: 700;
        color: #28a745;
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      }
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
      background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%);
      color: #7c5000;
    }

    &.estado-en_proceso {
      background: linear-gradient(135deg, #64b5f6 0%, #2196f3 100%);
      color: white;
    }

    &.estado-completado {
      background: linear-gradient(135deg, #81c784 0%, #4caf50 100%);
      color: white;
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
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        transition: width 0.4s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.5);
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
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #2c3e50;
    white-space: pre-wrap;
  }

  .etapas-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;

    .etapa-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #f3f4f6 100%);
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.2s;

      &:hover {
        border-color: #667eea;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
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
    padding: 1.5rem 2rem;
    background: white;
    border-top: 2px solid #f0f0f0;
    position: sticky;
    bottom: 0;
    border-radius: 0 0 12px 12px;
  }

  // Estilos para modal de seguimientos diarios
  .modal-seguimientos {
    max-width: 600px !important;
    max-height: 80vh !important;
  }

  .seguimientos-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #667eea;

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
    max-height: calc(80vh - 200px);
    overflow-y: auto;
  }

  .nuevo-comentario-section {
    background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid #667eea;

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s;

    &:hover {
      border-color: #667eea;
      background: #f9f9fa;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &.con-alerta {
      border-left: 4px solid #e74c3c;
      background: linear-gradient(90deg, rgba(231, 76, 60, 0.05) 0%, white 100%);
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
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
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
.paginator {
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
  z-index: 1000;
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
.admin-actividades .header,
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
}
</style>
