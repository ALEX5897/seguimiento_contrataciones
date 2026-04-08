<template>
  <div v-if="esLogin" class="workspace-login">
    <router-view />
  </div>

  <div v-else class="app-shell" :class="{ 'menu-hidden': !menuVisible }">
    <!-- Botón hamburguesa fuera del sidebar cuando el menú está oculto -->
    <button
      v-if="!menuVisible && auth.isAuthenticated"
      type="button"
      class="menu-hamburger menu-hamburger-global"
      @click="menuVisible = true"
      aria-label="Menú"
    >
      <span class="hamburger-bar"></span>
      <span class="hamburger-bar"></span>
      <span class="hamburger-bar"></span>
    </button>
    <aside class="sidebar" v-if="auth.isAuthenticated && menuVisible">
      <button type="button" class="menu-hamburger" @click="menuVisible = false" aria-label="Menú">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
      <div class="brand">
        <div class="brand-icon">
          <img :src="logoQt" alt="Quito Turismo" class="brand-logo" />
        </div>
        <div>
          <h1>Seguimiento</h1>
          <p>QUITO TURISMO</p>
        </div>
      </div>

      <nav class="menu">
        <router-link
          v-for="item in menuItems"
          :key="item.key"
          :to="item.to"
          class="menu-link"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div>{{ auth.user?.nombre || 'Usuario' }} · {{ auth.user?.role || '-' }}</div>
        <div class="app-version">Versión 1.0.6</div>
        <button type="button" class="logout-btn" @click="cerrarSesion">Cerrar sesión</button>
      </div>
    </aside>

    <div class="workspace">
      <main class="workspace-content">
        <button type="button" class="menu-toggle" @click="menuVisible = false" v-show="menuVisible && $screenIsMobile">
          Ocultar menú
        </button>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import logoQt from './assets/logoqt.png';


interface MenuItem {
  key: string;
  to: string;
  label: string;
}

const menuVisible = ref(window.innerWidth > 900);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const esLogin = computed(() => route.path === '/login');

const menuConfig: MenuItem[] = [
  { key: 'dashboard', to: '/', label: 'Dashboard' },
  { key: 'actividades', to: '/actividades', label: 'Procesos' },
  { key: 'reportes', to: '/reportes', label: 'Reportes' },
  { key: 'notificaciones', to: '/notificaciones', label: 'Notificaciones' },
  { key: 'admin_actividades', to: '/admin/actividades', label: 'Admin Procesos' },
  { key: 'admin_versiones', to: '/admin/versiones', label: 'Admin Versiones' },
  { key: 'admin_usuarios', to: '/admin/usuarios', label: 'Admin Usuarios' },
  { key: 'admin_catalogos', to: '/admin/catalogos', label: 'Admin Catálogos' },
  { key: 'admin_permisos', to: '/admin/permisos', label: 'Admin Permisos' },
  { key: 'admin_auditoria', to: '/admin/auditoria', label: 'Admin Auditoría' }
];

const menuItems = computed(() => menuConfig.filter((item) => auth.canAccessMenu(item.key)));

const $screenIsMobile = computed(() => window.innerWidth <= 900);

async function cerrarSesion() {
  await auth.logout();
  router.replace('/login');
}

// --- INACTIVITY LOGOUT ---
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutos
let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;

function resetInactivityTimer() {
  if (inactivityTimeout) clearTimeout(inactivityTimeout);
  if (!auth.isAuthenticated) return;
  inactivityTimeout = setTimeout(() => {
    auth.logout().finally(() => {
      router.replace('/login');
      alert('Sesión cerrada por inactividad.');
    });
  }, INACTIVITY_LIMIT_MS);
}

function setupInactivityListeners() {
  ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetInactivityTimer);
  });
}
function removeInactivityListeners() {
  ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(event => {
    window.removeEventListener(event, resetInactivityTimer);
  });
}

function handleResize() {
  if (window.innerWidth <= 900) {
    menuVisible.value = false;
  } else {
    menuVisible.value = true;
  }
}

onMounted(async () => {
  // Verifica sesión al abrir la app
  if (auth.token && !auth.user) {
    await auth.fetchMe();
  }
  // Inactividad
  setupInactivityListeners();
  resetInactivityTimer();
  window.addEventListener('resize', handleResize);
  if (window.innerWidth <= 900) menuVisible.value = false;
});

onUnmounted(() => {
  removeInactivityListeners();
  if (inactivityTimeout) clearTimeout(inactivityTimeout);
  window.removeEventListener('resize', handleResize);
});

watch(() => route.path, () => {
  if (window.innerWidth <= 900) menuVisible.value = false;
});
</script>

