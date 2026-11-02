import {test,expect} from '@playwright/test';

test('public settings parts accept host field requests and independent page navigation',async({page})=>{
 await page.goto('/#settings-source');const demo=page.getByTestId('settings-source-demo');
 const input=demo.locator('input[type=text]').first();await input.fill('Host world');
 await expect(input).toHaveValue('Host world');await expect(demo.locator('output')).toContainText('#world_name');
 await demo.getByRole('radio',{name:'多人游戏',exact:true}).click();
 await expect(demo.locator('[data-source-title=section]')).toHaveText('多人游戏设置');
 await expect(demo.getByText('连接与账号状态由宿主提供。',{exact:true})).toBeVisible();
});

test('public settings parts retain explicit dimensions inside a 320px host',async({page})=>{
 await page.setViewportSize({width:320,height:900});await page.goto('/#settings-source');
 const demo=page.getByTestId('settings-source-demo');const root=demo.locator('.mc-settings-frame');
 await expect(root).toBeVisible();
 await expect.poll(async()=>{const host=(await demo.boundingBox())!,frame=(await root.boundingBox())!;return frame.width<=host.width&&frame.x>=host.x&&frame.x+frame.width<=host.x+host.width+.01;}).toBe(true);
 expect((await root.boundingBox())!.height).toBe(340);
 expect(await root.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
});
