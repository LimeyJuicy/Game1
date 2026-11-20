import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

test('full body coordinates upper joints and compares with identical leg phase', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?mode=animation&carry=off');
  await expect(page.locator('#stats')).toContainText('43 clips');
  await expect(page.locator('#clip option:checked')).toHaveText('Walk_Loop · supplied');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const state = () => page.evaluate(() => (window as any).__rigWorkbench);
  const poses: any[] = [];
  for (const time of [0, .333, .667, 1]) {
    await page.locator('#timeline').fill(String(time));
    poses.push((await state()).bodyPose);
  }
  const angle = (a: number[], b: number[]) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((sum, value, i) => sum + value * b[i], 0))));
  const ranges = Object.fromEntries(['spine_01', 'spine_03', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r', 'neck_01', 'Head'].map(name => [name, Math.max(...poses.map(pose => angle(poses[0][name].rotation, pose[name].rotation)))]));
  expect(ranges.upperarm_l).toBeGreaterThan(.1);
  expect(ranges.upperarm_r).toBeGreaterThan(.1);
  expect(ranges.spine_01 + ranges.spine_03).toBeGreaterThan(.01);
  expect(ranges.clavicle_l + ranges.clavicle_r).toBeGreaterThan(.01);
  await page.locator('#timeline').fill('0.333');
  const full = await state();
  await page.getByRole('button', { name: 'Legs & hips', exact: true }).click();
  const lower = await state();
  expect(lower.time).toBeCloseTo(full.time, 5);
  expect(lower.playing).toBe(false);
  for (const name of ['pelvis', 'thigh_l', 'calf_l', 'foot_l']) expect(lower.bodyPose[name]).toEqual(full.bodyPose[name]);
  expect(lower.bodyPose.upperarm_l.rotation).not.toEqual(full.bodyPose.upperarm_l.rotation);
  await page.getByRole('button', { name: 'Full body', exact: true }).click();
  expect((await state()).bodyPose).toEqual(full.bodyPose);
  await page.getByRole('button', { name: '¾ view', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/full-body-walk-three-quarter.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Upper body', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/full-body-walk-upper.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/full-body-walk-side.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Legs & hips', exact: true }).click();
  expect((await state()).playing).toBe(true);
  await page.getByRole('button', { name: 'Upper body', exact: true }).click();
  expect((await state()).authoredLower).toBeNull();
  expect((await state()).playing).toBe(true);
  writeFileSync(fileURLToPath(new URL('../reports/full-body-checks.json', import.meta.url)), JSON.stringify({ scope: 'Native Quaternius Walk_Loop source playback; no sword-carry changes or game integration.', sampledLocalJointRotationRangesRadians: ranges, samples: poses, phaseMatchedLowerBody: true }, null, 2) + '\n');
  expect(errors).toEqual([]);
});
