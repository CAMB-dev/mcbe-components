import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

// Independent source03 literal geometry/colors, on the declared content-box Web
// mapping. These bounded 2D surface domains do not certify native HBUI rendering.
const rgb=(hex:string)=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(base:number[],white:number)=>base.map(c=>Math.round(c*(1-white)+255*white));
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(1/16);

test('source switch content boxes border bevel and static thumb surface pixels retain four semantic states',async({page},info)=>{
  await page.addInitScript(()=>{window.oreQAInitial={mode:'switch',actualArt:false}});await page.goto('/demo/ore-permissions-fixture.html');await expect(page.getByRole('checkbox')).toBeAttached();const checks=[];
  for(const guiScale of [1,2])for(const state of [{checked:false,disabled:false,hover:false},{checked:true,disabled:false,hover:false},{checked:false,disabled:false,hover:true},{checked:true,disabled:true,hover:false}]){
    await page.evaluate(v=>window.oreQA.configure(v),{guiScale,...state});await page.mouse.move(1,1);if(state.hover)await page.locator('.mc-ore-switch').hover();
    const root=await page.locator('.mc-ore-switch').boundingBox(),face=await page.locator('.mc-ore-switch__thumb-face').boundingBox(),rail=await page.locator('.mc-ore-switch__rail').boundingBox();expect(root&&face&&rail).toBeTruthy();const u=5*guiScale;
    near(root!.width,6*u);near(root!.height,3.2*u);near(rail!.width,6.4*u);near(rail!.height,3.2*u);near(face!.width,3.6*u);near(face!.height,3.6*u);near(face!.x-root!.x,(state.checked?3:.2)*u);near(face!.y-root!.y,-.8*u);
    const shot=await page.screenshot(),png=PNG.sync.read(shot);let compared=0,different=0,maxDelta=0;
    const sample=(_name:string,x:number,y:number,expected:number[],height=3)=>{for(let yy=0;yy<height;yy++)for(let xx=0;xx<3;xx++){const at=(Math.floor(y+yy)*png.width+Math.floor(x+xx))*4;let bad=png.data[at+3]!==255;for(let c=0;c<3;c++){const d=Math.abs(png.data[at+c]!-expected[c]!);if(d)bad=true;maxDelta=Math.max(maxDelta,d)}compared++;if(bad)different++}};
    const fill=rgb(state.disabled?'b1b2b5':state.hover?'b1b2b5':'d0d1d4'),border=rgb(state.disabled?'58585a':'1e1e1f');
    sample('face interior',face!.x+u,face!.y+u,fill);sample('face top border',face!.x+u,face!.y,border,1);sample('face lower bevel',face!.x+u,face!.y+3.6*u,rgb(state.disabled?'8c8d90':'58585a'),1);
    // Interior strips are predeclared by the source border/specular thickness;
    // use one central pixel at scale1 where the .2rem strip is exactly one px.
    const sx=Math.floor(face!.x+u),sy=Math.floor(face!.y+.2*u),at=(sy*png.width+sx)*4,expected=mix(fill,state.hover&&!state.disabled?.8:.6);for(let c=0;c<3;c++){const d=Math.abs(png.data[at+c]!-expected[c]!);maxDelta=Math.max(maxDelta,d)}compared++;
    checks.push({guiScale,...state,compared,different,maxDelta});await info.attach(`ore-switch-${guiScale}-${state.checked}-${state.disabled}-${state.hover}.png`,{body:shot,contentType:'image/png'});
  }
  await info.attach('source-switch-domains.json',{body:JSON.stringify({scope:'source CSS numeric surfaces, known host background; no native frame or glyph qualification',checks},null,2),contentType:'application/json'});for(const c of checks){expect(c.compared).toBe(16);expect(c.maxDelta,JSON.stringify(c)).toBeLessThanOrEqual(1)}
});

