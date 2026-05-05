<template>
  <section class="login-view">
    <div class="background-container">
      <img :src="fondoLogin" alt="Fondo" class="background-image" />
      <div class="background-overlay"></div>
    </div>

    <div class="login-shell">
      <div class="login-header">
        <div class="header-brand">
          <img :src="logoQt" alt="Logo Quito Turismo" class="brand-logo" />
        </div>
      </div>

      <form class="login-card" @submit.prevent="onSubmit">
        <div class="card-header">
          <div class="header-divider"></div>
          <h2 class="card-title">Acceso al Sistema</h2>
          <p class="card-subtitle">Ingresa tus credenciales para continuar</p>
        </div>

        <div class="form-group">
          <div class="input-field">
            <div class="combo-box">
              <input
                v-model="username"
                class="field-input"
                type="text"
                required
                autocomplete="username"
                placeholder=" "
                spellcheck="false"
                @focus="abrirOpciones"
                @input="abrirOpciones"
                @blur="ocultarOpciones"
              />
              <label class="field-label">
                <i class="ri-map-pin-2-line" aria-hidden="true"></i>
                <span>Dirección</span>
              </label>
              <span class="input-icon"><i class="ri-arrow-down-s-line" aria-hidden="true"></i></span>

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
          </div>
        </div>

        <div class="form-group">
          <div class="input-field">
            <div class="password-box">
              <input
                v-model="password"
                class="field-input"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder=" "
              />
              <label class="field-label">
                <i class="ri-lock-2-line" aria-hidden="true"></i>
                <span>Contraseña</span>
              </label>
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="error" class="error-message">
          <i class="ri-alert-circle-line" aria-hidden="true"></i>
          <span>{{ error }}</span>
        </div>

        <button type="submit" class="login-button" :disabled="auth.loading">
          <span v-if="auth.loading" class="button-spinner">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="9.42" stroke-dashoffset="0" stroke-linecap="round" />
            </svg>
            <span>Ingresando...</span>
          </span>
          <span v-else>
            <i class="ri-login-box-line" aria-hidden="true"></i>
            Ingresar
          </span>
        </button>

        <div class="divider"></div>

        <div class="support-links">
          <a href="#" class="support-link">
            <i class="ri-question-line" aria-hidden="true"></i>
            ¿Olvidaste tu contraseña?
          </a>
          <a href="mailto:soporte@quito-turismo.gob.ec" class="support-link">
            <i class="ri-phone-line" aria-hidden="true"></i>
            Soporte
          </a>
        </div>

        <div class="card-footer">
          <div class="security-info">
            <i class="ri-shield-check-line" aria-hidden="true"></i>
            <span>Conexión segura y cifrada</span>
          </div>
        </div>
      </form>
    </div>

    <footer class="login-footer">
      <div class="footer-content">
        <span class="footer-brand">Quito Turismo</span>
        <span class="footer-sep">|</span>
        <span class="footer-text">© {{ currentYear }} - Seguimiento de Contrataciones</span>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { authService } from '../services/api';
import { normalizarTextoBusqueda, repararTextoConTildes } from '../utils/search';
import logoQt from '../assets/logoqt-nuevo.png';
import fondoLogin from '../assets/fondo-corporativo.jpg';

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
:root {
  --primary-dark: #0a3a52;
  --primary-navy: #0d5a7a;
  --primary-blue: #2e7fa3;
  --accent-orange: #e67e22;
  --accent-bright: #f39c12;
  --success-green: #27ae60;
  --error-red: #c0392b;
  --neutral-light: #f8fafb;
  --neutral-gray: #e8ecf1;
  --neutral-dark: #6b7c8f;
  --text-primary: #1a1f26;
  --text-secondary: #5a6270;
}

.login-view {
  min-height: 100vh;
  position: relative;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: hidden;
}

.background-container {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.background-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.background-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(10, 58, 82, 0.35), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(230, 126, 34, 0.15), transparent 45%),
    linear-gradient(135deg, rgba(10, 58, 82, 0.5), rgba(13, 90, 122, 0.45));
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: overlay-shift 20s ease infinite;
}

@keyframes overlay-shift {
  0%, 100% {
    background:
      radial-gradient(circle at 20% 50%, rgba(10, 58, 82, 0.4), transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(230, 126, 34, 0.2), transparent 45%),
      linear-gradient(135deg, rgba(10, 58, 82, 0.6), rgba(13, 90, 122, 0.5));
  }
  50% {
    background:
      radial-gradient(circle at 30% 60%, rgba(10, 58, 82, 0.35), transparent 45%),
      radial-gradient(circle at 70% 70%, rgba(230, 126, 34, 0.25), transparent 50%),
      linear-gradient(135deg, rgba(13, 90, 122, 0.55), rgba(10, 58, 82, 0.6));
  }
}

