import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Usar base relativa './' permite que funcione en Vercel (raíz) y GitHub Pages (subcarpeta)
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});