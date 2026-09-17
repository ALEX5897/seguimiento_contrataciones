<template>
  <div class="catalogos-view">
    <div class="header">
      <h1>Catálogos Maestros</h1>
      <p>Administra los catálogos del sistema</p>
    </div>

    <div class="tabs-container">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: tabActiva === tab.id }]"
        @click="tabActiva = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="mensaje" :class="['mensaje', tipoMensaje]">{{ mensaje }}</div>

    <!-- TAB: Direcciones y Responsables -->
    <div v-if="tabActiva === 'direcciones-responsables'" class="tab-content">
      <!-- Sección Direcciones -->
      <section class="card">
        <div class="section-header">
          <h2>Direcciones</h2>
          <button type="button" class="btn-crear" @click="mostrarModalDireccion = true">
            ➕ Crear Dirección
          </button>
        </div>

        <!-- Modal Crear Dirección -->
        <div v-if="mostrarModalDireccion" class="modal-overlay" @click.self="mostrarModalDireccion = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>Crear Nueva Dirección</h3>
              <button type="button" class="btn-close" @click="mostrarModalDireccion = false">✕</button>
            </div>
            <form @submit.prevent="crearDireccion" class="form-modal">
              <div class="form-group">
                <label>Nombre *</label>
                <input v-model="nuevaDireccion" type="text" placeholder="Nombre de la dirección" required />
              </div>
              <div class="modal-actions">
                <button type="submit" :disabled="guardando" class="btn-primary">
                  {{ guardando ? 'Creando...' : '✓ Crear' }}
                </button>
                <button type="button" class="btn-secondary" @click="mostrarModalDireccion = false">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        <table class="tabla">
          <thead>
            <tr>
              <th width="60%">Nombre</th>
              <th width="20%">Activo</th>
              <th width="20%">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="direcciones.length === 0">
              <td colspan="3" class="sin-datos">No hay direcciones</td>
            </tr>
            <tr v-for="d in direcciones" :key="d.id">
              <td><input v-model="d.nombre" :disabled="d.id !== editandoDireccion" class="input-tabla" /></td>
              <td style="text-align: center">
                <input type="checkbox" v-model="d.activo" :disabled="d.id !== editandoDireccion" />
              </td>
              <td class="acciones-celda">
                <button v-if="d.id !== editandoDireccion" type="button" class="btn-editar-inline" @click="editandoDireccion = d.id" :disabled="guardando">
                  ✏️ Editar
                </button>
                <div v-else class="acciones-grupo">
                  <button type="button" class="btn-guardar-inline" @click="guardarDireccion(d)" :disabled="guardando">
                    ✓ Guardar
                  </button>
                  <button type="button" class="btn-cancelar-inline" @click="editandoDireccion = null" :disabled="guardando">
                    ✗ Cancelar
                  </button>
                </div>
                <button v-if="d.id === editandoDireccion" type="button" class="btn-eliminar-inline" @click="eliminarDireccion(d)" :disabled="guardando">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Sección Responsables -->
      <section class="card">
        <div class="section-header">
          <h2>Responsables</h2>
          <button type="button" class="btn-crear" @click="mostrarModalResponsable = true">
            ➕ Crear Responsable
          </button>
        </div>

        <div class="search-box">
          <input
            v-model="busquedaResponsables"
            type="text"
            placeholder="🔍 Buscar por nombre o dirección..."
            class="input-buscar"
          />
        </div>

        <!-- Acciones en masa -->
        <div v-if="responsablesSeleccionados.length > 0" class="acciones-masa">
          <span class="info-seleccion">{{ responsablesSeleccionados.length }} responsable(s) seleccionado(s)</span>
          <div class="botones-masa">
            <button
              type="button"
              class="btn-masa"
              @click="cambiarEstadoMasivo(true)"
              :disabled="guardando"
            >
              ✓ Activar
            </button>
            <button
              type="button"
              class="btn-masa"
              @click="cambiarEstadoMasivo(false)"
              :disabled="guardando"
            >
              ✗ Desactivar
            </button>
            <button
              type="button"
              class="btn-masa btn-masa-eliminar"
              @click="eliminarMasivo"
              :disabled="guardando"
            >
              🗑️ Eliminar
            </button>
            <button
              type="button"
              class="btn-masa btn-masa-limpiar"
              @click="responsablesSeleccionados = []"
              :disabled="guardando"
            >
              Limpiar
            </button>
          </div>
        </div>

        <!-- Modal Crear Responsable -->
        <div v-if="mostrarModalResponsable" class="modal-overlay" @click.self="mostrarModalResponsable = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>Crear Nuevo Responsable</h3>
              <button type="button" class="btn-close" @click="mostrarModalResponsable = false">✕</button>
            </div>
            <form @submit.prevent="crearResponsable" class="form-modal">
              <div class="form-group">
                <label>Nombre *</label>
                <input v-model="nuevoResponsable.nombre" type="text" placeholder="Nombre del responsable" required />
              </div>
              <div class="form-group">
                <label>Correo (opcional)</label>
                <input v-model="nuevoResponsable.email" type="email" placeholder="correo@ejemplo.com" />
              </div>
              <div class="form-group">
                <label>Dirección</label>
                <select v-model.number="nuevoResponsable.direccionId">
                  <option :value="null">-- Sin dirección --</option>
                  <option v-for="d in direcciones" :key="d.id" :value="d.id">{{ d.nombre }}</option>
                </select>
              </div>
              <div class="modal-actions">
                <button type="submit" :disabled="guardando" class="btn-primary">
                  {{ guardando ? 'Creando...' : '✓ Crear' }}
                </button>
                <button type="button" class="btn-secondary" @click="mostrarModalResponsable = false">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        <table class="tabla">
          <thead>
            <tr>
              <th width="5%">
                <input
                  type="checkbox"
                  :checked="responsablesFiltrados.length > 0 && responsablesFiltrados.every(r => responsablesSeleccionados.includes(r.id))"
                  @change="toggleSelectAll"
                />
              </th>
              <th width="20%">Nombre</th>
              <th width="20%">Correo</th>
              <th width="25%">Dirección</th>
              <th width="10%">Activo</th>
              <th width="20%">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="responsablesFiltrados.length === 0">
              <td colspan="6" class="sin-datos">{{ busquedaResponsables ? 'No hay coincidencias' : 'No hay responsables' }}</td>
            </tr>
            <tr v-for="r in responsablesFiltrados" :key="r.id">
              <td style="text-align: center">
                <input
                  type="checkbox"
                  :checked="responsablesSeleccionados.includes(r.id)"
                  @change="toggleSelectResponsable(r.id)"
                  :disabled="r.id === editandoResponsable"
                />
              </td>
              <td><input v-model="r.nombre" :disabled="r.id !== editandoResponsable" class="input-tabla" /></td>
              <td><input v-model="r.email" :disabled="r.id !== editandoResponsable" class="input-tabla" /></td>
              <td>
                <select v-model.number="r.direccionId" :disabled="r.id !== editandoResponsable" class="input-tabla">
                  <option :value="null">-- Sin dirección --</option>
                  <option v-for="d in direcciones" :key="d.id" :value="d.id">{{ d.nombre }}</option>
                </select>
              </td>
              <td style="text-align: center">
                <input type="checkbox" v-model="r.activo" :disabled="r.id !== editandoResponsable" />
              </td>
              <td class="acciones-celda">
                <button v-if="r.id !== editandoResponsable" type="button" class="btn-editar-inline" @click="editandoResponsable = r.id" :disabled="guardando">
                  ✏️ Editar
                </button>
                <div v-else class="acciones-grupo">
                  <button type="button" class="btn-guardar-inline" @click="guardarResponsable(r)" :disabled="guardando">
                    ✓ Guardar
                  </button>
                  <button type="button" class="btn-cancelar-inline" @click="editandoResponsable = null" :disabled="guardando">
                    ✗ Cancelar
                  </button>
                </div>
                <button v-if="r.id === editandoResponsable" type="button" class="btn-eliminar-inline" @click="eliminarResponsable(r)" :disabled="guardando">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- TAB: Catálogo de Etapas -->
    <div v-if="tabActiva === 'catalogo-etapas'" class="tab-content">
      <AdminCatalogoEtapas />
    </div>

    <!-- TAB: Tipos de Contratación -->
    <div v-if="tabActiva === 'tipos-contratacion'" class="tab-content">
      <section class="card">
        <div class="section-header">
          <h2>Tipos de Contratación</h2>
          <button type="button" class="btn-crear" @click="mostrarModalTipoContratacion = true">
            ➕ Crear Tipo de Contratación
          </button>
        </div>

        <!-- Modal Crear Tipo de Contratación -->
        <div v-if="mostrarModalTipoContratacion" class="modal-overlay" @click.self="mostrarModalTipoContratacion = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>Crear Nuevo Tipo de Contratación</h3>
              <button type="button" class="btn-close" @click="mostrarModalTipoContratacion = false">✕</button>
            </div>
            <form @submit.prevent="crearTipoContratacion" class="form-modal">
              <div class="form-group">
                <label>Nombre *</label>
                <input v-model="nuevoTipoContratacion" type="text" placeholder="Ej: Subasta Inversa Electrónica" required />
              </div>
              <div class="modal-actions">
                <button type="submit" :disabled="guardando" class="btn-primary">
                  {{ guardando ? 'Creando...' : '✓ Crear' }}
                </button>
                <button type="button" class="btn-secondary" @click="mostrarModalTipoContratacion = false">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>

        <table class="tabla">
          <thead>
            <tr>
              <th width="60%">Nombre</th>
              <th width="20%">Activo</th>
              <th width="20%">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="tiposContratacion.length === 0">
              <td colspan="3" class="sin-datos">No hay tipos de contratación</td>
            </tr>
            <tr v-for="t in tiposContratacion" :key="t.id">
              <td><input v-model="t.nombre" :disabled="t.id !== editandoTipoContratacion" class="input-tabla" /></td>
              <td style="text-align: center">
                <input type="checkbox" v-model="t.activo" :disabled="t.id !== editandoTipoContratacion" />
              </td>
              <td class="acciones-celda">
                <button v-if="t.id !== editandoTipoContratacion" type="button" class="btn-editar-inline" @click="editandoTipoContratacion = t.id" :disabled="guardando">
                  ✏️ Editar
                </button>
                <div v-else class="acciones-grupo">
                  <button type="button" class="btn-guardar-inline" @click="guardarTipoContratacion(t)" :disabled="guardando">
                    ✓ Guardar
                  </button>
                  <button type="button" class="btn-cancelar-inline" @click="editandoTipoContratacion = null" :disabled="guardando">
                    ✗ Cancelar
                  </button>
                </div>
                <button v-if="t.id === editandoTipoContratacion" type="button" class="btn-eliminar-inline" @click="eliminarTipoContratacion(t)" :disabled="guardando">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import api from '../services/api';