.login-shell {
  position: relative;
  z-index: 2;
  width: min(430px, 95vw); /* Ancho del contenedor: máximo 520px o 95% del viewport */
  display: grid;
  gap: 12px;
}

.login-header {
  text-align: center;
  animation: slideDown 0.7s ease-out;
  margin-bottom: 12px;
}

.header-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.brand-logo {
  width: 400px;
  height: 140px;
  object-fit: contain;
  filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.28));
  transition: transform 0.3s ease;
  animation: logoFloat 4s ease-in-out infinite;
}

.brand-logo:hover {
  transform: scale(1.05);
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.brand-subtitle {
  margin: 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 700;
  letter-spacing: 0.3px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.login-card {
  position: relative; /* Posición relativa para contenedor de elementos internos */
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 20px 25px; /* Espaciado interno: 20px vertical, 25px horizontal */
  /* Ancho: se ajusta automáticamente al contenedor padre (100% del width de .login-shell) */
  /* Alto: se ajusta automáticamente según el contenido */
  box-shadow:
    0 24px 56px rgba(10, 58, 82, 0.16),
    0 0 2px rgba(10, 58, 82, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  animation: slideUp 0.6s ease-out 0.1s both;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-card:hover {
  box-shadow:
    0 28px 64px rgba(10, 58, 82, 0.14),
    0 0 1px rgba(10, 58, 82, 0.1);
  border-color: rgba(230, 126, 34, 0.2);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  margin-bottom: 28px;
  text-align: center;
  position: relative;
}

.header-divider {
  height: 4px;
  width: 70px;
  margin: 0 auto 18px;
  background: linear-gradient(90deg, #e67e22, #1e7ba3);
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(230, 126, 34, 0.15);
}

.card-title {
  margin: 0 0 10px;
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--primary-dark);
  letter-spacing: -0.4px;
}

.card-subtitle {
  margin: 0;
  font-size: 0.93rem;
  color: var(--neutral-dark);
  font-weight: 500;
}

.form-group {
  position: relative;
  margin-bottom: 20px;
}

.input-field {
  position: relative;
}

.field-label {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  color: var(--neutral-dark);
  font-size: 0.9rem;
  font-weight: 500;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  z-index: 2;
}

.field-label i {
  font-size: 1.1rem;
  color: var(--primary-blue);
}

.field-label span {
  letter-spacing: 0.2px;
}

.field-input:focus ~ .field-label,
.field-input:not(:placeholder-shown) ~ .field-label {
  top: 8px;
  left: 14px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary-blue);
  background: white;
  padding: 0 4px;
}

.combo-box {
  position: relative;
}

.field-input {
  width: 100%;
  border: 2px solid #e0e5eb;
  border-radius: 12px;
  padding: 16px 16px 12px 16px;
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-family: inherit;
  font-weight: 500;
  box-shadow:
    0 4px 14px rgba(10, 58, 82, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.field-input::placeholder {
  color: var(--neutral-dark);
}

.field-input:focus {
  outline: none;
  border-color: #1e7ba3;
  box-shadow:
    0 8px 28px rgba(30, 123, 163, 0.18),
    0 0 0 4px rgba(30, 123, 163, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
}

.field-input:hover {
  border-color: rgba(230, 126, 34, 0.3);
}

.input-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--primary-blue);
  pointer-events: none;
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.field-input:focus ~ .input-icon {
  opacity: 1;
  color: var(--accent-orange);
}

.password-box {
  position: relative;
}

.password-box .field-input {
  padding-right: 48px;
}

.password-toggle {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(46, 127, 163, 0.08), rgba(230, 126, 34, 0.05));
  color: var(--primary-blue);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.password-toggle:hover {
  background: linear-gradient(135deg, rgba(46, 127, 163, 0.12), rgba(230, 126, 34, 0.12));
  color: var(--accent-orange);
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
  max-height: 240px;
  overflow-y: auto;
  background: white;
  border: 1px solid var(--neutral-gray);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(10, 58, 82, 0.12);
  backdrop-filter: blur(8px);
}

.combo-item,
.combo-empty {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
}

.combo-item {
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.combo-item:hover {
  background: linear-gradient(135deg, rgba(46, 127, 163, 0.08), rgba(230, 126, 34, 0.05));
  color: var(--primary-blue);
  padding-left: 20px;
}

.combo-empty {
  color: var(--neutral-dark);
  text-align: center;
  cursor: default;
}

.login-button {
  margin-top: 16px;
  border: none;
  border-radius: 14px;
  padding: 18px 28px;
  background: linear-gradient(135deg, #1e7ba3 0%, #0a3a52 100%);
  color: white;
  font-size: 0.97rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  cursor: pointer;
  box-shadow:
    0 18px 40px rgba(10, 58, 82, 0.28),
    0 0 2px rgba(10, 58, 82, 0.12);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: inherit;
  position: relative;
  overflow: hidden;
  min-height: 50px;
  width: 100%;
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-button:hover::before {
  left: 100%;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow:
    0 28px 56px rgba(10, 58, 82, 0.35),
    0 0 2px rgba(10, 58, 82, 0.12);
}

.login-button:active:not(:disabled) {
  transform: translateY(-1px);
}

.login-button:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.login-button i {
  font-size: 1rem;
}

.button-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.button-spinner svg {
  display: block;
  animation: spin-loader 0.9s linear infinite;
  width: 16px;
  height: 16px;
}

@keyframes spin-loader {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  margin: 8px 0 0;
  padding: 14px 16px;
  border-radius: 10px;
  border-left: 4px solid var(--error-red);
  background: linear-gradient(135deg, rgba(192, 57, 43, 0.08) 0%, rgba(192, 57, 43, 0.04) 100%);
  color: var(--error-red);
  font-size: 0.87rem;
  font-weight: 600;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: errorSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(192, 57, 43, 0.1);
}

.error-message i {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 1.1rem;
}

@keyframes errorSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.divider {
  height: 1px;
  margin: 28px 0;
  background: linear-gradient(90deg, transparent, var(--neutral-gray), transparent);
}

.support-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.support-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 13px 18px;
  background: linear-gradient(135deg, rgba(30, 123, 163, 0.06), rgba(230, 126, 34, 0.04));
  border: 1.5px solid #e0e5eb;
  border-radius: 11px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
}

.support-link i {
  font-size: 0.95rem;
  color: var(--primary-blue);
}

.support-link:hover {
  background: linear-gradient(135deg, rgba(30, 123, 163, 0.12), rgba(230, 126, 34, 0.1));
  border-color: #1e7ba3;
  color: #1e7ba3;
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(30, 123, 163, 0.1);
}

.card-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--neutral-gray);
  display: flex;
  align-items: center;
  justify-content: center;
}

.security-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.08), rgba(46, 204, 113, 0.04));
  border-radius: 10px;
  color: var(--success-green);
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(39, 174, 96, 0.15);
}

.security-info i {
  font-size: 1rem;
  animation: pulse-security 2s ease-in-out infinite;
}

@keyframes pulse-security {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.login-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  text-align: center;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.02));
  padding: 16px 12px 12px;
  height: 60px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--neutral-dark);
  font-size: 0.8rem;
  font-weight: 500;
}

