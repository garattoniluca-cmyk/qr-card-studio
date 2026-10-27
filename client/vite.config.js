import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.dirname(fileURLToPath(import.meta.url));
// Porta del backend in sviluppo (non si usa PORT, che alcuni launcher impostano per Vite stesso).
const backend = `http://127.0.0.1:${process.env.API_PORT || 8080}`;

export default defineConfig({
  root,
  plugins: [react()],
  resolve: { alias: { '@shared': path.resolve(root, '../shared') } },
  server: {
    host: true,
    port: Number(process.env.VITE_PORT || 5173),
    strictPort: true,
    fs: { allow: [path.resolve(root, '..')] },
    proxy: {
      '/api': { target: backend, changeOrigin: false },
      '/uploads': { target: backend, changeOrigin: false },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
});
