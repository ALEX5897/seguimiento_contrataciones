<template>
  <section class="login-view" :style="{ backgroundImage: `url(${fondoLogin})` }">
    <div class="login-overlay"></div>

    <div class="login-shell">
      <form class="login-card" @submit.prevent="onSubmit">
        <div class="card-top">
          <img :src="logoQt" alt="Logo Quito Turismo" class="card-logo" />
          <div>
            <h2><i class="ri-key-2-line title-icon" aria-hidden="true"></i>Ingreso al Sistema</h2>
            <p class="subtitle">
              Selecciona tu dirección del listado e ingresa tu contraseña.
              <i class="ri-information-line subtitle-icon" aria-hidden="true"></i>
            </p>
          </div>
        </div>

        <label class="field-group combo-label">
          <span class="field-label">Dirección</span>
          <div class="combo-box">
            <input
              v-model="username"
              class="field-input"
              type="text"
              required
              autocomplete="username"
              placeholder="Selecciona una dirección"
              spellcheck="false"
              @focus="abrirOpciones"
              @input="abrirOpciones"
              @blur="ocultarOpciones"
            />
            <span class="combo-chevron">v</span>

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

        <label class="field-group">
          <span class="field-label">Contraseña</span>
          <div class="password-box">
            <input
              v-model="password"
              class="field-input password-input"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="Ingresa tu contraseña"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'" aria-hidden="true"></i>
            </button>
          </div>
        </label>

        <button type="submit" class="login-button" :disabled="auth.loading">
          {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
        </button>

        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>

    <footer class="login-footer">(c) {{ currentYear }} Quito Turismo. Todos los derechos reservados.</footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { authService } from '../services/api';
import { normalizarTextoBusqueda, repararTextoConTildes } from '../utils/search';

const fondoLogin = 'https://as2.ftcdn.net/v2/jpg/01/70/03/67/1000_F_170036772_vOispQGM35tY2nN0PVluT6PgQd8NttZe.jpg';
const logoQt = 'https://turismo.quito.gob.ec/wp-content/uploads/2024/06/logoQT.png';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const currentYear = new Date().getFullYear();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
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
  const user = String(username.value || '').trim();
  const pass = String(password.value || '').trim();

  if (!user || !pass) {
    error.value = 'Dirección y contraseña son requeridas';
    return;
  }

  try {
    await auth.login(user, pass);
    const redirectTo = String(route.query.redirect || '/');
    router.replace(redirectTo);
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'No fue posible iniciar sesión';
  }
}
</script>

<style scoped>
.login-view {
  --login-primary: #0d5f63;
  --login-primary-strong: #083c46;
  --login-glass: rgba(239, 250, 251, 0.22);
  --login-glass-strong: rgba(255, 255, 255, 0.36);
  min-height: 100vh;
  position: relative;
  padding: 24px;
  display: grid;
  place-items: center;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.login-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(4, 31, 37, 0.8), rgba(8, 67, 78, 0.54)),
    radial-gradient(circle at top right, rgba(215, 162, 63, 0.26), transparent 28%),
    radial-gradient(circle at bottom left, rgba(255, 255, 255, 0.12), transparent 24%);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(470px, 92vw);
}

.login-card {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.14)),
    linear-gradient(180deg, rgba(239, 250, 251, 0.4), rgba(214, 235, 237, 0.18));
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 30px;
  backdrop-filter: blur(16px) saturate(135%);
  -webkit-backdrop-filter: blur(16px) saturate(135%);
  box-shadow:
    0 24px 54px rgba(3, 17, 22, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.56),
    inset 0 -1px 0 rgba(255, 255, 255, 0.06);
  padding: 46px 34px 40px;
  display: grid;
  align-content: center;
  gap: 20px;
}

.login-card::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 29px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.32), transparent 36%),
    radial-gradient(circle at top center, rgba(255, 255, 255, 0.28), transparent 40%);
  pointer-events: none;
}

.login-card::after {
  content: '';
  position: absolute;
  top: -14%;
  left: 8%;
  width: 84%;
  height: 80px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0));
  filter: blur(10px);
  pointer-events: none;
}

.card-top {
  display: grid;
  gap: 18px;
  justify-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
}

.card-logo {
  width: min(290px, 92%);
  height: auto;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 12px 24px rgba(255, 255, 255, 0.2));
}

.card-top h2 {
  margin: 0;
  color: #0d2430;
  font-size: 2.05rem;
  line-height: 1.12;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.subtitle {
  margin: 2px 0 0;
  color: #55707a;
  font-size: 0.94rem;
  line-height: 1.6;
  text-align: center;
}

.title-icon,
.subtitle-icon {
  color: var(--login-primary);
}

.title-icon {
  font-size: 1.2rem;
}

.subtitle-icon {
  margin-left: 6px;
  font-size: 0.95rem;
  vertical-align: middle;
}

.field-group {
  display: grid;
  gap: 8px;
}

.field-label {
  color: #26414c;
  font-size: 0.87rem;
  font-weight: 700;
}

.combo-box {
  position: relative;
}

.field-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 18px;
  padding: 13px 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(244, 250, 251, 0.62));
  color: #17333c;
  font-size: 0.96rem;
  box-shadow:
    0 10px 22px rgba(18, 54, 63, 0.09),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.field-input::placeholder {
  color: #8ba1a8;
}

.field-input:focus {
  outline: none;
  border-color: rgba(13, 95, 99, 0.46);
  box-shadow:
    0 16px 34px rgba(13, 95, 99, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.combo-chevron {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: #68828b;
  pointer-events: none;
  font-size: 1rem;
}

.password-box {
  position: relative;
}

.password-input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  color: #48656f;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.password-toggle:hover {
  background: rgba(255, 255, 255, 0.72);
  color: var(--login-primary);
}

.combo-list {
  position: absolute;
  z-index: 8;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  margin: 0;
  padding: 8px;
  list-style: none;
  max-height: 220px;
  overflow: auto;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 20px;
  box-shadow: 0 22px 40px rgba(11, 43, 50, 0.18);
  backdrop-filter: blur(14px);
}

.combo-item,
.combo-empty {
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.92rem;
}

.combo-item {
  color: #183742;
  cursor: pointer;
}

.combo-item:hover {
  background: rgba(13, 95, 99, 0.08);
  color: var(--login-primary);
}

.combo-empty {
  color: #7a9098;
}

.login-button {
  margin-top: 8px;
  border: none;
  border-radius: 18px;
  padding: 14px 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
    linear-gradient(135deg, var(--login-primary), var(--login-primary-strong));
  color: #ffffff;
  font-size: 0.98rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 18px 34px rgba(8, 60, 70, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 22px 38px rgba(8, 60, 70, 0.34);
}

.login-button:disabled {
  opacity: 0.78;
  cursor: not-allowed;
}

.error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(176, 26, 26, 0.08);
  color: #b42318;
  font-size: 0.88rem;
  font-weight: 600;
}

.login-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  z-index: 1;
  text-align: center;
  color: rgba(244, 250, 251, 0.95);
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

@media (max-width: 640px) {
  .login-view {
    padding: 14px;
  }

  .login-card {
    border-radius: 24px;
    padding: 30px 20px 24px;
  }

  .card-logo {
    width: min(245px, 86%);
  }

  .card-top h2 {
    font-size: 1.72rem;
  }

  .field-input,
  .login-button {
    border-radius: 16px;
    padding: 13px 15px;
  }

  .login-footer {
    font-size: 0.75rem;
    bottom: 8px;
    padding: 0 10px;
  }
}
</style>