import AdminCatalogoEtapas from './AdminCatalogoEtapas.vue';

const guardando = ref(false);
const mensaje = ref('');
const tipoMensaje = ref('info');
const tabActiva = ref('direcciones-responsables');
const busquedaResponsables = ref('');
const responsablesSeleccionados = ref<number[]>([]);

const mostrarModalDireccion = ref(false);
const mostrarModalResponsable = ref(false);
const mostrarModalTipoContratacion = ref(false);
const editandoDireccion = ref<number | null>(null);
const editandoResponsable = ref<number | null>(null);
const editandoTipoContratacion = ref<number | null>(null);

const tabs = [
  { id: 'direcciones-responsables', label: '📋 Direcciones y Responsables' },
  { id: 'catalogo-etapas', label: '📊 Catálogo de Etapas' },
  { id: 'tipos-contratacion', label: '📄 Tipos de Contratación' }
];

const direcciones = ref<any[]>([]);
const responsables = ref<any[]>([]);
const tiposContratacion = ref<any[]>([]);

const nuevaDireccion = ref('');
const nuevoTipoContratacion = ref('');
const nuevoResponsable = ref({
  nombre: '',
  email: '',
  direccionId: null as number | null
});

const responsablesFiltrados = computed(() => {
  if (!busquedaResponsables.value.trim()) return responsables.value;
  const term = busquedaResponsables.value.toLowerCase();
  return responsables.value.filter(r => {
    const nombre = (r.nombre || '').toLowerCase();
    const dirección = (r.direccion_nombre || '').toLowerCase();
    return nombre.includes(term) || dirección.includes(term);
  });
});

