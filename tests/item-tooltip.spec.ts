import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const source = (page: Page) => page.getByTestId('tooltip-source');
async function centerSource(page: Page) {
  await page.goto('/calibration.html');
  await page.evaluate(() => document.fonts.ready);
  await source(page).evaluate(node => node.scrollIntoView({ block: 'center', inline: 'center' }));
  const bounds = await source(page).boundingBox();
  expect(bounds).not.toBeNull(); return bounds!;
}
async function rectangle(locator: Locator) {
  const box = await locator.boundingBox(); expect(box).not.toBeNull(); return box!;
}

test('item tooltip follows real mouse movement inside one slot and preserves caller callback', async ({ page }) => {
  const box=await centerSource(page), tooltip=page.getByRole('tooltip');
  await page.mouse.move(box.x+6,box.y+10);await expect(tooltip).toBeVisible();const first=await rectangle(tooltip);
  const initial=JSON.parse(await page.getByLabel('Tooltip pointer callbacks').innerText()) as { count:number };
  await page.mouse.move(box.x+22,box.y+18);const second=await rectangle(tooltip);
  expect(second.x-first.x).toBeCloseTo(16,0);expect(second.y-first.y).toBeCloseTo(8,0);
  expect(await source(page).evaluate(node=>node.matches(':hover'))).toBe(true);
  const events=JSON.parse(await page.getByLabel('Tooltip pointer callbacks').innerText()) as { count:number;x:number;y:number };
  expect(events.count).toBeGreaterThan(initial.count);expect(Math.abs(events.x-(box.x+22))).toBeLessThanOrEqual(1);expect(Math.abs(events.y-(box.y+18))).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Callback output must not enlarge the calibration layout viewport.').toBe(true);
});

test('keyboard Tab focuses the slot and anchors its described tooltip beside the slot', async ({ page }) => {
  await centerSource(page);await page.mouse.move(1,1);await page.getByTestId('tooltip-before').focus();await page.keyboard.press('Tab');
  const slot=source(page),tooltip=page.getByRole('tooltip');await expect(slot).toBeFocused();await expect(tooltip).toBeVisible();
  const box=await rectangle(slot),tip=await rectangle(tooltip);
  expect(tip.x).toBeGreaterThanOrEqual(box.x+box.width);expect(tip.x-(box.x+box.width)).toBeLessThanOrEqual(24);expect(Math.abs(tip.y-box.y)).toBeLessThanOrEqual(1);
  await expect(slot).toHaveAttribute('aria-describedby',await tooltip.getAttribute('id') ?? '');
  await page.keyboard.press('Tab');await expect(page.getByTestId('tooltip-after')).toBeFocused();await expect(tooltip).toHaveCount(0);
});

test('leaving a focused slot restores keyboard anchoring instead of retaining cursor position', async ({ page }) => {
  await centerSource(page);await page.mouse.move(1,1);await page.getByTestId('tooltip-before').focus();await page.keyboard.press('Tab');
  const slot=source(page),tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();const anchor=await rectangle(tooltip),box=await rectangle(slot);
  await page.mouse.move(box.x+6,box.y+6);await expect.poll(async()=>(await rectangle(tooltip)).y).not.toBe(anchor.y);
  await page.mouse.move(box.x+box.width+20,box.y+box.height+20);await expect(slot).toBeFocused();
  await expect.poll(async()=>(await rectangle(tooltip)).x).toBeCloseTo(anchor.x,0);await expect.poll(async()=>(await rectangle(tooltip)).y).toBeCloseTo(anchor.y,0);
});

for(const viewport of [{width:980,height:700},{width:320,height:400}])test(`tooltip remains inside viewport margins at all corners (${viewport.width}x${viewport.height})`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'Calibration must fit its viewport before pointer hit-testing.').toBe(true);
  await page.getByRole('button',{name:'Toggle tooltip viewport sources'}).click();
  for(const corner of ['top-left','top-right','bottom-left','bottom-right']) {
    await page.mouse.move(viewport.width/2,viewport.height/2);
    const slot=page.getByRole('button',{name:`Tooltip ${corner} source`,exact:true}),box=await rectangle(slot);
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);const tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();
    await expect.poll(async()=>{const tip=await rectangle(tooltip);return tip.x>=8&&tip.y>=8&&tip.x+tip.width<=viewport.width-8+.01&&tip.y+tip.height<=viewport.height-8+.01;}).toBe(true);
    expect(await tooltip.innerText()).toContain('Second explicit lore line');
  }
});

