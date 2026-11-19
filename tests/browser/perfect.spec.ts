import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ viewport: { width: 720, height: 540 } });
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page) {
  await page.goto('/?debug&quality=low'); await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-pattern', 'normal');
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}
async function precisePress(page: Page, key: string, threshold: number) {
  // Exercise the actual input listener without network round-trip latency inside
  // a timing window. The page still advances/render its normal simulation.
  await page.evaluate(({ key, threshold }) => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Timing opportunity not observed')); }, 18000);
    const timer = setInterval(() => {
      const current = (window as any).__prototype;
      if (current.trainer.elapsed >= threshold && current.trainer.elapsed < 1.065) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: key, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: key, bubbles: true }));
        clearTimeout(timeout); clearInterval(timer); resolve();
      }
    }, 2);
  }), { key, threshold });
}

test('perfect parry locks inputs for slow motion, then a fresh J lands a defense-breaking riposte', async ({ page }) => {
  await begin(page); await precisePress(page, 'KeyE', 1.0);
  await expect.poll(async () => (await state(page)).perfect.slow, { timeout: 12000, intervals: [10] }).toBe(true);
  const before = await state(page);
  await page.keyboard.down('KeyJ'); await page.keyboard.down('KeyW'); await page.keyboard.press('KeyK');
  await expect.poll(async () => (await state(page)).perfect.ready, { timeout: 5000, intervals: [10] }).toBe(true);
  const after = await state(page);
  expect(after.attackSerial).toBe(before.attackSerial); expect(after.position).toEqual(before.position);
  expect(after.trainer.guard).toBe(100);
  await page.keyboard.up('KeyJ'); await page.keyboard.up('KeyW'); await page.keyboard.press('KeyJ');
  await expect.poll(async () => (await state(page)).trainer.guard, { timeout: 10000, intervals: [10] }).toBe(0);
  expect((await state(page)).trainer.health).toBe(68);
  await page.screenshot({ path: 'artifacts/riposte-defense-break.png' });
});

test('a narrowly timed side dodge earns slow motion and the roll option forfeits its riposte', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
  await begin(page);
  await page.clock.pauseAt(new Date('2026-11-17T12:01:00Z'));
  // Direction and dodge are delivered together so no early walking changes range.
  // Advance real browser timers/frame callbacks deterministically: a slow software
  // renderer can otherwise deliver the input after the dodge's safe startup point.
  await page.evaluate(() => {
    const timer = setInterval(() => {
      const current = (window as any).__prototype;
      if (current.trainer.elapsed >= 0.96 && current.trainer.elapsed < 1.02) {
        for (const code of ['KeyD', 'Space']) window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true })), 120);
        clearInterval(timer);
      }
    }, 2);
  });
  for (let i = 0; i < 200 && !(await state(page)).perfect.slow; i++) await page.clock.runFor(16);
  expect((await state(page)).perfect.slow).toBe(true);
  expect((await state(page)).perfect.kind).toBe('dodge');
  for (let i = 0; i < 40 && !(await state(page)).perfect.ready; i++) await page.clock.runFor(16);
  expect((await state(page)).perfect.ready).toBe(true);
  await page.keyboard.press('Space');
  await page.clock.runFor(32);
  expect((await state(page)).defense.mode).toBe('roll');
  expect((await state(page)).perfect.ready).toBe(false); expect((await state(page)).trainer.guard).toBe(100);
});

test('dodging empty space never awards a perfect defense', async ({ page }) => {
  await page.goto('/?debug&quality=low'); await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).defense.mode, { intervals: [10] }).toBe('free');
  expect((await state(page)).perfect.count).toBe(0);
});
