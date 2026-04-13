<template>
  <div v-if="esLogin" class="workspace-login">
    <router-view />
  </div>

  <div v-else class="app-shell">
    <div
      v-if="menuVisible && isMobile"
      class="mobile-overlay"
      @click="menuVisible = false"
    />

    <aside
      v-if="auth.isAuthenticated"
      class="sidebar"
      :class="{ 'sidebar-visible': menuVisible }"
    >
      <div class="sidebar-header">
        <div class="brand-row">
          <div class="brand-logo-wrap">
            <img :src="logoQt" class="brand-logo" alt="Logo Quito Turismo" />
          </div>
          <div class="brand-copy">
            <h1>Seguimiento</h1>
            <p>Quito Turismo</p>
          </div>
        </div>
      </div>

      <nav class="menu-container">
        <div class="menu-section">
          <small class="section-title">Principal</small>
          <router-link
            v-for="item in mainMenuItems"
            :key="item.key"
            :to="item.to"
            class="menu-link"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </div>

        <div v-if="adminMenuItems.length" class="menu-section">
          <small class="section-title">Administracion</small>
          <router-link
            v-for="item in adminMenuItems"
            :key="item.key"
            :to="item.to"
            class="menu-link"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-profile">
          <div class="user-avatar">
            {{ auth.user?.nombre?.charAt(0) || 'U' }}
          </div>
          <div class="user-meta">
            <div class="user-name">{{ auth.user?.nombre || 'Usuario' }}</div>
            <div class="user-role">{{ auth.user?.role || '-' }}</div>
          </div>
        </div>

        <div class="footer-meta">
          <span class="version-badge">{{ APP_VERSION }}</span>
          <button class="logout-btn" @click="cerrarSesion">
            <i class="ri-logout-box-r-line"></i>
            <span>Cerrar sesion</span>
          </button>
        </div>
      </div>
    </aside>

    <div class="workspace">
      <header class="workspace-navbar">
        <div class="navbar-left">
          <button class="menu-trigger" @click="menuVisible = !menuVisible">
            <i class="ri-menu-line"></i>
          </button>

          <div class="navbar-title-block">
            <div class="navbar-heading-row">
              <i :class="[currentModuleIcon, 'title-icon']" aria-hidden="true"></i>
              <h2>
                <span>{{ route.name || 'Panel de Control' }}</span>
              </h2>
            </div>
          </div>
        </div>

        <div class="navbar-right">
          <div class="navbar-date-circle" aria-live="polite" aria-label="Fecha actual">
            <i class="ri-calendar-event-line" aria-hidden="true"></i>
            <span>{{ fechaActual }}</span>
          </div>
        </div>
      </header>

      <main class="workspace-content">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

interface MenuItem {
  key: string
  to: string
  label: string
  icon: string
  isAdmin?: boolean
}

const APP_VERSION = 'v1.0.6'
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
/////////////LOGO/////////////
const logoQt = 'https://www.quito.gob.ec/wp-content/uploads/2024/02/POST-BASE-DMQ-19.png'

const viewportWidth = ref(window.innerWidth)
const menuVisible = ref(window.innerWidth > 900)
const fechaActual = ref('')

let inactivityTimer: number | undefined
let dateRefreshTimer: number | undefined

