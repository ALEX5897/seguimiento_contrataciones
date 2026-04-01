<template>
  <div class="subtareas-view">
    <div class="header">
      <h1>Matriz PAC por Código Olimpo</h1>
      <p class="subtitle">Seguimiento de etapas de contratación para PAC Segunda Reforma</p>
    </div>

    <div v-if="notificacion.mensaje" :class="['toast', `toast-${notificacion.tipo}`]">
      {{ notificacion.mensaje }}
    </div>

    <div v-if="cargando" class="loading">Cargando matriz de subtareas...</div>

    <div v-else>
      <div class="alertas-dia" v-if="alertasCriticas.length">
        <div class="alertas-header">
          <h3>Alertas del día</h3>
          <div class="alertas-actions">
            <button class="btn-filtro-rapido" @click="activarSoloAtrasadas">Ver atrasadas</button>
            <button class="btn-filtro-rapido" @click="activarSoloHoy">Ver vencen hoy</button>
            <button class="btn-filtro-rapido clear" @click="limpiarFiltrosRapidos">Limpiar</button>
          </div>
        </div>
        <div class="alertas-list">
          <div v-for="alerta in alertasCriticas" :key="alerta.id" class="alerta-item" :class="alerta.tipo">
            <div class="alerta-tipo">{{ alerta.tipo === 'atrasada' ? 'Atrasada' : 'Vence hoy' }}</div>
            <div class="alerta-text">
              <strong>{{ alerta.codigoOlympo }}</strong> · {{ alerta.etapaNombre }}
            </div>
            <div class="alerta-fecha">{{ formatFecha(alerta.fechaPlanificada) }}</div>
          </div>
        </div>
      </div>

      <div class="kpis" v-if="resumenDiario">
        <div class="kpi-card">
          <span class="kpi-label">Etapas totales</span>
          <strong>{{ resumenDiario.totalEtapas }}</strong>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Completadas</span>
          <strong>{{ resumenDiario.completadas }}</strong>
        </div>
        <div class="kpi-card warning">
          <span class="kpi-label">Con pendientes</span>
          <strong>{{ resumenDiario.conPendientes }}</strong>
        </div>
        <div class="kpi-card danger">
          <span class="kpi-label">En retraso</span>
          <strong>{{ resumenDiario.enRetraso }}</strong>
        </div>
        <div class="kpi-card info">
          <span class="kpi-label">Vencen hoy</span>
          <strong>{{ resumenDiario.vencenHoy }}</strong>
        </div>
      </div>

      <div class="resumen">
        <div class="resumen-item">
          <span class="label">Procesos</span>
          <strong>{{ subtareasFiltradas.length }}</strong>
        </div>
        <div class="resumen-item">
          <span class="label">Etapas por proceso</span>
          <strong>{{ totalEtapas }}</strong>
        </div>
      </div>

      <div class="filtros">
        <label class="check-label">
          <input type="checkbox" v-model="soloSegundaReforma" />
          Mostrar solo PAC Segunda Reforma
        </label>
        <label class="check-label">
          <input type="checkbox" v-model="soloAtrasadas" />
          Solo procesos con etapas en retraso
        </label>
        <label class="check-label">
          <input type="checkbox" v-model="soloVencenHoy" />
          Solo procesos con hitos para hoy
        </label>
        <select v-model="filtroEstadoEtapa" class="estado-select-global">
          <option value="">Todas las etapas</option>
          <option value="pendiente">Pendiente</option>
          <option value="con_pendientes">Con pendientes</option>
          <option value="en_retraso">En retraso</option>
          <option value="completado">Completado</option>
        </select>
        <input
          v-model="busqueda"
          class="search-input"
          placeholder="Buscar por código, proceso o responsable"
        />
      </div>

      <div class="tabla-container">
        <table class="tabla">
          <thead>
            <tr>
              <th>Código Olimpo</th>
              <th>Proceso</th>
              <th>Responsable</th>
              <th>Avance</th>
              <th>Presupuesto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="subtarea in subtareasFiltradas" :key="subtarea.codigoOlympo">
              <td class="codigo">{{ subtarea.codigoOlympo }}</td>
              <td>{{ subtarea.nombre }}</td>
              <td>{{ subtarea.responsableNombre || 'Sin asignar' }}</td>
              <td>
                <span class="badge">{{ subtarea.porcentajeAvance || 0 }}%</span>
              </td>
              <td>${{ Number(subtarea.presupuesto).toLocaleString('es-EC') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-for="subtarea in subtareasFiltradas" :key="`${subtarea.codigoOlympo}-etapas`" class="etapas-card">
        <h2>{{ subtarea.codigoOlympo }} - {{ subtarea.nombre }}</h2>

        <div class="timeline">
          <div v-for="(etapa, idx) in (subtarea.seguimientoEtapas || [])" :key="`timeline-${etapa.id}`" class="timeline-item">
            <div class="timeline-node" :class="estadoVisual(etapa)"></div>
            <div v-if="idx < (subtarea.seguimientoEtapas || []).length - 1" class="timeline-line"></div>
            <div class="timeline-content">
              <div class="timeline-title">{{ etapa.etapaNombre }}</div>
              <div class="timeline-date">
                Fecha tentativa: {{ formatFecha(etapa.fechaPlanificada) }}
                <span v-if="esAtrasada(etapa)" class="atraso-tag">Atraso {{ calcularDiasRetraso(etapa) }} días</span>
              </div>
            </div>
          </div>
        </div>

        <div class="tabla-etapas-container">
          <table class="tabla-etapas">
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Estado</th>
                <th>Fecha tentativa de entrega</th>
                <th>Fecha real</th>
                <th>Observaciones</th>
                <th>Acción</th>
                <th>Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="etapa in subtarea.seguimientoEtapas || []" :key="etapa.id">
                <td>
                  <div class="etapa-cell">
                    <span>{{ etapa.etapaNombre }}</span>
                    <span v-if="esAtrasada(etapa)" class="atraso-tag-inline">🔴 {{ calcularDiasRetraso(etapa) }} días</span>
                    <span class="estado-inline">Estado: {{ formatoEstadoTexto(etapa.estado) }}</span>
                  </div>
                </td>
                <td>
                  <select v-model="etapa.estado" class="estado-select" :disabled="normalizarEstado(etapa.estado) === 'completado'" @change="onEstadoEtapaChange(etapa)">
                    <option value="pendiente">Pendiente</option>
                    <option value="completado">Completado</option>
                  </select>
                  <div v-if="esAtrasada(etapa)" class="estado-hint">Se marca en retraso por fecha tentativa vencida</div>
                </td>
                <td>
                  <input
                    type="date"
                    class="fecha-input"
                    :value="toInputDate(etapa.fechaPlanificada)"
                    @input="onFechaPlanificadaInput(etapa, $event)"
                  />
                </td>
                <td>
                  <span>{{ formatFecha(etapa.fechaReal) }}</span>
                </td>
                <td>
                  <textarea v-model="etapa.observaciones" class="obs-input" rows="2" placeholder="Detalle de pendientes o novedades"></textarea>
                </td>
                <td>
                  <button
                    class="btn-guardar"
                    :disabled="savingEtapas.has(etapa.id)"
                    @click="guardarEtapa(subtarea.codigoOlympo, etapa)"
                  >
                    {{ savingEtapas.has(etapa.id) ? 'Guardando...' : 'Guardar' }}
                  </button>
                </td>
                <td>
                  <button
                    class="btn-seguimiento"
                    @click="abrirSeguimientosDiarios(subtarea, etapa)"
                  >
                    📋 Seguimiento
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de Seguimientos Diarios -->
    <div v-if="mostrarSeguimientos" class="modal-overlay" @click.self="cerrarSeguimientosDiarios">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>📋 Seguimiento Diario - {{ etapaActualSeguimiento?.etapaNombre }}</h2>
          <button class="btn-close" @click="cerrarSeguimientosDiarios">✕</button>
        </div>

        <div v-if="cargandoSeguimientos" class="loading">Cargando seguimientos...</div>
        <div v-else class="modal-body">
          <!-- Formulario para nuevo comentario -->
          <div class="nuevo-comentario-section">
            <h3>➕ Agregar Nuevo Comentario</h3>
            <div class="form-grupo">
              <label>Comentario:</label>
              <textarea
                v-model="nuevoComentario"
                rows="3"
                placeholder="Describe el progreso o inconvenientes en esta etapa..."
                class="textarea-comentario"
              ></textarea>
            </div>
            <div class="form-checkbox">
              <label class="alerta-label">
                <input v-model="nuevoAlerta" type="checkbox" />
                <span>🚨 Marcar como Alerta</span>
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
                    class="btn-eliminar"
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

        <div class="modal-footer">
          <button class="btn-cerrar" @click="cerrarSeguimientosDiarios">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import api, { subtareasService, type EtapaSeguimiento, type Subtarea } from '../services/api';
import { normalizarTextoBusqueda } from '../utils/search';

const cargando = ref(true);
const subtareas = ref<Subtarea[]>([]);
const soloSegundaReforma = ref(true);
const soloAtrasadas = ref(false);
const soloVencenHoy = ref(false);
const filtroEstadoEtapa = ref('');
const busqueda = ref('');
const savingEtapas = ref(new Set<number>());
const resumenDiario = ref<any>(null);

// Seguimientos diarios
const mostrarSeguimientos = ref(false);
const cargandoSeguimientos = ref(false);
const etapaActualSeguimiento = ref<any>(null);
const subtareaActualSeguimiento = ref<any>(null);
const seguimientosDiarios = ref<any[]>([]);
const nuevoComentario = ref('');
const nuevoAlerta = ref(false);
const notificacion = ref({ mensaje: '', tipo: 'success' as 'success' | 'error' });

type AlertaCritica = {
  id: string;
  tipo: 'atrasada' | 'hoy';
  codigoOlympo: string;
  etapaNombre: string;
  fechaPlanificada: string | null;
};

const subtareasFiltradas = computed(() => {
  let items = [...subtareas.value];

  if (soloSegundaReforma.value) {
    items = items.filter((s) => {
      const costo = Number((s as any).costoReforma2 ?? (s as any).costo_reforma_2 ?? 0);
      return costo > 0;
    });
  }

  if (soloAtrasadas.value) {
    items = items.filter((s) => (s.seguimientoEtapas || []).some((e) => esAtrasada(e)));
  }

  if (soloVencenHoy.value) {
    items = items.filter((s) => (s.seguimientoEtapas || []).some((e) => esVenceHoy(e)));
  }

  if (filtroEstadoEtapa.value) {
    items = items.filter((s) => (s.seguimientoEtapas || []).some((e) => normalizarEstado(e.estado) === filtroEstadoEtapa.value));
  }

  const text = normalizarTextoBusqueda(busqueda.value);
  if (text) {
    items = items.filter((s) => {
      const haystack = normalizarTextoBusqueda(`${s.codigoOlympo} ${s.nombre} ${s.responsableNombre || ''}`);
      return haystack.includes(text);
    });
  }

  return items;
});

const totalEtapas = computed(() => {
  if (!subtareasFiltradas.value.length) return 0;
  return subtareasFiltradas.value[0]?.seguimientoEtapas?.length || 0;
});

const alertasCriticas = computed<AlertaCritica[]>(() => {
  const alertas: AlertaCritica[] = [];

  for (const subtarea of subtareasFiltradas.value) {
    for (const etapa of subtarea.seguimientoEtapas || []) {
      if (esAtrasada(etapa)) {
        alertas.push({
          id: `${subtarea.codigoOlympo}-${etapa.id}-atrasada`,
          tipo: 'atrasada',
          codigoOlympo: subtarea.codigoOlympo,
          etapaNombre: etapa.etapaNombre || 'Etapa',
          fechaPlanificada: etapa.fechaPlanificada
        });
      } else if (esVenceHoy(etapa)) {
        alertas.push({
          id: `${subtarea.codigoOlympo}-${etapa.id}-hoy`,
          tipo: 'hoy',
          codigoOlympo: subtarea.codigoOlympo,
          etapaNombre: etapa.etapaNombre || 'Etapa',
          fechaPlanificada: etapa.fechaPlanificada
        });
      }
    }
  }

  return alertas.slice(0, 20);
});

onMounted(async () => {
  try {
    const [subtareasData, resumen] = await Promise.all([
      subtareasService.getAll(),
      subtareasService.getResumenDiario()
    ]);
    subtareas.value = subtareasData;
    resumenDiario.value = resumen;
  } catch (error) {
    console.error('Error cargando matriz de subtareas:', error);
    mostrarNotificacion(obtenerMensajeError(error, 'No se pudo cargar la matriz de subtareas'), 'error');
  } finally {
    cargando.value = false;
  }
});

function mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' = 'success') {
  notificacion.value = { mensaje, tipo };
  setTimeout(() => {
    if (notificacion.value.mensaje === mensaje) {
      notificacion.value = { mensaje: '', tipo: 'success' };
    }
  }, 3500);
}

function obtenerMensajeError(error: any, fallback: string) {
  return error?.response?.data?.error || error?.message || fallback;
}

function obtenerEtapaId(etapa: any): number | null {
  const valor = Number(etapa?.etapaId ?? etapa?.etapa_id ?? etapa?.id);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return 'No aplica';
  return new Date(fecha).toLocaleDateString('es-EC');
}

function normalizarEstado(estado: string | null | undefined) {
  return estado === 'completado' ? 'completado' : 'pendiente';
}

function esAtrasada(etapa: EtapaSeguimiento) {
  if (!etapa?.fechaPlanificada) return false;
  const estado = normalizarEstado(etapa.estado);
  if (estado === 'completado') return false;

  const fechaPlanificada = new Date(etapa.fechaPlanificada);
  if (Number.isNaN(fechaPlanificada.getTime())) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaPlanificada.setHours(0, 0, 0, 0);
  return fechaPlanificada < hoy;
}

function estadoVisual(etapa: EtapaSeguimiento) {
  if (esAtrasada(etapa)) return 'en_retraso';
  return normalizarEstado(etapa.estado);
}

function calcularDiasRetraso(etapa: EtapaSeguimiento) {
  if (!etapa?.fechaPlanificada) return 0;
  const fechaPlanificada = new Date(etapa.fechaPlanificada);
  if (Number.isNaN(fechaPlanificada.getTime())) return 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaPlanificada.setHours(0, 0, 0, 0);

  const diffMs = hoy.getTime() - fechaPlanificada.getTime();
  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatoEstadoTexto(estado: string | null | undefined) {
  const normalizado = normalizarEstado(estado);
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    con_pendientes: 'Con pendientes',
    en_retraso: 'En retraso',
    completado: 'Completado'
  };
  return labels[normalizado] || normalizado;
}

function esVenceHoy(etapa: EtapaSeguimiento) {
  if (!etapa?.fechaPlanificada) return false;
  const fecha = new Date(etapa.fechaPlanificada);
  if (Number.isNaN(fecha.getTime())) return false;
  const hoy = new Date();
  return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth() && fecha.getDate() === hoy.getDate();
}

function activarSoloAtrasadas() {
  soloAtrasadas.value = true;
  soloVencenHoy.value = false;
}

function activarSoloHoy() {
  soloVencenHoy.value = true;
  soloAtrasadas.value = false;
}

function limpiarFiltrosRapidos() {
  soloAtrasadas.value = false;
  soloVencenHoy.value = false;
}

function toInputDate(fecha: string | null | undefined) {
  if (!fecha) return '';
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function onFechaPlanificadaInput(etapa: EtapaSeguimiento, event: Event) {
  const value = (event.target as HTMLInputElement).value;
  etapa.fechaPlanificada = value || null;
}

function onEstadoEtapaChange(etapa: EtapaSeguimiento) {
  etapa.estado = normalizarEstado(etapa.estado);
  if (etapa.estado === 'completado' && !etapa.fechaReal) {
    etapa.fechaReal = new Date().toISOString().slice(0, 10);
  }
}

async function guardarEtapa(codigoOlympo: string, etapa: EtapaSeguimiento) {
  savingEtapas.value.add(etapa.id);
  try {
    const etapaActualizada = await subtareasService.updateEtapa(codigoOlympo, etapa.etapaId, {
      estado: etapa.estado,
      fechaPlanificada: etapa.fechaPlanificada,
      fechaReal: etapa.fechaReal,
      observaciones: etapa.observaciones || ''
    });

    etapa.estado = etapaActualizada.estado;
    etapa.fechaPlanificada = etapaActualizada.fechaPlanificada;
    etapa.fechaReal = etapaActualizada.fechaReal;
    etapa.observaciones = etapaActualizada.observaciones;

    const resumen = await subtareasService.getResumenDiario();
    resumenDiario.value = resumen;
    mostrarNotificacion(`Etapa "${etapa.etapaNombre}" guardada correctamente`, 'success');
  } catch (error) {
    console.error('Error actualizando etapa:', error);
    mostrarNotificacion(obtenerMensajeError(error, 'No se pudo guardar el estado/observación de la etapa'), 'error');
  } finally {
    savingEtapas.value.delete(etapa.id);
  }
}

// ============ SEGUIMIENTOS DIARIOS ============

async function abrirSeguimientosDiarios(subtarea: any, etapa: any) {
  etapaActualSeguimiento.value = etapa;
  subtareaActualSeguimiento.value = subtarea;
  mostrarSeguimientos.value = true;
  cargandoSeguimientos.value = true;
  seguimientosDiarios.value = [];

  try {
    const etapaId = obtenerEtapaId(etapa);
    if (!etapaId) {
      throw new Error('No se pudo identificar la etapa seleccionada');
    }

    const response = await api.get(`/subtareas/${subtarea.id}/etapas/${etapaId}/seguimientos`, {
      params: { dias: 3650 }
    });
    seguimientosDiarios.value = Array.isArray(response.data)
      ? response.data
      : (response.data.seguimientos || response.data || []);
    
    nuevoComentario.value = '';
    nuevoAlerta.value = false;
  } catch (error: any) {
    console.error('Error al cargar seguimientos:', error);
    mostrarNotificacion(obtenerMensajeError(error, 'Error al cargar seguimientos diarios'), 'error');
  } finally {
    cargandoSeguimientos.value = false;
  }
}

function cerrarSeguimientosDiarios() {
  mostrarSeguimientos.value = false;
  cargandoSeguimientos.value = false;
  etapaActualSeguimiento.value = null;
  subtareaActualSeguimiento.value = null;
  seguimientosDiarios.value = [];
  nuevoComentario.value = '';
  nuevoAlerta.value = false;
}

async function guardarNuevoSeguimiento() {
  if (!subtareaActualSeguimiento.value || !etapaActualSeguimiento.value) return;
  if (!nuevoComentario.value.trim()) {
    mostrarNotificacion('Ingresa un comentario antes de guardar', 'error');
    return;
  }

  try {
    const etapaId = obtenerEtapaId(etapaActualSeguimiento.value);
    if (!etapaId) {
      throw new Error('No se pudo identificar la etapa seleccionada');
    }

    const response = await api.post(
      `/subtareas/${subtareaActualSeguimiento.value.id}/etapas/${etapaId}/seguimientos`,
      {
        comentario: nuevoComentario.value.trim(),
        tieneAlerta: nuevoAlerta.value,
        responsableId: subtareaActualSeguimiento.value.responsableId,
        fecha: new Date().toISOString().split('T')[0]
      }
    );

    seguimientosDiarios.value = response.data.seguimientos || response.data || [];
    nuevoComentario.value = '';
    nuevoAlerta.value = false;
    mostrarNotificacion('Seguimiento diario guardado correctamente', 'success');
  } catch (error: any) {
    console.error('Error al guardar seguimiento:', error);
    mostrarNotificacion(obtenerMensajeError(error, 'Error al guardar seguimiento'), 'error');
  }
}

async function eliminarSeguimiento(seguimientoId: number) {
  if (!confirm('¿Estás seguro de que deseas eliminar este seguimiento?')) return;

  if (!subtareaActualSeguimiento.value || !etapaActualSeguimiento.value) return;

  try {
    const etapaId = obtenerEtapaId(etapaActualSeguimiento.value);
    if (!etapaId) {
      throw new Error('No se pudo identificar la etapa seleccionada');
    }

    const response = await api.delete(
      `/subtareas/${subtareaActualSeguimiento.value.id}/etapas/${etapaId}/seguimientos/${seguimientoId}`
    );

    seguimientosDiarios.value = response.data?.seguimientos || response.data || [];
    mostrarNotificacion('Seguimiento eliminado correctamente', 'success');
  } catch (error: any) {
    console.error('Error al eliminar seguimiento:', error);
    mostrarNotificacion(obtenerMensajeError(error, 'Error al eliminar seguimiento'), 'error');
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
</script>

<style scoped>
.subtareas-view {
  padding: 1rem;
}

.header {
  margin-bottom: 1.5rem;
}

.header h1 {
  margin: 0;
  color: #1f2937;
}

.subtitle {
  margin-top: 0.5rem;
  color: #6b7280;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.toast {
  position: sticky;
  top: 1rem;
  z-index: 30;
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
}

.toast-success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.toast-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.resumen {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.alertas-dia {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 0.8rem;
  margin-bottom: 1rem;
}

.alertas-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.alertas-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #9a3412;
}

.alertas-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.btn-filtro-rapido {
  background: #ea580c;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-filtro-rapido.clear {
  background: #64748b;
}

.alertas-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.45rem;
}

.alerta-item {
  border: 1px solid #fdba74;
  background: white;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
}

.alerta-item.atrasada {
  border-color: #fecaca;
  background: #fef2f2;
}

.alerta-item.hoy {
  border-color: #fde68a;
  background: #fffbeb;
}

.alerta-tipo {
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  color: #9a3412;
}

.alerta-text {
  font-size: 0.8rem;
  color: #1f2937;
}

.alerta-fecha {
  font-size: 0.75rem;
  color: #6b7280;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.kpi-card {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
}

.kpi-card.warning {
  background: #fff7ed;
  border-color: #fed7aa;
}

.kpi-card.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.kpi-card.info {
  background: #ecfeff;
  border-color: #a5f3fc;
}

.kpi-label {
  display: block;
  color: #475569;
  font-size: 0.72rem;
}

.filtros {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #374151;
}

.estado-select-global {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  font-size: 0.85rem;
  min-width: 170px;
}

.search-input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  min-width: 260px;
  font-size: 0.85rem;
}

.resumen-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  min-width: 180px;
}

.label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
}