test('source modal black70percent overlay and row border base selected hover palette compose independently',async({page},info)=>{
  await page.addInitScript(()=>{window.oreQAInitial={mode:'level',availableWidth:500,actualArt:false,viewportSize:[1280,1000],widgetWidth:600}});await page.goto('/demo/ore-permissions-fixture.html');await page.locator('.mc-ore-level__trigger').click();await expect(page.getByRole('dialog')).toBeVisible();await page.mouse.move(1,1);const checks:{name:string;compared:number;maxDelta:number}[]=[];
  const sample=(png:PNG,x:number,y:number,expected:number[],name:string)=>{let maxDelta=0;for(let yy=0;yy<5;yy++)for(let xx=0;xx<5;xx++){const at=((Math.floor(y)+yy)*png.width+Math.floor(x)+xx)*4;expect(png.data[at+3]).toBe(255);for(let c=0;c<3;c++)maxDelta=Math.max(maxDelta,Math.abs(png.data[at+c]!-expected[c]!))}checks.push({name,compared:25,maxDelta});expect(maxDelta,name).toBeLessThanOrEqual(1)};
  let shot=await page.screenshot(),png=PNG.sync.read(shot);sample(png,2,2,[5,10,14],'source black alpha.7 over host16/32/48');
  const dialog=await page.getByRole('dialog').boundingBox();expect(dialog!.width).toBeLessThanOrEqual(476+1/16);
  for(const [id,color]of [['visitor','58585a'],['member','313233']]as const){const b=await page.locator(`[data-ore-level="${id}"]`).boundingBox();near(b!.height,48);sample(png,b!.x+b!.width-40,b!.y+20,rgb(color),`${id} source fill`)}
  await page.locator('[data-ore-level="visitor"]').hover();shot=await page.screenshot();png=PNG.sync.read(shot);const b=await page.locator('[data-ore-level="visitor"]').boundingBox();sample(png,b!.x+b!.width-40,b!.y+20,rgb('48494a'),'source hover fill');await info.attach('ore-modal-surfaces.png',{body:shot,contentType:'image/png'});await info.attach('source-modal-domains.json',{body:JSON.stringify({checks,scope:'100 predeclared flat source pixels; not native full-screen parity'},null,2),contentType:'application/json'});
});

test('segmented selected primary and unselected secondary preserve source palettes through hover press and disabled',async({page},info)=>{
  // Source YZ/qZ assigns primary to roleOn, secondary to roleOff. Palette values
  // are pinned independently in source02 PALETTES-AND-REFERENCES, not read from CSS.
  await page.addInitScript(()=>{window.oreQAInitial={mode:'level',availableWidth:600,widgetWidth:800,viewportSize:[1440,1000],level:'custom',accept:false,actualArt:false,guiScale:2}});await page.goto('/demo/ore-permissions-fixture.html');await expect(page.locator('#qa-ore-level')).toHaveAttribute('data-presentation','segmented');
  const checks:{selected:boolean;state:string;expected:string;compared:number;different:number;maxDelta:number}[]=[];
  for(const selected of [true,false])for(const state of ['normal','hover','pressed','disabled']as const){
    await page.mouse.up();await page.mouse.move(1,1);await page.evaluate(disabled=>window.oreQA.configure({disabled}),state==='disabled');const button=page.locator(`[data-ore-level="${selected?'custom':'member'}"]`);await expect(button).toHaveAttribute('aria-checked',String(selected));
    if(state!=='normal')await button.hover();if(state==='pressed')await page.mouse.down();
    const expected=state==='disabled'?'b1b2b5':selected?({normal:'3c8527',hover:'2a641c',pressed:'1d4d13'}as const)[state]:state==='normal'?'d0d1d4':'b1b2b5';
    expect(await button.evaluate(n=>getComputedStyle(n).color)).toBe(state==='disabled'?'rgb(88, 88, 90)':selected?'rgb(255, 255, 255)':'rgb(30, 30, 31)');
    const shot=await button.screenshot(),png=PNG.sync.read(shot),color=rgb(expected);let different=0,maxDelta=0;
    // u10: source .2u border + .2u specular lies above this declared interior
    // 5x5 domain at [.8u,2u]; labels/icons live in the central content band.
    for(let y=20;y<25;y++)for(let x=8;x<13;x++){const at=(y*png.width+x)*4;let bad=false;expect(png.data[at+3]).toBe(255);for(let c=0;c<3;c++){const d=Math.abs(png.data[at+c]!-color[c]!);maxDelta=Math.max(maxDelta,d);if(d)bad=true}if(bad)different++}
    checks.push({selected,state,expected,compared:25,different,maxDelta});await info.attach(`ore-segment-${selected?'selected':'unselected'}-${state}.png`,{body:shot,contentType:'image/png'});await page.mouse.up();
  }
  await info.attach('source-segmented-domains.json',{body:JSON.stringify({scope:'Source roleOn primary/roleOff secondary. 8x25 predeclared opaque flat CSS pixels; no native framebuffer certificate.',checks},null,2),contentType:'application/json'});for(const c of checks)expect(c.maxDelta,JSON.stringify(c)).toBeLessThanOrEqual(1);
});
