<template>
  <div class="actividades-view">
    <div class="actividades-header">
      <h1>Procesos</h1>
      <span v-if="!cargando" class="total-actividades">
        Total de procesos: <strong>{{ actividadesActivas.length }}</strong>
      </span>
    </div>

    <div class="actividades-toolbar" v-if="!cargando">
      <div class="buscador-container">
        <span class="buscador-icon">🔎</span>
        <input
          v-model="busquedaActividades"
          class="buscador-input"
          type="text"
          placeholder="Buscar por nombre, dirección o responsable..."
        />
      </div>

      <div class="toolbar-filtros">
        <select v-model="filtroDireccion" class="filtro-select">
          <option value="">Todas las direcciones</option>
          <option v-for="direccion in direccionesDisponibles" :key="direccion" :value="direccion">{{ direccion }}</option>
        </select>

        <select v-model="filtroPacNoPac" class="filtro-select">
          <option value="">PAC y NO PAC</option>
          <option value="PAC">PAC</option>
          <option value="NO PAC">NO PAC</option>
        </select>

        <select v-model="filtroCuatrimestre" class="filtro-select">
          <option value="">Todos los cuatrimestres</option>
          <option value="1">Cuatrimestre 1</option>
          <option value="2">Cuatrimestre 2</option>
          <option value="3">Cuatrimestre 3</option>
          <option value="4">Cuatrimestre 4</option>
        </select>

        <select v-model="ordenPresupuesto" class="filtro-select">
          <option value="todos">Ordenar por...</option>
          <option value="presupuesto-desc">Presupuesto: mayor a menor</option>
          <option value="presupuesto-asc">Presupuesto: menor a mayor</option>
          <option value="fecha-fin-desc">Fecha de contratación: mayor a menor</option>
          <option value="fecha-fin-asc">Fecha de contratación: menor a mayor</option>
        </select>
      </div>
    </div>

    <div v-if="!cargando" class="cumplimiento-panel">
      <div class="cumplimiento-dona-wrap">
        <div class="cumplimiento-dona" :style="estiloDonaCumplimiento">
          <div class="cumplimiento-dona-centro">
            <strong>{{ porcentajeCumplimientoGlobal }}%</strong>
          </div>
        </div>
      </div>
      <div class="cumplimiento-resumen">
        <h3>Cumplimiento global</h3>
        <p>{{ actividadesActivas.length }} procesos</p>
      </div>
    </div>

    <div v-if="cargando" class="loading">Cargando procesos...</div>

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
            <div class="stat-label">Completadas</div>
          </div>
          <div class="stat retraso">
            <div class="stat-value">{{ tareasConRetraso(actividad) }}</div>
            <div class="stat-label">Con retraso</div>
          </div>
          <div class="stat">
            <div class="stat-value" :class="claseAvance(actividad)">{{ porcentajeAvance(actividad) }}%</div>
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
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ actividadSeleccionada.nombre }}</h2>
          <button type="button" class="btn-close" @click="cerrarDetalleActividad">✕</button>
        </div>

        <div class="modal-body">
          <div class="resumen-detalle">
            <span><strong>Total:</strong> {{ totalTareas(actividadSeleccionada) }}</span>
            <span><strong>Completadas:</strong> {{ tareasCompletadas(actividadSeleccionada) }}</span>
            <span><strong>Con retraso:</strong> {{ tareasConRetraso(actividadSeleccionada) }}</span>
            <span :class="claseAvance(actividadSeleccionada)"><strong>Avance:</strong> {{ porcentajeAvance(actividadSeleccionada) }}%</span>
          </div>

          <div class="timeline" v-if="etapasConFecha.length">
            <div class="timeline-header">
              <h4>Línea de tiempo</h4>
              <button type="button" class="btn-toggle-timeline" @click="timelineContraida = !timelineContraida">
                {{ timelineContraida ? 'Expandir' : 'Contraer' }}
              </button>
            </div>

            <div v-if="timelineContraida" class="timeline-contraida-box">
              <div class="timeline-contraida-titulo">📌 Línea de tiempo contraída</div>
              <div class="timeline-contraida-texto">
                Hay {{ etapasConFecha.length }} etapas en la secuencia. Haz clic en <strong>Expandir</strong> para ver el detalle completo.
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

          <table class="tabla-etapas" v-if="etapasConFecha.length">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Fecha de completado</th>
                <th>Retraso</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="etapa in etapasConFecha"
                :key="etapa.id || etapa.etapaId"
                :class="{ 'fila-etapa-destacada': esEtapaResaltada(etapa) }"
              >
                <td>{{ etapa.etapaNombre || etapa.nombre }}</td>
                <td>
                  <div class="estado-editor">
                    <select
                      v-model="etapa.estado"
                      class="estado-select-detalle"
                      :disabled="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)"
                      @change="onEstadoEtapaChange(etapa)"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="completado">Completado</option>
                    </select>
                    <span v-if="guardandoEstadoEtapaId === (etapa.id || etapa.etapaId)" class="estado-saving">Guardando...</span>
                  </div>
                </td>
                <td>{{ formatearFecha(etapa.fechaPlanificada || etapa.fechaTentativa) }}</td>
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
                  <span
                    v-if="estadoNormalizado(etapa.estado) === 'completado' && etapa.fechaReal && (etapa.fechaPlanificada || etapa.fechaTentativa)"
                    :class="['cumplimiento-chip', etapaCompletadaATiempo(etapa) ? 'a-tiempo' : 'con-retraso']"
                  >
                    {{ etapaCompletadaATiempo(etapa) ? 'A tiempo' : `${diasRetrasoCompletado(etapa)} días tarde` }}
                  </span>
                  <span v-else-if="esEtapaAtrasada(etapa)" class="retraso-chip">{{ diasRetraso(etapa) }} días</span>
                  <span v-else>-</span>
                </td>
                <td>
                  <button type="button" class="btn-seguimiento" @click="seleccionarEtapaSeguimiento(etapa)">
                    <span>Observaciones</span>
                    <span
                      v-if="mostrarCargaSeguimiento(etapa)"
                      class="seguimiento-loading-dot"
                      title="Cargando observaciones"
                    ></span>
                    <span v-if="etapaTieneAlertas(etapa)" class="seguimiento-alerta-icon" title="Esta etapa tiene alertas registradas">⚠️</span>
                    <span v-if="obtenerConteoSeguimientos(etapa) > 0" class="seguimiento-count">{{ obtenerConteoSeguimientos(etapa) }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>

    <div v-if="etapaSeguimiento" class="modal-overlay modal-seguimiento-overlay" @click.self="cerrarModalSeguimiento">
      <div class="modal-content modal-seguimiento" @click.stop>
        <div class="modal-header">
          <h2>Seguimiento de etapa: {{ etapaSeguimiento.etapaNombre || etapaSeguimiento.nombre }}</h2>
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
          ></textarea>
          <label class="alerta-label">
            <input type="checkbox" v-model="nuevoAlerta" />
            Marcar alerta
          </label>
          <button type="button" class="btn-guardar" @click="guardarSeguimiento" :disabled="guardandoSeguimiento || cargandoSeguimientos || !nuevoComentario.trim()">
            {{ guardandoSeguimiento ? 'Guardando...' : 'Guardar seguimiento' }}
          </button>

          <div class="seguimientos-historial">
            <h4>Historial</h4>
            <div v-if="seguimientosEtapa.length === 0">Sin observaciones registradas</div>
            <div v-for="item in seguimientosEtapa" :key="item.id" class="seguimiento-item">
              <div class="seguimiento-meta-row">
                <div class="seguimiento-meta">{{ formatearFechaConHora(item.createdAt || item.created_at || item.fecha) }} · {{ item.responsableNombre || 'Sin responsable' }}</div>
                <button
                  v-if="auth.isAdmin"
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

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cargando = ref(true);
const actividades = ref<any[]>([]);
const busquedaActividades = ref('');
const filtroDireccion = ref('');
const filtroPacNoPac = ref('');
const filtroCuatrimestre = ref('');
const ordenPresupuesto = ref('fecha-fin-asc');
const actividadesVisiblesBase = computed(() =>
  actividades.value.filter((actividad: any) =>
    Boolean(Number(actividad?.activo ?? 1))
  )
);
const direccionesDisponibles = computed(() => {
  const direcciones = [...new Set(actividadesVisiblesBase.value.map((actividad: any) => obtenerDireccion(actividad)))] as string[];
  return direcciones.filter((direccion) => direccion !== 'N/A').sort((a, b) => a.localeCompare(b));
});
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

  if (filtroCuatrimestre.value) {
    items = items.filter((a: any) => String(obtenerCuatrimestreOrden(a)) === filtroCuatrimestre.value);
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
const etapasTotalesFiltradas = computed(() =>
  actividadesActivas.value.reduce((acc: number, actividad: any) => acc + totalTareas(actividad), 0)
);
const etapasCompletadasFiltradas = computed(() =>
  actividadesActivas.value.reduce((acc: number, actividad: any) => acc + tareasCompletadas(actividad), 0)
);
const porcentajeCumplimientoGlobal = computed(() => {
  const total = etapasTotalesFiltradas.value;
  if (!total) return 0;
  return Math.round((etapasCompletadasFiltradas.value / total) * 100);
});
const colorCumplimientoGlobal = computed(() => {
  const valor = porcentajeCumplimientoGlobal.value;
  if (valor >= 80) return '#16a34a';
  if (valor >= 50) return '#f59e0b';
  return '#dc2626';
});
const estiloDonaCumplimiento = computed(() => ({
  background: `conic-gradient(${colorCumplimientoGlobal.value} 0 ${porcentajeCumplimientoGlobal.value}%, #e2e8f0 ${porcentajeCumplimientoGlobal.value}% 100%)`
}));
const actividadSeleccionada = ref<any | null>(null);
const etapasActividad = ref<any[]>([]);
const etapaSeguimiento = ref<any | null>(null);
const seguimientosEtapa = ref<any[]>([]);
const nuevoComentario = ref('');
const nuevoAlerta = ref(false);
const guardandoSeguimiento = ref(false);
const eliminandoSeguimientoId = ref<number | null>(null);
const guardandoEstadoEtapaId = ref<number | null>(null);
const cargandoSeguimientos = ref(false);
const cargandoConteosSeguimientos = ref(false);
const errorSeguimiento = ref('');
const mensajeSeguimiento = ref<{ texto: string; tipo: 'success' | 'info' } | null>(null);
const conteoSeguimientosPorEtapa = ref<Record<number, number>>({});
const alertasPorEtapa = ref<Record<number, boolean>>({});
const etapaResaltadaId = ref<number | null>(null);
const timelineContraida = ref(true);
const permiteEditarFechaCompletado = UI_FLAGS.ALLOW_MANUAL_COMPLETION_DATE;

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
  } catch (error) {
    console.error('Error cargando actividades:', error);
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
  filtroCuatrimestre.value = '';
  ordenPresupuesto.value = 'fecha-fin-asc';
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

function formatearFecha(fecha: string) {
  if (!fecha) return 'Sin fecha';
  return new Date(fecha).toLocaleDateString('es-EC');
}

function normalizarFechaInput(fecha?: string | null | Date) {
  if (!fecha) return null;
  
  // Si es un objeto Date, convertir a yyyy-MM-dd
  if (fecha instanceof Date) {
    // Usar toISOString() para evitar problemas de zona horaria local
    return fecha.toISOString().split('T')[0];
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
      return parsed.toISOString().split('T')[0];
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

function totalTareas(actividad: any) {
  return getEtapasConFecha(actividad).length;
}

function esEtapaAtrasada(etapa: any) {
  const estado = estadoNormalizado(etapa?.estado);
  if (estado === 'completado') return false;
  const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
  if (!fecha) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaObj = new Date(fecha);
  fechaObj.setHours(0, 0, 0, 0);
  return fechaObj < hoy;
}

function diasRetraso(etapa: any) {
  const fecha = etapa?.fechaPlanificada || etapa?.fechaTentativa;
  if (!fecha) return 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaObj = new Date(fecha);
  fechaObj.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoy.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24)));
}

function diasRetrasoCompletado(etapa: any) {
  const fechaTentativa = etapa?.fechaPlanificada || etapa?.fechaTentativa;
  const fechaReal = etapa?.fechaReal;
  if (!fechaTentativa || !fechaReal) return 0;

  const fechaTentativaObj = new Date(fechaTentativa);
  const fechaRealObj = new Date(fechaReal);
  fechaTentativaObj.setHours(0, 0, 0, 0);
  fechaRealObj.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((fechaRealObj.getTime() - fechaTentativaObj.getTime()) / (1000 * 60 * 60 * 24)));
}

