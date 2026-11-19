import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ viewport: { width: 720, height: 540 } });
test.setTimeout(90000);
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function begin(page: Page) {
  await page.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
  await page.goto('/?debug&quality=low');
  await page.clock.pauseAt(new Date('2026-11-17T12:01:00Z'));
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-count', '3'); await page.selectOption('#drill-pattern', 'normal');
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}
async function advanceUntil(page: Page, predicate: (s: any) => boolean, frames = 400) {
  for (let i = 0; i < frames; i++) {
    const current = await state(page); if (predicate(current)) return current;
    await page.clock.runFor(16);
  }
  throw new Error(`Expected combat event did not occur: ${JSON.stringify(await state(page))}`);
}

test('three opponents take staggered turns and blocking transfers focus to each attacker', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page); await page.keyboard.down('KeyE');
  const seen = new Set<string>();
  const result = await advanceUntil(page, s => {
    if (s.focus) seen.add(s.focus);
    return seen.size === 3 && s.defense.guard <= 28;
  });
  expect(result.opponents.filter((opponent: any) => opponent.enabled)).toHaveLength(3);
  expect(result.defense.health).toBe(100);
  expect(result.camera.y).toBeLessThan(5);
  for (const a of result.opponents) for (const b of result.opponents) {
    if (a.id !== b.id) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.7);
  }
  await page.screenshot({ path: 'artifacts/group-combat.png' });
  await page.getByRole('button', { name: 'Stop defense drill', exact: true }).click();
  expect((await state(page)).opponents.every((opponent: any) => !opponent.enabled)).toBe(true);
  expect((await state(page)).focus).toBeNull(); expect(errors).toEqual([]);
});

test('movement plus attack selects a second opponent and commits that target for the strike', async ({ page }) => {
  await begin(page);
  await page.keyboard.down('KeyD'); await page.keyboard.press('KeyJ');
  await page.clock.runFor(32); await page.keyboard.up('KeyD');
  const started = await state(page);
  expect(started.attackTarget).toBe('trainer-2'); expect(started.focus).toBe('trainer-2');
  await page.keyboard.down('KeyA'); await page.clock.runFor(160); await page.keyboard.up('KeyA');
  expect((await state(page)).attackTarget).toBe('trainer-2');
});

test('a perfect parry against the second attacker earns a riposte against that source only', async ({ page }) => {
  await begin(page); await page.keyboard.down('KeyE');
  await advanceUntil(page, s => s.opponents[1].elapsed >= 0.6);
  await page.keyboard.up('KeyE');
  await advanceUntil(page, s => s.opponents[1].elapsed >= 1.0);
  await page.keyboard.press('KeyE');
  const perfect = await advanceUntil(page, s => s.perfect.slow, 30);
  expect(perfect.perfect.source).toBe('trainer-2');
  await advanceUntil(page, s => s.perfect.ready, 45);
  await page.keyboard.press('KeyJ');
  const hit = await advanceUntil(page, s => s.opponents[1].guard === 0, 40);
  expect(hit.riposteSource).toBe('trainer-2'); expect(hit.attackTarget).toBe('trainer-2');
  expect(hit.opponents[1].health).toBe(68);
  expect(hit.opponents[0].health).toBe(100); expect(hit.opponents[0].guard).toBe(100);
  expect(hit.opponents[2].health).toBe(100); expect(hit.opponents[2].guard).toBe(100);
});
