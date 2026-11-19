import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

test('Quaternius authored legs animate with frozen upper locals and remain selectable alongside old study', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?body=legs');
  await expect(page.locator('#stats')).toContainText('43 clips');
  await expect(page.locator('#clip')).toHaveValue('lower:Walk_Loop');
  await expect(page.locator('#source-status')).toContainText('Sprint enter/exit are absent');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const state = () => page.evaluate(() => (window as any).__rigWorkbench);
  const samples: any[] = [];
  const originalUpper = (await state()).authoredLower.upper;
  for (const clip of ['Walk_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Formal_Loop']) {
    await page.selectOption('#clip', `lower:${clip}`);
    const first = (await state()).authoredLower;
    expect(first.tracks.length).toBeGreaterThan(20);
    expect(first.tracks.every((name: string) => !/spine|arm|Head|neck/.test(name))).toBe(true);
    await page.locator('#timeline').fill(String(first.duration * .3));
    const later = (await state()).authoredLower;
    expect(later.upper).toEqual(first.upper);
    expect(later.lower).not.toEqual(first.lower);
    expect(later.pelvis).not.toEqual(first.pelvis);
    samples.push({ clip, duration: first.duration, tracks: first.tracks, lowerChanges: true, upperLocalsUnchanged: true });
  }
  await page.selectOption('#clip', 'lower:Walk_Loop');
  await page.locator('#timeline').fill('0.333');
  await page.locator('#skeleton').uncheck();
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/quaternius-walk-legs-side.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/quaternius-walk-legs-front.png', import.meta.url)) });
  await page.selectOption('#clip', 'lower:Sprint_Loop');
  await page.locator('#timeline').fill('0.2');
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/quaternius-sprint-legs-side.png', import.meta.url)) });
  // Verify source full-body playback, then return to the lower mask without retaining upper animation.
  const options = await page.locator('#clip option').evaluateAll(options => options.map(option => ({ value: (option as HTMLOptionElement).value, text: option.textContent })));
  const walk = options.find(option => option.text === 'Walk_Loop · supplied')!;
  await page.selectOption('#clip', walk.value);
  await page.locator('#timeline').fill('0.333');
  await page.screenshot({ path: fileURLToPath(new URL('../reports/quaternius-walk-full-side.png', import.meta.url)) });
  await page.selectOption('#clip', 'lower:Walk_Loop');
  expect((await state()).authoredLower.upper).toEqual(originalUpper);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => (await state()).time).toBeGreaterThan(.05);
  await page.selectOption('#reference', 'soldier');
  await expect(page.locator('#clip')).toHaveValue('legs');
  await page.selectOption('#reference', 'quaternius');
  await expect(page.locator('#clip')).toHaveValue('lower:Walk_Loop');
  writeFileSync(fileURLToPath(new URL('../reports/quaternius-checks.json', import.meta.url)), JSON.stringify({ samples, scope: 'Source-rig lower-track mask; not retargeted or visually approved; no foot-contact certification.' }, null, 2) + '\n');
  expect(errors).toEqual([]);
});