.footer-brand {
  font-weight: 700;
  color: var(--primary-dark);
}

.footer-sep {
  color: var(--neutral-gray);
  opacity: 0.8;
}

.footer-text {
  color: var(--neutral-dark);
}

@media (max-width: 640px) {
  .login-view {
    padding: 20px 16px;
    padding-bottom: 80px;
  }

  .login-shell {
    width: min(100%, 100vw - 32px);
  }

  .login-card {
    border-radius: 16px;
    padding: 32px 24px;
  }

  .header-brand {
    gap: 12px;
    margin-bottom: 6px;
  }

  .brand-logo {
    width: 100px;
    height: 100px;
  }

  .brand-subtitle {
    font-size: 0.95rem;
  }

  .card-title {
    font-size: 1.5rem;
  }

  .card-subtitle {
    font-size: 0.85rem;
  }

  .field-input {
    border-radius: 10px;
    padding: 14px 14px 10px;
    font-size: 0.9rem;
  }

  .field-label {
    left: 14px;
    font-size: 0.85rem;
  }

  .field-input:focus ~ .field-label,
  .field-input:not(:placeholder-shown) ~ .field-label {
    left: 12px;
    font-size: 0.65rem;
  }

  .login-button {
    border-radius: 10px;
    padding: 14px 20px;
    font-size: 0.9rem;
  }

  .support-links {
    grid-template-columns: 1fr;
  }

  .support-link {
    font-size: 0.8rem;
    padding: 10px 14px;
  }

  .login-footer {
    height: 70px;
    padding: 16px 12px 10px;
  }

  .footer-content {
    font-size: 0.75rem;
    gap: 6px;
  }
}
</style>
