import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ viewport: { width: 720, height: 540 } });
test.setTimeout(90000);
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page, group = false, pattern = 'normal') {
  await page.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await page.goto('/?debug&quality=low'); await page.clock.pauseAt(new Date('2026-11-18T12:01:00Z'));
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-count', group ? '3' : '1'); await page.selectOption('#drill-pattern', pattern);
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}
async function until(page: Page, predicate: (s: any) => boolean, frames = 600) {
  for (let i = 0; i < frames; i++) {
    const s = await state(page); if (predicate(s)) return s;
    await page.clock.runFor(16);
  }
  throw new Error(`Combat event not observed: ${JSON.stringify(await state(page))}`);
}

test('Shift away disengages immediately, pivots smoothly and builds a sprint gap', async ({ page }) => {
  await begin(page); const initial = await state(page);
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyS'); await page.clock.runFor(32);
  expect((await state(page)).retreating).toBe(true); expect((await state(page)).focus).toBeNull();
  // Measure before the test courtyard's pillar at (-3, 13), which should stop
  // a continued straight sprint through it.
  await page.clock.runFor(1500);
  const escaped = await state(page);
  expect(escaped.position.z).toBeGreaterThan(initial.position.z + 4.5);
  expect(escaped.speed).toBeGreaterThan(6); expect(escaped.focus).toBeNull();
  expect(Math.hypot(escaped.position.x - escaped.trainer.x, escaped.position.z - escaped.trainer.z)).toBeGreaterThan(4);
  await page.screenshot({ path: 'artifacts/retreat-sprint.png' });
});

test('adaptive fighters begin at uneven surrounding positions and choose different attacks', async ({ page }) => {
  await begin(page, true, 'adaptive');
  const initial = await state(page);
  expect(new Set(initial.opponents.map((enemy: any) => enemy.kind)).size).toBe(3);
  const radii = initial.opponents.map((enemy: any) => Math.hypot(enemy.x - initial.position.x, enemy.z - initial.position.z));
  expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(1);
  await page.clock.runFor(2500);
  const later = await state(page);
  const angles = later.opponents.map((enemy: any) => Math.atan2(enemy.z - later.position.z, enemy.x - later.position.x)).sort((a: number, b: number) => a - b);
  const gaps = angles.map((angle: number, i: number) => (angles[(i + 1) % angles.length] - angle + Math.PI * 2) % (Math.PI * 2));
  expect(Math.max(...gaps)).toBeLessThan(3.5);
  await page.screenshot({ path: 'artifacts/adaptive-surround.png' });
});

test('an ordinary avoided strike transfers focus to the second attacker without a perfect reward', async ({ page }) => {
  await begin(page, true); await page.keyboard.down('KeyE');
  await until(page, s => s.opponents[1].elapsed >= 0.6); await page.keyboard.up('KeyE');
  const before = await until(page, s => s.opponents[1].elapsed >= 0.89);
  const enemy = before.opponents[1], dx = before.position.x - enemy.x, dz = before.position.z - enemy.z;
  let chosen: string[] = [], best = -Infinity;
  for (const [keys, x, forward] of [ [['KeyD'], 1, 0], [['KeyA'], -1, 0], [['KeyW'], 0, 1], [['KeyS'], 0, -1] ] as const) {
    const mx = x * Math.cos(before.cameraYaw) - forward * Math.sin(before.cameraYaw);
    const mz = -x * Math.sin(before.cameraYaw) - forward * Math.cos(before.cameraYaw);
    if (mx * dx + mz * dz > best) { best = mx * dx + mz * dz; chosen = [...keys]; }
  }
  for (const key of chosen) await page.keyboard.down(key);
  await page.keyboard.press('Space'); await page.clock.runFor(16);
  for (const key of chosen) await page.keyboard.up(key);
  const avoided = await until(page, s => s.focus === 'trainer-2', 50);
  expect(avoided.perfect.count).toBe(0); expect(avoided.defense.health).toBe(100);
});

test('a distant earned riposte dashes into a guaranteed hit and guard break freezes game time', async ({ page }) => {
  await begin(page);
  await until(page, s => s.trainer.elapsed >= 0.96);
  await page.keyboard.press('Space');
  await until(page, s => s.perfect.slow, 40);
  const ready = await until(page, s => s.perfect.ready, 50);
  expect(Math.hypot(ready.position.x - ready.trainer.x, ready.position.z - ready.trainer.z)).toBeGreaterThan(2.7);
  await page.keyboard.press('KeyJ');
  const hit = await until(page, s => s.impact.active, 90);
  expect(hit.trainer.health).toBe(68); expect(hit.trainer.guard).toBe(0); expect(hit.impact.count).toBe(1);
  expect(Math.hypot(hit.position.x - ready.position.x, hit.position.z - ready.position.z)).toBeGreaterThan(1.2);
  await expect(page.locator('.enemy-defense')).toHaveClass(/broken/);
  const frozenTime = hit.gameTime; await page.clock.runFor(32);
  expect((await state(page)).gameTime).toBe(frozenTime);
  await page.screenshot({ path: 'artifacts/dashing-riposte-break.png' });
  await page.clock.runFor(96); expect((await state(page)).impact.active).toBe(false);
});
