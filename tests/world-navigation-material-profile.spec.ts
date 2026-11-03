import{test,expect}from'@playwright/test';import type{Page}from'@playwright/test';import{readFile}from'node:fs/promises';import{PNG}from'pngjs';
const cfg=(page:Page,patch:Record<string,unknown>)=>page.evaluate(p=>(window as any).worldFixture.configure(p),patch);
const nav=(page:Page)=>page.locator('.mc-world-navigation');
const ready=async(page:Page)=>{await expect(nav(page)).toHaveAttribute('data-material-state','ready');await expect(nav(page).locator('canvas')).toHaveAttribute('data-render-state','ready');};
test.beforeEach(async({page})=>{await page.goto('/demo/world-settings-fixture.html');await page.locator('.mc-settings-frame').waitFor();await cfg(page,{screen:'navigation',width:190,context:{educationEdition:true,publish:false},raster:true});await ready(page);});

test('actual painter retains radio DOM, state skins, input ownership and bounded notifications',async({page})=>{
 const game=page.getByRole('radio',{name:'游戏',exact:true}),original=await game.elementHandle();await game.focus();await ready(page);await game.press('ArrowDown');await expect(page.getByRole('radio',{name:'课堂',exact:true})).toBeFocused();await page.getByRole('radio',{name:'课堂',exact:true}).press('Space');await ready(page);await expect(page.getByRole('radio',{name:'课堂',exact:true})).toHaveAttribute('aria-checked','true');expect(await game.evaluate((node,old)=>node===old,original)).toBe(true);
 await cfg(page,{disabled:true});await ready(page);await expect(game).toBeDisabled();await expect(game.locator('.mc-settings-navigation-section__state--locked')).toHaveCSS('display','block');
 const count=await page.evaluate(()=>(window as any).worldFixture.materialEvents.length);await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).worldFixture.materialEvents.length)).toBe(count);expect(count).toBeLessThan(40);
});
test('pointer repaint preserves source navigation and launch requests in the composed frame',async({page})=>{
 await cfg(page,{screen:'frame',width:520,context:{educationEdition:false}});await ready(page);
 for(let i=0;i<3;i++){await page.locator('[data-settings-navigation-id=multiplayer_button]').click();await expect(page.locator('[data-world-settings-source=multiplayer]')).toBeVisible();await page.locator('[data-settings-navigation-id=game_button]').click();await expect(page.locator('[data-world-settings-source=game]')).toBeVisible();}
 await page.locator('[data-world-launch-button=primary]').click();await expect.poll(()=>page.evaluate(()=>(window as any).worldFixture.events.filter((e:any)=>e.kind==='intent'&&e.target==='create_world_button').length)).toBe(1);
});
test('same-profile reactivation keeps CSS until its new actual decodes complete',async({page})=>{
 await page.evaluate(()=>{const old=createImageBitmap;(window as any).held=[];(window as any).hold=true;window.createImageBitmap=((...args:any[])=>new Promise((resolve,reject)=>{const run=()=>old.apply(window,args as any).then(resolve,reject);if((window as any).hold)(window as any).held.push(run);else run();}))as any;});
 await cfg(page,{raster:false});await expect(nav(page)).toHaveAttribute('data-material-state','css');await cfg(page,{raster:true});await expect(nav(page)).toHaveAttribute('data-material-state','loading');expect(await nav(page).evaluate(node=>node.classList.contains('mc-world-navigation--material-ready'))).toBe(false);await expect(page.locator('.mc-settings-navigation-section__paint').first()).toHaveCSS('visibility','visible');
 await expect.poll(()=>page.evaluate(()=>(window as any).held.length)).toBeGreaterThan(0);await page.evaluate(()=>{(window as any).hold=false;for(const release of(window as any).held.splice(0))release();});await ready(page);
});
test('real context loss returns CSS and explicit retry creates a ready new canvas',async({page})=>{
 await page.locator('canvas').evaluate((node:HTMLCanvasElement)=>node.getContext('webgl')!.getExtension('WEBGL_lose_context')!.loseContext());await expect(nav(page)).toHaveAttribute('data-material-state','error');await expect(page.locator('.mc-settings-navigation-section__paint').first()).toHaveCSS('visibility','visible');expect(await page.evaluate(()=>(window as any).worldFixture.materialEvents.filter((x:any)=>x.error).length)).toBe(1);
 await cfg(page,{rasterKey:1});await ready(page);await cfg(page,{mounted:false});await expect(nav(page)).toHaveCount(0);expect(await page.evaluate(()=>Object.values((window as any).worldFixture.refs).every(x=>x===null))).toBe(true);
});
test('zero-height source tree allocates no painter; fractional host extent uses declared ceil',async({page})=>{
 await cfg(page,{context:{worldSectionIncluded:false,packsSectionsIncluded:false}});await expect(nav(page)).toHaveAttribute('data-material-state','ready');await expect(nav(page).locator('canvas')).toHaveCount(0);
 await cfg(page,{width:190.25,context:{worldSectionIncluded:true,packsSectionsIncluded:true}});await ready(page);await expect(nav(page).locator('canvas')).toHaveAttribute('width','191');
});

