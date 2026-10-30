import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

// Independent stronger source hierarchy: fixed border-box inner contains its band.
// This bounded Web mapping does not certify native HBUI/provider or whole-frame parity.
const rgb=(hex:string)=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(base:number[],white:number)=>base.map(c=>Math.round(c*(1-white)+255*white));
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(1/16);

test('source switch nested border-box inner band and static surfaces retain four semantic states',async({page},info)=>{
  await page.addInitScript(()=>{window.oreQAInitial={mode:'switch',actualArt:false}});await page.goto('/demo/ore-permissions-fixture.html');await expect(page.getByRole('checkbox')).toBeAttached();const checks=[];
  for(const guiScale of [1,2])for(const state of [{checked:false,disabled:false,hover:false},{checked:true,disabled:false,hover:false},{checked:false,disabled:false,hover:true},{checked:true,disabled:true,hover:false}]){
    await page.evaluate(v=>window.oreQA.configure(v),{guiScale,...state});await page.mouse.move(1,1);if(state.hover)await page.locator('.mc-ore-switch').hover();
    const root=await page.locator('.mc-ore-switch').boundingBox(),face=await page.locator('.mc-ore-switch__thumb-face').boundingBox(),rail=await page.locator('.mc-ore-switch__rail').boundingBox();expect(root&&face&&rail).toBeTruthy();const u=5*guiScale;
    near(root!.width,6*u);near(root!.height,2.8*u);near(rail!.width,6*u);near(rail!.height,2.8*u);near(face!.width,3.2*u);near(face!.height,3.2*u);near(face!.x-root!.x,(state.checked?3:.2)*u);near(face!.y-root!.y,-.4*u);
    const top=page.locator('.mc-ore-switch__thumb-face > .mc-ore-switch__thumb-top'),bevel=page.locator('.mc-ore-switch__thumb-face > .mc-ore-switch__thumb-bevel');await expect(top).toHaveCount(1);await expect(bevel).toHaveCount(1);near((await top.boundingBox())!.height,2.4*u);near((await bevel.boundingBox())!.height,.4*u);near((await bevel.boundingBox())!.y-face!.y,2.6*u);
    const shot=await page.screenshot(),png=PNG.sync.read(shot);let compared=0,different=0,maxDelta=0;
    const sample=(_name:string,x:number,y:number,expected:number[],height=3)=>{for(let yy=0;yy<height;yy++)for(let xx=0;xx<3;xx++){const at=(Math.floor(y+yy)*png.width+Math.floor(x+xx))*4;let bad=png.data[at+3]!==255;for(let c=0;c<3;c++){const d=Math.abs(png.data[at+c]!-expected[c]!);if(d)bad=true;maxDelta=Math.max(maxDelta,d)}compared++;if(bad)different++}};
    const fill=rgb(state.disabled?'b1b2b5':state.hover?'b1b2b5':'d0d1d4'),border=rgb(state.disabled?'58585a':'1e1e1f');
    sample('face interior',face!.x+u,face!.y+u,fill);sample('face top border',face!.x+u,face!.y,border,1);sample('face lower bevel',face!.x+u,face!.y+2.6*u,rgb(state.disabled?'8c8d90':'58585a'),1);
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
  // Source04 closes qm neutral header + separate shadow, and FY neutral60
  // border.dimmest. These are new facts, not screenshot-derived expectations.
  await expect(page.locator('.mc-ore-level__modal-header')).toHaveCSS('background-color','rgb(72, 73, 74)');await expect(page.locator('.mc-ore-level__modal-header-shadow')).toHaveCSS('height','2px');await expect(page.locator('.mc-ore-level__modal-header-shadow')).toHaveCSS('background-color','rgb(49, 50, 51)');await expect(page.locator('[data-ore-level="visitor"]')).toHaveCSS('border-left-color','rgb(140, 141, 144)');await expect(page.locator('.mc-ore-level__menu-bottom-rule')).toHaveCSS('border-bottom-width','2px');await expect(page.locator('.mc-ore-level__menu-bottom-rule')).toHaveCSS('border-bottom-color','rgb(140, 141, 144)');
  // Stronger source04 closes FY/DY role neutral60 without a selected token:
  // accepted Member adds its check only. The previous pressed-color assumption
  // is preserved in the phase04 byte snapshot, not treated as native evidence.
  for(const [id,color]of [['visitor','58585a'],['member','58585a']]as const){const b=await page.locator(`[data-ore-level="${id}"]`).boundingBox();near(b!.height,48);sample(png,b!.x+b!.width-40,b!.y+20,rgb(color),`${id} source fill`)}
  await page.locator('[data-ore-level="visitor"]').hover();shot=await page.screenshot();png=PNG.sync.read(shot);const b=await page.locator('[data-ore-level="visitor"]').boundingBox();sample(png,b!.x+b!.width-40,b!.y+20,rgb('48494a'),'source hover fill');await info.attach('ore-modal-surfaces.png',{body:shot,contentType:'image/png'});await info.attach('source-modal-domains.json',{body:JSON.stringify({checks,scope:'100 predeclared flat source pixels; not native full-screen parity'},null,2),contentType:'application/json'});
});

test('source fullframe black50percent overlay and both ordinary section bevels preserve source alpha and point2rem thickness',async({page},info)=>{
  await page.setViewportSize({width:1440,height:1000});await page.addInitScript(()=>{window.oreQAInitial={actualArt:false,size:[1000,700],viewportSize:[1440,1000]}});await page.goto('/demo/ore-permissions-fixture.html');await expect(page.locator('#qa-ore-screen')).toBeAttached();
  const checks:{guiScale:number;part:string;domain:string;compared:number;different:number;maxDelta:number}[]=[];
  for(const guiScale of [2,3]){await page.evaluate(guiScale=>window.oreQA.configure({guiScale}),guiScale);await page.mouse.move(1,1);const u=5*guiScale,t=.2*u,frame=await page.locator('#qa-ore-screen').boundingBox(),shot=await page.screenshot(),pagePNG=PNG.sync.read(shot);expect(frame).not.toBeNull();
    const sample=(png:PNG,x:number,y:number,width:number,height:number,color:number[],part:string,domain:string)=>{let different=0,maxDelta=0;for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++){const at=((Math.floor(y)+yy)*png.width+Math.floor(x)+xx)*4;expect(png.data[at+3]).toBe(255);let bad=false;for(let c=0;c<3;c++){const d=Math.abs(png.data[at+c]!-color[c]!);maxDelta=Math.max(maxDelta,d);if(d)bad=true}if(bad)different++}checks.push({guiScale,part,domain,compared:width*height,different,maxDelta})};
    // The source gutters leave this declared left strip clear. Host background
    // is fixed16/32/48; only the root's black.5 overlay is composed here.
    sample(pagePNG,frame!.x+4,frame!.y+4.8*u+u,5,5,[8,16,24],'fullframe','black50 over host16/32/48');await info.attach(`ore-full-overlay-${guiScale}.png`,{body:shot,contentType:'image/png'});
    for(const [part,selector]of [['row','[data-permission-id="build"]'],['level','.mc-ore-level']]as const){const bytes=await page.locator(selector).screenshot(),png=PNG.sync.read(bytes),base=rgb('48494a');sample(png,10,0,5,t,mix(base,.1),part,'top white.1 exactly.2u');sample(png,10,t,5,2,base,part,'below top strip');sample(png,10,png.height-t,5,t,base.map(c=>Math.round(c*.7)),part,'bottom black.3 exactly.2u');sample(png,10,png.height-t-2,5,2,base,part,'above bottom strip');await info.attach(`ore-section-${part}-${guiScale}.png`,{body:bytes,contentType:'image/png'})}
  }
  await info.attach('source-overlay-bevel-domains.json',{body:JSON.stringify({source:'runtime FACTS backgroundAndRow + original gm/um CSS .2rem nonthin overlays',scope:'230 predeclared flat source CSS pixels at u10/u15. JPEG/native screenshot pixels are not reference inputs.',checks},null,2),contentType:'application/json'});expect(checks.reduce((n,c)=>n+c.compared,0)).toBe(230);for(const c of checks)expect(c.maxDelta,JSON.stringify(c)).toBeLessThanOrEqual(1);
});

