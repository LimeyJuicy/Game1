import { expect, test } from '@playwright/test';

for (const pattern of ['normal', 'heavy', 'unblockable']) {
  test(`${pattern} attack displays a star before its swing`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-17T12:00:00Z') });
    await page.goto('/?debug&quality=low');
    await page.clock.pauseAt(new Date('2026-11-17T12:01:00Z'));
    await page.getByRole('button', { name: 'Begin', exact: true }).click();
    await page.selectOption('#drill-pattern', pattern);
    await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
    for (let i = 0; i < 160; i++) {
      if (await page.evaluate(() => (window as any).__prototype.trainer.cue)) break;
      await page.clock.runFor(16);
    }
    const trainer = await page.evaluate(() => (window as any).__prototype.trainer);
    expect(trainer.cue).toBe(true); expect(trainer.stage).toBe('windup');
    await page.screenshot({ path: `artifacts/indicator-${pattern}.png` });
  });
}
