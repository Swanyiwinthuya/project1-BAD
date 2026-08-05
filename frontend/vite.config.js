import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/campusfix/',
  server: {
    port: 5173,
    proxy: {
      '/campusfix/api': 'http://127.0.0.1:3100'
    }
  }
});

