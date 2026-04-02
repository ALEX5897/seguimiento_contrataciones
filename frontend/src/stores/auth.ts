import { defineStore } from 'pinia';
import api, { authService } from '../services/api';
import type { PermisosAcciones, PermisosSesion } from '../services/api';

export type RolUsuario = 'admin' | 'direccion' | 'reporteria';

export interface UsuarioSesion {
  id: number;
  username: string;
  nombre: string;
  role: RolUsuario;
  direccionNombre?: string | null;
  activo?: boolean;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const PERMISSIONS_KEY = 'auth_permissions';

const EMPTY_ACTIONS: PermisosAcciones = {
  read: false,
  create: false,
  update: false,
  delete: false
};

function readPermissionsFromStorage(): PermisosSesion {
  const raw = localStorage.getItem(PERMISSIONS_KEY);
  if (!raw) return { role: '', modulos: {}, menu: {} };

  try {
    const parsed = JSON.parse(raw) as Partial<PermisosSesion>;
    return {
      role: String(parsed.role || ''),
      modulos: parsed.modulos && typeof parsed.modulos === 'object' ? parsed.modulos : {},
      menu: parsed.menu && typeof parsed.menu === 'object' ? parsed.menu : {}
    };
  } catch {
    return { role: '', modulos: {}, menu: {} };
  }
}

function normalizeMePayload(payload: any): { user: UsuarioSesion; permisos: PermisosSesion } {
  const user: UsuarioSesion = {
    id: Number(payload?.id),
    username: String(payload?.username || ''),
    nombre: String(payload?.nombre || ''),
    role: payload?.role as RolUsuario,
    direccionNombre: payload?.direccionNombre ?? null,
    activo: payload?.activo
  };

  const permisos = payload?.permisos as PermisosSesion | undefined;
  return {
    user,
    permisos: permisos || { role: user.role || '', modulos: {}, menu: {} }
  };
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: (() => {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
    })() as UsuarioSesion | null,
    permisos: readPermissionsFromStorage() as PermisosSesion,
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    role: (state) => state.user?.role || null,
    isAdmin: (state) => state.user?.role === 'admin',
    isDireccion: (state) => state.user?.role === 'direccion',
    isReporteria: (state) => state.user?.role === 'reporteria'
  },

  actions: {
    setSession(token: string, user: UsuarioSesion, permisos?: PermisosSesion) {
      this.token = token;
      this.user = user;
      this.permisos = permisos || { role: user.role || '', modulos: {}, menu: {} };
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(this.permisos));
    },

    clearSession() {
      this.token = '';
      this.user = null;
      this.permisos = { role: '', modulos: {}, menu: {} };
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(PERMISSIONS_KEY);
    },

    async logout() {
      try {
        if (this.token) {
          await authService.logout();
        }
      } catch (error) {
        console.error('No se pudo registrar logout en servidor:', error);
      } finally {
        this.clearSession();
      }
    },

    can(moduleKey: string, action: keyof PermisosAcciones = 'read') {
      const key = String(moduleKey || '').trim();
      if (!key) return false;
      const actions = this.permisos.modulos?.[key] || EMPTY_ACTIONS;
      return Boolean(actions[action]);
    },

    canAccessMenu(menuKey: string) {
      const key = String(menuKey || '').trim();
      if (!key) return false;
      return Boolean(this.permisos.menu?.[key]);
    },

    async login(username: string, password: string) {
      this.loading = true;
      try {
        const response = await api.post('/auth/login', { username, password });
        const permisos = (response.data?.permisos || { role: response.data?.user?.role || '', modulos: {}, menu: {} }) as PermisosSesion;
        this.setSession(response.data.token, response.data.user, permisos);
        return response.data.user as UsuarioSesion;
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      if (!this.token) return null;
      try {
        const response = await api.get('/auth/me');
        const normalized = normalizeMePayload(response.data);
        const user = normalized.user;
        this.user = user;
        this.permisos = normalized.permisos;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(normalized.permisos));
        return user;
      } catch {
        this.clearSession();
        return null;
      }
    }
  }
});
