import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4020,
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:4110',
        changeOrigin: true,
      },
    },
  },
});