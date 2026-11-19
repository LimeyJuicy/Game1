import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
test.use({ viewport: { width: 720, height: 540 } });
test.setTimeout(120000);
const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
async function until(page: Page, predicate: (s: any) => boolean, frames = 700) {
  for (let i = 0; i < frames; i++) {
    const current = await state(page); if (predicate(current)) return current;
    await page.clock.runFor(16);
  }
  throw new Error(`Combat event not observed: ${JSON.stringify(await state(page))}`);
}
async function begin(page: Page, variant: string, group = false) {
  await page.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await page.goto('/?debug&quality=low'); await page.clock.pauseAt(new Date('2026-11-18T12:01:00Z'));
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  if (group) await page.selectOption('#drill-count', '3');
  await page.selectOption('#drill-pattern', 'normal'); await page.selectOption('#finisher-variant', variant);
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
}
async function earnEligibility(page: Page, group = false) {
  for (let i = 0; i < 3; i++) {
    if (group) {
      await page.keyboard.down('KeyE');
      await until(page, s => s.trainer.elapsed >= .6 && s.trainer.elapsed < .8 && !s.attack);
      await page.keyboard.up('KeyE');
    }
    await until(page, s => s.trainer.elapsed >= 1.02 && s.trainer.elapsed < 1.06 && !s.attack);
    await page.keyboard.press('KeyE');
    await until(page, s => s.perfect.slow && s.perfect.source === 'trainer', 35);
    await until(page, s => s.perfect.ready, 50); await page.keyboard.press('KeyJ');
    await until(page, s => s.trainer.health === 100 - (i + 1) * 32, 80);
    if (i < 2) await until(page, s => !s.attack && !s.dash.active && !s.impact.active, 60);
  }
  return until(page, s => !!s.finisher.available, 50);
}

test('earned F finisher has one lethal event, locks actions, pauses safely and returns control', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.clock.install({ time: new Date('2026-11-18T12:00:00Z') });
  await page.goto('/?debug&quality=low'); await page.clock.pauseAt(new Date('2026-11-18T12:01:00Z'));
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.selectOption('#drill-pattern', 'normal');
  await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
  await page.keyboard.press('KeyF'); await page.clock.runFor(32);
  expect((await state(page)).finisher.active).toBe(false);
  await expect(page.locator('#finisher-hint')).toBeHidden();

  // Earn eligibility through actual combat: three fresh perfect-parry counters.
  for (let i = 0; i < 3; i++) {
    const threshold = 1.02;
    await until(page, s => s.trainer.elapsed >= threshold && s.trainer.elapsed < threshold + .04 && !s.attack);
    await page.keyboard.press('KeyE');
    await until(page, s => s.perfect.slow, 35);
    await until(page, s => s.perfect.ready, 50);
    await page.keyboard.press('KeyJ');
    await until(page, s => s.trainer.health === 100 - (i + 1) * 32, 80);
    if (i < 2) await until(page, s => !s.attack && !s.dash.active && !s.impact.active, 60);
  }
  const eligible = await until(page, s => !!s.finisher.available, 50);
  expect(eligible.trainer.health).toBe(4); expect(eligible.trainer.guard).toBe(0);
  await expect(page.locator('#finisher-hint')).toBeVisible();
  await page.keyboard.down('KeyF'); await page.clock.runFor(32);
  const started = await state(page); expect(started.finisher.active).toBe(true);
  expect(started.finisher.source).toBe('trainer');
  expect(started.attack).toBeNull();
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyJ'); await page.keyboard.press('Space');
  await page.clock.runFor(160);
  const pausedAt = await state(page);
  await page.keyboard.press('Escape'); await page.clock.runFor(500);
  const paused = await state(page);
  expect(paused.paused).toBe(true); expect(paused.finisher.elapsed).toBe(pausedAt.finisher.elapsed);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const lethal = await until(page, s => s.finisher.lethalApplied, 100);
  expect(lethal.trainer.health).toBe(0);
  expect(lethal.defense.health).toBe(started.defense.health);
  expect(lethal.attackSerial).toBe(started.attackSerial);
  expect(lethal.defense.mode).toBe('free');
  expect(Math.hypot(lethal.position.x - started.position.x, lethal.position.z - started.position.z)).toBeLessThan(.8);
  await page.screenshot({ path: 'artifacts/finisher-prototype.png' });
  await until(page, s => !s.finisher.active, 120);
  const end = await state(page);
  await page.clock.runFor(320);
  const held = await state(page);
  expect(held.position).toEqual(end.position); expect(held.attackSerial).toBe(started.attackSerial);
  expect(held.trainer.health).toBe(0); expect(held.finisher.active).toBe(false);
  await page.keyboard.up('KeyF'); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyJ');
  await page.keyboard.down('KeyW'); await page.clock.runFor(300); await page.keyboard.up('KeyW');
  const moved = await state(page);
  expect(Math.hypot(moved.position.x - held.position.x, moved.position.z - held.position.z)).toBeGreaterThan(.1);
  await page.getByRole('button', { name: 'Stop defense drill', exact: true }).click();
  expect((await state(page)).finisher.active).toBe(false);
  expect(errors).toEqual([]);
});

