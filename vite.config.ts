
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/cotizador-sergio/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