function normalizarActivo(valor: unknown, porDefecto = true): boolean {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  const texto = String(valor).trim().toLowerCase();
  if (['1', 'true', 'si', 'sí', 'on'].includes(texto)) return true;
  if (['0', 'false', 'no', 'off'].includes(texto)) return false;
  return porDefecto;
}

async function cargarCatalogos() {
  try {
    const [dirs, reps, tiposCont] = await Promise.all([
      api.get('/catalogos/direcciones'),
      api.get('/catalogos/responsables'),
      api.get('/catalogos/tipos-contratacion')
    ]);
    direcciones.value = (dirs.data || []).map((d: any) => ({
      ...d,
      activo: normalizarActivo(d?.activo, true)
    }));
    responsables.value = reps.data.map((r: any) => ({
      ...r,
      direccionId: r.direccionId ?? r.direccion_id ?? null,
      activo: normalizarActivo(r?.activo, true)
    }));
    tiposContratacion.value = (tiposCont.data || []).map((t: any) => ({
      ...t,
      activo: normalizarActivo(t?.activo, true)
    }));
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = 'Error al cargar catálogos';
  }
}

async function crearTipoContratacion() {
  if (!nuevoTipoContratacion.value.trim()) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.post('/catalogos/tipos-contratacion', { nombre: nuevoTipoContratacion.value.trim(), activo: true });
    nuevoTipoContratacion.value = '';
    mostrarModalTipoContratacion.value = false;
    tipoMensaje.value = 'success';
    mensaje.value = 'Tipo de contratación creado correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al crear tipo de contratación';
  } finally {
    guardando.value = false;
  }
}