.tabla-container,
.tabla-etapas-container {
  overflow-x: auto;
}

.tabla,
.tabla-etapas {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.tabla th,
.tabla td,
.tabla-etapas th,
.tabla-etapas td {
  border-bottom: 1px solid #e5e7eb;
  padding: 0.75rem;
  text-align: left;
}

.tabla thead,
.tabla-etapas thead {
  background: #f9fafb;
}

.codigo {
  font-family: monospace;
  font-size: 0.85rem;
}

.badge {
  display: inline-block;
  background: #3b82f6;
  color: white;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 0.75rem;
}

.etapas-card {
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  padding: 1rem;
}

.etapas-card h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  color: #111827;
}

.timeline {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: #fafafa;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px 16px 1fr;
  align-items: start;
  gap: 0.4rem;
  min-height: 28px;
}

.timeline-node {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 3px;
}

.timeline-node.completado {
  background: #10b981;
}

.timeline-node.en_retraso {
  background: #ef4444;
}

.timeline-node.con_pendientes {
  background: #f59e0b;
}

.timeline-node.pendiente {
  background: #9ca3af;
}

.timeline-line {
  width: 2px;
  background: #d1d5db;
  height: 100%;
  margin-left: 5px;
}

.timeline-content {
  padding-bottom: 0.5rem;
}