const formateadorFecha = new Intl.DateTimeFormat('es-EC', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

const menuConfig: MenuItem[] = [
  { key: 'dashboard', to: '/', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { key: 'actividades', to: '/actividades', label: 'Procesos', icon: 'ri-refresh-line' },
  { key: 'reportes', to: '/reportes', label: 'Reportes', icon: 'ri-bar-chart-line' },
  { key: 'notificaciones', to: '/notificaciones', label: 'Notificaciones', icon: 'ri-notification-3-line' },
  { key: 'admin_actividades', to: '/admin/actividades', label: 'Admin Procesos', icon: 'ri-settings-3-line', isAdmin: true },
  { key: 'admin_versiones', to: '/admin/versiones', label: 'Versiones', icon: 'ri-price-tag-3-line', isAdmin: true },
  { key: 'admin_usuarios', to: '/admin/usuarios', label: 'Usuarios', icon: 'ri-user-3-line', isAdmin: true },
  { key: 'admin_catalogos', to: '/admin/catalogos', label: 'Catalogos', icon: 'ri-folder-2-line', isAdmin: true },
  { key: 'admin_permisos', to: '/admin/permisos', label: 'Permisos', icon: 'ri-lock-2-line', isAdmin: true },
  { key: 'admin_auditoria', to: '/admin/auditoria', label: 'Auditoria', icon: 'ri-shield-check-line', isAdmin: true }
]

const esLogin = computed(() => route.path === '/login')
const isMobile = computed(() => viewportWidth.value <= 900)
const filteredMenu = computed(() => menuConfig.filter((item) => auth.canAccessMenu(item.key)))
const mainMenuItems = computed(() => filteredMenu.value.filter((item) => !item.isAdmin))
const adminMenuItems = computed(() => filteredMenu.value.filter((item) => item.isAdmin))
const currentModuleIcon = computed(() => {
  const byPath = menuConfig.find((item) => item.to === route.path)
  if (byPath) return byPath.icon

  const byPrefix = menuConfig
    .filter((item) => item.to !== '/')
    .find((item) => route.path.startsWith(item.to))
  return byPrefix?.icon || 'ri-dashboard-line'
})

function actualizarFecha() {
  fechaActual.value = formateadorFecha.format(new Date())
}

function iniciarActualizacionFecha() {
  actualizarFecha()
  dateRefreshTimer = window.setInterval(actualizarFecha, 60 * 1000)
}

function detenerActualizacionFecha() {
  if (dateRefreshTimer !== undefined) {
    window.clearInterval(dateRefreshTimer)
    dateRefreshTimer = undefined
  }
}

async function cerrarSesion() {
  await auth.logout()
  clearInactivityTimer()
  router.replace('/login')
}

function clearInactivityTimer() {
  if (inactivityTimer !== undefined) {
    window.clearTimeout(inactivityTimer)
    inactivityTimer = undefined
  }
}

async function manejarInactividad() {
  if (!auth.isAuthenticated) return
  await auth.logout()
  await router.replace('/login')
  alert('Sesion cerrada por inactividad.')
}

function scheduleInactivityTimer() {
  clearInactivityTimer()
  if (!auth.isAuthenticated) return

  inactivityTimer = window.setTimeout(() => {
    void manejarInactividad()
  }, INACTIVITY_LIMIT_MS)
}

function onUserActivity() {
  scheduleInactivityTimer()
}

function onResize() {
  viewportWidth.value = window.innerWidth
  if (!isMobile.value) {
    menuVisible.value = true
  }
}

const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const

onMounted(async () => {
  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      // El store gestiona el estado de sesion si fetchMe falla
    }
  }

  iniciarActualizacionFecha()
  scheduleInactivityTimer()

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, onUserActivity, { passive: true })
  })
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  detenerActualizacionFecha()
  clearInactivityTimer()

  activityEvents.forEach((eventName) => {
    window.removeEventListener(eventName, onUserActivity)
  })
  window.removeEventListener('resize', onResize)
})

watch(
  () => route.path,
  () => {
    if (isMobile.value) {
      menuVisible.value = false
    }
  }
)

watch(
  () => auth.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      scheduleInactivityTimer()
    } else {
      clearInactivityTimer()
    }
  }
)

watch(isMobile, (mobile) => {
  if (!mobile) {
    menuVisible.value = true
  }
})
</script>

<style>
@import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --sidebar-width: 204px;
  --sidebar-bg-top: #0b1122;
  --sidebar-bg-bottom: #0b1122;
  --accent-blue: #3b82f6;
  --accent-cyan: #0ea5e9;
  --surface-border: #e1e8f2;
  --surface-bg-top: #ffffff;
  --surface-bg-mid: #ffffff;
  --surface-bg-bottom: #ffffff;
  --text-main: #0f2f55;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', sans-serif;
  background: #f1f3f7;
  color: #0f172a;
}

.workspace-login {
  min-height: 100vh;
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  z-index: 40;
  display: flex;
  flex-direction: column;
  color: #e9f1fb;
  background: linear-gradient(180deg, var(--sidebar-bg-top), var(--sidebar-bg-bottom));
  border-right: 1px solid rgba(148, 186, 224, 0.28);
  box-shadow: 8px 0 26px rgba(7, 21, 38, 0.28);
}

