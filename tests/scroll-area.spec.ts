import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import { ScrollArea, ScrollBar } from '../src/scroll-area';

test('scroll primitives are SSR-safe and expose their controlled accessibility contract',()=>{
  expect(typeof window).toBe('undefined');
  const html=renderToStaticMarkup(createElement(ScrollBar,{label:'Source bar',controls:'content',value:25,max:100,pageSize:50,onValueChange:()=>{}}));
  expect(html).toContain('role="scrollbar"');expect(html).toContain('aria-controls="content"');expect(html).toContain('aria-valuenow="25"');
  const invalid=renderToStaticMarkup(createElement(ScrollBar,{label:'Empty bar',controls:'content',value:NaN,max:-1,pageSize:Infinity,onValueChange:()=>{}}));
  expect(invalid).toContain('aria-valuemax="0"');expect(invalid).toContain('aria-disabled="true"');expect(invalid).not.toContain('NaN');
  expect(renderToStaticMarkup(createElement(ScrollArea,{label:'Static region'},'Content'))).toContain('role="region"');
  expect(()=>renderToStaticMarkup(createElement(ScrollArea,{scale:1.5}))).toThrow(RangeError);
});

test.describe('native scroll composition',()=>{
  test.beforeEach(async({page})=>{
    await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator('[data-scroll-fixture]')).toBeVisible();
    await expect(page.getByRole('scrollbar',{name:'Quest log: vertical',exact:true})).toBeVisible();
  });
  test('controlled keys, track paging, disabled and prevented inputs preserve state',async({page})=>{
    const vertical=page.getByRole('scrollbar',{name:'Controlled vertical',exact:true});
    await vertical.focus();await vertical.press('End');await expect(vertical).toHaveAttribute('aria-valuenow','400');
    await vertical.press('PageUp');await expect(vertical).toHaveAttribute('aria-valuenow','300');
    await vertical.press('ArrowUp');await expect(vertical).toHaveAttribute('aria-valuenow','270');
    await vertical.press('Home');await expect(vertical).toHaveAttribute('aria-valuenow','0');
    await vertical.click({position:{x:8,y:180}});await expect(vertical).toHaveAttribute('aria-valuenow','100');
    await vertical.click({position:{x:8,y:5}});await expect(vertical).toHaveAttribute('aria-valuenow','0');
    const horizontal=page.getByRole('scrollbar',{name:'Controlled horizontal',exact:true});
    await horizontal.focus();await horizontal.press('ArrowRight');await expect(horizontal).toHaveAttribute('aria-valuenow','130');
    await horizontal.press('ArrowDown');await expect(horizontal).toHaveAttribute('aria-valuenow','130');
    const disabled=page.getByRole('scrollbar',{name:'Disabled source',exact:true});await expect(disabled).toHaveAttribute('aria-disabled','true');await expect(disabled).toHaveAttribute('tabindex','-1');
    await disabled.click({force:true});await expect(disabled).toHaveAttribute('aria-valuenow','50');
    const prevented=page.getByRole('scrollbar',{name:'Prevented source',exact:true});await prevented.focus();await prevented.press('End');await prevented.click({position:{x:8,y:90}});await expect(prevented).toHaveAttribute('aria-valuenow','100');
    await expect(page.getByRole('status',{name:'Scroll fixture events'})).toBeEmpty();
  });
  test('pointer capture drags outside the thumb and pointercancel stops updates',async({page})=>{
    const bar=page.getByRole('scrollbar',{name:'Controlled vertical',exact:true}),thumb=bar.locator('.mc-scrollbar__thumb');
    await bar.scrollIntoViewIfNeeded();const box=await thumb.boundingBox();expect(box).not.toBeNull();
    await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();
    await expect(bar).toHaveAttribute('data-dragging','true');
    await page.mouse.move(box!.x+box!.width/2+60,box!.y+box!.height/2+64,{steps:4});
    await expect.poll(async()=>Number(await bar.getAttribute('aria-valuenow'))).toBeGreaterThan(250);
    await bar.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',isPrimary:true});await expect(bar).not.toHaveAttribute('data-dragging','true');
    const cancelled=await bar.getAttribute('aria-valuenow');await page.mouse.move(box!.x+90,box!.y+150);await page.mouse.up();
    await expect(bar).toHaveAttribute('aria-valuenow',cancelled!);
  });
  test('native scroll refs and wheel synchronize the controlled visual bar',async({page})=>{
    const viewport=page.getByRole('region',{name:'Quest log',exact:true}),bar=page.getByRole('scrollbar',{name:'Quest log: vertical',exact:true});
    await page.getByRole('button',{name:'Read scroll refs',exact:true}).click();await expect(page.getByRole('status',{name:'Scroll fixture events'})).toHaveText('DIV|true');
    await page.getByRole('button',{name:'Native scroll to 200',exact:true}).click();await expect(bar).toHaveAttribute('aria-valuenow','200');
    await viewport.evaluate(node=>{node.scrollTop=0;});await expect(bar).toHaveAttribute('aria-valuenow','0');
    await viewport.hover();await page.mouse.wheel(0,180);await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
    await expect.poll(async()=>Number(await bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    await expect(bar).toHaveAttribute('aria-controls',(await viewport.getAttribute('id'))!);
    // A bar is a sibling of the native viewport, so its own wheel needs to
    // control that viewport. Content wheel still uses the native path above.
    await viewport.evaluate(node=>{node.scrollTop=0;});await expect(bar).toHaveAttribute('aria-valuenow','0');
    await bar.hover();await page.mouse.wheel(0,80);await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
  });
  test('viewport native keys stay native and child editable controls retain their keys',async({page})=>{
    const viewport=page.getByRole('region',{name:'Quest log',exact:true}),bar=page.getByRole('scrollbar',{name:'Quest log: vertical',exact:true});
    await viewport.focus();await viewport.press('PageDown');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
    await viewport.press('End');await expect.poll(async()=>Math.abs(Number(await bar.getAttribute('aria-valuemax'))-await viewport.evaluate(node=>node.scrollTop))).toBeLessThan(1);
    await viewport.press('Home');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBe(0);
    const note=page.getByRole('textbox',{name:'Quest note',exact:true});await note.focus();await note.press('Home');await note.press('ArrowRight');
    expect(await note.evaluate((node:HTMLInputElement)=>node.selectionStart)).toBe(1);expect(await viewport.evaluate(node=>node.scrollTop)).toBe(0);
  });
  test('both native axes and horizontal-only page keys synchronize independently',async({page})=>{
    const both=page.getByRole('region',{name:'Map region',exact:true});
    await both.evaluate(node=>{node.scrollTop=120;node.scrollLeft=140;});
    await expect(page.getByRole('scrollbar',{name:'Map region: vertical',exact:true})).toHaveAttribute('aria-valuenow','120');
    await expect(page.getByRole('scrollbar',{name:'Map region: horizontal',exact:true})).toHaveAttribute('aria-valuenow','140');
    const horizontal=page.getByRole('region',{name:'Hotbar region',exact:true}),bar=page.getByRole('scrollbar',{name:'Hotbar region: horizontal',exact:true});
    await horizontal.focus();await horizontal.press('End');await expect(bar).toHaveAttribute('aria-valuenow',(await bar.getAttribute('aria-valuemax'))!);
    await horizontal.press('Home');await expect(bar).toHaveAttribute('aria-valuenow','0');
    await horizontal.press('PageDown');await expect(bar).toHaveAttribute('aria-valuenow','260');
    // Direction changes are observed on a viewport resize; DOM offsets stay signed.
    await horizontal.evaluate((node:HTMLElement)=>{node.dir='rtl';node.style.width='259px';});
    await expect(bar).toHaveAttribute('dir','rtl');await horizontal.press('End');
    expect(await horizontal.evaluate(node=>node.scrollLeft)).toBeLessThan(0);
    await expect(bar).toHaveAttribute('aria-valuenow',(await bar.getAttribute('aria-valuemax'))!);
  });
  test('content and viewport resize update ranges, thumb extents and auto visibility',async({page})=>{
    const bar=page.getByRole('scrollbar',{name:'Resizable region: vertical',exact:true}),viewport=page.getByRole('region',{name:'Resizable region',exact:true});
    await expect(bar).toHaveAttribute('aria-valuemax','210');const thumb=bar.locator('.mc-scrollbar__thumb'),before=(await thumb.boundingBox())!.height;
    await page.getByRole('button',{name:'Grow scroll content',exact:true}).click();await expect(bar).toHaveAttribute('aria-valuemax','760');
    expect((await thumb.boundingBox())!.height).toBeLessThan(before);
    await page.getByRole('button',{name:'Resize scroll viewport',exact:true}).click();await expect(bar).toHaveAttribute('aria-valuemax','700');
    await viewport.evaluate(node=>{node.scrollTop=600;});await expect(bar).toHaveAttribute('aria-valuenow','600');
    await page.getByRole('button',{name:'Shrink scroll content',exact:true}).click();await expect(bar).toBeHidden();
    expect(await viewport.evaluate(node=>node.scrollTop)).toBe(0);
  });
  test('unmount during capture disconnects owned ResizeObservers and leaves no ghost drag',async({page})=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.evaluate(()=>{
      const Native=window.ResizeObserver,watched=new Set<Element>();
      (window as typeof window & {scrollObserved:Set<Element>}).scrollObserved=watched;
      window.ResizeObserver=class extends Native {
        own=new Set<Element>();
        observe(target:Element,options?:ResizeObserverOptions){this.own.add(target);watched.add(target);super.observe(target,options);}
        disconnect(){for(const target of this.own)watched.delete(target);this.own.clear();super.disconnect();}
      };
    });
    await page.getByRole('button',{name:'Mount disposable scroll',exact:true}).click();
    const bar=page.getByRole('scrollbar',{name:'Disposable region: vertical',exact:true});await expect(bar).toBeVisible();
    const thumb=await bar.locator('.mc-scrollbar__thumb').boundingBox();expect(thumb).not.toBeNull();
    await page.mouse.move(thumb!.x+thumb!.width/2,thumb!.y+thumb!.height/2);await page.mouse.down();await expect(bar).toHaveAttribute('data-dragging','true');
    await page.getByRole('button',{name:'Remove disposable scroll',exact:true}).evaluate((node:HTMLButtonElement)=>node.click());
    await expect(bar).toHaveCount(0);await page.mouse.move(20,20);await page.mouse.up();
    const active=await page.evaluate(()=>[...(window as typeof window & {scrollObserved:Set<Element>}).scrollObserved].filter(node=>node.closest('[data-scroll-case="disposable"]')).length);
    expect(active).toBe(0);expect(errors).toEqual([]);
  });
  test('native touch pan scrolls the viewport without a custom touch interceptor',async({page,isMobile})=>{
    test.skip(!isMobile,'Touch gesture is verified in the mobile Chromium project.');
    const viewport=page.getByRole('region',{name:'Quest log',exact:true});await viewport.scrollIntoViewIfNeeded();const box=(await viewport.boundingBox())!;
    const client=await page.context().newCDPSession(page),x=box.x+box.width-25,y=box.y+box.height-15;
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=5;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*18}]});await page.waitForTimeout(20);}
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
    await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
  });
});