.timeline-title {
  font-size: 0.85rem;
  color: #1f2937;
}

.timeline-date {
  font-size: 0.75rem;
  color: #6b7280;
}

.atraso-tag {
  display: inline-flex;
  align-items: center;
  margin-left: 0.4rem;
  background: #dc2626;
  color: #ffffff;
  border: 1px solid #fecaca;
  padding: 0.15rem 0.6rem;
  padding: 0.05rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;

.etapa-cell {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.estado-inline {
  font-size: 0.75rem;
  color: #334155;
}

.atraso-tag-inline {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
}
}

.estado {
  display: inline-block;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  color: white;
}

.estado.completado {
  background: #10b981;
}

.estado.en_proceso {
  background: #f59e0b;
}

.estado.pendiente {
  background: #6b7280;
}

.estado-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  font-size: 0.85rem;
  width: 140px;
}

.estado-hint {
  margin-top: 0.25rem;
  color: #b91c1c;
  font-size: 0.72rem;
}

.fecha-input {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  font-size: 0.85rem;
  width: 140px;
}

.obs-input {
  width: 100%;
  min-width: 220px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  font-size: 0.85rem;
  resize: vertical;
}

.btn-guardar {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn-guardar:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Estilos para Seguimientos Diarios */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #f3f4f6;
  border-radius: 6px;
}

