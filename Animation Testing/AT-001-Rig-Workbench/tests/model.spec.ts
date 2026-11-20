import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test('model review opens the actual knight, hides motion tools and stays still', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?model=legacy');
  await expect(page.getByRole('heading', { name: 'Knight model', exact: true })).toBeVisible();
  await expect(page.locator('#stats')).toContainText('Silver and red knight');
  for (const id of ['clip', 'timeline', 'play', 'restart', 'speed', 'leg-panel', 'reference', 'skeleton']) await expect(page.locator(`#${id}`)).toBeHidden();
  const before = await page.evaluate(() => (window as any).__rigWorkbench);
  expect(before.mode).toBe('model'); expect(before.playing).toBe(false); expect(before.selected).toBe('-1');
  expect(before.sourceReference).toBe('knight');
  await page.evaluate(() => new Promise<void>(resolve => { let frames = 0; const tick = () => ++frames >= 30 ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); }));
  expect((await page.evaluate(() => (window as any).__rigWorkbench)).time).toBe(0);
  for (const [view, label] of [['front', 'Front'], ['side', 'Side'], ['back', 'Back'], ['three-quarter', '¾ view']] as const) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.screenshot({ path: fileURLToPath(new URL(`../reports/knight-model-${view}.png`, import.meta.url)) });
  }
  await page.getByRole('button', { name: 'Upper body', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/knight-model-upper.png', import.meta.url)) });
  await page.locator('#wireframe').check(); await page.locator('#wireframe').uncheck();
  await page.mouse.move(730, 350); await page.mouse.down(); await page.mouse.move(830, 380, { steps: 8 }); await page.mouse.up();
  expect(await page.locator('aside').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});
