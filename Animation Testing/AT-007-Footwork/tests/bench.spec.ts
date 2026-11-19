import { expect, test } from '@playwright/test';

// Smoke checks for the bench page itself. The footwork engine is covered by tests/footwork-*.test.ts.
declare global { interface Window { __footwork: any } }

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto('/');
  await page.waitForFunction(() => window.__footwork?.info.bones > 0);
  expect(errors).toEqual([]);
});

test('the bench hosts the game knight and offers every guard', async ({ page }) => {
  expect(await page.evaluate(() => window.__footwork.info.bones)).toBeGreaterThanOrEqual(55);
  await expect(page.locator('#guards button')).toHaveCount(3);
  await expect(page.locator('#hud')).toContainText('En garde');
});

test('holding W walks forward in real time and letting go stops in guard', async ({ page }) => {
  await page.evaluate(() => window.__footwork.toggle('wall', false));
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__footwork.info.root.z < -0.6);
  await page.keyboard.up('KeyW');
  await page.waitForFunction(() => window.__footwork.info.move === null);
  const state = await page.evaluate(() => ({ feet: window.__footwork.fw.state.feet, homes: window.__footwork.fw.homes() }));
  for (const i of [0, 1]) expect(Math.hypot(state.feet[i].x - state.homes[i].x, state.feet[i].z - state.homes[i].z)).toBeLessThan(0.061);
});

test('a guard key pressed in the middle of a lunge interrupts it and forms that guard', async ({ page }) => {
  await page.evaluate(() => { const b = window.__footwork; b.setPaused(true); b.fw.lunge(1); b.run(16); });
  expect(await page.evaluate(() => window.__footwork.info.move)).toBe('Lunge');
  await page.keyboard.press('Digit2');
  expect(await page.evaluate(() => window.__footwork.info.move)).toContain('Guard');
  await page.evaluate(() => window.__footwork.run(9));
  const info = await page.evaluate(() => window.__footwork.info);
  expect(info.stance).toBe('low');
  expect(info.guard).toMatch(/^1[0-5]\d ms from lunge$/);
  await expect(page.locator('#hud')).toContainText('Low guard');
});

test('the timeline scrubs back to an earlier moment and play continues from there', async ({ page }) => {
  await page.evaluate(() => { const b = window.__footwork; b.toggle('wall', false); b.setPaused(true); b.held.add('KeyW'); b.run(90); b.held.delete('KeyW'); });
  const end = await page.evaluate(() => window.__footwork.info.root.z);
  expect(end).toBeLessThan(-1);
  await page.evaluate(() => { window.__footwork.show(30); window.__footwork.frame(); });
  const earlier = await page.evaluate(() => window.__footwork.info);
  expect(earlier.root.z).toBeGreaterThan(end + 0.5);
  expect(earlier.cursor).toBe(30);
  await page.evaluate(() => window.__footwork.run(5));
  expect(await page.evaluate(() => window.__footwork.info.history)).toBe(36);
});