.modal-body {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-cerrar {
  background: #e5e7eb;
  color: #1f2937;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-cerrar:hover {
  background: #d1d5db;
}

.nuevo-comentario-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.nuevo-comentario-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1f2937;
  font-size: 1rem;
}

.form-grupo {
  margin-bottom: 1rem;
}

.form-grupo label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.textarea-comentario {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.75rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.textarea-comentario:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-checkbox {
  margin-bottom: 1.25rem;
}

.alerta-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 500;
}

.alerta-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.btn-guardar-comentario {
  width: 100%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.btn-guardar-comentario:hover {
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-guardar-comentario:active {
  transform: scale(0.98);
}

.seguimientos-list {
  margin-top: 1.5rem;
}

.seguimientos-list h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1f2937;
  font-size: 1rem;
}

.sin-seguimientos {
  text-align: center;
  padding: 2rem 1rem;
  color: #9ca3af;
}

.sin-seguimientos p {
  margin: 0;
}

.seguimientos-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.seguimiento-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: white;
  border-left: 4px solid #d1d5db;
  transition: box-shadow 0.2s, transform 0.2s;
}

.seguimiento-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.seguimiento-item.con-alerta {
  border-left-color: #dc2626;
  background: #fef2f2;
}

.seguimiento-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.seguimiento-fecha {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.seguimiento-responsable {
  font-size: 0.85rem;
  color: #6b7280;
}

.btn-eliminar {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-eliminar:hover {
  opacity: 1;
}

.seguimiento-contenido {
  margin-bottom: 0.75rem;
  color: #374151;
  line-height: 1.5;
}

.seguimiento-contenido p {
  margin: 0;
}

.alerta-badge {
  display: inline-block;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.8rem;
}

.btn-seguimiento {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-seguimiento:hover {
  background: #059669;
}

.btn-seguimiento:active {
  transform: scale(0.98);
}
</style>
