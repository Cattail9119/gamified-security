import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — щоб статична збірка працювала з будь-якого шляху (GitHub Pages тощо)
export default defineConfig({
  base: './',
  plugins: [react()],
  // Явно IPv4: інакше на Windows сервер може слухати лише [::1], і localhost у браузері не відкривається
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
});
