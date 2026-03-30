import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy to the 3D-Mapping API running on :4000
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/assets': { target: API_TARGET, changeOrigin: true },
      '/socket.io': { target: API_TARGET, ws: true, changeOrigin: true },
    },
  },
});
