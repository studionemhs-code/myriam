import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Config principal — sem o plugin do Base44 (apenas React + alias @/).
// Build:  npm run build  →  dist/  →  enviar conteúdo para public_html na Hostinger
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1600
  }
});