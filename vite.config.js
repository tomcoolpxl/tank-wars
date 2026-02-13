import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0, // Ensure assets are always separate files if needed, or keep default
  },
  server: {
    host: true
  }
});
