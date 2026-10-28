import { expect, test } from '@playwright/test';

test.beforeEach(async({page})=>{ await page.goto('/calibration.html'); });

test('independent option retains label, level, rune content, DOM attributes and ref',async({page})=>{
  const fixture=page.locator('[data-enchantment-fixture]');
  const option=fixture.getByRole('button',{name:'Standalone enchantment 7',exact:true});
  await expect(option).toHaveAttribute('id','standalone-enchantment');
  await expect(option).toHaveAttribute('data-enchantment-id','standalone');
  await expect(option).toHaveAttribute('data-enchantment-tier','2');
  await expect(option).toHaveAttribute('data-consumer','preserved');
  await expect(option).toHaveClass(/consumer-option/);
  await expect(option).toHaveAttribute('aria-description','Custom requirement');
  await expect(option.locator('.mc-enchanting__cost')).toHaveText('7');
  await expect(option.locator('[data-original-runes]')).toHaveText('Actual rune node');
  await fixture.getByRole('button',{name:'Focus standalone option',exact:true}).click();
  await expect(option).toBeFocused();
});

test('keyboard activation emits native click before the logical selection callback',async({page})=>{
  const fixture=page.locator('[data-enchantment-fixture]');
  const option=fixture.getByRole('button',{name:'Standalone enchantment 7',exact:true});
  await option.focus();await option.press('Enter');
  await expect(fixture.getByRole('status',{name:'Standalone option events'})).toHaveText('click|enchant:standalone');
  await option.press('Space');
  await expect(fixture.getByRole('status',{name:'Standalone option events'})).toHaveText('click|enchant:standalone|click|enchant:standalone');
});

test('disabled and preventDefault options cannot perform an enchant action',async({page})=>{
  const fixture=page.locator('[data-enchantment-fixture]');
  const locked=fixture.getByRole('button',{name:'Locked enchantment 30',exact:true});
  await expect(locked).toBeDisabled();
  await locked.evaluate((node:HTMLButtonElement)=>node.click());
  await expect(fixture.getByRole('status',{name:'Standalone option events'})).toBeEmpty();
  await fixture.getByRole('button',{name:'Prevented enchantment 3',exact:true}).click();
  await expect(fixture.getByRole('status',{name:'Standalone option events'})).toHaveText('prevented-click');
});

test('default option button does not submit its surrounding form',async({page})=>{
  const fixture=page.locator('[data-enchantment-fixture]');
  const option=fixture.getByRole('button',{name:'Default button type 1',exact:true});
  await expect(option).toHaveAttribute('type','button');
  await option.click();
  await expect(fixture.getByRole('status',{name:'Standalone form submissions'})).toHaveText('0');
});

test('table composition preserves all three option records and forwards their original ids',async({page})=>{
  const fixture=page.locator('[data-enchantment-fixture]');
  const table=fixture.getByRole('region',{name:'Composed option table'});
  const options=table.getByRole('group',{name:'Enchantments'}).getByRole('button');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0).locator('[data-table-runes]')).toHaveText('Table rune node');
  await expect(options.nth(1).locator('.mc-enchanting__runes')).toBeEmpty();
  await expect(options.nth(2)).toBeDisabled();
  await options.nth(1).click();
  await expect(fixture.getByRole('status',{name:'Standalone option events'})).toHaveText('table:table-second');
  await expect(options.nth(0)).toHaveAttribute('data-enchantment-tier','1');
  await expect(options.nth(1)).toHaveAttribute('data-enchantment-tier','2');
  await expect(options.nth(2)).toHaveAttribute('data-enchantment-tier','3');
  const box=await table.locator('.mc-enchanting__options').boundingBox();
  expect(box?.width).toBeCloseTo(212.8,1);
  expect(box?.height).toBeCloseTo(121.6,1);
});
