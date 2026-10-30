import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import type { Locator, Page } from '@playwright/test';
import type { JigsawQASettings } from '../demo/jigsaw-fixture';

// Independent original v1.26.60.5 whole bytes, not values read from production.
// resource_pack/ui/jigsaw_editor_screen.json SHA256
// 0b80bfeab1841031a1897227c02d4bbf09b82da0e6d2041dd346be0a5e98d510.
const originalImages = [
  ['StoreTopBar', 'e247c9b13bc2b67a09e8a312c7c420680899d3f6d5a1d8a6269230c9cf212a98', 3, 5],
  ['chevron_left', '6347595f4a317c028fc9160d3d1a7f5cb12ead3af205ce34453381705eac264b', 4, 7],
  ['dialog_background_hollow_4', '274740b9ceed9229f6a20c46e0d840ecfb5c3b36bcff6cc9c7970e304a2b1893', 18, 18],
  ['control', '7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab', 2, 2],
] as const;

test('four added whole original image sources retain upstream bytes and full dimensions', async () => {
  for (const [name, digest, width, height] of originalImages) {
    const bytes = await readFile(new URL(`../src/assets/jigsaw/${name}.png`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex'), name).toBe(digest);
    const png = PNG.sync.read(bytes);
    expect([png.width, png.height], name).toEqual([width, height]);
  }
  for(const[name,raw]of [['StoreTopBar',{nineslice_size:[1,0,1,4],base_size:[3,5]}],['dialog_background_hollow_4',{nineslice_size:8,base_size:[18,18]}],['control',{nineslice_size:1,base_size:[2,2]}]]as const){
    expect(JSON.parse(await readFile(new URL(`../src/assets/jigsaw/${name}.json`,import.meta.url),'utf8'))).toEqual(raw);
  }
});

async function configure(page:Page,patch:Partial<JigsawQASettings>){await page.evaluate(value=>window.jigsawQA.configure(value),patch);}
async function open(page:Page,patch:Partial<JigsawQASettings>={}){await page.goto('/demo/jigsaw-fixture.html');await expect.poll(()=>page.evaluate(()=>window.jigsawQA?.mounted)).toBe(true);await configure(page,{showPair:false,...patch});}
async function logical(node:Locator,root:Locator,scale:number){const a=await node.boundingBox(),b=await root.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();return[(a!.x-b!.x)/scale,(a!.y-b!.y)/scale,a!.width/scale,a!.height/scale];}
function near(actual:number[],expected:readonly number[]){expect(actual).toHaveLength(expected.length);actual.forEach((n,i)=>expect(n).toBeCloseTo(expected[i]!,6));}
async function urlBytes(page:Page,url:string){if(url.startsWith('data:'))return Buffer.from(url.slice(url.indexOf(',')+1),'base64');const response=await page.request.get(url);expect(response.ok()).toBe(true);return response.body();}

test('caller viewport resolves original header scroll pane and fixed footer scopes at two scales',async({page})=>{
  await open(page);const root=page.locator('#jigsaw-editor-host .mc-jigsaw');
  for(const[width,height,scale]of [[320,260,1],[360,300,2]]as const){
    await configure(page,{size:[width,height],scale});await expect(root).toHaveCSS('width',`${width*scale}px`);
    near(await logical(root,root,scale),[0,0,width,height]);
    near(await logical(root.locator('.mc-jigsaw__header'),root,scale),[0,0,width,23]);
    const title=await logical(root.locator('.mc-jigsaw__title'),root,scale);near([title[0]!,title[1]!,title[3]!],[40,6,10]);
    near(await logical(root.locator('.mc-jigsaw__scroll-frame'),root,scale),[8,26,width-16,height-72]);
    near(await logical(root.locator('.mc-jigsaw__scroll'),root,scale),[16,34,width-32,height-88]);
    near(await logical(root.locator('.mc-jigsaw__footer-wrapper'),root,scale),[8,height-46,width-16,46]);
    near(await logical(root.locator('.mc-jigsaw__footer'),root,scale),[8,height-43,width-16,40]);
    near(await logical(root.locator('.mc-jigsaw__exit-buttons'),root,scale),[16,height-35,width-32,24]);
    near(await logical(root.locator('[data-jigsaw-action="help"]'),root,scale),[width-40,height-35,24,24]);
    const help=root.locator('[data-jigsaw-action="help"] .mc-image');
    expect(await help.evaluate(node=>[(node as HTMLImageElement).naturalWidth,(node as HTMLImageElement).naturalHeight])).toEqual([15,15]);
    expect((await help.boundingBox())!.width/scale).toBe(32);expect((await help.boundingBox())!.height/scale).toBe(16);
    expect(await root.locator('.mc-jigsaw__scroll .mc-scroll-area__viewport').evaluate(node=>node.contains(document.querySelector('[data-jigsaw-action="done"]')))).toBe(false);
  }
  for(const[selector,property,digest]of [
    ['.mc-jigsaw__header','borderImageSource',originalImages[0][1]],
    ['.mc-jigsaw__scroll-frame','borderImageSource',originalImages[2][1]],
    ['.mc-jigsaw__scroll-fill','backgroundImage',originalImages[3][1]],
    ['.mc-jigsaw__footer','borderImageSource','daa6d490de8583f424e24787812c6c2921bc688a7761d9d03e93badb27ed1d77'],
  ]as const){
    const css=await root.locator(selector).evaluate((node,property)=>getComputedStyle(node)[property],property);
    expect(css.startsWith('url(')).toBe(true);const url=css.slice(4,-1).replace(/^["']|["']$/g,'');
    expect(createHash('sha256').update(await urlBytes(page,url)).digest('hex')).toBe(digest);
  }
  const helpURL=(await root.locator('[data-jigsaw-action="help"] img').getAttribute('src'))!;
  expect(createHash('sha256').update(await urlBytes(page,helpURL)).digest('hex')).toBe('9da66fe0cc5b463fe71521848fbfa1f65b1da678d254318cfad9d193939e4b43');
});

test('form source22 edits gaps priority host resolution and nine-unit scrollbar stay explicit',async({page},testInfo)=>{
  await open(page,{scale:2,size:[320,260]});const root=page.locator('#jigsaw-editor-host .mc-jigsaw'),scale=2;
  const regular=root.locator('.mc-jigsaw__content > .mc-jigsaw__field');await expect(regular).toHaveCount(4);
  for(let i=0;i<4;i++){
    const field=regular.nth(i),label=field.locator('label'),edit=field.locator('input');
    expect((await label.boundingBox())!.height/scale).toBe(10);expect((await edit.boundingBox())!.height/scale).toBe(22);
    near(await logical(field,root,scale),[20,38+i*42,271,32]);
  }
  const pair=root.locator('.mc-jigsaw-priorities');await expect(pair).toHaveAttribute('data-source-field-height','16');await expect(pair).toHaveAttribute('data-resolved-field-height','32');
  const pairFields=pair.locator('.mc-jigsaw__field'),left=(await pairFields.nth(0).boundingBox())!,right=(await pairFields.nth(1).boundingBox())!;
  expect((right.x-left.x-left.width)/scale).toBe(10);expect(left.width).toBe(right.width);
  const bar=root.locator('.mc-scrollbar[data-orientation="vertical"]');expect((await bar.boundingBox())!.width/scale).toBe(9);
  expect((await bar.locator('.mc-scrollbar__track').boundingBox())!.width/scale).toBe(3);expect((await bar.locator('.mc-scrollbar__thumb').boundingBox())!.width/scale).toBe(5);
  const viewport=root.locator('.mc-scroll-area__viewport');expect(await viewport.evaluate(node=>getComputedStyle(node).scrollbarWidth)).toBe('none');
  await viewport.evaluate(node=>{node.scrollTop=node.scrollHeight;});
  const toggle=root.locator('.mc-jigsaw__joint-switch > .mc-switch');expect((await toggle.boundingBox())!.width/scale).toBe(30);expect((await toggle.boundingBox())!.height/scale).toBe(16);
  await configure(page,{priorityFieldHeight:40});await expect(pair).toHaveAttribute('data-source-field-height','16');await expect(pair).toHaveAttribute('data-resolved-field-height','40');
  expect((await pair.boundingBox())!.height/scale).toBe(40);
  await testInfo.attach('explicit-source-and-host-priority-scope',{body:JSON.stringify({rawSourceWrapperHeight:16,childrenSource:[10,22],hostDefault:32,callerOverride:40,qualification:'Natural32 is the declared usable Web resolution, not a native layout measurement; checkbox checked-to-aligned is also an explicit Web enum contract.'}),contentType:'application/json'});
});

test('whole original chevron paints complete source POINT cells in an isolated explicit host plane',async({page},testInfo)=>{
  await open(page,{scale:2});
  const bytes=await readFile(new URL('../src/assets/jigsaw/chevron_left.png',import.meta.url)),source=PNG.sync.read(bytes);
  const image=page.locator('#jigsaw-editor-host [data-jigsaw-action="back"] .mc-image');
  expect(createHash('sha256').update(await urlBytes(page,(await image.getAttribute('src'))!)).digest('hex')).toBe(originalImages[1][1]);
  const proofs=[];
  for(const scale of[2,3]){
    await configure(page,{scale});await image.evaluate(node=>{const image=node as HTMLImageElement;image.style.position='fixed';image.style.left='1100px';image.style.top='8px';image.style.backgroundColor='#000';image.style.zIndex='999';});
    await image.evaluate(node=>(node as HTMLImageElement).decode());
    const actual=PNG.sync.read(await image.screenshot({caret:'initial',animations:'disabled'}));expect([actual.width,actual.height]).toEqual([4*scale,7*scale]);
    let differences=0;for(let y=0;y<actual.height;y++)for(let x=0;x<actual.width;x++){
      const s=(Math.floor(y/scale)*4+Math.floor(x/scale))*4,d=(y*actual.width+x)*4,a=source.data[s+3]!/255;
      const expected=[Math.round(source.data[s]!*a),Math.round(source.data[s+1]!*a),Math.round(source.data[s+2]!*a),255];
      if(expected.some((value,c)=>actual.data[d+c]!==value))differences++;
    }
    expect(differences).toBe(0);proofs.push({scale,pixels:actual.width*actual.height,differingPixels:differences});
  }
  await testInfo.attach('whole-chevron-point-host-contract',{body:JSON.stringify({proofs,scope:'Independent full original4x7PNG integer nearest cells on explicit black host plane. No captured PNG, fitted origin or native full-screen pixel claim.'}),contentType:'application/json'});
});

test('forced colors retains named actions keyboard focus and readable inputs without decorative covering',async({page})=>{
  await open(page,{scale:1});await page.emulateMedia({forcedColors:'active'});
  const root=page.locator('#jigsaw-editor-host .mc-jigsaw'),back=root.getByRole('button',{name:'Back',exact:true}),help=root.getByRole('button',{name:'Help',exact:true});
  await back.focus();await expect(back).toBeFocused();await help.focus();await expect(help).toBeFocused();
  await expect(root.locator('.mc-jigsaw__scroll-fill')).toBeHidden();
  expect(await root.locator('.mc-jigsaw__header').evaluate(node=>getComputedStyle(node).borderImageSource)).toBe('none');
  const colors=await root.locator('.mc-jigsaw__field').first().evaluate(node=>{const style=getComputedStyle(node);return{foreground:style.color};});
  const system=await page.evaluate(()=>{const probe=document.createElement('span');probe.style.color='CanvasText';probe.style.backgroundColor='Canvas';document.body.append(probe);const style=getComputedStyle(probe),result={foreground:style.color,background:style.backgroundColor};probe.remove();return result;});
  expect(colors.foreground).toBe(system.foreground);expect(system.foreground).not.toBe(system.background);
  await expect(root.locator('#editor-name')).toBeEditable();await root.locator('#editor-name').focus();await expect(root.locator('#editor-name')).toBeFocused();
});
