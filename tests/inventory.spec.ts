import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('slots distinguish empty, zero, single, stack and remaining durability',async({page})=>{
  await page.goto('/calibration.html');
  await expect(page.locator('[data-case="slot-zero"] .mc-slot')).toHaveAttribute('data-empty','true');
  await expect(page.locator('[data-case="slot-zero"] .mc-slot__item')).toBeEmpty();
  await expect(page.locator('[data-case="slot-single"] .mc-slot__count')).toHaveCount(0);
  await expect(page.locator('[data-case="slot-stack"] .mc-slot__count')).toHaveText('64');
  await expect(page.getByRole('button',{name:'Damaged tool, 75% durability'})).toBeVisible();
  await expect(page.locator('[data-case="slot-durability"] .mc-slot__durability > span')).toHaveCSS('width','18px');
});
test('item tooltip follows focus, escapes and remains accessible inside modal',async({page})=>{
  await page.goto('/calibration.html');
  const slot=page.getByRole('button',{name:'Stack of items, 64'}); await slot.focus();
  await expect(page.getByRole('tooltip')).toContainText('A useful stack.');
  await slot.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.getByRole('button',{name:'Open settings dialog'}).click();
  const modal=page.getByRole('dialog',{name:'Settings dialog'}), inside=modal.getByRole('button',{name:'Dialog item'});
  await inside.focus(); await expect(modal.getByRole('tooltip')).toContainText('Inside the dialog');
  await inside.press('Escape'); await expect(modal).toBeVisible(); await expect(page.getByRole('tooltip')).toHaveCount(0);
  await inside.press('Escape'); await expect(modal).not.toBeVisible();
});
test('inventory grid uses one tab stop and arrows skip disabled slots',async({page})=>{
  await page.goto('/calibration.html'); const grid=page.getByRole('grid',{name:'Keyboard inventory'});
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
  const first=grid.getByRole('button',{name:'First item'}),third=grid.getByRole('button',{name:'Third item'});
  await first.focus(); await first.press('ArrowRight'); await expect(third).toBeFocused();
  await third.press('ArrowDown'); await expect(grid.getByRole('button',{name:'Empty slot 6'})).toBeFocused();
  await page.keyboard.press('Control+End'); const last=grid.getByRole('button',{name:'Empty slot 9'}); await expect(last).toBeFocused();
  await last.press('Enter'); await expect(last).toHaveAttribute('aria-pressed','true');
  await expect(grid.getByRole('gridcell').last()).toHaveAttribute('aria-selected','true');
});
test('inventory secondary action and controlled workstation callbacks work',async({page})=>{
  await page.goto('/'); const grid=page.getByRole('grid',{name:'Interactive inventory'}), first=grid.getByRole('button').first();
  await first.focus(); await first.press('Shift+F10'); await expect(page.locator('.toast')).toHaveText('Secondary action: slot 1');
  const workstation=page.locator('#workstations'); const result=workstation.locator('.mc-grindstone__result');
  await result.click(); await expect(page.locator('.toast')).toHaveText('Grindstone result taken.'); await expect(result).toBeDisabled();
  await page.getByRole('button',{name:'Reset grindstone example'}).click(); await expect(result).toBeEnabled();
  await workstation.getByRole('button',{name:'Unbreaking I 3',exact:true}).click();
  await expect(page.locator('.toast')).toHaveText('Enchantment requested: unbreaking');
  await expect(workstation.getByRole('button',{name:'Fortune III 30',exact:true})).toBeDisabled();
});
test('workstations expose 27 inventory and 9 hotbar slots without page overflow',async({page},testInfo)=>{
  await page.goto('/');const station=page.locator('.mc-grindstone');
  await expect(station.getByRole('grid',{name:'Inventory',exact:true}).getByRole('gridcell')).toHaveCount(27);
  await expect(station.getByRole('grid',{name:'Hotbar',exact:true}).getByRole('gridcell')).toHaveCount(9);
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#workstations').screenshot({path:`test-results/${testInfo.project.name}-workstations.png`});
  const results=await new AxeBuilder({page}).include('#workstations').analyze();
  expect(results.violations.filter(issue=>issue.impact==='serious'||issue.impact==='critical')).toEqual([]);
});
