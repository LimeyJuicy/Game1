import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5175', viewport: { width: 1400, height: 860 },
    launchOptions: { channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: { command: 'npm run footwork:dev', cwd: fileURLToPath(new URL('../..', import.meta.url)), url: 'http://127.0.0.1:5175', reuseExistingServer: !process.env.CI },
});
