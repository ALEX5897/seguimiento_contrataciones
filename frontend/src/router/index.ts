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
      meta: { requiresAuth: true }
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
      meta: { requiresAuth: true }
    },
    {
      path: '/reportes',
      name: 'reportes',
      component: () => import('../views/Reportes.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/actividades',
      name: 'admin-actividades',
      component: () => import('../views/AdminActividades.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/admin/versiones',
      name: 'admin-versiones',
      component: () => import('../views/AdminVersiones.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/admin/usuarios',
      name: 'admin-usuarios',
      component: () => import('../views/AdminUsuarios.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
    },
    {
      path: '/admin/catalogos',
      name: 'admin-catalogos',
      component: () => import('../views/AdminCatalogos.vue'),
      meta: { requiresAuth: true, roles: ['admin'] }
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

  if (to.meta.public) {
    if (auth.isAuthenticated && to.path === '/login') return '/';
    return true;
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  const roles = (to.meta.roles as string[] | undefined) || [];
  if (roles.length && auth.role && !roles.includes(auth.role)) {
    return '/actividades';
  }

  return true;
});

export default router;
