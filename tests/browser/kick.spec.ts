import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ viewport: { width: 960, height: 640 } });
test.setTimeout(60000);
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page) {
  await page.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await page.goto('/?debug&quality=low'); await page.clock.pauseAt(new Date('2026-11-18T12:01:00Z'));
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-pattern', 'unblockable');
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}
async function until(page: Page, predicate: (s: any) => boolean, frames = 300) {
  for (let i = 0; i < frames; i++) { const s = await state(page); if (predicate(s)) return s; await page.clock.runFor(16); }
  throw new Error(`Expected kick event missing: ${JSON.stringify(await state(page))}`);
}

test('enemy raises a knee with a red cue; even a fresh parry is shoved into a stagger', async ({ page }) => {
  await begin(page);
  const windup = await until(page, s => s.trainer.elapsed >= 0.82);
  expect(windup.trainer.delivery).toBe('kick'); expect(windup.trainer.cue).toBe(true);
  expect(windup.trainer.attackName).toBe('Front push kick');
  await page.screenshot({ path: 'artifacts/enemy-kick-windup.png' });
  await until(page, s => s.trainer.elapsed >= 0.97); await page.keyboard.down('KeyE');
  const hit = await until(page, s => s.defense.health === 70, 30);
  expect(hit.defense.mode).toBe('stagger'); expect(hit.defense.guard).toBe(100); expect(hit.perfect.count).toBe(0);
  await page.clock.runFor(160);
  const shoved = await state(page);
  expect(Math.hypot(shoved.position.x - windup.position.x, shoved.position.z - windup.position.z)).toBeGreaterThan(0.4);
  await page.screenshot({ path: 'artifacts/enemy-kick-impact.png' });
});

test('perfectly dodging the actual kick earns the source-bound dashing riposte', async ({ page }) => {
  await begin(page); await until(page, s => s.trainer.elapsed >= 0.92);
  await page.keyboard.press('Space'); await until(page, s => s.perfect.slow, 40);
  expect((await state(page)).perfect.source).toBe('trainer');
  await until(page, s => s.perfect.ready, 50); await page.keyboard.press('KeyJ');
  const counter = await until(page, s => s.trainer.guard === 0, 60);
  expect(counter.trainer.health).toBe(68); expect(counter.defense.health).toBe(100);
});
