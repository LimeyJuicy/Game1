import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

test('low carry preserves source legs and free arm with a stable attached sword', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#clip')).toHaveValue('carry:Walk_Loop');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const state = () => page.evaluate(() => (window as any).__rigWorkbench);
  const samples: any[] = [];
  for (const name of ['Walk_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Formal_Loop']) {
    const originalValue = await page.locator('#clip option').evaluateAll((options, name) => (options.find(option => option.textContent === `${name} · supplied`) as HTMLOptionElement).value, name);
    const duration = name === 'Sprint_Loop' ? 2 / 3 : name === 'Jog_Fwd_Loop' ? 14 / 15 : 4 / 3;
    const heights: number[] = [], bends: number[] = [], swings: number[] = [];
    let gripSocket: unknown, fingerPose: unknown;
    for (const phase of [0, .125, .25, .375, .5, .625, .75, .875]) {
      await page.selectOption('#clip', originalValue);
      await page.locator('#timeline').fill(String(phase * duration));
      const original = await state();
      await page.locator('#sword-carry').check();
      const carrying = await state();
      expect(carrying.carry.active).toBe(true);
      expect(carrying.time).toBeCloseTo(original.time, 5);
      for (const bone of ['pelvis', 'thigh_l', 'calf_l', 'foot_l', 'spine_01', 'spine_03', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'lowerarm_l', 'neck_01', 'Head']) expect(carrying.bodyPose[bone]).toEqual(original.bodyPose[bone]);
      expect(carrying.bodyPose.upperarm_r.rotation).not.toEqual(original.bodyPose.upperarm_r.rotation);
      expect(carrying.carry.tip.every(Number.isFinite)).toBe(true);
      heights.push(carrying.carry.tip[1]);
      const a = carrying.bodyPose.upperarm_r.world, b = carrying.bodyPose.lowerarm_r.world, c = carrying.bodyPose.hand_r.world;
      const u = a.map((value: number, i: number) => value - b[i]);
      const v = c.map((value: number, i: number) => value - b[i]);
      const dot = u.reduce((sum: number, value: number, i: number) => sum + value * v[i], 0) / (Math.hypot(...u) * Math.hypot(...v));
      bends.push(180 - Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI);
      swings.push(c[2] - a[2]);
      const blade = carrying.carry.tip.map((value: number, i: number) => value - carrying.carry.grip[i]);
      expect(carrying.carry.backOfHand[1]).toBeGreaterThan(.995);
      expect(blade[0]).toBeLessThan(-.2); expect(blade[2]).toBeLessThan(-.5);
      const fingers = ['middle_01_r', 'middle_02_r', 'middle_03_r'].map(name => carrying.bodyPose[name].rotation);
      if (gripSocket) { expect(carrying.carry.socket).toEqual(gripSocket); expect(fingers).toEqual(fingerPose); }
      else { gripSocket = carrying.carry.socket; fingerPose = fingers; }
    }
    expect(Math.min(...heights)).toBeGreaterThan(.08);
    expect(Math.min(...bends)).toBeGreaterThan(35);
    const swingRange = Math.max(...swings) - Math.min(...swings);
    if (name === 'Walk_Loop' || name === 'Sprint_Loop') expect(swingRange).toBeGreaterThan(.05);
    expect((await state()).carry.maximumHandError).toBeLessThan(.001);
    samples.push({ name, minimumElbowBendDegrees: Math.min(...bends), maximumElbowBendDegrees: Math.max(...bends), handSwingRangeMeters: swingRange, fixedSocketAndFingerGrip: true, backOfHandFacesUp: true, minimumSampledTipHeight: Math.min(...heights), maximumHandError: (await state()).carry.maximumHandError, maximumReachAdjustment: (await state()).carry.maximumReachAdjustment });
  }
  await page.selectOption('#clip', 'carry:Walk_Loop');
  await page.locator('#timeline').fill('0.333');
  await page.getByRole('button', { name: '¾ view', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/sword-carry-walk-three-quarter.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Sword side', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/sword-carry-walk-weapon-side.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/sword-carry-walk-side.png', import.meta.url)) });
  await page.selectOption('#clip', 'carry:Sprint_Loop');
  await page.locator('#timeline').fill('0.2');
  await page.getByRole('button', { name: '¾ view', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/sword-carry-sprint-three-quarter.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Sword side', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/sword-carry-sprint-weapon-side.png', import.meta.url)) });
  await page.getByRole('button', { name: 'Legs & hips', exact: true }).click();
  expect((await state()).carry.active).toBe(false);
  await page.getByRole('button', { name: 'Full body', exact: true }).click();
  expect((await state()).carry.active).toBe(true);
  await page.locator('#sword-carry').uncheck();
  expect((await state()).carry.active).toBe(false);
  writeFileSync(fileURLToPath(new URL('../reports/sword-carry-checks.json', import.meta.url)), JSON.stringify({ samples, scope: 'Native reference rig, sampled flat-ground blade-tip clearance and untouched source-joint comparison. No continuous collision/armor clearance certification.' }, null, 2) + '\n');
  expect(await page.locator('aside').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});
