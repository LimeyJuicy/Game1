import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const state = (page: Page) => page.evaluate(() => (window as any).__prototype);
const waitTime = async (page: Page, seconds: number) => {
  const begin = (await state(page)).gameTime;
  await expect.poll(async () => (await state(page)).gameTime - begin, { timeout: 20000, intervals: [50] }).toBeGreaterThanOrEqual(seconds);
};
async function begin(page: Page) {
  await page.goto('/?debug&quality=low');
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
}

test('holding attack never repeats; a heavy locks movement and turning', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await begin(page);
  await page.keyboard.down('KeyJ');
  await expect.poll(async () => (await state(page)).attackSerial).toBe(1);
  await waitTime(page, 1.2);
  expect((await state(page)).attack).toBeNull();
  expect((await state(page)).attackSerial).toBe(1);
  await page.keyboard.up('KeyJ');
  const before = await state(page);
  await page.keyboard.down('KeyK');
  await expect.poll(async () => (await state(page)).attackSerial).toBe(2);
  await page.keyboard.down('KeyD');
  await waitTime(page, 0.4);
  const committed = await state(page);
  expect(committed.attack.kind).toBe('heavy');
  expect(committed.position).toEqual(before.position);
  expect(committed.facing).toBe(before.facing);
  await page.keyboard.up('KeyD');
  await waitTime(page, 1.3);
  expect((await state(page)).attackSerial).toBe(2);
  expect((await state(page)).attack).toBeNull();
  await page.keyboard.up('KeyK');
  expect(errors).toEqual([]);
});

test('running attack brakes before starting and ignores extra strikes during the slide', async ({ page }) => {
  await begin(page);
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyD');
  await expect.poll(async () => (await state(page)).speed, { timeout: 15000, intervals: [20] }).toBeGreaterThan(6);
  const before = await state(page);
  await page.evaluate(() => {
    (window as any).__brakingSamples = [];
    const sample = () => {
      const current = (window as any).__prototype;
      (window as any).__brakingSamples.push(current);
      if (current.attackSerial === 0) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.keyboard.press('KeyJ');
  await expect.poll(async () => (await state(page)).attackBraking, { intervals: [10] }).toBe(true);
  await page.keyboard.press('KeyK');
  await expect.poll(async () => (await state(page)).attackSerial, { intervals: [20] }).toBe(1);
  await page.keyboard.up('KeyD'); await page.keyboard.up('ShiftLeft');
  const samples = await page.evaluate(() => (window as any).__brakingSamples);
  const slide = samples.filter((sample: any) => sample.attackBraking);
  expect(slide.length).toBeGreaterThan(0);
  expect(slide[0].speed).toBeLessThan(before.speed);
  expect(slide.every((sample: any) => sample.attack === null)).toBe(true);
  const attackStart = samples.find((sample: any) => sample.attackSerial === 1);
  expect(attackStart.speed).toBe(0);
  expect(attackStart.attack.kind).toBe('light');
  const travel = Math.hypot(attackStart.position.x - before.position.x, attackStart.position.z - before.position.z);
  expect(travel).toBeGreaterThan(0.1);
  expect(travel).toBeLessThan(1.4);
  await waitTime(page, 1);
  expect((await state(page)).attackSerial).toBe(1);
});

test('three separately timed light presses chain without creating extra swings', async ({ page }) => {
  await begin(page);
  await page.keyboard.press('KeyJ');
  for (let strike = 1; strike < 3; strike++) {
    await expect.poll(async () => {
      const current = await state(page);
      return current.attackSerial === strike && current.attack?.bufferOpen;
    }, { timeout: 15000, intervals: [20] }).toBe(true);
    await page.keyboard.press('KeyJ');
    await expect.poll(async () => (await state(page)).attackSerial, { intervals: [20] }).toBe(strike + 1);
  }
  await waitTime(page, 1.2);
  expect((await state(page)).attack).toBeNull();
  expect((await state(page)).attackSerial).toBe(3);
});

test('approaching the dummy allows real sword contact and one hit per strike', async ({ page }) => {
  await begin(page);
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyA');
  await expect.poll(async () => {
    const current = await state(page);
    return Math.hypot(current.position.x - current.dummy.x, current.position.z - current.dummy.z);
  }, { timeout: 20000, intervals: [50] }).toBeLessThan(2.3);
  await page.keyboard.up('KeyW'); await page.keyboard.up('KeyA');
  await expect.poll(async () => (await state(page)).speed, { intervals: [20] }).toBe(0);
  const before = await state(page);
  await page.keyboard.press('KeyJ');
  await expect.poll(async () => (await state(page)).dummy.health, { timeout: 15000, intervals: [20] }).toBe(82);
  await waitTime(page, 0.7);
  const after = await state(page);
  expect(after.dummy.hits).toBe(1);
  expect(Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z)).toBeLessThanOrEqual(0.43);
  await page.keyboard.press('KeyK');
  await expect.poll(async () => (await state(page)).dummy.health, { timeout: 15000, intervals: [20] }).toBe(44);
  await waitTime(page, 0.7);
  expect((await state(page)).dummy.hits).toBe(2);
  await page.screenshot({ path: 'artifacts/sword-practice.png' });
});
