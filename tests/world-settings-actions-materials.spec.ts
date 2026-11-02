import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';

const material={light:['document-viewer/button_borderless_light.png','document-viewer/button_borderless_lighthover.png','document-viewer/button_borderless_lightpressed.png'],
  dark:['player-permissions/button_borderless_dark.png','player-permissions/button_borderless_darkhover.png','player-permissions/button_borderless_darkpressed.png'],
  realms:['play-screen/realmsContent.png','play-screen/realmsContentHover.png','play-screen/realmsContentPressed.png']}as const;
for(const tone of ['light','dark','realms']as const)for(const [index,state]of ['idle','hover','pressed','locked'].entries())for(const scale of [1,2]){
  test(`${tone} ${state} GUI${scale}: complete original source nine-slice plane`,async({page})=>{
    await page.goto('/demo/world-settings-actions-fixture.html');
    await page.evaluate(config=>(window as any).worldSettingsFixture.configure(config),{standalone:true,width:130,tone,scale,disabled:state==='locked'});
    // Material-only plane; text layout is a separate contract, not a masked native oracle.
    await page.addStyleTag({content:'.mc-world-settings-action__content{visibility:hidden}'});
    const button=page.locator('.mc-world-settings-action');
    await page.mouse.move(0,0);
    if(state==='hover'||state==='pressed')await button.hover();
    if(state==='pressed')await page.mouse.down();
    const sourcePath=index===3?'document-viewer/disabledButtonNoBorder.png':material[tone][index]!;
    const source=PNG.sync.read(await readFile(new URL(`../src/assets/${sourcePath}`,import.meta.url)));
    const shot=PNG.sync.read(await button.locator('.mc-world-settings-action__skins').screenshot({animations:'disabled'}));
    expect([shot.width,shot.height]).toEqual([128*scale,33*scale]);
    const axis=(physical:number,extent:number,sourceExtent:number)=>{
      const coordinate=(physical+.5)/scale;
      return coordinate<1?0:coordinate>=extent-1?sourceExtent-1:Math.min(sourceExtent-1,Math.floor(1+(coordinate-1)*(sourceExtent-2)/(extent-2)));
    };
    let different=0;
    for(let y=0;y<shot.height;y++)for(let x=0;x<shot.width;x++){
      const dst=(y*shot.width+x)*4,src=(axis(y,33,source.height)*source.width+axis(x,128,source.width))*4,a=source.data[src+3]!/255;
      const expected=[32,48,64].map((background,c)=>Math.round(source.data[src+c]!*a+background*(1-a))).concat(255);
      if(expected.some((v,c)=>shot.data[dst+c]!==v))different++;
    }
    if(state==='pressed')await page.mouse.up();
    expect(different).toBe(0);
  });
}
