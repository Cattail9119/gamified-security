import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — щоб статична збірка працювала з будь-якого шляху (GitHub Pages тощо)
export default defineConfig({
  base: './',
  plugins: [react()],
});