test('source page header keeps fullwidth bottom specular strip and separate scene bevel across safe zones',async({page},info)=>{
  await page.setViewportSize({width:1440,height:1000});await page.addInitScript(()=>{window.oreQAInitial={actualArt:false,size:[1000,700],viewportSize:[1440,1000]}});await page.goto('/demo/ore-permissions-fixture.html');await expect(page.locator('#qa-ore-screen')).toBeAttached();
  const checks:{guiScale:number;safe:boolean;domain:string;compared:number;maxDelta:number}[]=[];
  // Independent tO/neutral20 source: nav4.4u, bottom white.2 edge.2u,
  // in-flow gray strip.4u, then external black.3 edge over root black.5.
  for(const guiScale of [1,2,5])for(const safe of [false,true]){
    await page.evaluate(v=>window.oreQA.configure(v),{guiScale,safeArea:{x:safe?.9:1,y:safe?.9:1,positionX:0,positionY:0}});await page.mouse.move(1,1);
    const u=5*guiScale,top=safe?50:0,frame=await page.locator('#qa-ore-screen').boundingBox(),header=await page.locator('.mc-ore-player-permissions__header').boundingBox();near(header!.height,top+4.8*u);
    const shot=await page.screenshot(),png=PNG.sync.read(shot);
    for(const [domain,y,color]of [['nav background',top+u,[230,232,235]],['fullwidth bottom specular',top+4.2*u,mix([230,232,235],.2)],['gray flow strip',top+4.4*u,[177,178,181]],['outside scene bevel',top+4.8*u,[16,32,48].map(c=>Math.round(c*.5*.7))]]as const){
      let maxDelta=0;for(let xx=0;xx<3;xx++){const at=(Math.floor(frame!.y+y)*png.width+Math.floor(frame!.x+4+xx))*4;expect(png.data[at+3]).toBe(255);for(let c=0;c<3;c++)maxDelta=Math.max(maxDelta,Math.abs(png.data[at+c]!-color[c]!))}checks.push({guiScale,safe,domain,compared:3,maxDelta});expect(maxDelta,`${guiScale}/${safe}/${domain}`).toBeLessThanOrEqual(1);
    }
    await info.attach(`ore-header-${guiScale}-${safe}.png`,{body:shot,contentType:'image/png'});
  }
  expect(checks.reduce((n,c)=>n+c.compared,0)).toBe(72);await info.attach('source-header-domains.json',{body:JSON.stringify({scope:'72 predeclared source-color samples over known host; not native wholeframe equality or engine alpha qualification',checks},null,2),contentType:'application/json'});
});

