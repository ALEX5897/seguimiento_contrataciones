import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, permissionModule: 'dashboard', permissionAction: 'read', menuKey: 'dashboard' }
    },
    {
      path: '/tareas',
      redirect: '/actividades'
    },
    {
      path: '/tareas/:id',
      redirect: '/actividades'
    },
    {
      path: '/actividades',
      name: 'actividades',
      component: () => import('../views/Actividades.vue'),
      meta: { requiresAuth: true, permissionModule: 'actividades', permissionAction: 'read', menuKey: 'actividades' }
    },
    {
      path: '/reportes',
      name: 'reportes',
      component: () => import('../views/Reportes.vue'),
      meta: { requiresAuth: true, permissionModule: 'reportes', permissionAction: 'read', menuKey: 'reportes' }
    },
    {
      path: '/informes',
      name: 'informes',
      component: () => import('../views/Informes.vue'),
      meta: { requiresAuth: true, permissionModule: 'reportes', permissionAction: 'read', menuKey: 'reportes' }
    },
    {
      path: '/notificaciones',
      name: 'notificaciones',
      component: () => import('../views/AdminNotificaciones.vue'),
      meta: { requiresAuth: true, permissionModule: 'notificaciones', permissionAction: 'read', menuKey: 'notificaciones' }
    },
    {
      path: '/chat-ia',
      name: 'chat-ia',
      component: () => import('../views/ChatIA.vue'),
      meta: { requiresAuth: true, permissionModule: 'chat_ia', permissionAction: 'read', menuKey: 'chat_ia' }
    },
    {
      path: '/admin/actividades',
      name: 'admin-actividades',
      component: () => import('../views/AdminActividades.vue'),
      meta: { requiresAuth: true, permissionModule: 'admin_actividades', permissionAction: 'read', menuKey: 'admin_actividades' }
    },
    {
      path: '/admin/carga-masiva',
      name: 'carga-masiva',
      // @ts-expect-error CargaMasiva.vue usa <script setup> sin lang="ts", pendiente de tipar
      component: () => import('../views/CargaMasiva.vue'),
      meta: { requiresAuth: true, permissionModule: 'admin_actividades', permissionAction: 'create' }
    },
    // Versiones module temporarily hidden - will be handled later
    // {
    //   path: '/admin/versiones',
    //   name: 'admin-versiones',
    //   component: () => import('../views/AdminVersiones.vue'),
    //   meta: { requiresAuth: true, permissionModule: 'admin_versiones', permissionAction: 'read', menuKey: 'admin_versiones' }
    // },
    {
      path: '/admin/usuarios',
      name: 'admin-usuarios',
      component: () => import('../views/AdminUsuarios.vue'),
      meta: { requiresAuth: true, permissionModule: 'admin_usuarios', permissionAction: 'read', menuKey: 'admin_usuarios' }
    },
    {
      path: '/admin/catalogos',
      name: 'admin-catalogos',
      component: () => import('../views/AdminCatalogos.vue'),
      meta: { requiresAuth: true, permissionModule: 'admin_catalogos', permissionAction: 'read', menuKey: 'admin_catalogos' }
    },
    {
      path: '/admin/permisos',
      name: 'admin-permisos',
      component: () => import('../views/AdminPermisos.vue'),
      meta: { requiresAuth: true, permissionModule: 'admin_permisos', permissionAction: 'read', menuKey: 'admin_permisos' }
    },
    {
      path: '/admin/auditoria',
      name: 'admin-auditoria',
      component: () => import('../views/AdminAuditoria.vue'),
      meta: { requiresAuth: true, permissionModule: 'admin_auditoria', permissionAction: 'read', menuKey: 'admin_auditoria' }
    },
    {
      path: '/subtareas',
      redirect: '/actividades'
    }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.user && auth.token) {
    await auth.fetchMe();
  }

  // Allow public routes (login)
  if (to.meta.public) {
    if (auth.isAuthenticated && to.path === '/login') {
      return '/actividades';
    }
    return true;
  }

  // Check authentication only
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // Permission checks disabled for now - allow all authenticated users to access all routes
  // TODO: Re-enable permission checks after login flow is stable

  return true;
});

export default router;
