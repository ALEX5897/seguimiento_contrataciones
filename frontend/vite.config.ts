import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    host: '172.16.1.72',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://172.16.1.72:3000',
        changeOrigin: true,
      },
    },
  },
})