.sidebar-header {
  padding: 0.95rem 0.78rem 0.8rem;
  border-bottom: 1px solid rgba(148, 186, 224, 0.25);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.brand-logo-wrap {
  width: 42px;
  min-width: 42px;
  height: 42px;
  border-radius: 10px;
  padding: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: none;
}

.brand-copy h1 {
  margin: 0;
  font-size: 0.88rem;
  color: #ffffff;
  line-height: 1.1;
}

.brand-copy p {
  margin: 0.12rem 0 0;
  font-size: 0.67rem;
  color: #ffffff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.menu-container {
  flex: 1;
  padding: 0.75rem;
  overflow-y: auto;
}

.menu-container::-webkit-scrollbar {
  width: 6px;
}

.menu-container::-webkit-scrollbar-thumb {
  background: #31455f;
  border-radius: 10px;
}

.menu-section + .menu-section {
  margin-top: 0.8rem;
}

.section-title {
  display: inline-block;
  margin-bottom: 0.45rem;
  font-size: 0.62rem;
  color: #ffffff;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.56rem;
  border-radius: 10px;
  color: #ffffff;
  font-size: 0.81rem;
  font-weight: 500;
  text-decoration: none;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.menu-link i {
  font-size: 0.96rem;
}

.menu-link:hover {
  background: rgba(183, 217, 250, 0.18);
  transform: translateX(2px);
}

.menu-link.router-link-active {
  color: #ffffff;
  font-weight: 700;
  background: linear-gradient(90deg, #2f7bd7, #3f93ea);
  box-shadow: inset 3px 0 0 #7ec2ff;
}

.sidebar-footer {
  padding: 0.72rem 0.75rem 0.84rem;
  border-top: 1px solid rgba(148, 186, 224, 0.25);
  background: linear-gradient(180deg, rgba(9, 30, 53, 0.5), rgba(6, 22, 40, 0.68));
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.64rem;
  margin-bottom: 0.72rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #3f93ea, #64b6ff);
  box-shadow: 0 4px 12px rgba(78, 164, 244, 0.35);
}

.user-meta {
  min-width: 0;
}

.user-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.68rem;
  color: #ffffff;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.55rem;
}

.version-badge {
  font-size: 0.68rem;
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 186, 224, 0.35);
  background: rgba(255, 255, 255, 0.08);
}

.logout-btn {
  height: 33px;
  padding: 0 0.65rem;
  border: 1px solid rgba(248, 113, 113, 0.55);
  border-radius: 9px;
  color: #ffe0e0;
  background: linear-gradient(135deg, rgba(132, 35, 35, 0.42), rgba(224, 82, 82, 0.28));
  font-size: 0.76rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.logout-btn:hover {
  border-color: rgba(248, 113, 113, 0.78);
  background: linear-gradient(135deg, rgba(148, 37, 37, 0.5), rgba(239, 98, 98, 0.36));
}

.logout-btn:active {
  transform: translateY(1px);
}

.workspace {
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
}

.workspace-navbar {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1.05rem;
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(4px);
  border-bottom: 1px solid var(--surface-border);
  background: linear-gradient(100deg, var(--surface-bg-top) 0%, var(--surface-bg-mid) 55%, var(--surface-bg-bottom) 100%);
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.menu-trigger {
  width: 32px;
  height: 32px;
  border: 1px solid #c7d8ee;
  border-radius: 10px;
  color: var(--text-main);
  background: #ffffff;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.menu-trigger:hover {
  border-color: #a9c3e5;
  background: #edf4ff;
}

.navbar-title-block {
  min-width: 0;
}

.navbar-heading-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.workspace-navbar h2 {
  margin: 0;
  color: var(--text-main);
  font-size: 1.01rem;
  font-weight: 700;
  white-space: nowrap;
}

.title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1px solid #dbe7f5;
  background: linear-gradient(180deg, #ffffff, #eef4ff);
  color: #1f4f83;
  font-size: 0.9rem;
}

.navbar-right {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.navbar-date-circle {
  height: 34px;
  min-width: 180px;
  border-radius: 999px;
  border: 1px solid #d4e1f2;
  background: linear-gradient(180deg, #ffffff, #eef4ff);
  color: #194a7e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  text-align: left;
  padding: 0 0.7rem;
  box-shadow: 0 4px 10px rgba(30, 74, 126, 0.12);
}

.navbar-date-circle i {
  font-size: 0.82rem;
}

.navbar-date-circle span {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  text-transform: capitalize;
  white-space: nowrap;
}

.workspace-content {
  padding: 1rem 1.1rem 1.25rem;
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.45);
  z-index: 30;
}

@media (max-width: 900px) {
  .sidebar {
    left: calc(-1 * var(--sidebar-width));
    transition: left 0.22s ease;
  }

  .sidebar.sidebar-visible {
    left: 0;
  }

  .workspace {
    margin-left: 0;
  }

  .workspace-navbar {
    padding: 0.58rem 0.85rem;
  }

  .navbar-date-circle {
    display: none;
  }

}

@media (max-width: 640px) {
  .workspace-navbar h2 {
    font-size: 0.9rem;
  }

  .workspace-content {
    padding: 0.9rem 0.85rem 1rem;
  }

}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>