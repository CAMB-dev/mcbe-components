import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { Spinner, Toast, Tooltip } from '../src/feedback';

test('feedback primitives render statically and reject invalid source-frame parameters',()=>{
  expect(typeof window).toBe('undefined');
  expect(renderToStaticMarkup(createElement(Spinner,{label:'Loading world',frame:3}))).toContain('role="status"');
  expect(renderToStaticMarkup(createElement(Spinner,{decorative:true}))).not.toContain('role="status"');
  expect(()=>renderToStaticMarkup(createElement(Spinner,{frame:10}))).toThrow(RangeError);
  expect(()=>renderToStaticMarkup(createElement(Spinner,{scale:1.5}))).toThrow(RangeError);
  const tooltip=renderToStaticMarkup(createElement(Tooltip,{content:'Description',defaultOpen:true,children:createElement('button',null,'Native control')}));
  expect(tooltip).toContain('<button>Native control</button>');expect(tooltip).not.toContain('role="tooltip"');
  const toast=renderToStaticMarkup(createElement(Toast,{open:false,onOpenChange:()=>{},title:'Saved'}));expect(toast).toContain('role="status"');expect(toast).toContain('data-state="closed"');
});

test.describe('interactive feedback',()=>{
  test.beforeEach(async({page})=>{await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);await expect(page.locator('[data-feedback-fixture]')).toBeVisible();});
  test('tooltip preserves native child ref, description and click while supporting focus and Escape',async({page})=>{
    const fixture=page.locator('[data-feedback-fixture]'),trigger=fixture.getByRole('button',{name:'Described control',exact:true});
    await fixture.getByRole('button',{name:'Read feedback refs',exact:true}).click();await expect(fixture.getByRole('status',{name:'Feedback fixture events'})).toHaveText('SPAN|BUTTON|status');
    await trigger.focus();const tip=page.getByRole('tooltip');await expect(tip).toHaveText('Native frame description');
    const description=(await trigger.getAttribute('aria-describedby'))!.split(' ');expect(description).toContain('feedback-original-description');expect(description).toContain((await tip.getAttribute('id'))!);
    await trigger.click();await expect(fixture.getByRole('status',{name:'Feedback native trigger clicks'})).toHaveText('1');
    await trigger.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0);await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-describedby','feedback-original-description');
  });
  test('tooltip remains hoverable and dismisses on outside pointer without consuming that action',async({page})=>{
    const fixture=page.locator('[data-feedback-fixture]'),trigger=fixture.getByRole('button',{name:'Described control',exact:true});
    await trigger.hover();const tip=page.getByRole('tooltip');await expect(tip).toBeVisible();await tip.hover();await page.waitForTimeout(140);await expect(tip).toBeVisible();
    await fixture.getByRole('button',{name:'Outside tooltip',exact:true}).click();await expect(tip).toHaveCount(0);await expect(fixture.getByRole('status',{name:'Feedback fixture events'})).toHaveText('outside action');
    await fixture.getByRole('button',{name:'Disabled hint',exact:true}).focus();await expect(page.getByRole('tooltip')).toHaveCount(0);
  });
  test('dialog tooltip uses its top-layer host; first Escape closes tooltip and second closes dialog',async({page})=>{
    const fixture=page.locator('[data-feedback-fixture]');await fixture.getByRole('button',{name:'Open feedback dialog',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Feedback dialog',exact:true}),hint=dialog.getByRole('button',{name:'Dialog hint',exact:true});await hint.focus();
    const tip=dialog.getByRole('tooltip');await expect(tip).toHaveText('Dialog description');
    expect(await tip.evaluate(node=>!!node.closest('dialog[open]'))).toBe(true);
    await hint.press('Escape');await expect(dialog.getByRole('tooltip')).toHaveCount(0);await expect(dialog).toBeVisible();
    await hint.press('Escape');await expect(dialog).toHaveCount(0);await expect(fixture.getByRole('button',{name:'Open feedback dialog',exact:true})).toBeFocused();
  });
  test('controlled tooltip stays inside narrow viewport bounds after native layout changes',async({page})=>{
    await page.setViewportSize({width:360,height:700});const fixture=page.locator('[data-feedback-fixture]');await fixture.getByRole('button',{name:'Open controlled tooltip',exact:true}).click();
    const tip=page.getByRole('tooltip');await expect(tip).toHaveText('Controlled description');const box=(await tip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(7);expect(box.x+box.width).toBeLessThanOrEqual(353);expect(box.y).toBeGreaterThanOrEqual(7);expect(box.y+box.height).toBeLessThanOrEqual(693);
    await page.keyboard.press('Escape');await expect(tip).toHaveCount(0);
  });
  test('a readonly background tooltip cannot swallow Escape from an active modal',async({page})=>{
    const fixture=page.locator('[data-feedback-fixture]');await fixture.getByRole('button',{name:'Show pinned background hint',exact:true}).click();await expect(page.locator('[role="tooltip"]')).toHaveText('Background controlled description');
    await fixture.getByRole('button',{name:'Open feedback dialog',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Feedback dialog',exact:true}),hint=dialog.getByRole('button',{name:'Dialog hint',exact:true});
    await hint.focus();await expect(dialog.getByRole('tooltip')).toHaveText('Dialog description');await hint.press('Escape');await expect(dialog.getByRole('tooltip')).toHaveCount(0);await expect(dialog).toBeVisible();
    await hint.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.locator('[role="tooltip"]')).toHaveText('Background controlled description');
  });
  test('mobile tap toggles descriptive content and preserves the native click; outside tap dismisses',async({page,isMobile})=>{
    test.skip(!isMobile,'Native touch path is exercised in mobile Chromium.');
    const fixture=page.locator('[data-feedback-fixture]'),trigger=fixture.getByRole('button',{name:'Touch hint',exact:true});
    await trigger.tap();await expect(page.getByRole('tooltip')).toHaveText('Tap description');await expect(fixture.getByRole('status',{name:'Feedback native trigger clicks'})).toHaveText('1');
    await fixture.getByRole('button',{name:'Outside tooltip',exact:true}).tap();await expect(page.getByRole('tooltip')).toHaveCount(0);
    await trigger.tap();await expect(page.getByRole('tooltip')).toBeVisible();await trigger.tap();await expect(page.getByRole('tooltip')).toHaveCount(0);
  });
  test('toast status owner remains mounted across show, dismiss and reopen, and actions stay native',async({page})=>{
    const fixture=page.locator('[data-feedback-fixture]'),toast=fixture.locator('[data-toast-case="ordinary"]');
    await expect(toast).toHaveAttribute('role','status');await expect(toast).toBeEmpty();await toast.evaluate(node=>node.setAttribute('data-stable-owner','original'));
    await fixture.getByRole('button',{name:'Show persistent notification',exact:true}).click();await expect(toast).toContainText('World saved');await expect(toast).toHaveAttribute('aria-live','polite');
    await toast.getByRole('button',{name:'Dismiss saved notification',exact:true}).focus();await page.keyboard.press('Enter');await expect(toast).toBeEmpty();await expect(toast).toHaveAttribute('data-stable-owner','original');
    await fixture.getByRole('button',{name:'Show persistent notification',exact:true}).click();await expect(toast).toHaveAttribute('data-stable-owner','original');await expect(toast).toContainText('Saved to this device.');
    await fixture.getByRole('button',{name:'Show action notification',exact:true}).click();await fixture.getByRole('button',{name:'Undo move',exact:true}).click();await expect(fixture.getByRole('status',{name:'Feedback fixture events'})).toHaveText('undo action');await expect(fixture.locator('[data-toast-case="action"]')).toContainText('Item moved');
  });
  test('explicit low-stakes timeout pauses on hover and resumes remaining time',async({page})=>{
    await page.clock.install();const fixture=page.locator('[data-feedback-fixture]'),toast=fixture.locator('[data-toast-case="ordinary"]');
    await fixture.getByRole('button',{name:'Show timed notification',exact:true}).click();await expect(toast).toHaveAttribute('data-state','open');await page.clock.runFor(3000);
    await toast.hover();await page.clock.runFor(10000);await expect(toast).toHaveAttribute('data-state','open');
    await page.mouse.move(0,0);await page.clock.runFor(2100);await expect(toast).toHaveAttribute('data-state','closed');
    // Closing while its dismiss button had focus must not leave a stale pause.
    await fixture.getByRole('button',{name:'Show timed notification',exact:true}).click();await toast.getByRole('button',{name:'Dismiss saved notification',exact:true}).focus();await page.keyboard.press('Enter');await expect(toast).toHaveAttribute('data-state','closed');
    await fixture.getByRole('button',{name:'Show timed notification',exact:true}).click();await page.mouse.move(0,0);await page.clock.runFor(5100);await expect(toast).toHaveAttribute('data-state','closed');
  });
  test('errors and action-bearing notifications ignore a supplied timeout',async({page})=>{
    await page.clock.install();const fixture=page.locator('[data-feedback-fixture]');
    await fixture.getByRole('button',{name:'Show action notification',exact:true}).click();await fixture.getByRole('button',{name:'Show error notification',exact:true}).click();await page.mouse.move(0,0);await page.clock.runFor(30000);
    await expect(fixture.locator('[data-toast-case="action"]')).toHaveAttribute('data-state','open');await expect(fixture.locator('[data-toast-case="error"]')).toHaveAttribute('data-state','open');
    await fixture.getByRole('button',{name:'Dismiss error notification',exact:true}).click();await expect(fixture.locator('[data-toast-case="error"]')).toBeEmpty();
  });
  test('source animation respects pause and reduced-motion without rotating invented artwork',async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});const fixture=page.locator('[data-feedback-fixture]'),image=fixture.locator('[data-feedback-case="animated"] .mc-spinner__image');
    await expect(image).toHaveCSS('animation-duration','1s');await expect(image).toHaveCSS('animation-timing-function','steps(10)');
    await fixture.getByRole('button',{name:'Pause source spinner',exact:true}).click();await expect(image).toHaveCSS('animation-play-state','paused');
    await page.emulateMedia({reducedMotion:'reduce'});await expect(image).toHaveCSS('animation-name','none');await expect(fixture.getByRole('status',{name:'World loading',exact:true})).toBeVisible();
  });
  test('Button.loading reuses the original atlas with native disabled and busy semantics',async({page})=>{
    const button=page.locator('[data-feedback-case="loading-button"]');await expect(button).toBeDisabled();await expect(button).toHaveAttribute('aria-busy','true');
    const spinner=button.locator('[data-source="loading-spin"]'),image=spinner.locator('.mc-spinner__image');
    await expect(spinner).toHaveAttribute('aria-hidden','true');await expect(spinner).toHaveCSS('border-top-width','0px');await expect(spinner).toHaveCSS('transform','none');
    const box=(await spinner.boundingBox())!;expect([box.width,box.height]).toEqual([28,28]);
    const background=await image.evaluate(node=>getComputedStyle(node).backgroundImage),bytes=Buffer.from(background.split('base64,')[1]!.split('"')[0]!.split(')')[0]!,'base64');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('024ee98b3e4d000b748aab1e4e564473bd84f423c860f2ce8c1db203770a6b10');
    await expect(button.getByRole('status')).toHaveCount(0);
  });
});

