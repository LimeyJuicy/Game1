import { test, expect } from '@playwright/test';
test('character study renders the skinned knight and representative poses without graphics errors', async ({ page }) => {
  const errors: string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('/?study');
  await expect(page.getByRole('heading',{name:'The Bat Knight'})).toBeVisible();
  await page.selectOption('#study-action','idle'); await page.waitForTimeout(500);
  await page.screenshot({path:'artifacts/character-study-front.png'});
  await page.getByRole('button',{name:'Side',exact:true}).click();
  await page.selectOption('#study-action','sprint'); await page.waitForTimeout(400);
  await page.screenshot({path:'artifacts/character-study-sprint.png'});
  await page.selectOption('#study-action','spin'); await page.waitForTimeout(250);
  await page.screenshot({path:'artifacts/character-study-backspin.png'});
  expect((await page.evaluate(()=>(window as any).__study)).bones).toBeGreaterThan(50);
  expect(errors).toEqual([]);
});
