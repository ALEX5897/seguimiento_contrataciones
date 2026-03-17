import { defineStore } from 'pinia';
import api from '../services/api';

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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: (() => {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
    })() as UsuarioSesion | null,
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
    setSession(token: string, user: UsuarioSesion) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clearSession() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    async login(username: string, password: string) {
      this.loading = true;
      try {
        const response = await api.post('/auth/login', { username, password });
        this.setSession(response.data.token, response.data.user);
        return response.data.user as UsuarioSesion;
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      if (!this.token) return null;
      try {
        const response = await api.get('/auth/me');
        const user = response.data as UsuarioSesion;
        this.user = user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      } catch {
        this.clearSession();
        return null;
      }
    }
  }
});