test.describe('source scrollbar pixels',()=>{
  test.use({deviceScaleFactor:1});
  test('real rail and nine-slice handle retain source pixels at a fixed controlled state',async({page})=>{
    const files=[['ScrollRail','eab268e0814cb9db1e2c8e158cea2d54a9b5f07fe0b7b74f82d5a67fa32cc6be'],['ScrollHandle','f5e26f4b26c2edadd36e8a8bec2018b86558525f9920168d8d2c277bd210f46a'],['ScrollGutterWithBG','2bf03c1220f01e0825b831b64dc007c5643a20a18e33afef8c8b7744ff8b560b'],['ScrollBox','9671fab7614309dfce95b82e42a5535fe7a8e9e70cef57630070c8b5565e2105']] as const;
    const originals:PNG[]=[];for(const [file,sha]of files){const bytes=await readFile(new URL(`../.cache/references/${file}.png`,import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);originals.push(PNG.sync.read(bytes));}
    await page.goto('/calibration.html');await page.evaluate(()=>document.fonts.ready);
    await page.locator('[data-scroll-fixture]').evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'0',top:'0',right:'0',margin:'0',zIndex:'10000'}));
    const bar=page.getByRole('scrollbar',{name:'Controlled vertical',exact:true});
    await expect(bar.locator('.mc-scrollbar__thumb')).toHaveCSS('height','40px');
    // Source-backed cross geometry: default 2+4+2 game pixels, 3px
    // rail and 5px handle; container 2+4+0 with a 4px rail/handle.
    const raster=(height:number,position:number,extent:number,container=false)=>{
      const width=container ? 12 : 16,result=new PNG({width,height});
      const pixel=(source:PNG,x:number,y:number)=>[...source.data.subarray(4*(y*source.width+x),4*(y*source.width+x)+4)];
      const slice=(p:number,length:number,size:number,cut:number)=>p<cut*2 ? Math.floor(p/2) : p>=length-cut*2 ? size-cut+Math.floor((p-length+cut*2)/2) : cut;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        let color=[40,41,42,255];
        if(container && x>=4)color=pixel(originals[2]!,slice(x-4,8,3,1),slice(y,height,3,1));
        else if(!container && x>=5 && x<11)color=pixel(originals[0]!,0,0);
        const left=container ? 4 : 3,thumbWidth=container ? 8 : 10;
        if(x>=left && x<left+thumbWidth && y>=position && y<position+extent)color=pixel(originals[container ? 3 : 1]!,slice(x-left,thumbWidth,3,1),slice(y-position,extent,container ? 3 : 5,container ? 1 : 2));
        result.data.set(color,4*(y*width+x));
      }
      return result;
    };
    const compare=async(label:string,expected:PNG)=>{
      const actual=PNG.sync.read(await page.getByRole('scrollbar',{name:label,exact:true}).screenshot({scale:'css'}));expect([actual.width,actual.height]).toEqual([expected.width,expected.height]);
      let changed=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))changed++;
      if(changed){await test.info().attach(label+' actual',{body:PNG.sync.write(actual),contentType:'image/png'});await test.info().attach(label+' source-sampling',{body:PNG.sync.write(expected),contentType:'image/png'});}
      expect(changed,label+' complete original-PNG region').toBe(0);
    };
    await compare('Controlled vertical',raster(200,40,40));
    await bar.locator('.mc-scrollbar__thumb').hover();await compare('Controlled vertical',raster(200,40,40));
    await compare('Container source',raster(200,40,40,true));
    await compare('Disabled source',raster(100,10,20));
  });
});
