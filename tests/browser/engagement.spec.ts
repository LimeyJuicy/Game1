import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page) {
  await page.goto('/?debug&quality=low'); await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-pattern', 'normal');
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}
async function waitTime(page: Page, time: number) {
  const start = (await state(page)).gameTime;
  await expect.poll(async () => (await state(page)).gameTime - start, { timeout: 20000, intervals: [20] }).toBeGreaterThan(time);
}

test('locked movement strafes without turning away and the camera orbits with the fight', async ({ page }) => {
  await begin(page); const before = await state(page);
  await page.keyboard.down('KeyD'); await waitTime(page, 0.8); await page.keyboard.up('KeyD');
  const current = await state(page);
  expect(current.focus).toBe('trainer'); expect(current.position.x).toBeGreaterThan(before.position.x + 1);
  const desired = Math.atan2(current.position.x - current.trainer.x, current.position.z - current.trainer.z);
  expect(Math.abs(Math.atan2(Math.sin(current.facing - desired), Math.cos(current.facing - desired)))).toBeLessThan(0.15);
  expect(Math.abs(current.cameraYaw)).toBeGreaterThan(0.1);
  await page.screenshot({ path: 'artifacts/combat-lock-on.png' });
});

test('retreating draws the opponent forward to close distance', async ({ page }) => {
  await begin(page); const before = await state(page);
  await page.keyboard.down('KeyS'); await waitTime(page, 0.9); await page.keyboard.up('KeyS'); await page.keyboard.down('KeyE');
  await expect.poll(async () => (await state(page)).trainer.z, { timeout: 20000, intervals: [50] }).toBeGreaterThan(before.trainer.z + 1);
  await expect.poll(async () => {
    const current = await state(page); return Math.hypot(current.trainer.x - current.position.x, current.trainer.z - current.position.z);
  }, { timeout: 20000, intervals: [50] }).toBeLessThan(2.2);
  expect((await state(page)).focus).toBe('trainer');
});

test('enemy blocks early cuts, while a timed heavy punishes its committed windup', async ({ page }) => {
  await begin(page); await page.keyboard.press('KeyJ');
  await expect.poll(async () => (await state(page)).trainer.guard, { timeout: 15000, intervals: [20] }).toBe(76);
  expect((await state(page)).trainer.health).toBe(100);
  await expect(page.locator('#feedback')).toHaveText('ENEMY BLOCKED');
  await page.screenshot({ path: 'artifacts/enemy-block.png' });
  await expect.poll(async () => (await state(page)).attack, { intervals: [20] }).toBeNull();
  // Deliver a real input during windup so its eventual blade contact lands after
  // guard drops, without relying on automation round-trip timing.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Windup not observed')); }, 15000);
    const timer = setInterval(() => {
      const enemy = (window as any).__prototype.trainer;
      if (enemy.elapsed >= 0.25 && enemy.elapsed < 0.4) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyK', bubbles: true }));
        clearTimeout(timeout); clearInterval(timer); resolve();
      }
    }, 2);
  }));
  await expect.poll(async () => (await state(page)).trainer.health, { timeout: 15000, intervals: [20] }).toBe(62);
  expect((await state(page)).trainer.reaction).toBe('stagger');
  expect((await state(page)).defense.health).toBe(100);
  await expect.poll(async () => (await state(page)).trainer.cue, { timeout: 10000, intervals: [20] }).toBe(true);
  expect((await state(page)).trainer.stage).toBe('windup');
});
