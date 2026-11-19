import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
const state = (page: Page) => page.evaluate(() => (window as any).__rigWorkbench);
test('legs study plants its support foot, keeps upper joints still, and exposes clear inspection phases', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    const screenshotDriverNotice = message.text().includes('GPU stall due to ReadPixels');
    if (message.type() === 'error' || (message.type() === 'warning' && !screenshotDriverNotice)) errors.push(message.text());
  });
  await page.goto('/?reference=soldier');
  await expect(page.locator('#clip')).toHaveValue('legs');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const info = await state(page);
  expect(info.study.tracks).toHaveLength(10); expect(info.study.maximumReachError).toBeLessThan(.003);
  expect(info.study.minimumSupportKneeBend).toBeLessThan(12);
  expect(info.study.extendedSupportFraction).toBeGreaterThan(.6);
  expect(info.study.duration).toBeGreaterThan(1.2); expect(info.study.stride).toBeGreaterThan(1);
  expect(info.study.tracks.every((name: string) => !/Spine|Arm|Head|Neck/.test(name))).toBe(true);
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  const supported: number[] = [];
  for (const time of [.24, .4, .6]) {
    await page.locator('#timeline').fill(String(time));
    const current = await state(page);
    expect(current.study.feet[0].stance).toBe(true);
    supported.push(current.study.feet[0].ankle[2]);
    expect(current.study.upper).toEqual(info.study.upper);
  }
  expect(Math.max(...supported) - Math.min(...supported)).toBeLessThan(.002);
  writeFileSync(fileURLToPath(new URL('../reports/legs-metrics.json', import.meta.url)), JSON.stringify({
    scope: 'Actual reference rig; AT-003 legs-only prototype',
    tracks: info.study.tracks, maximumReachErrorMeters: info.study.maximumReachError,
    strideSpeedMetersPerSecond: info.study.speed, supportAnkleWorldZ: supported,
    version: 2, durationSeconds: info.study.duration, strideMeters: info.study.stride,
    minimumSupportKneeBendDegrees: info.study.minimumSupportKneeBend,
    extendedSupportFraction: info.study.extendedSupportFraction,
    supportDriftMeters: Math.max(...supported) - Math.min(...supported),
    upperJointRotationsUnchanged: true,
    note: 'Measures bone targets/virtual sole contacts, not final mesh-ground clearance or artistic acceptance.',
  }, null, 2) + '\n');
  const pelvisRotations: number[][] = [];
  for (const [label, phase] of [['contact', 0], ['passing', .25], ['opposite-contact', .5], ['opposite-passing', .75]] as const) {
    await page.locator('#timeline').fill(String(phase * info.study.duration));
    const pose = await state(page); pelvisRotations.push(pose.study.pelvis.rotation);
    if (phase === 0) expect(pose.study.feet[0].hip[2]).toBeLessThan(pose.study.feet[1].hip[2]);
    if (phase === .5) expect(pose.study.feet[1].hip[2]).toBeLessThan(pose.study.feet[0].hip[2]);
    await page.screenshot({ path: fileURLToPath(new URL(`../reports/legs-${label}.png`, import.meta.url)) });
  }
  expect(pelvisRotations[0]).not.toEqual(pelvisRotations[2]);
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/legs-front.png', import.meta.url)) });
  await page.locator('#lower-only').uncheck();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/legs-upper-frozen.png', import.meta.url)) });
  await page.selectOption('#clip', '3'); expect((await state(page)).study.active).toBe(false);
  await page.selectOption('#clip', 'legs'); expect((await state(page)).study.active).toBe(true);
  expect(errors).toEqual([]);
});
