<template>
  <div class="admin-permisos-view">
    <div class="encabezado">
      <div>
        <h1>Administración de permisos</h1>
        <p class="subtitulo">Configura qué puede hacer cada rol y qué opciones ve en el menú lateral</p>
      </div>

      <div class="acciones">
        <label>
          Rol
          <select v-model="rolSeleccionado" @change="cargarDetalleRol" :disabled="cargando || guardando">
            <option v-for="rol in roles" :key="rol" :value="rol">{{ rol }}</option>
          </select>
        </label>
        <button type="button" @click="guardar" :disabled="guardando || cargando || !detalleRol">
          {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </div>

    <p v-if="mensaje" class="mensaje">{{ mensaje }}</p>

    <section class="card" v-if="detalleRol">
      <h2>Permisos por módulo</h2>
      <table class="tabla">
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Leer</th>
            <th>Crear</th>
            <th>Actualizar</th>
            <th>Borrar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="modulo in detalleRol.modulos" :key="modulo.clave">
            <td>
              <strong>{{ modulo.nombre }}</strong>
              <p class="descripcion">{{ modulo.descripcion || 'Sin descripción' }}</p>
            </td>
            <td><input type="checkbox" v-model="modulo.permisos.read" /></td>
            <td><input type="checkbox" v-model="modulo.permisos.create" /></td>
            <td><input type="checkbox" v-model="modulo.permisos.update" /></td>
            <td><input type="checkbox" v-model="modulo.permisos.delete" /></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card" v-if="detalleRol">
      <h2>Acceso a menú lateral</h2>
      <table class="tabla">
        <thead>
          <tr>
            <th>Opción</th>
            <th>Ruta</th>
            <th>Puede ingresar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="menu in detalleRol.menu" :key="menu.clave">
            <td>{{ menu.nombre }}</td>
            <td>{{ menu.ruta }}</td>
            <td><input type="checkbox" v-model="menu.puedeIngresar" /></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { permisosService, type PermisosRolDetalle } from '../services/api';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const cargando = ref(false);
const guardando = ref(false);
const mensaje = ref('');
const roles = ref<string[]>([]);
const rolSeleccionado = ref('');
const detalleRol = ref<PermisosRolDetalle | null>(null);

const MENU_TO_MODULE: Record<string, string> = {
  dashboard: 'dashboard',
  actividades: 'actividades',
  reportes: 'reportes',
  admin_actividades: 'admin_actividades',
  admin_versiones: 'admin_versiones',
  admin_usuarios: 'admin_usuarios',
  admin_catalogos: 'admin_catalogos',
  admin_permisos: 'admin_permisos',
  admin_auditoria: 'admin_auditoria'
};

function syncPermisosMenuModulo(detalle: PermisosRolDetalle) {
  const moduloByClave = new Map(detalle.modulos.map((m) => [m.clave, m]));

  for (const menu of detalle.menu) {
    const moduleKey = MENU_TO_MODULE[menu.clave];
    if (!moduleKey) continue;
    const modulo = moduloByClave.get(moduleKey);
    if (!modulo) continue;

    if (menu.puedeIngresar && !modulo.permisos.read) {
      modulo.permisos.read = true;
    }

    if (!modulo.permisos.read && menu.puedeIngresar) {
      menu.puedeIngresar = false;
    }
  }
}

function clonarDetalle(detalle: PermisosRolDetalle): PermisosRolDetalle {
  return {
    role: detalle.role,
    modulos: detalle.modulos.map((m) => ({
      ...m,
      permisos: {
        read: Boolean(m.permisos.read),
        create: Boolean(m.permisos.create),
        update: Boolean(m.permisos.update),
        delete: Boolean(m.permisos.delete)
      }
    })),
    menu: detalle.menu.map((m) => ({
      ...m,
      puedeIngresar: Boolean(m.puedeIngresar)
    }))
  };
}

async function cargarResumen() {
  cargando.value = true;
  mensaje.value = '';
  try {
    const data = await permisosService.getAll();
    roles.value = Array.isArray(data.roles) ? data.roles : [];

    if (!roles.value.length) {
      detalleRol.value = null;
      mensaje.value = 'No hay roles disponibles para configurar';
      return;
    }

    const roleActual = String(auth.user?.role || '');
    rolSeleccionado.value = roles.value.includes(roleActual)
      ? roleActual
      : String(roles.value[0] || '');

    await cargarDetalleRol();
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo cargar el módulo de permisos';
  } finally {
    cargando.value = false;
  }
}

async function cargarDetalleRol() {
  if (!rolSeleccionado.value) return;
  cargando.value = true;
  mensaje.value = '';

  try {
    const detalle = await permisosService.getByRole(rolSeleccionado.value);
    const clonado = clonarDetalle(detalle);
    syncPermisosMenuModulo(clonado);
    detalleRol.value = clonado;
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudo cargar el detalle del rol';
  } finally {
    cargando.value = false;
  }
}

async function guardar() {
  if (!detalleRol.value) return;
  guardando.value = true;
  mensaje.value = '';

  try {
    const payload = {
      modulos: detalleRol.value.modulos.map((m) => ({
        clave: m.clave,
        permisos: {
          read: Boolean(m.permisos.read),
          create: Boolean(m.permisos.create),
          update: Boolean(m.permisos.update),
          delete: Boolean(m.permisos.delete)
        }
      })),
      menu: detalleRol.value.menu.map((m) => ({
        clave: m.clave,
        puedeIngresar: Boolean(m.puedeIngresar)
      }))
    };

    const payloadAjustado = {
      modulos: payload.modulos.map((m) => ({
        ...m,
        permisos: { ...m.permisos }
      })),
      menu: payload.menu.map((m) => ({ ...m }))
    };

    for (const itemMenu of payloadAjustado.menu) {
      const moduleKey = MENU_TO_MODULE[itemMenu.clave];
      if (!moduleKey) continue;
      const modulePerm = payloadAjustado.modulos.find((m) => m.clave === moduleKey);
      if (!modulePerm) continue;

      if (itemMenu.puedeIngresar && !modulePerm.permisos.read) {
        modulePerm.permisos.read = true;
      }
      if (!modulePerm.permisos.read && itemMenu.puedeIngresar) {
        itemMenu.puedeIngresar = false;
      }
    }

    const updated = await permisosService.updateByRole(rolSeleccionado.value, payloadAjustado);
    detalleRol.value = clonarDetalle(updated);
    mensaje.value = `Permisos actualizados para el rol ${rolSeleccionado.value}`;

    if (auth.user?.role === rolSeleccionado.value) {
      await auth.fetchMe();
    }
  } catch (error: any) {
    mensaje.value = error?.response?.data?.error || 'No se pudieron guardar los permisos';
  } finally {
    guardando.value = false;
  }
}

onMounted(async () => {
  await cargarResumen();
});
</script>

<style scoped>
.admin-permisos-view {
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

.acciones {
  display: flex;
  align-items: end;
  gap: 0.6rem;
}

.acciones label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: #334155;
}

.acciones select,
.acciones button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}

.acciones button {
  background: #1d4ed8;
  color: #fff;
  border-color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
}

.acciones button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.tabla {
  width: 100%;
  border-collapse: collapse;
}

.tabla th,
.tabla td {
  border-bottom: 1px solid #e2e8f0;
  padding: 0.5rem;
  font-size: 0.84rem;
  text-align: left;
}

.tabla th {
  color: #1e293b;
  background: #f8fafc;
}

.tabla td input[type='checkbox'] {
  width: 16px;
  height: 16px;
}

.descripcion {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.76rem;
}

.mensaje {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .encabezado {
    flex-direction: column;
    align-items: flex-start;
  }

  .acciones {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