test.describe('original spinner pixels',()=>{
  test.use({deviceScaleFactor:1});
  test('all ten displayed frames are exact integer expansions of the real native atlas',async({page})=>{
    const bytes=await readFile(new URL('../.cache/references/loading_spin.png',import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe('024ee98b3e4d000b748aab1e4e564473bd84f423c860f2ce8c1db203770a6b10');const atlas=PNG.sync.read(bytes);expect([atlas.width,atlas.height]).toEqual([70,7]);
    await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);await page.locator('[data-feedback-fixture]').evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'0',top:'0',right:'0',margin:'0',zIndex:'10000'}));
    for(let frame=0;frame<10;frame++){
      const actual=PNG.sync.read(await page.locator(`[data-native-frame="${frame}"]`).screenshot({scale:'css'}));expect([actual.width,actual.height]).toEqual([28,28]);let changed=0;
      for(let y=0;y<28;y++)for(let x=0;x<28;x++){const from=4*(Math.floor(y/4)*70+frame*7+Math.floor(x/4)),to=4*(y*28+x),alpha=atlas.data[from+3]!/255;for(let c=0;c<3;c++){const expected=Math.round(atlas.data[from+c]!*alpha+[40,41,42][c]!*(1-alpha));if(actual.data[to+c]!==expected){changed++;break;}}}
      expect(changed,'native original frame '+frame+' full region').toBe(0);
    }
  });
});
