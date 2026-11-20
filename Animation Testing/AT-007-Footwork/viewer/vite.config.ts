import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The bench imports the real knight and the footwork engine from the game's
// src/ folder, which sits outside this page's root.
export default defineConfig({
  cacheDir: fileURLToPath(new URL('../../../node_modules/.vite-footwork', import.meta.url)),
  publicDir: fileURLToPath(new URL('../../AT-001-Rig-Workbench/viewer/public', import.meta.url)),
  build: { outDir: 'dist', emptyOutDir: true, target: 'esnext' },
  server: { fs: { allow: [fileURLToPath(new URL('../../..', import.meta.url))] } },
});
