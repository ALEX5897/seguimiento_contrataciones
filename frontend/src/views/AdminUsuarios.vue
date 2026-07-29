<template>
  <div class="admin-usuarios-view">
    <!-- Encabezado -->
    <div class="encabezado">
      <div>
        <h1>👥 Administración de Usuarios</h1>
        <p class="subtitulo">Gestiona roles, permisos y accesos</p>
      </div>
      <div class="stats">
        <div class="stat-box"><strong>{{ usuarios.length }}</strong><span>Total</span></div>
        <div class="stat-box"><strong>{{ usuariosActivos }}</strong><span>Activos</span></div>
        <div class="stat-box"><strong>{{ usuariosInactivos }}</strong><span>Inactivos</span></div>
      </div>
    </div>

    <!-- Mensajes -->
    <p v-if="mensaje" :class="['mensaje', mensaje.includes('Error') ? 'error' : 'exito']">{{ mensaje }}</p>

    <!-- Botón para abrir modal de crear -->
    <section class="card">
      <div class="section-header">
        <h2>Usuarios Registrados</h2>
        <button class="btn-crear" @click="abrirModalCrear" :disabled="guardando">
          ➕ Crear Usuario
        </button>
      </div>

      <!-- Tabla de usuarios -->
      <table class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Vigencia</th>
            <th>Dirección</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id" :class="{ 'fila-inactiva': !u.activo }">
            <td class="nombre"><strong>{{ u.nombre }}</strong></td>
            <td class="usuario">{{ u.username }}</td>
            <td class="rol"><span class="chip-rol" :class="u.role">{{ etiquetaRol(u.role) }}</span></td>
            <td class="vigencia">
              <span v-if="rolVencido(u)" class="chip-estado vencido" title="Rol vencido">⏰ Vencido</span>
              <span v-else-if="u.fechaFinRol" class="chip-estado temporal" :title="`Hasta ${u.fechaFinRol}`">📅 Temporal</span>
              <span v-else class="chip-estado permanente">♾️ Permanente</span>
            </td>
            <td class="direccion">
              <span v-if="u.role === 'direccion' && u.direccionNombre" class="chip-direccion">{{ u.direccionNombre }}</span>
              <span v-else class="text-secondary">—</span>
            </td>
            <td class="estado">
              <span :class="['chip-estado', u.activo ? 'activo' : 'inactivo']">
                {{ u.activo ? '✓ Activo' : '✗ Inactivo' }}
              </span>
            </td>
            <td class="acciones">
              <button class="btn-accion" @click="abrirModalEditar(u)" title="Editar usuario" :disabled="guardando">
                ✏️ Editar
              </button>
              <button class="btn-accion" @click="abrirGestorDirecciones(u)" title="Gestionar direcciones de acceso" :disabled="guardando">
                🎯 Acceso
              </button>
              <button
                class="btn-accion eliminar"
                @click="eliminarUsuario(u)"
                :disabled="guardando || Number(u.id) === Number(auth.user?.id)"
                :title="Number(u.id) === Number(auth.user?.id) ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'"
              >
                🗑️ Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Modal: Crear/Editar Usuario -->
    <div v-if="modalUsuario.mostrar" class="modal-overlay" @click.self="cerrarModalUsuario">
      <div class="modal-content modal-usuario" @click.stop>
        <div class="modal-header">
          <h2>{{ modalUsuario.esNuevo ? '➕ Crear Usuario' : '✏️ Editar Usuario' }}</h2>
          <button class="btn-close-modal" @click="cerrarModalUsuario" :disabled="guardando">✕</button>
        </div>

        <form @submit.prevent="guardarUsuario" class="modal-body">
          <div class="form-group">
            <label>Nombre completo *</label>
            <input v-model="modalUsuario.form.nombre" placeholder="Ej: Juan García López" required />
          </div>

          <div class="form-group">
            <label>Nombre de usuario (login) *</label>
            <input v-model="modalUsuario.form.username" placeholder="Ej: jgarcia" required />
            <small>Solo letras, números, punto, guion</small>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Rol *</label>
              <select v-model="modalUsuario.form.role" required>
                <option v-for="rol in rolesDisponibles" :key="rol" :value="rol">
                  {{ etiquetaRol(rol) }}
                </option>
              </select>
            </div>

            <div class="form-group" v-if="modalUsuario.form.role === 'direccion'">
              <label>Dirección responsable *</label>
              <select v-model="modalUsuario.form.direccionNombre" required :disabled="direccionesDisponibles.length === 0">
                <option value="">Seleccione una dirección</option>
                <option v-for="dir in direccionesDisponibles" :key="dir" :value="dir">
                  {{ dir }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Orden de login</label>
              <input v-model.number="modalUsuario.form.ordenLogin" type="number" min="0" placeholder="0" />
              <small>Para ordenar en el selector de usuarios</small>
            </div>

            <div class="form-group">
              <label>Estado</label>
              <select v-model="modalUsuario.form.activo">
                <option :value="true">✓ Activo</option>
                <option :value="false">✗ Inactivo</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Válido desde</label>
              <input v-model="modalUsuario.form.fechaInicioRol" type="date" />
              <small>Dejar vacío = siempre válido</small>
            </div>

            <div class="form-group">
              <label>Válido hasta</label>
              <input v-model="modalUsuario.form.fechaFinRol" type="date" />
              <small>Dejar vacío = sin límite</small>
            </div>
          </div>

          <div class="form-group">
            <label v-if="!modalUsuario.esNuevo">Nueva contraseña (dejar vacío para no cambiar)</label>
            <label v-else>Contraseña</label>
            <input v-model="modalUsuario.form.password" type="text" :placeholder="modalUsuario.esNuevo ? 'Por defecto: 12345' : 'Dejar vacío para no cambiar'" />
          </div>

          <div class="modal-footer">
            <button type="submit" class="btn-primary" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Guardar' }}
            </button>
            <button type="button" class="btn-secondary" @click="cerrarModalUsuario" :disabled="guardando">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Gestionar Direcciones de Acceso -->
    <div v-if="modalDirecciones.mostrar" class="modal-overlay" @click.self="cerrarModalDirecciones">
      <div class="modal-content modal-direcciones" @click.stop>
        <div class="modal-header">
          <h2>🎯 Permisos de Acceso</h2>
          <button class="btn-close-modal" @click="cerrarModalDirecciones" :disabled="guardando">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-subtitle"><strong>{{ modalDirecciones.usuario?.nombre }}</strong></p>
          <p class="modal-subtitle small">Selecciona las direcciones a las que puede acceder:</p>

          <div class="checkboxes-grupo">
            <label v-for="dir in direccionesCatalogo" :key="dir.id" class="checkbox-item">
              <input
                type="checkbox"
                :checked="modalDirecciones.direccionesSeleccionadas.includes(dir.id)"
                @change="toggleDireccionSeleccionada(dir.id)"
              />
              <span>{{ dir.nombre }}</span>
            </label>
          </div>

          <div class="info-box">
            <p v-if="modalDirecciones.direccionesSeleccionadas.length === 0" class="info-note">
              ℹ️ <strong>Sin restricciones:</strong> El usuario puede acceder a TODAS las direcciones.
            </p>
            <p v-else class="info-note">
              ✓ <strong>Acceso limitado:</strong> El usuario solo verá procesos de {{ modalDirecciones.direccionesSeleccionadas.length }} dirección(es).
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-primary" @click="guardarDirecciones" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar Permisos' }}
          </button>
          <button type="button" class="btn-secondary" @click="cerrarModalDirecciones" :disabled="guardando">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <datalist id="direcciones-disponibles">
      <option v-for="direccion in direccionesDisponibles" :key="direccion" :value="direccion" />
    </datalist>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { permisosService, usuariosService } from '../services/api';
import api from '../services/api';

const auth = useAuthStore();
const usuarios = ref<any[]>([]);
const direccionesDisponibles = ref<string[]>([]);
const direccionesCatalogo = ref<any[]>([]);
const rolesDisponibles = ref<string[]>(['admin', 'direccion', 'reporteria']);
const guardando = ref(false);
const mensaje = ref('');

// Modal para crear/editar usuarios
const modalUsuario = ref({
  mostrar: false,
  esNuevo: true,
  usuarioId: null as number | null,
  form: {
    nombre: '',
    username: '',
    ordenLogin: 0,
    password: '12345',
    role: 'direccion',
    direccionNombre: '',
    activo: true,
    fechaInicioRol: '',
    fechaFinRol: ''
  }
});

// Modal para gestionar direcciones de acceso
const modalDirecciones = ref({
  mostrar: false,
  usuario: null as any,
  direccionesSeleccionadas: [] as number[]
});

const usuariosActivos = computed(() => usuarios.value.filter((u: any) => u.activo).length);
const usuariosInactivos = computed(() => usuarios.value.filter((u: any) => !u.activo).length);

// Cargar datos
async function cargarUsuarios() {
  const response = await usuariosService.getAll();
  usuarios.value = (response || []).map((u: any) => ({
    ...u,
    nombre: normalizarNombrePersona(u.nombre),
    username: normalizarUsername(u.username),
    direccionNombre: normalizarDireccion(u.direccionNombre || ''),
    ordenLogin: Number(u.ordenLogin ?? 0),
    activo: Boolean(u.activo),
    fechaInicioRol: String(u.fechaInicioRol || u.fecha_inicio_rol || '').trim() || '',
    fechaFinRol: String(u.fechaFinRol || u.fecha_fin_rol || '').trim() || ''
  }));
}

async function cargarDireccionesDisponibles() {
  const response = await api.get('/catalogos/direcciones');
  const rows = Array.isArray(response.data) ? response.data : [];
  direccionesCatalogo.value = rows.filter((item: any) => item?.activo !== false);
  direccionesDisponibles.value = rows
    .filter((item: any) => item?.activo !== false)
    .map((item: any) => normalizarDireccion(item?.nombre || ''))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b, 'es'));
}

