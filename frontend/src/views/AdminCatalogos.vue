<template>
  <div class="catalogos-view">
    <div class="header">
      <h1>Catálogos: Direcciones y Responsables</h1>
      <p>Administra los catálogos maestros del sistema</p>
    </div>

    <div v-if="mensaje" class="mensaje">{{ mensaje }}</div>

    <section class="card">
      <h2>Direcciones</h2>
      <form class="inline-form" @submit.prevent="crearDireccion">
        <input v-model="nuevaDireccion" placeholder="Nueva dirección" required />
        <button type="submit" :disabled="guardando">Agregar dirección</button>
      </form>

      <table class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in direcciones" :key="d.id">
            <td><input v-model="d.nombre" /></td>
            <td><input type="checkbox" v-model="d.activo" /></td>
            <td class="acciones">
              <button type="button" class="btn-guardar" @click="guardarDireccion(d)" :disabled="guardando">Guardar</button>
              <button type="button" class="btn-eliminar" @click="eliminarDireccion(d)" :disabled="guardando">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2>Responsables</h2>
      <form class="grid-form" @submit.prevent="crearResponsable">
        <input v-model="nuevoResponsable.nombre" placeholder="Nombre" required />
        <input v-model="nuevoResponsable.email" placeholder="Correo (opcional)" />
        <select v-model.number="nuevoResponsable.direccionId">
          <option :value="null">Sin dirección</option>
          <option v-for="d in direcciones" :key="d.id" :value="d.id">{{ d.nombre }}</option>
        </select>
        <button type="submit" :disabled="guardando">Agregar responsable</button>
      </form>

      <table class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Dirección</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in responsables" :key="r.id">
            <td><input v-model="r.nombre" /></td>
            <td><input v-model="r.email" /></td>
            <td>
              <select v-model.number="r.direccionId">
                <option :value="null">Sin dirección</option>
                <option v-for="d in direcciones" :key="d.id" :value="d.id">{{ d.nombre }}</option>
              </select>
            </td>
            <td><input type="checkbox" v-model="r.activo" /></td>
            <td class="acciones">
              <button type="button" class="btn-guardar" @click="guardarResponsable(r)" :disabled="guardando">Guardar</button>
              <button type="button" class="btn-eliminar" @click="eliminarResponsable(r)" :disabled="guardando">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../services/api';

const guardando = ref(false);
const mensaje = ref('');

const direcciones = ref<any[]>([]);
const responsables = ref<any[]>([]);

const nuevaDireccion = ref('');
const nuevoResponsable = ref({
  nombre: '',
  email: '',
  direccionId: null as number | null
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
  const [dirs, reps] = await Promise.all([
    api.get('/catalogos/direcciones'),
    api.get('/catalogos/responsables')
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
}

async function crearDireccion() {
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.post('/catalogos/direcciones', { nombre: nuevaDireccion.value.trim(), activo: true });
    nuevaDireccion.value = '';
    mensaje.value = 'Dirección creada';
    await cargarCatalogos();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo crear dirección';
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
    mensaje.value = 'Dirección actualizada';
    await cargarCatalogos();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo actualizar dirección';
  } finally {
    guardando.value = false;
  }
}

async function eliminarDireccion(direccion: any) {
  if (!confirm(`¿Eliminar dirección ${direccion.nombre}?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.delete(`/catalogos/direcciones/${direccion.id}`);
    mensaje.value = 'Dirección eliminada';
    await cargarCatalogos();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo eliminar dirección';
  } finally {
    guardando.value = false;
  }
}

async function crearResponsable() {
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
    mensaje.value = 'Responsable creado';
    await cargarCatalogos();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo crear responsable';
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
    mensaje.value = 'Responsable actualizado';
    await cargarCatalogos();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo actualizar responsable';
  } finally {
    guardando.value = false;
  }
}

async function eliminarResponsable(responsable: any) {
  if (!confirm(`¿Eliminar responsable ${responsable.nombre}?`)) return;
  guardando.value = true;
  mensaje.value = '';
  try {
    await api.delete(`/catalogos/responsables/${responsable.id}`);
    mensaje.value = 'Responsable eliminado';
    await cargarCatalogos();
  } catch (e: any) {
    mensaje.value = e?.response?.data?.error || 'No se pudo eliminar responsable';
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

.card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.9rem;
}

.card h2 {
  margin: 0 0 0.7rem;
  color: #1e293b;
}

.inline-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}

.grid-form {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}

input,
select,
button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}

button {
  cursor: pointer;
}

.btn-guardar {
  background: #2563eb;
  border-color: #1d4ed8;
  color: #fff;
}

.btn-eliminar {
  background: #fff;
  border-color: #fca5a5;
  color: #b91c1c;
}

.mensaje {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
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

.tabla input,
.tabla select {
  width: 100%;
}

.acciones {
  display: flex;
  gap: 0.35rem;
}

@media (max-width: 980px) {
  .inline-form,
  .grid-form {
    grid-template-columns: 1fr;
  }

  .tabla {
    display: block;
    overflow-x: auto;
  }
}
</style>