function etapaCompletadaATiempo(etapa: any) {
  return diasRetrasoCompletado(etapa) === 0;
}

function tareasCompletadas(actividad: any) {
  return getEtapasConFecha(actividad).filter((etapa: any) => estadoNormalizado(etapa.estado) === 'completado').length;
}

function tareasConRetraso(actividad: any) {
  return getEtapasConFecha(actividad).filter((etapa: any) => esEtapaAtrasada(etapa) || estadoNormalizado(etapa.estado) === 'en_retraso').length;
}

function porcentajeAvance(actividad: any) {
  const total = totalTareas(actividad);
  if (total === 0) return 0;
  return Math.round((tareasCompletadas(actividad) / total) * 100);
}

function claseAvance(actividad: any) {
  const avance = porcentajeAvance(actividad);
  if (avance >= 70) return 'avance-alto';
  if (avance >= 40) return 'avance-medio';
  return 'avance-bajo';
}

function estadoVisual(etapa: any) {
  if (esEtapaAtrasada(etapa)) return 'en_retraso';
  return estadoNormalizado(etapa.estado);
}

function textoLeyendaTimeline(etapa: any) {
  if (estadoNormalizado(etapa?.estado) === 'completado') {
    return 'Completado';
  }
  return `Pendiente hasta ${formatearFecha(etapa?.fechaPlanificada || etapa?.fechaTentativa)}`;
}

