import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page, pattern = 'normal', bearing = '0') {
  await page.goto('/?debug&quality=low');
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-pattern', pattern); await page.selectOption('#drill-bearing', bearing);
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}

test('held block stops a rear strike; a fresh timed parry restores guard', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page, 'normal', '180');
  await page.keyboard.down('KeyE');
  await expect.poll(async () => (await state(page)).defense.guard, { timeout: 20000, intervals: [20] }).toBe(76);
  expect((await state(page)).defense.health).toBe(100);
  await page.keyboard.up('KeyE');
  await expect.poll(async () => {
    const current = await state(page); return current.trainer.elapsed >= 0.88 && current.trainer.elapsed < 1.01;
  }, { timeout: 20000, intervals: [10] }).toBe(true);
  await page.keyboard.press('KeyE');
  await expect(page.locator('#feedback')).toHaveText(/PARRY/, { timeout: 10000 });
  expect((await state(page)).defense.health).toBe(100);
  expect((await state(page)).defense.guard).toBeGreaterThanOrEqual(98);
  await page.screenshot({ path: 'artifacts/defense-parry.png' });
  expect(errors).toEqual([]);
});

test('red front kicks bypass held block and shove the player into a stagger', async ({ page }) => {
  await begin(page, 'unblockable'); await page.keyboard.down('KeyE');
  await expect.poll(async () => (await state(page)).trainer.cue, { timeout: 15000, intervals: [20] }).toBe(true);
  await expect.poll(async () => (await state(page)).defense.health, { timeout: 15000, intervals: [20] }).toBe(70);
  expect((await state(page)).defense.mode).toBe('stagger');
});

test('Space steps backward, a second press rolls, and recovery stops the travel', async ({ page }) => {
  await page.goto('/?debug&quality=low'); await page.getByRole('button', { name: 'Begin', exact: true }).click();
  const initial = await state(page);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).defense.mode, { intervals: [10] }).toBe('dodge');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).defense.mode, { intervals: [10] }).toBe('roll');
  await expect.poll(async () => (await state(page)).defense.mode, { timeout: 10000, intervals: [20] }).toBe('free');
  const after = await state(page);
  expect(after.position.z - initial.position.z).toBeGreaterThan(2);
  expect(after.position.z - initial.position.z).toBeLessThan(4.1);
  const stopped = after.position;
  await page.waitForTimeout(250); expect((await state(page)).position).toEqual(stopped);
});

test('E cancels preparation but cannot cancel a committed swing', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await page.goto('/?debug&quality=low'); await page.clock.pauseAt(new Date('2026-11-18T12:01:00Z'));
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.keyboard.press('KeyK');
  await page.clock.runFor(32); expect((await state(page)).attack?.phase).toBe('preparation');
  await page.keyboard.down('KeyE');
  await page.clock.runFor(32); expect((await state(page)).attack).toBeNull();
  await page.keyboard.up('KeyE');
  await page.clock.runFor(400);
  await page.keyboard.press('KeyK');
  for (let i = 0; i < 80 && (await state(page)).attack?.phase !== 'swing'; i++) await page.clock.runFor(16);
  expect((await state(page)).attack?.phase).toBe('swing');
  await page.keyboard.down('KeyE');
  await page.clock.runFor(16);
  expect((await state(page)).attack).not.toBeNull();
  for (let i = 0; i < 80 && !(await state(page)).defense.blocking; i++) await page.clock.runFor(16);
  expect((await state(page)).defense.blocking).toBe(true);
  expect((await state(page)).attack).toBeNull();
});