test('tooltip preserves explicit name color and lore without inventing durability text',async({page})=>{
  const box=await centerSource(page);await page.mouse.move(box.x+10,box.y+10);const tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();
  await expect(tooltip.getByText('Caller named sword',{exact:true})).toHaveCSS('color','rgb(85, 255, 255)');
  expect((await tooltip.innerText()).split('\n').filter(Boolean)).toEqual(['Caller named sword','Sharpness II','Caller supplied lore']);
  await expect(tooltip).not.toContainText(/27%|Durability:/i);
  // Remaining durability is still an existing slot/meter accessibility value.
  await expect(source(page)).toHaveAttribute('aria-label','Tooltip movement source, 27% durability');
  await expect(source(page).getByRole('meter',{includeHidden:true})).toHaveAttribute('aria-valuenow','0.27');
});

test('Escape dismissal survives further mousemove until a new hover session',async({page})=>{
  await centerSource(page);await page.getByTestId('tooltip-before').focus();await page.keyboard.press('Tab');
  const box=await rectangle(source(page)),tooltip=page.getByRole('tooltip');await page.mouse.move(box.x+8,box.y+8);await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');await expect(tooltip).toHaveCount(0);await page.mouse.move(box.x+24,box.y+24);await expect(tooltip).toHaveCount(0);
  await page.mouse.move(box.x+box.width+20,box.y+box.height+20);await page.mouse.move(box.x+12,box.y+12);await expect(tooltip).toBeVisible();
});

test('item text renderer reaches slot tooltips without replacing rich lore or accessible names',async({page})=>{
  await page.goto('/calibration.html');const slot=page.getByRole('button',{name:'Custom font source',exact:true});
  await slot.focus();const tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();
  await expect(tooltip.locator('[data-font-row="name"]')).toHaveText('Rendered item');
  await expect(tooltip.locator('[data-font-row="lore"]')).toHaveText('Rendered lore');
  await expect(tooltip.locator('[data-font-row="lore"]')).toHaveAttribute('data-font-index','0');
  await expect(tooltip.locator('strong[data-rich-lore]')).toHaveText('Rich lore');
  await expect(tooltip.locator('.mc-item-tooltip__lore').last()).toHaveText('42');
  await expect(slot).toHaveAttribute('aria-label','Custom font source');
});

test('standalone tooltip renderer overrides item rendering while preserving caller nodes',async({page})=>{
  await page.goto('/calibration.html');await page.getByRole('button',{name:'Toggle standalone text renderer'}).click();
  const tooltip=page.getByTestId('standalone-text-renderer');
  await expect(tooltip.locator('[data-override-row]')).toHaveText(['Rendered item','Rendered lore']);
  await expect(tooltip.locator('[data-font-row]')).toHaveCount(0);
  await expect(tooltip.locator('strong[data-rich-lore]')).toHaveText('Rich lore');
});

test('focused tooltip remains within the viewport when a text renderer changes its measured size',async({page})=>{
  await page.setViewportSize({width:320,height:400});await page.goto('/calibration.html');
  await page.getByRole('button',{name:'Toggle growing text source'}).click();await page.mouse.move(1,1);
  const slot=page.getByRole('button',{name:'Growing font source',exact:true});await slot.focus();
  const tooltip=page.getByRole('tooltip');await expect(tooltip).toBeVisible();const before=await rectangle(tooltip);
  await slot.press('g');await expect(slot).toBeFocused();
  await expect.poll(async()=>(await rectangle(tooltip)).width-before.width).toBeGreaterThan(150);
  await expect.poll(async()=>{const after=await rectangle(tooltip);return after.x>=8&&after.x+after.width<=312;}).toBe(true);
});