async function cargarRolesDisponibles() {
  try {
    const response = await permisosService.getAll();
    const roles = Array.isArray(response?.roles) ? response.roles.map((item) => String(item || '').trim()).filter(Boolean) : [];
    rolesDisponibles.value = [...new Set(['admin', 'direccion', 'reporteria', ...roles])]
      .sort((a, b) => a.localeCompare(b, 'es'));
  } catch {
    rolesDisponibles.value = ['admin', 'direccion', 'reporteria'];
  }
}

// Modal de crear/editar
function abrirModalCrear() {
  modalUsuario.value.esNuevo = true;
  modalUsuario.value.usuarioId = null;
  modalUsuario.value.form = {
    nombre: '',
    username: '',
    ordenLogin: 0,
    password: '12345',
    role: 'direccion',
    direccionNombre: '',
    activo: true,
    fechaInicioRol: '',
    fechaFinRol: ''
  };
  modalUsuario.value.mostrar = true;
}

function abrirModalEditar(usuario: any) {
  modalUsuario.value.esNuevo = false;
  modalUsuario.value.usuarioId = usuario.id;
  modalUsuario.value.form = {
    nombre: usuario.nombre,
    username: usuario.username,
    ordenLogin: usuario.ordenLogin,
    password: '',
    role: usuario.role,
    direccionNombre: usuario.direccionNombre,
    activo: usuario.activo,
    fechaInicioRol: usuario.fechaInicioRol,
    fechaFinRol: usuario.fechaFinRol
  };
  modalUsuario.value.mostrar = true;
}

