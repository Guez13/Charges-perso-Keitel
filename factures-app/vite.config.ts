import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PWA is wired manually (public/manifest.webmanifest + src/sw/service-worker.ts)
// to keep the toolchain minimal — "le simple qui marche".
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
