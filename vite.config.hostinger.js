// Config de build para hospedagem externa (Hostinger, Vercel, Netlify, cPanel...).
// Igual à config padrão, mas SEM o plugin do Base44 (que só serve ao editor/preview
// da plataforma e não deve ir para produção própria).
//
// Build:  npx vite build --config vite.config.hostinger.js
// Saída:  dist/  → enviar o conteúdo para public_html na Hostinger
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

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