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
          Contraseña
          <input v-model="form.password" type="text" placeholder="Por defecto 12345" />
        </label>
        <label>
          Rol
          <select v-model="form.role" required>
            <option value="admin">Administrador</option>
            <option value="direccion">Dirección (solo su área)</option>
            <option value="reporteria">Gerencia General / Reportes (todas las áreas)</option>
          </select>
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
      <h2>Usuarios registrados</h2>
      <table class="tabla">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Dirección</th>
          <th>Activo</th>
          <th>Nueva contraseña</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id">
          <td>
            <input v-model="u.nombre" placeholder="Nombre" />
          </td>
          <td>{{ u.username }}</td>
          <td>
            <select v-model="u.role">
              <option value="admin">Administrador</option>
              <option value="direccion">Dirección (solo su área)</option>
              <option value="reporteria">Gerencia General / Reportes</option>
            </select>
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
          <td class="acciones-fila">
            <button type="button" class="btn-guardar" @click="guardarUsuario(u)" :disabled="guardando">Guardar</button>
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

    <datalist id="direcciones-disponibles">
      <option v-for="direccion in direccionesDisponibles" :key="direccion" :value="direccion" />
    </datalist>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { usuariosService } from '../services/api';
import api from '../services/api';

const auth = useAuthStore();
const usuarios = ref<any[]>([]);
const direccionesDisponibles = ref<string[]>([]);
const guardando = ref(false);
const mensaje = ref('');

const usuariosActivos = computed(() => usuarios.value.filter((u: any) => u.activo).length);
const usuariosDireccion = computed(() => usuarios.value.filter((u: any) => u.role === 'direccion').length);

const form = ref({
  nombre: '',
  username: '',
  password: '12345',
  role: 'reporteria',
  direccionNombre: '',
  activo: true
});

async function cargarUsuarios() {
  const response = await usuariosService.getAll();
  usuarios.value = (response || []).map((u: any) => ({
    ...u,
    nombre: normalizarNombrePersona(u.nombre),
    username: normalizarUsername(u.username),
    direccionNombre: normalizarDireccion(u.direccionNombre || ''),
    activo: Boolean(u.activo),
    nuevaPassword: ''
  }));
}

async function cargarDireccionesDisponibles() {
  const response = await api.get('/catalogos/direcciones');
  const rows = Array.isArray(response.data) ? response.data : [];
  direccionesDisponibles.value = rows
    .filter((item: any) => item?.activo !== false)
    .map((item: any) => normalizarDireccion(item?.nombre || ''))
    .filter(Boolean)
    .sort((a: string, b: string) => a.localeCompare(b, 'es'));
}

async function crearUsuario() {
  guardando.value = true;
  mensaje.value = '';
  try {
    const payload = construirPayloadNuevoUsuario();

    if (!payload.nombre) throw new Error('El nombre es obligatorio');
    if (!payload.username) throw new Error('El usuario es obligatorio');
    if (!/^[a-z0-9._-]+$/.test(payload.username)) {
      throw new Error('El usuario solo puede contener letras minúsculas, números, punto, guion y guion bajo');
    }

    const existeUsername = usuarios.value.some(
      (item: any) => normalizarUsername(item?.username) === payload.username
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
    form.value = { nombre: '', username: '', password: '12345', role: 'reporteria', direccionNombre: '', activo: true };
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

  return {
    nombre,
    username,
    role,
    password,
    direccionNombre
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

async function guardarUsuario(usuario: any) {
  guardando.value = true;
  mensaje.value = '';
  try {
    await usuariosService.update(usuario.id, {
      nombre: normalizarNombrePersona(usuario.nombre),
      role: usuario.role,
      direccionNombre: usuario.role === 'direccion' ? normalizarDireccion(usuario.direccionNombre) : null,
      activo: Boolean(usuario.activo),
      password: usuario.nuevaPassword?.trim() || undefined
    });
    usuario.nuevaPassword = '';
    mensaje.value = 'Usuario actualizado';
    await cargarUsuarios();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo actualizar el usuario';
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
  await Promise.all([cargarUsuarios(), cargarDireccionesDisponibles()]);
});

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
    .toLowerCase()
    .replace(/\s+/g, '_');
}
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

.mensaje {
  margin: 0;
  color: #1d4ed8;
  font-weight: 600;
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
}
</style>