test('compact trigger source secondary hover changes both specular edges with the fill',async({page},info)=>{
  await page.setViewportSize({width:1440,height:1000});await page.addInitScript(()=>{window.oreQAInitial={mode:'level',availableWidth:500,widgetWidth:640,viewportSize:[1279,1000],level:'member',actualArt:false}});await page.goto('/demo/ore-permissions-fixture.html');const trigger=page.locator('.mc-ore-level__trigger'),checks=[];
  for(const guiScale of [1,2,5])for(const hovered of [false,true]){
    await page.evaluate(guiScale=>window.oreQA.configure({guiScale,viewportSize:[100*5*guiScale,1000]}),guiScale);await page.mouse.move(1,1);if(hovered)await trigger.hover();await expect(trigger).toHaveAttribute('data-hovered',String(hovered));
    const u=5*guiScale,b=await trigger.locator('.mc-ore-level__trigger-shine').boundingBox(),png=PNG.sync.read(await page.screenshot()),base=rgb(hovered?'b1b2b5':'d0d1d4');
    for(const [domain,y,color]of [['fill',b!.y+2*u,base],['top specular',b!.y,mix(base,hovered?.8:.6)],['bottom specular',b!.y+b!.height-.2*u,mix(base,hovered?.6:.4)]]as const){let maxDelta=0;for(let x=0;x<3;x++){const at=(Math.floor(y)*png.width+Math.floor(b!.x+b!.width-3*u+x))*4;expect(png.data[at+3]).toBe(255);for(let c=0;c<3;c++)maxDelta=Math.max(maxDelta,Math.abs(png.data[at+c]!-color[c]!))}checks.push({guiScale,hovered,domain,compared:3,maxDelta});expect(maxDelta,JSON.stringify(checks.at(-1))).toBeLessThanOrEqual(1)}
  }
  expect(checks.reduce((n,c)=>n+c.compared,0)).toBe(54);await info.attach('source-trigger-hover-domains.json',{body:JSON.stringify({scope:'54 source secondary specular/fill samples across GUI1/2/5; not native wholeframe or Coherent mouse transport qualification',checks},null,2),contentType:'application/json'});
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
