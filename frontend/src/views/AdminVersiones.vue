<template>
  <div class="admin-versiones">
    <div class="header">
      <h1>📂 Gestión de Versiones POA-PAC</h1>
      <p class="subtitle">Administra versiones y reformas del Plan Operativo Anual</p>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button class="btn-primary btn-crear" @click="abrirModalNuevaReforma">
        ➕ Nueva Reforma
      </button>
      <div class="buscador-container">
        <span class="buscador-icon">🔎</span>
        <input
          v-model="busquedaVersiones"
          type="text"
          class="buscador-input"
          placeholder="Buscar por nombre, descripción o usuario..."
        />
      </div>
      <div class="filtros">
        <label>
          <span>Año:</span>
          <select v-model="anioFiltro" @change="filtrarVersiones">
            <option value="">Todos</option>
            <option v-for="anio in aniosDisponibles" :key="anio" :value="anio">{{ anio }}</option>
          </select>
        </label>
        <label>
          <span>Estado:</span>
          <select v-model="estadoFiltro" @change="filtrarVersiones">
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="aprobado">Aprobado</option>
            <option value="historico">Histórico</option>
          </select>
        </label>
        <label>
          <span>Orden:</span>
          <select v-model="ordenVersiones" @change="filtrarVersiones">
            <option value="fecha-desc">Más recientes</option>
            <option value="fecha-asc">Más antiguas</option>
            <option value="nombre-asc">Nombre A-Z</option>
            <option value="presupuesto-desc">Presupuesto ↓</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Version Actual Destacada -->
    <div v-if="versionActual" class="version-actual-card">
      <div class="version-header">
        <div class="version-info">
          <h2>🎯 {{ versionActual.nombre }}</h2>
          <span class="badge badge-aprobado">VERSIÓN ACTUAL</span>
        </div>
        <div class="version-stats">
          <div class="stat">
            <span class="stat-label">Procesos</span>
            <span class="stat-value">{{ versionActual.totalActividades }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Activas</span>
            <span class="stat-value destacado">{{ versionActual.actividadesActivas }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Presupuesto</span>
            <span class="stat-value">${{ formatearMonto(versionActual.presupuestoTotal) }}</span>
          </div>
        </div>
      </div>
      <div class="version-actions">
        <button class="btn-secondary" @click="verDetalleVersion(versionActual)">
          👁️ Ver Detalle
        </button>
      </div>
    </div>

    <!-- Lista de Versiones -->
    <div class="versiones-lista">
      <h3>📚 Historial de Versiones</h3>

      <div v-if="totalPaginasVers > 1" class="paginator">
        <button class="pag-btn" :disabled="paginaVersiones === 1" @click="paginaVersiones--">‹ Anterior</button>
        <span class="pag-info">Página {{ paginaVersiones }} de {{ totalPaginasVers }} · {{ versionesFiltradas.length }} versiones</span>
        <button class="pag-btn" :disabled="paginaVersiones >= totalPaginasVers" @click="paginaVersiones++">Siguiente ›</button>
      </div>
      
      <div v-if="versionesFiltradas.length === 0" class="sin-datos">
        📭 No hay versiones para mostrar
      </div>

      <div v-for="version in versionesPaginadas" :key="version.id" class="version-card">
        <div class="version-card-header">
          <div class="version-titulo">
            <h4>{{ version.nombre }}</h4>
            <span :class="['badge', `badge-${version.estado}`]">
              {{ formatearEstado(version.estado) }}
            </span>
          </div>
          <div class="version-fecha">
            <span v-if="version.fechaCreacion">
              📅 Creada: {{ formatearFecha(version.fechaCreacion) }}
            </span>
            <span v-if="version.fechaAprobacion">
              ✅ Aprobada: {{ formatearFecha(version.fechaAprobacion) }}
            </span>
          </div>
        </div>

        <div class="version-card-body">
          <div class="version-descripcion" v-if="version.descripcion">
            <p>{{ version.descripcion }}</p>
          </div>
          
          <div class="version-metricas">
            <div class="metrica">
              <span class="metrica-icono">📊</span>
              <span class="metrica-texto">
                <strong>{{ version.totalActividades }}</strong> procesos
              </span>
            </div>
            <div class="metrica">
              <span class="metrica-icono">✓</span>
              <span class="metrica-texto">
                <strong>{{ version.actividadesActivas }}</strong> activas
              </span>
            </div>
            <div class="metrica">
              <span class="metrica-icono">💰</span>
              <span class="metrica-texto">
                <strong>${{ formatearMonto(version.presupuestoTotal) }}</strong>
              </span>
            </div>
          </div>
        </div>

        <div class="version-card-actions">
          <button class="btn-small btn-ver" @click="verDetalleVersion(version)">
            👁️ Ver
          </button>
          <button 
            v-if="version.estado === 'borrador'" 
            class="btn-small btn-aprobar" 
            @click="aprobarVersionModal(version)"
          >
            ✅ Aprobar
          </button>
          <button 
            v-if="version.numeroReforma > 0" 
            class="btn-small btn-cambios" 
            @click="verCambios(version)"
          >
            📋 Cambios
          </button>
          <button 
            v-if="versionesParaComparar.length > 1" 
            class="btn-small btn-comparar" 
            @click="agregarAComparacion(version)"
          >
            🔄 Comparar
          </button>
          <button 
            v-if="version.estado === 'borrador'" 
            class="btn-small btn-eliminar" 
            @click="eliminarVersionModal(version)"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Paginador versiones -->
    <div v-if="totalPaginasVers > 1" class="paginator">
      <button class="pag-btn" :disabled="paginaVersiones === 1" @click="paginaVersiones--">‹ Anterior</button>
      <span class="pag-info">Página {{ paginaVersiones }} de {{ totalPaginasVers }} · {{ versionesFiltradas.length }} versiones</span>
      <button class="pag-btn" :disabled="paginaVersiones >= totalPaginasVers" @click="paginaVersiones++">Siguiente ›</button>
    </div>

    <!-- Modal Nueva Reforma -->
    <div v-if="mostrarModalReforma" class="modal-overlay" @click.self="cerrarModalReforma">
      <div class="modal-content modal-reforma" @click.stop>
        <div class="modal-header">
          <h2>➕ Crear Nueva Reforma</h2>
          <button class="btn-close" @click="cerrarModalReforma">✕</button>
        </div>

        <form @submit.prevent="crearReforma" class="modal-body">
          <div class="form-grupo">
            <label for="anio">Año *</label>
            <input
              id="anio"
              v-model.number="formularioReforma.anio"
              type="number"
              required
              min="2020"
              max="2030"
              placeholder="2026"
            />
          </div>

          <div class="form-grupo">
            <label for="descripcion">Descripción de la Reforma *</label>
            <textarea
              id="descripcion"
              v-model="formularioReforma.descripcion"
              required
              rows="4"
              placeholder="Ejemplo: Ajuste de presupuesto Q1 - Incremento para infraestructura tecnológica"
            ></textarea>
          </div>

          <div class="form-grupo">
            <label for="usuario">Usuario Responsable *</label>
            <input
              id="usuario"
              v-model="formularioReforma.usuario_creacion"
              type="text"
              required
              placeholder="Nombre del usuario creador"
            />
          </div>

          <div class="alert alert-info">
            <strong>ℹ️ Información:</strong> La nueva reforma duplicará todos los procesos activos de la versión anterior. Podrás modificarlos antes de aprobar.
          </div>

          <div class="modal-footer">
            <button type="submit" class="btn-primary" :disabled="creandoReforma">
              {{ creandoReforma ? '⏳ Creando...' : '✅ Crear Reforma' }}
            </button>
            <button type="button" class="btn-secondary" @click="cerrarModalReforma">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Detalle Versión -->
    <div v-if="mostrarModalDetalle" class="modal-overlay" @click.self="cerrarModalDetalle">
      <div class="modal-content modal-detalle" @click.stop>
        <div class="modal-header">
          <h2>📄 {{ versionDetalle?.nombre || 'Detalle de versión' }}</h2>
          <button class="btn-close" @click="cerrarModalDetalle">✕</button>
        </div>

        <div v-if="cargandoModalDetalle" class="loading">Cargando detalle...</div>

        <div v-else-if="versionDetalle" class="modal-body">
          <div class="detalle-seccion">
            <h3>📊 Información General</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Estado:</span>
                <span :class="['badge', `badge-${versionDetalle.estado}`]">
                  {{ formatearEstado(versionDetalle.estado) }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Año:</span>
                <span>{{ versionDetalle.anio }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Número de Reforma:</span>
                <span>{{ versionDetalle.numeroReforma }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Fecha Creación:</span>
                <span>{{ formatearFecha(versionDetalle.fechaCreacion) }}</span>
              </div>
              <div class="info-item" v-if="versionDetalle.fechaAprobacion">
                <span class="info-label">Fecha Aprobación:</span>
                <span>{{ formatearFecha(versionDetalle.fechaAprobacion) }}</span>
              </div>
              <div class="info-item" v-if="versionDetalle.usuarioCreacion">
                <span class="info-label">Usuario:</span>
                <span>{{ versionDetalle.usuarioCreacion }}</span>
              </div>
            </div>
          </div>

          <div class="detalle-seccion" v-if="versionDetalle.descripcion">
            <h3>📝 Descripción</h3>
            <p>{{ versionDetalle.descripcion }}</p>
          </div>

          <div class="detalle-seccion">
            <h3>💰 Presupuesto y Estadísticas</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-icono">📊</span>
                <span class="stat-numero">{{ versionDetalle.totalActividades }}</span>
                <span class="stat-label">Total Procesos</span>
              </div>
              <div class="stat-card activa">
                <span class="stat-icono">✅</span>
                <span class="stat-numero">{{ versionDetalle.actividadesActivas }}</span>
                <span class="stat-label">Activas</span>
              </div>
              <div class="stat-card inactiva">
                <span class="stat-icono">⏸️</span>
                <span class="stat-numero">{{ versionDetalle.actividadesInactivas }}</span>
                <span class="stat-label">Inactivas</span>
              </div>
              <div class="stat-card presupuesto">
                <span class="stat-icono">💰</span>
                <span class="stat-numero">${{ formatearMonto(versionDetalle.presupuestoTotal) }}</span>
                <span class="stat-label">Presupuesto Total</span>
              </div>
            </div>
          </div>

          <div class="detalle-seccion" v-if="versionDetalle.actividades && versionDetalle.actividades.length > 0">
            <h3>📋 Procesos ({{ versionDetalle.actividades.length }})</h3>
            <div class="actividades-lista-mini">
              <div 
                v-for="act in versionDetalle.actividades.slice(0, 10)" 
                :key="act.id" 
                class="actividad-mini"
              >
                <span class="actividad-nombre">{{ act.nombre }}</span>
                <span class="actividad-monto">${{ formatearMonto(act.presupuesto) }}</span>
              </div>
              <div v-if="versionDetalle.actividades.length > 10" class="mas-actividades">
                ... y {{ versionDetalle.actividades.length - 10 }} más
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" @click="versionDetalle && irAActividades(versionDetalle)">
            📝 Ver Procesos Completos
          </button>
          <button class="btn-secondary" @click="cerrarModalDetalle">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Toast de notificación -->
    <div v-if="notificacion.mensaje" :class="['toast', `toast-${notificacion.tipo}`]">
      {{ notificacion.mensaje }}
    </div>

    <!-- Modal de confirmación -->
    <div v-if="confirmar.activa" class="confirm-overlay" @click.self="confirmar.activa = false; confirmar.resolve(false)">
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

    <!-- Modal aprobar versión -->
    <div v-if="aprobarModal.activa" class="confirm-overlay" @click.self="aprobarModal.activa = false">
      <div class="confirm-modal aprobar-modal" @click.stop>
        <div class="confirm-icon">✅</div>
        <h3 class="confirm-titulo">Aprobar versión</h3>
        <p class="confirm-msg">Esta acción marcará la versión anterior como histórica.</p>
        <div class="form-grupo">
          <label>Nombre de usuario *</label>
          <input
            v-model="aprobarModal.usuario"
            type="text"
            placeholder="Ingrese su nombre de usuario"
            class="input-usuario"
            @keyup.enter="confirmarAprobacion"
          />
          <span v-if="aprobarModal.error" class="campo-error">{{ aprobarModal.error }}</span>
        </div>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="aprobarModal.activa = false">Cancelar</button>
          <button class="btn-aprobar-confirm" @click="confirmarAprobacion">✔ Aprobar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import * as versionesService from '../services/versionesService';
import { normalizarTextoBusqueda } from '../utils/search';

// Tipos
interface Version {
  id: number;
  anio: number;
  numeroReforma: number;
  nombre: string;
  descripcion?: string;
  estado: 'borrador' | 'aprobado' | 'historico';
  presupuestoTotal: number;
  fechaCreacion?: string;
  fechaAprobacion?: string;
  usuarioCreacion?: string;
  totalActividades: number;
  actividadesActivas: number;
  actividadesInactivas: number;
  actividades?: any[];
}

interface FormularioReforma {
  anio: number;
  descripcion: string;
  usuario_creacion: string;
}

interface Notificacion {
  mensaje: string;
  tipo: 'success' | 'error' | 'info';
}

// Estado
const versiones = ref<Version[]>([]);
const versionActual = ref<Version | null>(null);
const versionDetalle = ref<Version | null>(null);
const mostrarModalReforma = ref(false);
const mostrarModalDetalle = ref(false);
const cargandoModalDetalle = ref(false);
const creandoReforma = ref(false);
const anioFiltro = ref('');
const estadoFiltro = ref('');
const busquedaVersiones = ref('');
const ordenVersiones = ref('fecha-desc');
const versionesParaComparar = ref<Version[]>([]);

const formularioReforma = ref<FormularioReforma>({
  anio: new Date().getFullYear(),
  descripcion: '',
  usuario_creacion: ''
});

const notificacion = ref<Notificacion>({ mensaje: '', tipo: 'success' });

// Paginación
const paginaVersiones = ref(1);
const itemsPorPaginaVers = 8;
const totalPaginasVers = computed(() => Math.ceil(versionesFiltradas.value.length / itemsPorPaginaVers));
const versionesPaginadas = computed(() => {
  const start = (paginaVersiones.value - 1) * itemsPorPaginaVers;
  return versionesFiltradas.value.slice(start, start + itemsPorPaginaVers);
});
watch([busquedaVersiones, anioFiltro, estadoFiltro, ordenVersiones], () => { paginaVersiones.value = 1; });

// Modal de confirmación
const confirmar = ref({ activa: false, titulo: '', mensaje: '', resolve: (_: boolean) => {} });
function pedirConfirmacion(titulo: string, mensaje: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmar.value = { activa: true, titulo, mensaje, resolve };
  });
}

// Modal aprobar versión
const aprobarModal = ref({ activa: false, version: null as Version | null, usuario: '', error: '' });
function abrirAprobarModal(version: Version) {
  aprobarModal.value = { activa: true, version, usuario: '', error: '' };
}
async function confirmarAprobacion() {
  if (!aprobarModal.value.usuario.trim()) {
    aprobarModal.value.error = 'Por favor ingrese su nombre de usuario';
    return;
  }
  const version = aprobarModal.value.version!;
  const usuario = aprobarModal.value.usuario.trim();
  aprobarModal.value.activa = false;
  try {
    await versionesService.aprobarVersion(version.id, usuario);
    mostrarNotificacion('Versión aprobada exitosamente', 'success');
    await cargarVersiones();
  } catch (error) {
    console.error('Error al aprobar:', error);
    mostrarNotificacion('Error al aprobar la versión', 'error');
  }
}

// Computed
const aniosDisponibles = computed(() => {
  const anios = [...new Set(versiones.value.map(v => v.anio))];
  return anios.sort((a, b) => b - a);
});

const versionesFiltradas = computed(() => {
  let resultado = versiones.value.filter(v => v.id !== versionActual.value?.id);
  
  if (anioFiltro.value) {
    resultado = resultado.filter(v => v.anio === parseInt(anioFiltro.value));
  }
  
  if (estadoFiltro.value) {
    resultado = resultado.filter(v => v.estado === estadoFiltro.value);
  }

  const q = normalizarTextoBusqueda(busquedaVersiones.value);
  if (q) {
    resultado = resultado.filter((v) =>
      normalizarTextoBusqueda(`${v.nombre || ''} ${v.descripcion || ''} ${v.usuarioCreacion || ''}`).includes(q)
    );
  }

  resultado = [...resultado].sort((a, b) => {
    const fechaA = new Date(a.fechaCreacion || 0).getTime();
    const fechaB = new Date(b.fechaCreacion || 0).getTime();
    switch (ordenVersiones.value) {
      case 'fecha-asc': return fechaA - fechaB;
      case 'nombre-asc': return (a.nombre || '').localeCompare(b.nombre || '');
      case 'presupuesto-desc': return Number(b.presupuestoTotal || 0) - Number(a.presupuestoTotal || 0);
      default: return fechaB - fechaA;
    }
  });
  
  return resultado;
});

// Métodos
async function cargarVersiones() {
  try {
    const [todasVersiones, actual] = await Promise.all([
      versionesService.getAllVersiones(),
      versionesService.getVersionActual().catch(() => null)
    ]);
    
    versiones.value = todasVersiones;
    versionActual.value = actual;
    
    console.log('Versiones cargadas:', versiones.value);
  } catch (error) {
    console.error('Error al cargar versiones:', error);
    mostrarNotificacion('Error al cargar versiones', 'error');
  }
}

function abrirModalNuevaReforma() {
  formularioReforma.value = {
    anio: new Date().getFullYear(),
    descripcion: '',
    usuario_creacion: ''
  };
  mostrarModalReforma.value = true;
}

function cerrarModalReforma() {
  mostrarModalReforma.value = false;
}

async function crearReforma() {
  try {
    creandoReforma.value = true;
    
    const nuevaVersion = await versionesService.crearNuevaReforma(formularioReforma.value);
    
    mostrarNotificacion('Reforma creada exitosamente', 'success');
    cerrarModalReforma();
    await cargarVersiones();
    
    // Abrir detalle de la nueva versión
    verDetalleVersion(nuevaVersion);
    
  } catch (error: any) {
    console.error('Error al crear reforma:', error);
    mostrarNotificacion('Error al crear reforma: ' + (error.response?.data?.error || error.message), 'error');
  } finally {
    creandoReforma.value = false;
  }
}

async function verDetalleVersion(version: Version) {
  mostrarModalDetalle.value = true;
  cargandoModalDetalle.value = true;
  versionDetalle.value = version;

  try {
    const detalle = await versionesService.getVersionById(version.id);
    versionDetalle.value = detalle;
  } catch (error) {
    console.error('Error al cargar detalle:', error);
    mostrarNotificacion('Error al cargar detalle de la versión', 'error');
  } finally {
    cargandoModalDetalle.value = false;
  }
}

function cerrarModalDetalle() {
  mostrarModalDetalle.value = false;
  cargandoModalDetalle.value = false;
  versionDetalle.value = null;
}

async function aprobarVersionModal(version: Version) {
  abrirAprobarModal(version);
}

async function eliminarVersionModal(version: Version) {
  if (!await pedirConfirmacion('Eliminar versión', `¿Eliminar la versión "${version.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await versionesService.deleteVersion(version.id);
    mostrarNotificacion('Versión eliminada exitosamente', 'success');
    await cargarVersiones();
  } catch (error) {
    console.error('Error al eliminar:', error);
    mostrarNotificacion('Error al eliminar la versión', 'error');
  }
}

function verCambios(_version: Version) {
  // TODO: Implementar vista de cambios
  mostrarNotificacion('Funcionalidad en desarrollo', 'info');
}

function agregarAComparacion(_version: Version) {
  // TODO: Implementar comparación
  mostrarNotificacion('Funcionalidad en desarrollo', 'info');
}

function irAActividades(version: Version) {
  // Redirigir a actividades con filtro de versión
  window.location.href = `/#/admin/actividades?version=${version.id}`;
}

function filtrarVersiones() {
  // El computed ya maneja el filtrado
}

function formatearMonto(monto: number | string): string {
  if (!monto) return '0.00';
  return parseFloat(monto as string).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(fecha: string | Date | undefined): string {
  if (!fecha) return 'N/A';
  try {
    return new Date(fecha).toLocaleDateString('es-EC', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    return fecha as string;
  }
}

function formatearEstado(estado: string): string {
  const estados: Record<string, string> = {
    'borrador': 'Borrador',
    'aprobado': 'Aprobado',
    'historico': 'Histórico'
  };
  return estados[estado] || estado;
}

function mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info') {
  notificacion.value = { mensaje, tipo };
  setTimeout(() => {
    notificacion.value = { mensaje: '', tipo: 'success' };
  }, 3000);
}

// Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', manejarEscapeModales);
  await cargarVersiones();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', manejarEscapeModales);
});

function manejarEscapeModales(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;

  if (aprobarModal.value.activa) {
    aprobarModal.value.activa = false;
    return;
  }
  if (confirmar.value.activa) {
    confirmar.value.activa = false;
    confirmar.value.resolve(false);
    return;
  }
  if (mostrarModalDetalle.value) {
    cerrarModalDetalle();
    return;
  }
  if (mostrarModalReforma.value) {
    cerrarModalReforma();
  }
}
</script>

<style scoped lang="scss">
.admin-versiones {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;

  .header {
    margin-bottom: 2rem;
    text-align: center;

    h1 {
      font-size: 2.5rem;
      color: #2c3e50;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #666;
      font-size: 1rem;
      margin: 0;
    }
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;

    .buscador-container {
      position: relative;
      min-width: 260px;
      flex: 1;

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
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0.5rem 0.65rem 0.5rem 2rem;
        font-size: 0.86rem;
        color: #0f172a;

        &:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
      }
    }

    .btn-crear {
      font-size: 1.1rem;
      padding: 0.8rem 1.5rem;
    }

    .filtros {
      display: flex;
      gap: 1rem;

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #2c3e50;
        font-weight: 500;

        select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95rem;
        }
      }
    }
  }

  .version-actual-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);

    .version-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.8rem;
      }

      .badge-aprobado {
        background: rgba(255, 255, 255, 0.3);
        padding: 0.4rem 1rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 700;
      }
    }

    .version-stats {
      display: flex;
      gap: 2rem;

      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 0.25rem;

          &.destacado {
            color: #ffd700;
          }
        }
      }
    }

    .version-actions {
      margin-top: 1rem;

      button {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }

  .versiones-lista {
    h3 {
      font-size: 1.5rem;
      color: #2c3e50;
      margin-bottom: 1.5rem;
    }
  }

  .version-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .version-card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
padding-bottom: 1rem;
      border-bottom: 2px solid #f0f0f0;

      .version-titulo {
        display: flex;
        align-items: center;
        gap: 1rem;

        h4 {
          margin: 0;
          font-size: 1.3rem;
          color: #2c3e50;
        }
      }

      .version-fecha {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
        font-size: 0.9rem;
        color: #666;
      }
    }

    .version-card-body {
      margin-bottom: 1rem;

      .version-descripcion {
        margin-bottom: 1rem;
        color: #555;
        font-size: 0.95rem;
      }

      .version-metricas {
        display: flex;
        gap: 2rem;

        .metrica {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          .metrica-icono {
            font-size: 1.3rem;
          }

          .metrica-texto {
            font-size: 0.95rem;
            color: #555;

            strong {
              color: #2c3e50;
              font-size: 1.1rem;
            }
          }
        }
      }
    }

    .version-card-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  }

  .badge {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;

    &.badge-borrador {
      background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%);
      color: #7c5000;
    }

    &.badge-aprobado {
      background: linear-gradient(135deg, #81c784 0%, #4caf50 100%);
      color: white;
    }

    &.badge-historico {
      background: linear-gradient(135deg, #90a4ae 0%, #607d8b 100%);
      color: white;
    }
  }

  .modal-reforma {
    max-width: 600px;
  }

  .modal-detalle {
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .detalle-seccion {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    h3 {
      font-size: 1.2rem;
      color: #2c3e50;
      margin-bottom: 1rem;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .info-label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 600;
      }
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;

    .stat-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%);
      border-radius: 8px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      &.activa {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      }

      &.inactiva {
        background: linear-gradient(135deg, #fff9c4 0%, #fff59d 100%);
      }

      &.presupuesto {
        background: linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%);
      }

      .stat-icono {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .stat-numero {
        font-size: 1.8rem;
        font-weight: 700;
        color: #2c3e50;
        margin-bottom: 0.25rem;
      }

      .stat-label {
        font-size: 0.85rem;
        color: #666;
      }
    }
  }

  .actividades-lista-mini {
    max-height: 300px;
    overflow-y: auto;

    .actividad-mini {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .actividad-nombre {
        flex: 1;
        color: #2c3e50;
      }

      .actividad-monto {
        font-weight: 600;
        color: #667eea;
      }
    }

    .mas-actividades {
      padding: 0.75rem;
      text-align: center;
      color: #666;
      font-style: italic;
    }
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;

    &.alert-info {
      background: #e3f2fd;
      color: #1565c0;
      border-left: 4px solid #1976d2;
    }
  }

  // Botones
  .btn-primary,
  .btn-secondary,
  .btn-small {
    padding: 0.6rem 1.2rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-secondary {
    background-color: #ccc;
    color: #333;
  }

  .btn-small {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .btn-ver {
    background-color: #6c757d;
    color: white;
  }

  .btn-aprobar {
    background-color: #28a745;
    color: white;
  }

  .btn-cambios {
    background-color: #17a2b8;
    color: white;
  }

  .btn-comparar {
    background-color: #ff9800;
    color: white;
  }

  .btn-eliminar {
    background-color: #dc3545;
    color: white;
  }

  .btn-close {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background-color: #dc3545;
      color: white;
      transform: rotate(90deg);
    }
  }

  .sin-datos {
    text-align: center;
    padding: 3rem;
    color: #999;
    font-size: 1.2rem;
  }

  // Toast
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;

    &.toast-success {
      background: linear-gradient(135deg, #81c784 0%, #4caf50 100%);
    }

    &.toast-error {
      background: linear-gradient(135deg, #e57373 0%, #f44336 100%);
    }

    &.toast-info {
      background: linear-gradient(135deg, #64b5f6 0%, #2196f3 100%);
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

  // Modal estilos (reutilizando de AdminActividades)
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 800px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: modalFadeIn 0.3s ease-out;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid #f0f0f0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px 12px 0 0;

    h2 {
      margin: 0;
      font-size: 1.6rem;
    }
  }

  .modal-body {
    padding: 2rem;
    max-height: 70vh;
    overflow-y: auto;
  }

  .modal-footer {
    padding: 1.5rem 2rem;
    border-top: 2px solid #f0f0f0;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
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
    textarea,
    select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
    }

    textarea {
      resize: vertical;
      min-height: 100px;
    }
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Capa de homogeneización visual con el nuevo dashboard */
  padding: 0.25rem;
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
    }

    .subtitle {
      color: #cbd5e1;
      font-size: 0.88rem;
    }
  }

  .toolbar {
    margin-bottom: 1rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 0.75rem;
  }

  .version-actual-card,
  .version-card,
  .modal-content {
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  }

  .version-actual-card {
    background: linear-gradient(135deg, #0f172a, #1d4ed8);
  }

  .version-card:hover {
    border-color: #bfdbfe;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  }

  .modal-overlay {
    background: rgba(15, 23, 42, 0.55);
  }

  .modal-header {
    background: #f8fafc;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
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
  min-width: 16ch;
  text-align: center;
}

/* Modales de confirmaci\u00f3n */
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
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
}

.aprobar-modal {
  text-align: left;
}

.aprobar-modal .confirm-icon,
.aprobar-modal .confirm-titulo,
.aprobar-modal .confirm-msg {
  text-align: center;
}

.confirm-icon { font-size: 2.4rem; margin-bottom: 0.6rem; }
.confirm-titulo { margin: 0 0 0.5rem; font-size: 1.15rem; color: #0f172a; }
.confirm-msg { margin: 0 0 1.2rem; color: #475569; font-size: 0.92rem; line-height: 1.5; }

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.2rem;
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

.btn-danger:hover { background: #b91c1c; }

.btn-aprobar-confirm {
  padding: 0.5rem 1.2rem;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-aprobar-confirm:hover { background: #15803d; }

.input-usuario {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-top: 0.3rem;
  box-sizing: border-box;
}

.input-usuario:focus {
  outline: none;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15);
}

.campo-error {
  display: block;
  color: #dc2626;
  font-size: 0.8rem;
  margin-top: 0.3rem;
}

/* Pulido visual final */
.admin-versiones .header,
.admin-versiones .toolbar,
.admin-versiones .version-card,
.admin-versiones .version-actual-card,
.admin-versiones .paginator {
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.admin-versiones .version-card-actions .btn-small {
  border-radius: 8px;
}

.admin-versiones .version-card:focus-within,
.admin-versiones .version-card:hover {
  border-color: #93c5fd;
}

.admin-versiones .buscador-input:focus,
.admin-versiones input:focus,
.admin-versiones select:focus,
.admin-versiones textarea:focus,
.admin-versiones .input-usuario:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
}

.admin-versiones .btn-small:focus-visible,
.admin-versiones .btn-primary:focus-visible,
.admin-versiones .btn-secondary:focus-visible,
.admin-versiones .pag-btn:focus-visible,
.admin-versiones .btn-aprobar-confirm:focus-visible,
.admin-versiones .btn-danger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.admin-versiones .modal-content,
.admin-versiones .confirm-modal {
  border: 1px solid #e2e8f0;
}
</style>