async function guardarTipoContratacion(tipo: any) {
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.put(`/catalogos/tipos-contratacion/${tipo.id}`, {
      nombre: tipo.nombre,
      activo: normalizarActivo(tipo.activo, true)
    });
    editandoTipoContratacion.value = null;
    tipoMensaje.value = 'success';
    mensaje.value = 'Tipo de contratación actualizado correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al actualizar tipo de contratación';
  } finally {
    guardando.value = false;
  }
}

async function eliminarTipoContratacion(tipo: any) {
  if (!confirm(`¿Eliminar tipo de contratación "${tipo.nombre}"?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.delete(`/catalogos/tipos-contratacion/${tipo.id}`);
    editandoTipoContratacion.value = null;
    tipoMensaje.value = 'success';
    mensaje.value = 'Tipo de contratación eliminado correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al eliminar tipo de contratación';
  } finally {
    guardando.value = false;
  }
}

async function crearDireccion() {
  if (!nuevaDireccion.value.trim()) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.post('/catalogos/direcciones', { nombre: nuevaDireccion.value.trim(), activo: true });
    nuevaDireccion.value = '';
    mostrarModalDireccion.value = false;
    tipoMensaje.value = 'success';
    mensaje.value = 'Dirección creada correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al crear dirección';
  } finally {
    guardando.value = false;
  }
}

async function guardarDireccion(direccion: any) {
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.put(`/catalogos/direcciones/${direccion.id}`, {
      nombre: direccion.nombre,
      activo: normalizarActivo(direccion.activo, true)
    });
    editandoDireccion.value = null;
    tipoMensaje.value = 'success';
    mensaje.value = 'Dirección actualizada correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al actualizar dirección';
  } finally {
    guardando.value = false;
  }
}

async function eliminarDireccion(direccion: any) {
  if (!confirm(`¿Eliminar dirección "${direccion.nombre}"?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.delete(`/catalogos/direcciones/${direccion.id}`);
    editandoDireccion.value = null;
    tipoMensaje.value = 'success';
    mensaje.value = 'Dirección eliminada correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al eliminar dirección';
  } finally {
    guardando.value = false;
  }
}

async function crearResponsable() {
  if (!nuevoResponsable.value.nombre.trim()) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.post('/catalogos/responsables', {
      nombre: nuevoResponsable.value.nombre.trim(),
      email: nuevoResponsable.value.email?.trim() || null,
      direccionId: nuevoResponsable.value.direccionId,
      activo: true
    });
    nuevoResponsable.value = { nombre: '', email: '', direccionId: null };
    mostrarModalResponsable.value = false;
    tipoMensaje.value = 'success';
    mensaje.value = 'Responsable creado correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al crear responsable';
  } finally {
    guardando.value = false;
  }
}

async function guardarResponsable(responsable: any) {
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.put(`/catalogos/responsables/${responsable.id}`, {
      nombre: responsable.nombre,
      email: responsable.email || null,
      direccionId: responsable.direccionId,
      activo: normalizarActivo(responsable.activo, true)
    });
    editandoResponsable.value = null;
    tipoMensaje.value = 'success';
    mensaje.value = 'Responsable actualizado correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al actualizar responsable';
  } finally {
    guardando.value = false;
  }
}

