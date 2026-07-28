<template>
  <div class="admin-usuarios-view">
    <div class="encabezado">
      <div>
        <h1>Administración de usuarios</h1>
        <p class="subtitulo">Gestiona roles, direcciones, estado y contraseñas</p>
      </div>
      <div class="stats">
        <div class="stat-box"><strong>{{ usuarios.length }}</strong><span>Total</span></div>
        <div class="stat-box"><strong>{{ usuariosActivos }}</strong><span>Activos</span></div>
        <div class="stat-box"><strong>{{ usuariosDireccion }}</strong><span>Dirección</span></div>
      </div>
    </div>

    <section class="card">
      <h2>Crear usuario</h2>
      <form class="usuario-form" @submit.prevent="crearUsuario">
        <label>
          Nombre
          <input v-model="form.nombre" placeholder="Nombre" required />
        </label>
        <label>
          Usuario
          <input v-model="form.username" placeholder="Usuario" required />
        </label>
        <label>
          Orden login
          <input v-model.number="form.ordenLogin" type="number" min="0" placeholder="0" />
        </label>
        <label>
          Contraseña
          <input v-model="form.password" type="text" placeholder="Por defecto 12345" />
        </label>
        <label>
          Rol
          <select v-model="form.role" required>
            <option v-for="rol in rolesDisponibles" :key="`nuevo-${rol}`" :value="rol">
              {{ etiquetaRol(rol) }}
            </option>
          </select>
        </label>
        <label>
          Válido desde (opcional)
          <input v-model="form.fechaInicioRol" type="date" />
        </label>
        <label>
          Válido hasta (opcional)
          <input v-model="form.fechaFinRol" type="date" />
        </label>
        <label>
          Estado
          <select v-model="form.activo" required>
            <option :value="true">Activo</option>
            <option :value="false">Inactivo</option>
          </select>
        </label>
        <label v-if="form.role === 'direccion'">
          Dirección asignada
          <select v-model="form.direccionNombre" :disabled="direccionesDisponibles.length === 0" required>
            <option value="" disabled>{{ direccionesDisponibles.length ? 'Seleccione una dirección' : 'No hay direcciones activas' }}</option>
            <option v-for="direccion in direccionesDisponibles" :key="direccion" :value="direccion">
              {{ direccion }}
            </option>
          </select>
        </label>
        <div class="acciones-crear">
          <button type="submit" :disabled="guardando">Crear usuario</button>
        </div>
      </form>
    </section>

    <p v-if="mensaje" class="mensaje">{{ mensaje }}</p>

    <section class="card">
      <div class="tabla-header">
        <h2>Usuarios registrados</h2>
        <button type="button" class="btn-guardar-todo" @click="guardarTodosUsuarios" :disabled="guardando || usuarios.length === 0">
          {{ guardando ? 'Guardando...' : 'Guardar todo' }}
        </button>
      </div>
      <table class="tabla">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Vigencia del rol</th>
          <th>Dirección</th>
          <th>Orden login</th>
          <th>Activo</th>
          <th>Nueva contraseña</th>
          <th>Gestionar Direcciones</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id">
          <td>
            <input v-model="u.nombre" placeholder="Nombre" />
          </td>
          <td>
            <input v-model="u.username" placeholder="Usuario" />
          </td>
          <td>
            <select v-model="u.role">
              <option v-for="rol in rolesDisponibles" :key="`edit-${u.id}-${rol}`" :value="rol">
                {{ etiquetaRol(rol) }}
              </option>
            </select>
          </td>
          <td>
            <div class="vigencia-rol-inline">
              <input :value="u.fechaInicioRol" @input="(e: any) => u.fechaInicioRol = e.target.value" type="date" title="Válido desde (dejar vacío = siempre)" />
              <span>–</span>
              <input :value="u.fechaFinRol" @input="(e: any) => u.fechaFinRol = e.target.value" type="date" title="Válido hasta (dejar vacío = siempre)" />
              <span v-if="rolVencido(u)" class="chip-rol-vencido">⏰ Vencido</span>
              <span v-else-if="u.fechaFinRol" class="chip-rol-temporal">Temporal</span>
              <span v-else class="chip-rol-permanente">Permanente</span>
            </div>
          </td>
          <td>
            <input
              v-model="u.direccionNombre"
              list="direcciones-disponibles"
              :disabled="u.role !== 'direccion'"
              placeholder="Sin dirección"
            />
          </td>
          <td>
            <input v-model.number="u.ordenLogin" type="number" min="0" placeholder="0" />
          </td>
          <td>
            <label class="estado-activo">
              <input type="checkbox" v-model="u.activo" />
              <span>{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
            </label>
          </td>
          <td>
            <input
              v-model="u.nuevaPassword"
              type="text"
              placeholder="Dejar vacío para no cambiar"
            />
          </td>
          <td>
            <button
              type="button"
              class="btn-small"
              @click="abrirGestorDirecciones(u)"
              :disabled="guardando"
            >
              🎯 Direcciones
            </button>
          </td>
          <td class="acciones-fila">
            <button
              type="button"
              class="btn-eliminar"
              @click="eliminarUsuario(u)"
              :disabled="guardando || Number(u.id) === Number(auth.user?.id)"
              :title="Number(u.id) === Number(auth.user?.id) ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'"
            >
              Eliminar
            </button>
          </td>
        </tr>
      </tbody>
      </table>
    </section>

    <!-- Modal Gestor de Direcciones -->
    <div v-if="modalDirecciones.mostrar" class="modal-overlay" @click.self="cerrarModalDirecciones">
      <div class="modal-content modal-direcciones" @click.stop>
        <div class="modal-header">
          <h2>🎯 Gestionar Direcciones - {{ modalDirecciones.usuario?.nombre }}</h2>
          <button class="btn-close-modal" @click="cerrarModalDirecciones">✕</button>
        </div>
        <div class="modal-body">
          <p class="modal-subtitle">Selecciona las direcciones a las que este usuario puede acceder:</p>
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
              ℹ️ Si no selecciona ninguna dirección, el usuario podrá acceder a TODAS las direcciones.
            </p>
            <p v-else class="info-note">
              ✓ El usuario podrá ver procesos de {{ modalDirecciones.direccionesSeleccionadas.length }} dirección(es) seleccionada(s).
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-primary" @click="guardarDirecciones" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar' }}
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

const modalDirecciones = ref({
  mostrar: false,
  usuario: null as any,
  direccionesSeleccionadas: [] as number[]
});

const usuariosActivos = computed(() => usuarios.value.filter((u: any) => u.activo).length);
const usuariosDireccion = computed(() => usuarios.value.filter((u: any) => u.role === 'direccion').length);

const form = ref({
  nombre: '',
  username: '',
  ordenLogin: 0,
  password: '12345',
  role: 'direccion',
  direccionNombre: '',
  activo: true,
  fechaInicioRol: '',
  fechaFinRol: ''
});

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
    fechaFinRol: String(u.fechaFinRol || u.fecha_fin_rol || '').trim() || '',
    nuevaPassword: ''
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

async function crearUsuario() {
  guardando.value = true;
  mensaje.value = '';
  try {
    const payload = construirPayloadNuevoUsuario();

    if (!payload.nombre) throw new Error('El nombre es obligatorio');
    if (!payload.username) throw new Error('El usuario es obligatorio');
    if (!/^[A-Za-z0-9._-]+$/.test(payload.username)) {
      throw new Error('El usuario solo puede contener letras, números, punto, guion y guion bajo');
    }

    const existeUsername = usuarios.value.some(
      (item: any) => normalizarUsername(item?.username).toLowerCase() === payload.username.toLowerCase()
    );
    if (existeUsername) throw new Error('El usuario ya existe');

    if (payload.role === 'direccion') {
      if (!payload.direccionNombre) throw new Error('Debe seleccionar una dirección para el rol dirección');
      const direccionValida = direccionesDisponibles.value.includes(payload.direccionNombre);
      if (!direccionValida) throw new Error('La dirección seleccionada no es válida o está inactiva');
    }

    await usuariosService.create({
      ...payload,
      activo: form.value.activo
    });
    mensaje.value = 'Usuario creado correctamente';
    form.value = { nombre: '', username: '', ordenLogin: 0, password: '12345', role: 'direccion', direccionNombre: '', activo: true, fechaInicioRol: '', fechaFinRol: '' };
    await cargarUsuarios();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo crear el usuario';
  } finally {
    guardando.value = false;
  }
}

function construirPayloadNuevoUsuario() {
  const nombre = normalizarNombrePersona(form.value.nombre);
  const username = normalizarUsername(form.value.username);
  const role = form.value.role;
  const password = form.value.password?.trim() || '12345';
  const direccionNombre = role === 'direccion' ? normalizarDireccion(form.value.direccionNombre) : null;
  const ordenLogin = Math.max(0, Number(form.value.ordenLogin ?? 0));
  const fechaInicioRol = form.value.fechaInicioRol ? String(form.value.fechaInicioRol).trim() : null;
  const fechaFinRol = form.value.fechaFinRol ? String(form.value.fechaFinRol).trim() : null;

  return {
    nombre,
    username,
    role,
    password,
    direccionNombre,
    ordenLogin,
    fechaInicioRol,
    fechaFinRol
  };
}

watch(
  () => form.value.role,
  (role) => {
    if (role !== 'direccion') {
      form.value.direccionNombre = '';
    }
  }
);

function construirPayloadEdicionUsuario(usuario: any) {
  const usernameNormalizado = normalizarUsername(usuario.username);
  if (!usernameNormalizado) throw new Error('El nombre de usuario es obligatorio');
  if (!/^[A-Za-z0-9._-]+$/.test(usernameNormalizado)) {
    throw new Error('El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo');
  }

  return {
    nombre: normalizarNombrePersona(usuario.nombre),
    username: usernameNormalizado,
    role: usuario.role,
    direccionNombre: usuario.role === 'direccion' ? normalizarDireccion(usuario.direccionNombre) : null,
    ordenLogin: Math.max(0, Number(usuario.ordenLogin ?? 0)),
    activo: Boolean(usuario.activo),
    password: usuario.nuevaPassword?.trim() || undefined,
    fechaInicioRol: usuario.fechaInicioRol ? String(usuario.fechaInicioRol).trim() : null,
    fechaFinRol: usuario.fechaFinRol ? String(usuario.fechaFinRol).trim() : null
  };
}

async function guardarTodosUsuarios() {
  if (!usuarios.value.length) return;
  guardando.value = true;
  mensaje.value = '';

  try {
    let actualizaSesion = false;

    for (const usuario of usuarios.value) {
      await usuariosService.update(usuario.id, construirPayloadEdicionUsuario(usuario));
      usuario.nuevaPassword = '';
      if (Number(usuario.id) === Number(auth.user?.id)) {
        actualizaSesion = true;
      }
    }

    if (actualizaSesion) {
      await auth.fetchMe();
    }

    await cargarUsuarios();
    mensaje.value = 'Todos los cambios se guardaron correctamente';
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || e?.message || 'No se pudieron guardar todos los cambios';
  } finally {
    guardando.value = false;
  }
}

async function eliminarUsuario(usuario: any) {
  if (!confirm(`¿Eliminar usuario ${usuario.username}?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await usuariosService.delete(Number(usuario.id));
    mensaje.value = 'Usuario eliminado';
    await cargarUsuarios();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo eliminar el usuario';
  } finally {
    guardando.value = false;
  }
}

onMounted(async () => {
  await Promise.all([cargarUsuarios(), cargarDireccionesDisponibles(), cargarRolesDisponibles()]);
});

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
  modalDirecciones.value.usuario = usuario;
  const response = await api.get(`/usuarios/${usuario.id}/direcciones`);
  const direcciones = Array.isArray(response.data) ? response.data : [];
  modalDirecciones.value.direccionesSeleccionadas = direcciones.map((d: any) => d.id);
  modalDirecciones.value.mostrar = true;
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
  try {
    await api.put(`/usuarios/${modalDirecciones.value.usuario.id}/direcciones`, {
      direccionIds: modalDirecciones.value.direccionesSeleccionadas
    });
    mensaje.value = 'Direcciones del usuario guardadas correctamente';
    setTimeout(() => { mensaje.value = ''; }, 3000);
    cerrarModalDirecciones();
  } catch (error: any) {
    mensaje.value = `Error: ${error.response?.data?.error || error.message}`;
  } finally {
    guardando.value = false;
  }
}

onMounted(async () => {
  await cargarDireccionesDisponibles();
  await cargarRolesDisponibles();
  await cargarUsuarios();
});

watch(() => form.value.role, () => {
  if (form.value.role !== 'direccion') {
    form.value.direccionNombre = '';
  }
});
</script>

<style scoped>
.admin-usuarios-view {
  display: grid;
  gap: 1rem;
}

.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.subtitulo {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.stats {
  display: flex;
  gap: 0.5rem;
}

.stat-box {
  border: 1px solid #dbeafe;
  background: #eff6ff;
  border-radius: 10px;
  padding: 0.45rem 0.7rem;
  display: grid;
  text-align: center;
  min-width: 88px;
}

.stat-box strong {
  font-size: 1rem;
  color: #1d4ed8;
}

.stat-box span {
  font-size: 0.76rem;
  color: #334155;
}

.card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 0.9rem;
}

.card h2 {
  margin: 0 0 0.8rem;
  font-size: 1rem;
  color: #0f172a;
}

.tabla-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.btn-guardar-todo {
  border: none;
  border-radius: 8px;
  background: #0f766e;
  color: #fff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
  font-weight: 600;
}

.usuario-form {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
}

.usuario-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: #334155;
}

.acciones-crear {
  display: flex;
  align-items: end;
}

.usuario-form input,
.usuario-form select,
.usuario-form button,
.tabla input,
.tabla select,
.tabla button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}

.usuario-form button,
.btn-guardar {
  background: #2563eb;
  color: #fff;
  border-color: #1d4ed8;
  font-weight: 600;
}

.btn-eliminar {
  background: #fff;
  color: #b91c1c;
  border-color: #fca5a5;
}

.tabla input,
.tabla select {
  width: 100%;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.tabla th,
.tabla td {
  border: 1px solid #e2e8f0;
  padding: 0.45rem;
  vertical-align: middle;
}

.acciones-fila {
  display: flex;
  gap: 0.35rem;
}

.estado-activo {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  color: #334155;
}

.vigencia-rol-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.vigencia-rol-inline input {
  flex: 1;
  min-width: 100px;
}

.vigencia-rol-inline span {
  font-size: 0.75rem;
  white-space: nowrap;
}

.chip-rol-vencido,
.chip-rol-temporal,
.chip-rol-permanente {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.chip-rol-vencido {
  background: #fee2e2;
  color: #991b1b;
}

.chip-rol-temporal {
  background: #fef3c7;
  color: #92400e;
}

.chip-rol-permanente {
  background: #e0f2fe;
  color: #0c4a6e;
}

.mensaje {
  margin: 0;
  color: #1d4ed8;
  font-weight: 600;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-direcciones {
  max-width: 450px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
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
}

.btn-close-modal:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-subtitle {
  margin: 0 0 1rem;
  color: #475569;
  font-size: 0.9rem;
}

.checkboxes-grupo {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.checkbox-item:hover {
  background: #f8fafc;
}

.checkbox-item input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
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
  line-height: 1.4;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #e2e8f0;
  color: #334155;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e1;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: #dbeafe;
  color: #0c4a6e;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover:not(:disabled) {
  background: #bfdbfe;
}

.btn-small:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .encabezado {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats {
    width: 100%;
  }

  .stat-box {
    flex: 1;
  }

  .usuario-form {
    grid-template-columns: 1fr;
  }

  .tabla {
    display: block;
    overflow-x: auto;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
}
</style>
