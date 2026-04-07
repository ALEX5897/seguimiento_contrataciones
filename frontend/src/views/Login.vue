<template>
  <div class="login-view" :style="{ backgroundImage: `url(${fondoLogin})` }">
    <form class="login-card" @submit.prevent="onSubmit">
      <div class="brand-login">
        <img :src="logoQt" alt="Quito Turismo" class="logo-login" />
      </div>
      <h1>Ingreso al sistema</h1>
      

      <label class="combo-label">
        Usuario
        <div class="combo-box">
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="Escribe tu usuario"
            spellcheck="false"
            @focus="abrirOpciones"
            @input="abrirOpciones"
            @blur="ocultarOpciones"
          />
          <span class="combo-chevron">▾</span>

          <ul v-if="mostrarOpciones" class="combo-list" role="listbox">
            <li
              v-for="opcion in opcionesFiltradas"
              :key="opcion"
              class="combo-item"
              @mousedown.prevent="seleccionarOpcion(opcion)"
            >
              {{ opcion }}
            </li>
            <li v-if="opcionesFiltradas.length === 0" class="combo-empty">Sin resultados</li>
          </ul>
        </div>
      </label>

      <label>
        Contraseña
        <input v-model="password" type="password" required autocomplete="current-password" />
      </label>

      <button type="submit" :disabled="auth.loading">{{ auth.loading ? 'Ingresando...' : 'Ingresar' }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { authService } from '../services/api';
import { normalizarTextoBusqueda, repararTextoConTildes } from '../utils/search';
import fondoLogin from '../assets/fondo.jpg';
import logoQt from '../assets/logoqt.png';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const error = ref('');
const usuariosLogin = ref<string[]>([]);
const mostrarOpciones = ref(false);

const opcionesLogin = computed(() => {
  const values = usuariosLogin.value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return [...new Set(values)];
});

const opcionesFiltradas = computed(() => {
  const q = normalizarTextoBusqueda(username.value || '');
  if (!q) return opcionesLogin.value;
  return opcionesLogin.value.filter((item) => normalizarTextoBusqueda(item).includes(q));
});

function abrirOpciones() {
  mostrarOpciones.value = true;
}

function ocultarOpciones() {
  setTimeout(() => {
    mostrarOpciones.value = false;
  }, 130);
}

function seleccionarOpcion(opcion: string) {
  username.value = opcion;
  mostrarOpciones.value = false;
}

onMounted(async () => {
  try {
    const data = await authService.getOpcionesLogin();
    usuariosLogin.value = Array.isArray(data)
      ? data.map((item) => repararTextoConTildes(String(item || '')))
      : [];
  } catch {
    usuariosLogin.value = [];
  }
});

async function onSubmit() {
  error.value = '';
  try {
    await auth.login(username.value, password.value);
    const redirectTo = String(route.query.redirect || '/');
    router.replace(redirectTo);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No fue posible iniciar sesión';
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  position: relative;
  padding: 1rem;
}

.login-view::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.login-card {
  width: min(420px, 92vw);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.3rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.8rem;
  position: relative;
  z-index: 1;
}

.brand-login {
  display: grid;
  place-items: center;
  margin-bottom: 0.15rem;
}

.logo-login {
  width: min(220px, 70%);
  height: auto;
  object-fit: contain;
}

h1 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.sub {
  margin: 0;
  color: #64748b;
  font-size: 0.86rem;
}

label {
  display: grid;
  gap: 0.35rem;
  color: #334155;
  font-size: 0.86rem;
}

input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
  width: 100%;
}

.combo-box {
  position: relative;
}

.combo-chevron {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
}

.combo-list {
  position: absolute;
  z-index: 5;
  left: 0;
  right: 0;
  top: calc(100% + 0.25rem);
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  max-height: 220px;
  overflow: auto;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
}

.combo-item {
  padding: 0.5rem 0.55rem;
  border-radius: 8px;
  color: #1e293b;
  cursor: pointer;
}

.combo-item:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.combo-empty {
  padding: 0.45rem 0.55rem;
  color: #64748b;
  font-size: 0.84rem;
}

button {
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  margin: 0;
  color: #dc2626;
  font-size: 0.82rem;
}
</style>