function cerrarModalUsuario() {
  modalUsuario.value.mostrar = false;
}

async function guardarUsuario() {
  guardando.value = true;
  mensaje.value = '';

  try {
    const payload = construirPayloadUsuario();

    if (!payload.nombre) throw new Error('El nombre es obligatorio');
    if (!payload.username) throw new Error('El usuario es obligatorio');
    if (!/^[A-Za-z0-9._-]+$/.test(payload.username)) {
      throw new Error('El usuario solo puede contener letras, números, punto, guion y guion bajo');
    }

    // Validar duplicado de username (solo si es nuevo o cambió)
    if (modalUsuario.value.esNuevo) {
      const existeUsername = usuarios.value.some(
        (u: any) => normalizarUsername(u.username).toLowerCase() === payload.username.toLowerCase()
      );
      if (existeUsername) throw new Error('El usuario ya existe');
    }

    if (payload.role === 'direccion') {
      if (!payload.direccionNombre) throw new Error('Debe seleccionar una dirección para el rol dirección');
      const direccionValida = direccionesDisponibles.value.includes(payload.direccionNombre);
      if (!direccionValida) throw new Error('La dirección seleccionada no es válida o está inactiva');
    }

    if (modalUsuario.value.esNuevo) {
      await usuariosService.create(payload);
      mensaje.value = 'Usuario creado correctamente ✓';
    } else {
      if (!modalUsuario.value.usuarioId) throw new Error('ID de usuario requerido');
      await usuariosService.update(modalUsuario.value.usuarioId, payload);
      mensaje.value = 'Usuario actualizado correctamente ✓';

      if (Number(modalUsuario.value.usuarioId) === Number(auth.user?.id)) {
        await auth.fetchMe();
      }
    }

    cerrarModalUsuario();
    await cargarUsuarios();
    setTimeout(() => { mensaje.value = ''; }, 3000);
  } catch (e: any) {
    mensaje.value = `Error: ${e?.response?.data?.error || e?.message || 'No se pudo guardar'}`;
  } finally {
    guardando.value = false;
  }
}

