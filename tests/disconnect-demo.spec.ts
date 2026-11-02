import {test, expect} from '@playwright/test';

test('public demo exposes three source variants and reports real host intents', async ({page}) => {
  await page.goto('/#disconnect');
  const section = page.locator('#disconnect'), demo = section.getByTestId('disconnect-demo');
  await expect(demo).toBeVisible();
  await demo.locator('[data-disconnect-button="ok"]').click();
  await expect(demo.locator('output')).toHaveText('leave · button.menu_leave_screen');
  await demo.getByRole('combobox',{name:'断线界面'}).click();
  await page.getByRole('option',{name:'Realms 警告',exact:true}).click();
  await expect(demo.locator('.mc-disconnect-screen')).toHaveAttribute('data-source-variant','realms-warning');
  await demo.locator('[data-disconnect-button="cancel"]').click();
  await expect(demo.locator('output')).toHaveText('cancel-realm-join · button.cancel_join_realm');
  await demo.getByLabel('平台不提供商店').check();
  await expect(demo.locator('[data-disconnect-button="store"]')).toHaveCount(0);
  await demo.getByLabel('GPU 原图背景').check();
  await expect(demo.locator('.mc-disconnect-background canvas')).toHaveAttribute('data-render-state','ready',{timeout:15000});
});

test('public source frame stays inside its demo host at a narrow viewport', async ({page}) => {
  await page.setViewportSize({width:320,height:900}); await page.goto('/#disconnect');
  const section = page.locator('#disconnect'), screen = section.locator('.mc-disconnect-screen');
  await expect(screen).toBeVisible();
  const host = (await section.locator('.example-frame').boundingBox())!, frame = (await screen.boundingBox())!;
  expect(frame.x).toBeGreaterThanOrEqual(host.x); expect(frame.x+frame.width).toBeLessThanOrEqual(host.x+host.width);
});
