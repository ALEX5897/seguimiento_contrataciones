<template>
  <div v-if="esLogin" class="workspace-login">
    <router-view />
  </div>

  <div v-else class="app-shell" :class="{ 'menu-hidden': !menuVisible }">
    <aside class="sidebar" v-if="auth.isAuthenticated">
      <div class="brand">
        <div class="brand-icon">
          <img :src="logoQt" alt="Quito Turismo" class="brand-logo" />
        </div>
        <div>
          <h1>Seguimiento POA</h1>
          <p>QUITO TURISMO</p>
        </div>
      </div>

      <nav class="menu">
        <router-link to="/" class="menu-link">Dashboard</router-link>
        <router-link to="/actividades" class="menu-link">Procesos</router-link>
        <router-link to="/reportes" class="menu-link">Reportes</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/actividades" class="menu-link">Admin Procesos</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/versiones" class="menu-link">Admin Versiones</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/usuarios" class="menu-link">Admin Usuarios</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/catalogos" class="menu-link">Admin Catálogos</router-link>
      </nav>

      <div class="sidebar-footer">
        <div>{{ auth.user?.nombre || 'Usuario' }} · {{ auth.user?.role || '-' }}</div>
        <button type="button" class="logout-btn" @click="cerrarSesion">Cerrar sesión</button>
      </div>
    </aside>

    <div class="workspace">
      <main class="workspace-content">
        <button type="button" class="menu-toggle" @click="menuVisible = !menuVisible">
          {{ menuVisible ? 'Ocultar menú' : 'Desplegar menú' }}
        </button>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import logoQt from './assets/logoqt.png';

const menuVisible = ref(true);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const esLogin = computed(() => route.path === '/login');

function cerrarSesion() {
  auth.clearSession();
  router.replace('/login');
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 250px 1fr;
  background: #f1f5f9;
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
  /* Fixed: stays in place while content scrolls */
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
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
  background: #f1f5f9;
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
  }

  .sidebar-footer {
    display: none;
  }

  .menu {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .menu {
    grid-template-columns: 1fr;
  }

  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