function construirPayloadUsuario() {
  const nombre = normalizarNombrePersona(modalUsuario.value.form.nombre);
  const username = normalizarUsername(modalUsuario.value.form.username);
  const role = modalUsuario.value.form.role;
  const password = modalUsuario.value.form.password?.trim();
  const direccionNombre = role === 'direccion' ? normalizarDireccion(modalUsuario.value.form.direccionNombre) : null;
  const ordenLogin = Math.max(0, Number(modalUsuario.value.form.ordenLogin ?? 0));
  const fechaInicioRol = modalUsuario.value.form.fechaInicioRol ? String(modalUsuario.value.form.fechaInicioRol).trim() : null;
  const fechaFinRol = modalUsuario.value.form.fechaFinRol ? String(modalUsuario.value.form.fechaFinRol).trim() : null;

  const payload: any = {
    nombre,
    username,
    role,
    direccionNombre,
    ordenLogin,
    fechaInicioRol,
    fechaFinRol,
    activo: modalUsuario.value.form.activo
  };

  if (modalUsuario.value.esNuevo && !password) {
    payload.password = '12345';
  } else if (password) {
    payload.password = password;
  }

  return payload;
}

async function eliminarUsuario(usuario: any) {
  if (!confirm(`¿Eliminar usuario ${usuario.username}?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await usuariosService.delete(Number(usuario.id));
    mensaje.value = 'Usuario eliminado correctamente ✓';
    await cargarUsuarios();
    setTimeout(() => { mensaje.value = ''; }, 3000);
  } catch (e: any) {
    mensaje.value = `Error: ${e?.response?.data?.error || 'No se pudo eliminar el usuario'}`;
  } finally {
    guardando.value = false;
  }
}

// Utilidades
const hoyISO = new Date().toISOString().slice(0, 10);

function rolVencido(usuario: any) {
  return Boolean(usuario.fechaFinRol) && usuario.fechaFinRol < hoyISO;
}

function etiquetaRol(role: string) {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'admin') return 'Administrador';
  if (normalized === 'direccion') return 'Dirección (solo su área)';
  if (normalized === 'reporteria') return 'Gerencia General / Reportes';
  return String(role || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizarTexto(value: string | null | undefined) {
  return repararCaracteres(String(value || '').trim().replace(/\s+/g, ' '));
}

function normalizarDireccion(value: string | null | undefined) {
  return normalizarTexto(value);
}

function normalizarNombrePersona(value: string | null | undefined) {
  const texto = normalizarTexto(value);
  if (!texto) return texto;

  const lower = texto.toLowerCase();
  return lower
    .split(' ')
    .map((parte) => {
      if (['de', 'del', 'la', 'las', 'los', 'y'].includes(parte)) return parte;
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join(' ');
}

function repararCaracteres(value: string) {
  return value
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Atracci.n/gi, 'Atracción')
    .replace(/Tur.stico/gi, 'Turístico')
    .replace(/Tur.stica/gi, 'Turística');
}

function normalizarUsername(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_');
}

async function abrirGestorDirecciones(usuario: any) {
  try {
    modalDirecciones.value.usuario = usuario;
    const response = await api.get(`/usuarios/${usuario.id}/direcciones`);
    const direcciones = Array.isArray(response.data) ? response.data : [];
    modalDirecciones.value.direccionesSeleccionadas = direcciones.map((d: any) => d.id);
    modalDirecciones.value.mostrar = true;
  } catch (error: any) {
    mensaje.value = `Error: ${error.response?.data?.error || error.message}`;
  }
}

function cerrarModalDirecciones() {
  modalDirecciones.value.mostrar = false;
  modalDirecciones.value.usuario = null;
  modalDirecciones.value.direccionesSeleccionadas = [];
}

function toggleDireccionSeleccionada(direccionId: number) {
  const index = modalDirecciones.value.direccionesSeleccionadas.indexOf(direccionId);
  if (index > -1) {
    modalDirecciones.value.direccionesSeleccionadas.splice(index, 1);
  } else {
    modalDirecciones.value.direccionesSeleccionadas.push(direccionId);
  }
}

async function guardarDirecciones() {
  if (!modalDirecciones.value.usuario) return;

  guardando.value = true;
  mensaje.value = '';
  try {
    await api.put(`/usuarios/${modalDirecciones.value.usuario.id}/direcciones`, {
      direccionIds: modalDirecciones.value.direccionesSeleccionadas
    });
    mensaje.value = 'Permisos de acceso actualizados ✓';
    setTimeout(() => { mensaje.value = ''; }, 3000);
    cerrarModalDirecciones();
  } catch (error: any) {
    mensaje.value = `Error: ${error.response?.data?.error || error.message}`;
  } finally {
    guardando.value = false;
  }
}

// Watch para limpiar dirección si cambia el rol
watch(() => modalUsuario.value.form.role, (role) => {
  if (role !== 'direccion') {
    modalUsuario.value.form.direccionNombre = '';
  }
});

// Inicialización
onMounted(async () => {
  await Promise.all([cargarUsuarios(), cargarDireccionesDisponibles(), cargarRolesDisponibles()]);
});
</script>

<style scoped>
.admin-usuarios-view {
  display: grid;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

/* Encabezado */
.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 2rem;
}

.encabezado h1 {
  margin: 0;
  font-size: 2rem;
  color: #0f172a;
}

.subtitulo {
  margin: 0.3rem 0 0;
  color: #64748b;
  font-size: 0.95rem;
}

.stats {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stat-box {
  border: 1px solid #dbeafe;
  background: #eff6ff;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  text-align: center;
  min-width: 100px;
}

.stat-box strong {
  display: block;
  font-size: 1.3rem;
  color: #0c4a6e;
}

.stat-box span {
  display: block;
  font-size: 0.8rem;
  color: #475569;
  font-weight: 500;
}

/* Mensajes */
.mensaje {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.mensaje.exito {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.mensaje.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

/* Card */
.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 1.25rem;
}

.card h2 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
  color: #0f172a;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

/* Botones */
.btn-crear {
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-crear:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-crear:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-accion {
  border: none;
  border-radius: 6px;
  background: #dbeafe;
  color: #0c4a6e;
  padding: 0.4rem 0.7rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-accion:hover:not(:disabled) {
  background: #bfdbfe;
}

.btn-accion.eliminar {
  background: #fee2e2;
  color: #991b1b;
}

.btn-accion.eliminar:hover:not(:disabled) {
  background: #fca5a5;
}

.btn-accion:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tabla */
.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.tabla thead {
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.tabla th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #475569;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla td {
  padding: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.tabla tbody tr:hover {
  background: #f8fafc;
}

.tabla tbody tr.fila-inactiva {
  opacity: 0.7;
}

.tabla .nombre {
  font-weight: 600;
  color: #0f172a;
}

.tabla .usuario {
  font-family: monospace;
  color: #475569;
  font-size: 0.85rem;
}

.tabla .rol {
  white-space: nowrap;
}

.tabla .vigencia,
.tabla .estado {
  text-align: center;
}

.tabla .acciones {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

/* Chips/Badges */
.chip-rol {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.chip-rol.admin {
  background: #fee2e2;
  color: #991b1b;
}

.chip-rol.direccion {
  background: #dbeafe;
  color: #0c4a6e;
}

.chip-rol.reporteria {
  background: #fef3c7;
  color: #92400e;
}

.chip-estado {
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.chip-estado.vencido {
  background: #fee2e2;
  color: #991b1b;
}

.chip-estado.temporal {
  background: #fef3c7;
  color: #92400e;
}

.chip-estado.permanente {
  background: #d1fae5;
  color: #065f46;
}

.chip-estado.activo {
  background: #dcfce7;
  color: #166534;
}

.chip-estado.inactivo {
  background: #f3f4f6;
  color: #6b7280;
}

.chip-direccion {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  background: #dbeafe;
  color: #0c4a6e;
  font-size: 0.85rem;
  font-weight: 600;
}

.text-secondary {
  color: #94a3b8;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-usuario {
  max-width: 550px;
  width: 100%;
}

.modal-direcciones {
  max-width: 450px;
  width: 100%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
  flex: 1;
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.5rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close-modal:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.btn-close-modal:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

/* Formulario en modal */
.modal-body form {
  display: grid;
  gap: 1rem;
}

.form-group {
  display: grid;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group small {
  font-size: 0.8rem;
  color: #94a3b8;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.modal-subtitle {
  margin: 0 0 0.5rem;
  color: #475569;
  font-size: 0.95rem;
}

.modal-subtitle.small {
  font-size: 0.85rem;
}

.checkboxes-grupo {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
  user-select: none;
}

.checkbox-item:hover {
  background: #f8fafc;
}

.checkbox-item input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
}

.checkbox-item span {
  color: #334155;
  font-size: 0.95rem;
}

.info-box {
  background: #f0f9ff;
  border-left: 3px solid #0284c7;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.info-note {
  margin: 0;
  color: #0c4a6e;
  font-size: 0.85rem;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  background: #e2e8f0;
  color: #334155;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e1;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 1024px) {
  .encabezado {
    flex-direction: column;
    gap: 1rem;
  }

  .stats {
    width: 100%;
    justify-content: flex-start;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .tabla {
    font-size: 0.85rem;
  }

  .tabla th,
  .tabla td {
    padding: 0.5rem;
  }

  .btn-accion {
    padding: 0.3rem 0.5rem;
    font-size: 0.75rem;
  }
}

@media (max-width: 768px) {
  .admin-usuarios-view {
    gap: 1rem;
  }

  .tabla {
    font-size: 0.8rem;
  }

  .tabla .acciones {
    flex-direction: column;
  }

  .modal-content {
    max-width: 95%;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
