import {test,expect} from '@playwright/test';
test('public world actions expose source requests and EDU host state',async({page})=>{
  await page.goto('/#world-settings-actions');const demo=page.getByTestId('world-settings-actions-demo');
  await demo.locator('[data-world-launch-button=primary]').click();await expect(demo.locator('output')).toHaveText('create_world_button');
  await demo.getByRole('combobox',{name:'世界设置版本'}).click();await page.getByRole('option',{name:'Education',exact:true}).click();
  await demo.locator('[data-world-launch-button=host]').click();await expect(demo.locator('output')).toHaveText('create_world_edu_button · should_host=true');
  await demo.getByRole('button',{name:'复制世界',exact:true}).click();await expect(demo.locator('output')).toHaveText('copy_world_button');
});
test('public world actions fit the available 320px host',async({page})=>{
  await page.setViewportSize({width:320,height:900});await page.goto('/#world-settings-actions');
  const demo=page.getByTestId('world-settings-actions-demo'),box=(await demo.boundingBox())!,row=(await demo.locator('.mc-world-launch-actions').boundingBox())!;
  expect(row.x).toBeGreaterThanOrEqual(box.x);expect(row.x+row.width).toBeLessThanOrEqual(box.x+box.width);
});
