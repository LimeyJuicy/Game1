import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test('fitted knight rig preserves rest shape and plays fitted locomotion', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?model=rigged');
  await expect(page.locator('#stats')).toContainText('66 bones', { timeout: 30000 });
  await expect(page.locator('#stats')).toContainText('1 meshes · 1 skinned');
  expect(await page.evaluate(() => (window as any).__rigWorkbench.playing)).toBe(false);
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/rigged-knight-rest.png', import.meta.url)) });
  await page.goto('/?mode=animation&reference=rigged-knight');
  await expect(page.locator('#stats')).toContainText('66 bones · 43 clips', { timeout: 30000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const options = await page.locator('#clip option').evaluateAll(options => options.map(option => ({ value: (option as HTMLOptionElement).value, text: option.textContent })));
  for (const name of ['Idle_Loop','Walk_Loop','Sprint_Loop']) {
    const option = options.find(option => option.text === `${name} · supplied`)!;
    await page.selectOption('#clip', option.value);
    await page.locator('#timeline').fill(name === 'Sprint_Loop' ? '0.2' : '0.333');
    for (const [label,view] of [['Front','front'],['Side','side']] as const) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.screenshot({ path: fileURLToPath(new URL(`../reports/rigged-knight-${name}-${view}.png`, import.meta.url)) });
    }
  }
  expect(errors).toEqual([]);
});