async function eliminarResponsable(responsable: any) {
  if (!confirm(`¿Eliminar responsable "${responsable.nombre}"?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.delete(`/catalogos/responsables/${responsable.id}`);
    editandoResponsable.value = null;
    tipoMensaje.value = 'success';
    mensaje.value = 'Responsable eliminado correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al eliminar responsable';
  } finally {
    guardando.value = false;
  }
}

function toggleSelectResponsable(id: number) {
  const idx = responsablesSeleccionados.value.indexOf(id);
  if (idx > -1) {
    responsablesSeleccionados.value.splice(idx, 1);
  } else {
    responsablesSeleccionados.value.push(id);
  }
}

function toggleSelectAll(event: any) {
  if (event.target.checked) {
    responsablesSeleccionados.value = responsablesFiltrados.value.map(r => r.id);
  } else {
    responsablesSeleccionados.value = [];
  }
}

async function cambiarEstadoMasivo(nuevoEstado: boolean) {
  if (responsablesSeleccionados.value.length === 0) return;
  guardando.value = true;
  mensaje.value = '';
  const cantidad = responsablesSeleccionados.value.length;
  try {
    await Promise.all(
      responsablesSeleccionados.value.map(id => {
        const resp = responsables.value.find(r => r.id === id);
        return api.put(`/catalogos/responsables/${id}`, {
          nombre: resp?.nombre,
          email: resp?.email || null,
          direccionId: resp?.direccionId,
          activo: nuevoEstado
        });
      })
    );
    responsablesSeleccionados.value = [];
    tipoMensaje.value = 'success';
    mensaje.value = `${cantidad} responsable(s) ${nuevoEstado ? 'activados' : 'desactivados'} correctamente`;
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al actualizar responsables';
  } finally {
    guardando.value = false;
  }
}

async function eliminarMasivo() {
  if (responsablesSeleccionados.value.length === 0) return;
  if (!confirm(`¿Eliminar ${responsablesSeleccionados.value.length} responsable(s)?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await Promise.all(
      responsablesSeleccionados.value.map(id => api.delete(`/catalogos/responsables/${id}`))
    );
    responsablesSeleccionados.value = [];
    tipoMensaje.value = 'success';
    mensaje.value = 'Responsables eliminados correctamente';
    await cargarCatalogos();
  } catch (e: any) {
    tipoMensaje.value = 'error';
    mensaje.value = e?.response?.data?.error || 'Error al eliminar responsables';
  } finally {
    guardando.value = false;
  }
}

onMounted(cargarCatalogos);
</script>

<style scoped>
.catalogos-view {
  display: grid;
  gap: 1rem;
}

.header h1 {
  margin: 0;
  color: #0f172a;
}

.header p {
  margin: 0.2rem 0 0;
  color: #64748b;
}

.tabs-container {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  background: #fff;
  padding: 0 1rem;
  border-radius: 8px 8px 0 0;
  margin-bottom: 0.5rem;
}

.tab {
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: #0f172a;
}

.tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-content {
  animation: fadeIn 0.2s ease-in;
  display: grid;
  gap: 1.5rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  color: #1e293b;
  font-size: 1.2rem;
}

.btn-crear {
  padding: 0.5rem 1rem;
  background: #0284c7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-crear:hover {
  background: #0369a1;
}

.btn-crear:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.mensaje {
  padding: 0.75rem 1rem;
  border-radius: 4px;
  font-weight: 500;
}

.mensaje.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.mensaje.error {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.mensaje.info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla thead {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.tabla th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
}

.tabla td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.tabla tbody tr:hover {
  background: #fafafa;
}

.tabla input,
.tabla select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.tabla input:disabled,
.tabla select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.tabla input:not(:disabled),
.tabla select:not(:disabled) {
  border-color: #0284c7;
  background: #f0f9ff;
}

.sin-datos {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 1.5rem;
}

.input-tabla {
  width: 100%;
}

.acciones-celda {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.acciones-grupo {
  display: flex;
  gap: 0.5rem;
}

.btn-editar-inline,
.btn-guardar-inline,
.btn-cancelar-inline,
.btn-eliminar-inline {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-editar-inline {
  background: #e0e7ff;
  color: #4f46e5;
}

.btn-editar-inline:hover {
  background: #c7d2fe;
}

.btn-guardar-inline {
  background: #dcfce7;
  color: #166534;
}

.btn-guardar-inline:hover {
  background: #bbf7d0;
}

.btn-cancelar-inline {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-cancelar-inline:hover {
  background: #e5e7eb;
}

.btn-eliminar-inline {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.4rem 0.6rem;
}

.btn-eliminar-inline:hover {
  background: #fecaca;
}

.btn-editar-inline:disabled,
.btn-guardar-inline:disabled,
.btn-cancelar-inline:disabled,
.btn-eliminar-inline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  padding: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
}

.btn-close:hover {
  color: #1f2937;
}

.form-modal {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #0284c7;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.search-box {
  margin-bottom: 1rem;
}

.input-buscar {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}

.input-buscar:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.1);
}

.acciones-masa {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.info-seleccion {
  font-weight: 600;
  color: #1e40af;
}

.botones-masa {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-masa {
  padding: 0.5rem 1rem;
  background: #0284c7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-masa:hover:not(:disabled) {
  background: #0369a1;
}

.btn-masa-eliminar {
  background: #dc2626;
}

.btn-masa-eliminar:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-masa-limpiar {
  background: #6b7280;
}

.btn-masa-limpiar:hover:not(:disabled) {
  background: #4b5563;
}

.btn-masa:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
