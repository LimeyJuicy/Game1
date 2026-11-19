import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The bench imports the real knight and the footwork engine from the game's
// src/ folder, which sits outside this page's root.
export default defineConfig({
  server: { fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
