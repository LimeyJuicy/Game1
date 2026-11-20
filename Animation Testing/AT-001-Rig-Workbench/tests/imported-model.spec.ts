import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test('supplied GLB is the default static model with embedded materials and no motion UI', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#stats')).toContainText('Player knight · supplied GLB', { timeout: 30000 });
  await expect(page.locator('#stats')).toContainText('1 meshes · 0 skinned');
  const state = () => page.evaluate(() => (window as any).__rigWorkbench);
  const initial = await state();
  expect(initial.sourceReference).toBe('imported-knight'); expect(initial.playing).toBe(false); expect(initial.clips).toBe(0); expect(initial.selected).toBe('-1'); expect(initial.skeletons).toBe(0);
  for (const id of ['clip', 'play', 'timeline', 'speed', 'leg-panel', 'skeleton']) await expect(page.locator(`#${id}`)).toBeHidden();
  for (const [label, name] of [['Front','front'],['¾ view','three-quarter'],['Upper body','upper']] as const) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`../reports/imported-knight-${name}.png`, import.meta.url)) });
  }
  expect((await state()).time).toBe(0);
  await page.locator('#wireframe').check(); await page.locator('#wireframe').uncheck();
  expect(errors).toEqual([]);
});