// This compares the mounted URL-decoded painter with the existing public GPU
// engine driven by independently DOM-derived source boxes and Node PNG pixels.
// It qualifies integration/decoding, not Minecraft native rasterization.
async function compareMaterial(page:Page,scale:number,transparent:boolean,info:any){
 const descriptor=await page.evaluate(async({scale,transparent})=>{
  const n=document.querySelector('.mc-world-navigation')!,root=n.getBoundingClientRect(),images:any[]=[];
  const{settingsNavigationAssets:skins}=await import('/src/settings-navigation-assets.ts' as string),{worldNavigationAssets:icons}=await import('/src/world-navigation-assets.ts' as string),{worldActionAssets:action}=await import('/src/world-settings-assets.ts' as string);
  const rect=(e:Element)=>{const r=e.getBoundingClientRect();return[(r.x-root.x)/scale,(r.y-root.y)/scale,r.width/scale,r.height/scale];};
  const skin=(asset:any,r:number[],t=1,a=1)=>images.push({texture:asset.url,rect:r,tint:[t,t,t,1],hudOpacity:a,...(asset.metadata?.nineslice_size===undefined?{}:{nineSlice:{baseSize:asset.metadata.base_size,insets:asset.metadata.nineslice_size}})});
  const thumbnail=n.querySelector('[data-source-settings-node=world_snapshot_image]');if(thumbnail)skin(icons['textures/ui/BannersTransparent'],rect(thumbnail));
  for(const b of n.querySelectorAll<HTMLButtonElement>('button[data-world-launch-button]')){const state=['idle','hover','pressed','locked'].find(s=>getComputedStyle(b.querySelector('.mc-world-settings-action-'+s)!).display!=='none')!,realm=b.dataset.worldLaunchButton==='realms',bank=realm?[action.realms,action.realmsHover,action.realmsPressed,skins.locked]:[skins.unchecked,skins.uncheckedHover,skins.checkedHover,skins.locked],box=rect(b),i=['idle','hover','pressed','locked'].indexOf(state);skin(bank[i],rect(b.querySelector('.mc-world-settings-action__skins')!));const filter=getComputedStyle(b.querySelector('.mc-world-settings-action__outline')!).filter;skin(skins.border,box,filter==='none'?1:.075);}
  const rows=Array.from(n.querySelectorAll<HTMLButtonElement>('button[data-settings-navigation-id]')).map((b,i)=>({b,i,z:Number(getComputedStyle(b).zIndex)})).sort((a,b)=>a.z-b.z||a.i-b.i);
  for(const{b}of rows){if(b.closest('[hidden]')||getComputedStyle(b).visibility==='hidden')continue;const css=getComputedStyle(b),state=['unchecked','checked','uncheckedHover','checkedHover','locked'].find(s=>getComputedStyle(b.querySelector('.mc-settings-navigation-section__state--'+s)!).display!=='none')!,paint=b.querySelector('.mc-settings-navigation-section__paint')!,a=Number(getComputedStyle(b.querySelector('.mc-settings-navigation-section__content')!).opacity),g=Number(css.getPropertyValue('--mc-settings-navigation-glyph'));skin(skins[state],rect(b.querySelector('.mc-settings-navigation-section__state--'+state)!));skin(skins.border,rect(paint),Number(css.getPropertyValue('--mc-settings-navigation-border')));
   for(const selector of['.mc-settings-navigation-section__outline-glyph','.mc-settings-navigation-section__color-glyph','.mc-world-navigation__pack-border','.mc-world-navigation__pack-icon','.mc-world-navigation__server-outline','.mc-world-navigation__server-color']){const img=b.querySelector<HTMLImageElement>(selector);if(img&&!img.hidden&&getComputedStyle(img).display!=='none')images.push({texture:img.src,rect:rect(img),tint:[selector.includes('outline')||selector.includes('border')?g:1,selector.includes('outline')||selector.includes('border')?g:1,selector.includes('outline')||selector.includes('border')?g:1,1],hudOpacity:a});}
   const loading=b.querySelector<HTMLElement>('.mc-world-navigation__loading');if(loading)images.push({texture:icons['textures/ui/loading_bar'].url,rect:rect(loading),uvRect:[Number(loading.dataset.sourceUvFrame)/10,0,.1,1],tint:[g,g,g,1],hudOpacity:a});
  }
  return{width:Math.ceil(root.width),height:Math.ceil(root.height),guiScale:scale,images,background:transparent?{kind:'transparent'}:{kind:'solid',color:[49/255,50/255,51/255,1]}};
 },{scale,transparent});
 const decoded=new Map<string,any>();for(const image of descriptor.images){let pixels=decoded.get(image.texture);if(!pixels){const url=new URL(image.texture,'http://localhost'),data=url.protocol==='data:'?Buffer.from(image.texture.split(',')[1],'base64'):await readFile(new URL('../'+url.pathname.replace(/^\//,''),import.meta.url));const p=PNG.sync.read(data);pixels={width:p.width,height:p.height,data:Array.from(p.data)};decoded.set(image.texture,pixels);}image.texture=pixels;}
 const result=await page.evaluate(async p=>{const{renderGuiImages}=await import('/src/gui-image-webgl.ts' as string);for(const image of p.images)image.texture={...image.texture,data:new Uint8ClampedArray(image.texture.data)};const reference=renderGuiImages(p as any);try{const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl')!,raw=new Uint8Array(canvas.width*canvas.height*4);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);let different=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const a=(y*canvas.width+x)*4,b=((canvas.height-1-y)*canvas.width+x)*4;if([0,1,2,3].some(c=>reference.data[a+c]!==raw[b+c]))different++;}return{different,pixels:canvas.width*canvas.height,queue:p.images.length};}finally{reference.dispose();}},descriptor);
 await info.attach('whole-source-image-integration.json',{body:JSON.stringify({...result,nativeProof:false,reference:'existing GPU engine, independent DOM source boxes and original Node decoded RGBA'}),contentType:'application/json'});expect(result.different).toBe(0);
}
for(const scale of[1,2])for(const transparent of[false,true])test(`GUI${scale} ${transparent?'transparent':'opaque'} whole painter original PNG integration and state queue`,async({page},info)=>{
 await cfg(page,{scale,rasterTransparent:transparent});await page.locator('#before').focus();await page.mouse.move(1000,900);await ready(page);await compareMaterial(page,scale,transparent,info);
 await page.getByRole('radio',{name:'课堂',exact:true}).hover();await ready(page);await compareMaterial(page,scale,transparent,info);
 await cfg(page,{disabled:true});await ready(page);await compareMaterial(page,scale,transparent,info);
});
for(const scale of[1,2])test(`GUI${scale} ten original loading UV frames in complete mounted painter`,async({page},info)=>{
 await cfg(page,{scale,context:{pregame:false,educationEdition:false},serverVisible:true,serverIcon:'loading'});await page.getByRole('radio',{name:'服务器设置',exact:true}).hover();
 for(let loadingFrame=0;loadingFrame<10;loadingFrame++){await cfg(page,{loadingFrame});await ready(page);await compareMaterial(page,scale,false,info);}
});
for(const scale of[1,2])test(`GUI${scale} Switch instance consumes its two distinct originals`,async({page},info)=>{
 await cfg(page,{scale,context:{nxOs:true}});await page.getByRole('radio',{name:'游戏',exact:true}).hover();await ready(page);await compareMaterial(page,scale,false,info);
});
test('forced colors retains system radio borders and suppresses the decorative GPU plane',async({page})=>{
 await page.emulateMedia({forcedColors:'active'});await expect(page.locator('canvas')).toHaveCSS('display','none');await expect(page.getByRole('radio',{name:'游戏',exact:true})).toHaveCSS('border-top-width','1px');
});