<style scoped>
@media (max-width: 900px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: relative;
    left: 0;
    top: 0;
    height: auto;
    max-height: none;
    z-index: 2;
    width: 100%;
    transform: none;
    transition: none;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    border-right: none;
    border-bottom: 1px solid #1e293b;
  }
  .menu-hamburger {
    display: block;
    position: absolute;
    left: 1rem;
    top: 1rem;
    z-index: 3;
  }
}
@media (max-width: 600px) {
  .sidebar {
    width: 100vw;
    min-width: 0;
    max-width: 100vw;
    padding: 0.5rem;
  }
  .menu-hamburger {
    left: 0.5rem;
    top: 0.5rem;
  }
}
/* --- Responsive Hamburger Menu --- */
.menu-hamburger {
  display: block;
  position: absolute;
  top: 1rem;
  right: 1rem;
  left: auto;
  background: #0f172a;
  border-radius: 8px;
  padding: 0.18rem 0.22rem;
  border: 1px solid #334155;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: background 0.2s, box-shadow 0.2s;
  width: 32px;
  height: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.menu-hamburger.menu-hamburger-global {
  position: fixed;
  left: 1rem;
  right: auto;
  top: 1rem;
  z-index: 100;
}
.menu-hamburger:hover {
  background: #1e293b;
  box-shadow: 0 4px 16px rgba(0,0,0,0.13);
}
.hamburger-bar {
  width: 18px;
  height: 2.5px;
  margin: 2.5px 0;
  background: #fff;
  border-radius: 2px;
  transition: 0.3s;
  display: block;
}

@media (max-width: 900px) {
  .menu-hamburger {
    display: block;
    position: absolute;
    left: 1rem;
    top: 1rem;
  }
  .sidebar {
    box-shadow: 2px 0 8px rgba(0,0,0,0.08);
  }
}

@media (max-width: 600px) {
  .menu-hamburger {
    top: 0.5rem;
    right: 0.5rem;
    width: 26px;
    height: 26px;
    padding: 0.12rem 0.15rem;
  }
  .hamburger-bar {
    width: 13px;
    height: 2px;
    margin: 2px 0;
  }
}
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 250px 1fr;
  background: linear-gradient(180deg, #eef2f5 0%, #e7edf2 100%);
  position: relative;
}

.app-shell.menu-hidden {
  grid-template-columns: 1fr;
}

.app-shell.menu-hidden .sidebar {
  display: none;
}

.sidebar {
  background: #0f172a;
  color: #cbd5e1;
  padding: 1rem;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  border-right: 1px solid #1e293b;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 5;
}

.app-version {
  color: #a5b4fc;
  font-size: 0.85rem;
  margin: 0.3rem 0 0.2rem 0;
  text-align: left;
}

.brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem;
}

.brand-icon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #fff;
  padding: 0.18rem;
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand h1 {
  margin: 0;
  color: #f8fafc;
  font-size: 1rem;
}

.brand p {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  color: #94a3b8;
}

.menu {
  display: grid;
  gap: 0.35rem;
  align-content: start;
}

.menu-link {
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 9px;
  padding: 0.55rem 0.65rem;
  font-size: 0.88rem;
  border: 1px solid transparent;
}

.menu-link:hover {
  background: #1e293b;
  border-color: #334155;
}

.menu-link.router-link-active {
  background: #dbeafe;
  color: #1d4ed8;
  border-color: #93c5fd;
  font-weight: 600;
}

.sidebar-footer {
  font-size: 0.72rem;
  color: #64748b;
  border-top: 1px solid #1e293b;
  padding-top: 0.7rem;
}

.logout-btn {
  margin-top: 0.55rem;
  width: 100%;
  border: 1px solid #334155;
  background: #0f172a;
  color: #cbd5e1;
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
  font-size: 0.78rem;
  cursor: pointer;
}

.logout-btn:hover {
  background: #1e293b;
  color: #fff;
}

.workspace-login {
  min-height: 100vh;
  background: linear-gradient(180deg, #eef2f5 0%, #e7edf2 100%);
}

.workspace {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
}

.workspace-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.85rem 1.15rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.8rem;
}

.workspace-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.workspace-header span {
  font-size: 0.8rem;
  color: #64748b;
}

.workspace-content {
  padding: 1rem;
  min-width: 0;
  background: transparent;
}

:deep(.modal-overlay),
:deep(.confirm-overlay),
:deep(.kpi-detail-overlay) {
  z-index: 3000 !important;
}

:deep(.modal-content),
:deep(.confirm-modal),
:deep(.kpi-detail-modal) {
  position: relative;
  z-index: 3001;
}

.menu-toggle {
  margin-bottom: 0.85rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 9px;
  padding: 0.45rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.menu-toggle:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}

@media (max-width: 960px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    grid-template-rows: auto auto;
    position: relative;
    top: 0;
    height: auto;
    overflow: visible;
  }
  .sidebar-footer {
    display: none;
  }
  .menu {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-content: start;
  }
}

@media (max-width: 620px) {
  .menu {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-content: start;
  }
  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
