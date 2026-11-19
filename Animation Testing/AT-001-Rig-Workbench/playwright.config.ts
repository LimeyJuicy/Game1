import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 1100, height: 760 },
    launchOptions: { channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run rig:dev', cwd: fileURLToPath(new URL('../..', import.meta.url)), url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI },
});
