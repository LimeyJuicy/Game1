import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// The experimental ?footwork flag (AT-007). Without the flag the game must be untouched.
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page, flag: boolean) {
  await page.goto(`/?debug&quality=low${flag ? '&footwork' : ''}`);
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}

test('without the flag the footwork system is not created and the guard key cannot cancel a committed swing', async ({ page }) => {
  await begin(page, false);
  expect((await state(page)).footwork).toBeNull();
  await page.keyboard.press('KeyJ');
  await expect.poll(async () => (await state(page)).attack?.phase, { intervals: [5] }).toBe('swing');
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(50);
  expect((await state(page)).attack).not.toBeNull();
  await page.keyboard.up('KeyE');
});

test('with the flag the footwork legs take over while engaged and stand in guard', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page, true);
  await expect.poll(async () => (await state(page)).footwork.weight, { timeout: 15000, intervals: [20] }).toBeGreaterThan(0.98);
  const engaged = (await state(page)).footwork;
  expect(engaged.stance).toBe('engarde');
  expect(engaged.hipHeight).toBeGreaterThan(0.8); expect(engaged.hipHeight).toBeLessThan(0.84);
  // Strafing: the feet step to keep up, and planted feet stay where they were put.
  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await state(page)).footwork.move, { intervals: [10] }).toMatch(/Step/);
  const speeds: number[] = [];
  for (let i = 0; i < 20; i++) { speeds.push((await state(page)).actualSpeed); await page.waitForTimeout(25); }
  await page.keyboard.up('KeyD');
  expect(Math.max(...speeds)).toBeLessThan(1.3);
  expect(Math.max(...speeds)).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

test('with the flag the guard key interrupts a swing in progress and the guard forms', async ({ page }) => {
  await begin(page, true);
  await expect.poll(async () => (await state(page)).footwork.weight, { timeout: 15000, intervals: [20] }).toBeGreaterThan(0.98);
  await page.keyboard.press('KeyJ');
  await expect.poll(async () => (await state(page)).attack?.phase, { intervals: [5] }).toBe('swing');
  expect((await state(page)).footwork.move).toMatch(/Lunge|Thrust/);
  await page.keyboard.down('KeyE');
  await expect.poll(async () => (await state(page)).attack, { intervals: [5] }).toBeNull();
  await expect.poll(async () => (await state(page)).defense.blocking, { intervals: [5] }).toBe(true);
  await expect.poll(async () => { const s = (await state(page)).footwork; return s.stance === 'low' && s.move === null && s.feet.every((foot: any) => foot.planted); }, { timeout: 2000, intervals: [10] }).toBe(true);
  expect(Math.abs((await state(page)).footwork.hipHeight - 0.72)).toBeLessThan(0.02);
  await page.keyboard.up('KeyE');
  await expect.poll(async () => (await state(page)).footwork.stance, { intervals: [10] }).toBe('engarde');
});