function badgeLeyendaTimeline(etapa: any) {
  if (estadoNormalizado(etapa?.estado) === 'completado') {
    const diasTarde = diasRetrasoCompletado(etapa);
    return diasTarde > 0 ? `${diasTarde}D` : '✓';
  }
  const diasTarde = diasRetraso(etapa);
  return diasTarde > 0 ? `${diasTarde}D` : '';
}

function claseBadgeLeyendaTimeline(etapa: any) {
  if (estadoNormalizado(etapa?.estado) === 'completado' && diasRetrasoCompletado(etapa) === 0) {
    return 'ok';
  }
  return 'late';
}

function formatearFechaConHora(fechaISO: string | undefined | null): string {
  if (!fechaISO) return 'Sin fecha';
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
    if (Number(actividadSeleccionada.value?.id) === actividadId) {
      actividadSeleccionada.value = {
        ...actividadSeleccionada.value,
        etapas: etapasActividad.value,
        seguimientoEtapas: etapasActividad.value
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
    etapa.fechaReal = new Date().toISOString().split('T')[0];
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
    actividadSeleccionada.value.etapas = etapasActividad.value;
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
        fecha: new Date().toISOString().split('T')[0]
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
  if (!auth.isAdmin || !actividadSeleccionada.value || !etapaSeguimiento.value) return;
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
</script>

<style scoped>
.actividades-view {
  padding: 0.25rem;
}

.actividades-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.2rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
}

.actividades-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.7rem;
  margin-bottom: 1rem;
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

.buscador-input,
.filtro-select {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.48rem 0.65rem;
  font-size: 0.86rem;
  color: #0f172a;
  background: #fff;
}

.buscador-input {
  width: 100%;
  padding-left: 2rem;
}

.buscador-input:focus,
.filtro-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.toolbar-filtros {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cumplimiento-panel {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
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
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
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
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 1rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}

.actividad-card:hover {
  transform: translateY(-2px);
  border-color: #bfdbfe;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
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
}

.actividad-info {
  margin-bottom: 1.5rem;
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
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
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
  z-index: 40;
  padding: 1rem;
}

.modal-content {
  width: min(1100px, 96vw);
  max-height: 92vh;
  overflow: auto;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #dbeafe;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.28);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #e5e7eb;
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

.resumen-detalle {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  color: #334155;
}

.timeline {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.8rem;
  margin-bottom: 1rem;
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
  margin-bottom: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
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
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.cumplimiento-chip {
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.cumplimiento-chip.a-tiempo {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.cumplimiento-chip.con-retraso {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
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

.btn-guardar:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.seguimiento-panel {
  border: 1px solid #dbeafe;
  background: #f8fbff;
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
</style>