for (const variant of ['disarm', 'helmet', 'decapitation', 'sword-arm']) test(`${variant} event changes the actual victim once and reset clears owned props`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await begin(page, variant);
  const eligible = await earnEligibility(page);
  expect(eligible.finisher.availableVariant).toBe(variant);
  await page.keyboard.press('KeyF'); await page.clock.runFor(32);
  expect((await state(page)).finisher.variant).toBe(variant);
  const event = variant === 'helmet' ? 'lethal' : variant === 'disarm' ? 'drop-weapon' : variant === 'decapitation' ? 'sever-head' : 'sever-arm';
  const severed = await until(page, s => s.finisher.events.some((entry: any) => entry.type === event), 120);
  expect(severed.finisher.events.filter((entry: any) => entry.type === event)).toHaveLength(1);
  if (variant === 'helmet') {
    expect(severed.trainer.health).toBe(0); expect(severed.trainer.capabilities.head).toBe(true);
    expect(severed.trainer.capabilities.weapon).toBe(true); expect(severed.debris).toHaveLength(0);
    expect(severed.position.z).toBeLessThan(severed.trainer.z);
    expect(Math.cos(severed.trainer.facing)).toBeLessThan(-.9);
  } else if (variant === 'decapitation') {
    expect(severed.trainer.capabilities.weapon).toBe(false);
    expect(severed.trainer.capabilities.head).toBe(false); expect(severed.trainer.health).toBe(0);
    expect(severed.debris.map((item: any) => item.kind)).toEqual(['Detached head', 'Dropped sword']);
  } else {
    expect(severed.trainer.capabilities.weapon).toBe(false);
    expect(severed.trainer.health).toBe(4); expect(severed.finisher.lethalApplied).toBe(false);
    if (variant === 'sword-arm') expect(severed.trainer.capabilities.swordArm).toBe(false);
    expect(severed.debris).toHaveLength(1);
  }
  await page.clock.runFor(240);
  await page.screenshot({ path: `artifacts/finisher-${variant}.png` });
  if (variant !== 'sword-arm') {
    await until(page, s => !s.finisher.active, 130);
    expect((await state(page)).trainer.health).toBe(0);
    expect((await state(page)).finisher.events.filter((entry: any) => entry.type === event)).toHaveLength(1);
  }
  // Arm case resets between sever and lethal, exercising cancellation cleanup.
  await page.getByRole('button', { name: 'Stop defense drill', exact: true }).click();
  const reset = await state(page);
  expect(reset.finisher.active).toBe(false); expect(reset.debris).toHaveLength(0);
  expect(reset.trainer.capabilities).toEqual({ head: true, helmet: true, swordArm: true, weapon: true });
  expect(reset.finisher.events).toEqual([]); expect(errors).toEqual([]);
});

test('group execution holds living bystanders, keeps player protected, and resumes with new windups', async ({ page }) => {
  test.setTimeout(210000);
  await begin(page, 'disarm', true);
  await earnEligibility(page, true);
  await page.keyboard.press('KeyF'); await page.clock.runFor(32);
  const started = await state(page); expect(started.finisher.active).toBe(true);
  const serial = started.attackSerial;
  await page.keyboard.down('KeyJ'); await page.keyboard.down('KeyW');
  let moved = false, previous = started;
  for (let i = 0; i < 200; i++) {
    await page.clock.runFor(16); const current = await state(page);
    if (!current.finisher.active) break;
    expect(current.defense.health).toBe(started.defense.health); expect(current.attackSerial).toBe(serial);
    for (const enemy of current.opponents.slice(1)) {
      expect(enemy.elapsed).toBeLessThan(0); expect(enemy.cue).toBe(false);
      const old = previous.opponents.find((other: any) => other.id === enemy.id);
      moved ||= Math.hypot(enemy.x - old.x, enemy.z - old.z) > .001;
    }
    previous = current;
  }
  expect(moved).toBe(true);
  const done = await state(page); expect(done.finisher.active).toBe(false); expect(done.trainer.health).toBe(0);
  expect(done.opponents.slice(1).every((enemy: any) => enemy.elapsed < -.5 && !enemy.cue)).toBe(true);
  await page.keyboard.up('KeyJ'); await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyE');
  await until(page, s => s.opponents.slice(1).some((enemy: any) => enemy.cue && enemy.elapsed >= .55 && enemy.elapsed < enemy.windup), 400);
  await page.keyboard.up('KeyE');
});
