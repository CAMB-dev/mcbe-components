import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import type {Locator,Page} from '@playwright/test';
import type {NpcQASettings} from '../demo/npc-fixture';
// Independent complete official npc_interact_screen.json46878B:
// SHA70ade43c1ae88ef6a3ca779bc149c1e4c5f15fa995b526832247aa70ef8a4d58.
// Whole original source bytes and inherited layout are expectations; production CSS is not an oracle.
const originals=[
  ['back_button_default','ede3778556c75a258f65a44302efdca198edbf167ccb1fd63db2a338836f25f0',15,15],
  ['back_button_hover','6687db0752fb8515005c0ae894d46801596e388d1bf841f2bc8a872db3057eb3',15,15],
  ['back_button_pressed','e41aab8770a86c1f56aaca1ac5a844a092397bbcb607775173b686e9988ca752',15,15],
  ['dialog_bubble','ad047b13bafab8d4af7b57e8d36bc74ddf727da17cbc7e69d5c824d5bdd1d554',17,18],
  ['dialog_bubble_point','865789438222328b737a5fc8c1662f24f334062f596c3d1f1904cb283ae3b27f',16,18],
  ['trash_default','4931525ef5366df2cdedf35c526ad0a22cc5b9ab2b0f07fd79d16a9f89880ec3',16,16],
  ['background_indent_no_top','8edb761296c690704873a97eb55cedf8bc33282abd97d1571fbba74fea028ab2',3,2],
  ['immersive_reader','afdb8dbfda225fd18bf4feee56ba775377df4b23a9b6f6f97a93b2e6710c5ea2',19,19],
  ['toggle_on','b37762f63652856a4c735f5adf55e511e9c01744a883ec70647b97e08a1711ff',30,16],
  ['toggle_on_hover','3ce38b76a06e672c95cb8fa4892456e4deaf482c7f6a67b8e991761421fe6b8b',30,16],
]as const;
async function configure(page:Page,patch:Partial<NpcQASettings>){await page.evaluate(value=>window.npcQA.configure(value),patch);}
async function open(page:Page,patch:Partial<NpcQASettings>={}){await page.goto('/demo/npc-fixture.html');await expect.poll(()=>page.evaluate(()=>window.npcQA?.mounted)).toBe(true);await configure(page,patch);}
async function rect(node:Locator,origin:Locator,scale:number){const a=await node.boundingBox(),b=await origin.boundingBox();expect(a).not.toBeNull();expect(b).not.toBeNull();return[(a!.x-b!.x)/scale,(a!.y-b!.y)/scale,a!.width/scale,a!.height/scale];}
function near(actual:number[],expected:readonly number[]){actual.forEach((value,index)=>expect(value).toBeCloseTo(expected[index]!,6));}
const cssURL=(value:string)=>{expect(value.startsWith('url(')).toBe(true);return value.slice(4,-1).replace(/^["']|["']$/g,'');};
async function urlBytes(page:Page,url:string){if(url.startsWith('data:'))return Buffer.from(url.slice(url.indexOf(',')+1),'base64');const response=await page.request.get(url);expect(response.ok()).toBe(true);return response.body();}
async function boundSHA(page:Page,node:Locator,pseudo:string|null,property:'backgroundImage'|'borderImageSource'){const value=await node.evaluate((node,{pseudo,property})=>getComputedStyle(node,pseudo)[property],{pseudo,property});return createHash('sha256').update(await urlBytes(page,cssURL(value))).digest('hex');}
test('NPC return states and dialogue art retain whole original PNG bytes dimensions and asymmetric raw slice metadata',async()=>{
  for(const[name,sha,width,height]of originals){const bytes=await readFile(new URL(`../src/assets/npc/${name}.png`,import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);const image=PNG.sync.read(bytes);expect([image.width,image.height]).toEqual([width,height]);}
  expect(JSON.parse(await readFile(new URL('../src/assets/npc/dialog_bubble.json',import.meta.url),'utf8'))).toEqual({nineslice_size:[8,7,6,6],base_size:[17,18]});
  expect(JSON.parse(await readFile(new URL('../src/assets/npc/background_indent_no_top.json',import.meta.url),'utf8'))).toEqual({nineslice_size:[1,0,1,1],base_size:[3,2]});
});

test('normal five-column skin grid retains160x65 source cells scissor offsets and independently bound selected frame',async({page})=>{
  await open(page,{showEditor:false,showPicker:true,showPortrait:true});const picker=page.locator('#npc-picker-host .mc-npc-skin-picker');
  expect(await page.evaluate(()=>window.npcQA.settings.columns)).toBeUndefined();
  const actors=picker.locator('[data-qa-actor]');await expect(actors).toHaveCount(5);
  await actors.evaluateAll(nodes=>{(window as unknown as{npcNormalActors:Element[]}).npcNormalActors=nodes;});
  for(const scale of[1,2]){await configure(page,{scale});near(await rect(picker,page.locator('#npc-picker-host'),scale),[0,0,301,65]);near(await rect(picker.locator('.mc-npc-skin-picker__grid'),picker,scale),[70.5,0,160,65]);for(const direction of['previous','next']){const button=picker.locator(`.mc-npc-skin-picker__${direction}`);expect([(await button.boundingBox())!.width/scale,(await button.boundingBox())!.height/scale]).toEqual([30,65]);const glyph=button.locator('.mc-npc-skin-picker__chevron');expect([(await glyph.boundingBox())!.width/scale,(await glyph.boundingBox())!.height/scale]).toEqual([4,7]);}
    for(let index=0;index<5;index++){
      const cell=picker.locator(`[data-skin-id="skin-${index}"]`),portrait=cell.locator('.mc-npc-portrait');
      near(await rect(cell,picker.locator('.mc-npc-skin-picker__grid'),scale),[32*index,0,32,65]);
      near(await rect(portrait.locator('.mc-npc-portrait__clip'),portrait,scale),[0,0,32,64]);
      near(await rect(portrait.locator('.mc-npc-portrait__model'),portrait,scale),[0,-10,32,64]);
      await expect(cell.locator('[data-qa-actor]')).toHaveAttribute('data-qa-actor',`skin-${index}`);
    }
    expect(await actors.evaluateAll(nodes=>nodes.every((node,index)=>node===(window as unknown as{npcNormalActors:Element[]}).npcNormalActors[index]))).toBe(true);
    const cell=picker.locator('[data-skin-id="skin-0"]');near(await rect(cell.locator('.mc-npc-skin-picker__selected'),cell,scale),[.5,1,31,63]);expect(await boundSHA(page,cell.locator('.mc-npc-skin-picker__selected'),null,'borderImageSource')).toBe('bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8');
  }
  const skins=await page.evaluate(()=>window.npcQA.settings.skins);await configure(page,{skins:skins.map(skin=>({...skin,selectedVisible:skin.id==='skin-1'}))});await expect(picker.locator('[data-skin-id="skin-0"] .mc-npc-skin-picker__selected')).toBeHidden();await expect(picker.locator('[data-skin-id="skin-1"] .mc-npc-skin-picker__selected')).toBeVisible();expect(await page.evaluate(()=>window.npcQA.settings.pickerValue)).toBe('skin-0');
});

test('source action template deliberately preserves252 edit plus30 expansion over a280 row and25 toggle strip',async({page})=>{
  await open(page,{showEditor:false,showAction:true});const root=page.locator('#npc-action-host .mc-npc-action-editor');for(const scale of[1,2]){await configure(page,{scale});const stack=root.locator('.mc-npc-action-editor__stack'),line=root.locator('.mc-npc-action-editor__text-row'),edit=root.locator('.mc-npc-action-editor__editbox'),expand=root.locator('.mc-npc-action-editor__expand');expect((await root.boundingBox())!.width/scale).toBe(292);expect((await stack.boundingBox())!.width/scale).toBe(280);expect((await line.boundingBox())!.width/scale).toBe(280);near(await rect(edit,line,scale),[0,0,252,50]);near(await rect(expand,line,scale),[252,0,30,50]);expect((await expand.locator('[data-gui-icon="plus"]').boundingBox())!.width/scale).toBe(15);expect((await root.locator('.mc-npc-action-editor__mode').boundingBox())!.height/scale).toBe(25);expect((await root.locator('.mc-npc-action-editor__single').boundingBox())!.height/scale).toBe(14);}
  const command=await page.evaluate(()=>window.npcQA.settings.action);for(const kind of['command','url']as const){await configure(page,{scale:1,action:{...command,kind},actionState:{errorStatus:'none'}});const line=root.locator('.mc-npc-action-editor__text-row'),single=root.locator('.mc-npc-action-editor__single'),a=(await line.boundingBox())!,b=(await single.boundingBox())!;expect(b.y-a.y-a.height).toBe(kind==='command'?32:17);}
});

test('normal teacher325x200 preserves native-observed Basic row allocation with visible Appearance and nested button offsets',async({page},testInfo)=>{
  await open(page);const teacher=page.locator('#npc-editor-host .mc-npc-editor__teacher');for(const scale of[1,2]){await configure(page,{scale});near([(await teacher.boundingBox())!.width/scale,(await teacher.boundingBox())!.height/scale],[325,200]);near(await rect(teacher.locator('.mc-npc-editor__indent'),teacher,scale),[8,23,309,169]);const basic=teacher.locator('.mc-npc-editor__basic');expect((await basic.boundingBox())!.width/scale).toBe(301);const title=await rect(teacher.locator('.mc-npc-editor__title'),teacher,scale);expect(title[1]).toBe(9);expect(title[0]!+title[2]!/2).toBe(162.5);near(await rect(basic.locator('.mc-npc-editor__name'),teacher,scale),[12,38,301,14]);near(await rect(teacher.locator('.mc-npc-close-holder'),teacher,scale),[304,-1,21,21]);near(await rect(teacher.locator('.mc-npc-editor__indent > .mc-npc-close-holder > .mc-npc-close'),teacher,scale),[302,1,21,21]);await expect(teacher.locator('.mc-npc-editor__indent > .mc-npc-close-holder > .mc-npc-close')).toHaveCSS('background-size',`${15*scale}px ${15*scale}px`);await expect(teacher.locator('.mc-npc-editor__skin > span')).toHaveCSS('opacity','0.8');}
  // Official Basic sequence and finite original-GUI5 WGC geometry independently
  // constrain managed stack allocation. Literal direct-child[-1,-10] was NOT
  // applied in that original screen. The former CSS-relative expectation is
  // retained in baseline QA history, not promoted to a native layout oracle.
  const basic=teacher.locator('.mc-npc-editor__basic'),picker=basic.locator('.mc-npc-skin-picker'),appearance=basic.locator('.mc-npc-editor__appearance-label');
  const rows:Record<string,readonly number[]>={nameLabel:[12,27,301,10],dialogueLabel:[12,53,301,10],dialogueWrapper:[12,65,301,20],appearance:[12,86,301,10],banner:[12,97,301,65],advancedWrapper:[12,162,301,20]};
  const nodes:Record<keyof typeof rows,Locator>={nameLabel:basic.locator(':scope > label'),dialogueLabel:basic.locator('.mc-npc-editor__dialogue-label'),dialogueWrapper:basic.locator('.mc-npc-editor__dialogue-button'),appearance,banner:picker,advancedWrapper:basic.locator('.mc-npc-editor__advanced-button')};
  const observations:unknown[]=[];
  for(const scale of[1,2]){
    await configure(page,{scale});
    for(const[key,expected]of Object.entries(rows))near(await rect(nodes[key]!,teacher,scale),expected);
    await expect(appearance).toBeVisible();
    const a=(await appearance.boundingBox())!,p=(await picker.boundingBox())!;
    expect((p.y-a.y-a.height)/scale).toBe(1);expect(p.x-a.x).toBe(0);
    expect(await appearance.evaluate(node=>{const box=node.getBoundingClientRect();return document.elementFromPoint(box.left+2,box.top+box.height/2)===node;})).toBe(true);
    near(await rect(picker.locator('[data-skin-id="skin-0"] .mc-npc-skin-picker__selected'),teacher,scale),[83,98,31,63]);
    await expect(picker.locator('[data-skin-id]')).toHaveCount(5);
    const buttons=[];
    for(const[selector,top]of [['.mc-npc-editor__dialogue-button',66],['.mc-npc-editor__advanced-button',164]]as const){
      const button=basic.locator(`${selector} > button`),r=await rect(button,teacher,scale);
      expect(r[1]).toBe(top);expect(r[3]).toBe(20);
      // Text-dependent inline widths are quantized on Blink's1/64 CSSpx
      // layout grid. Bound only the geometric center in CSS pixels; source
      // row endpoints/heights and the independent PNG RGBA contract stay exact.
      const centerErrorCSS=(r[0]!+r[2]!/2-162.5)*scale;
      expect(Math.abs(centerErrorCSS)).toBeLessThanOrEqual(1/64);buttons.push({selector,rect:r,centerErrorCSS});
    }
    observations.push({scale,rows,buttons});
  }
  await testInfo.attach('npc-basic-native-finite-layout',{body:JSON.stringify({observations,nativeWgc:{sha256:'e366462c87a0dfbef58a88e759491d5d1c4e0298c061e4432b1ab0c1d5aaf343',scale:5,banner:[12,97,301,65],selected:[83,98,31,63],appearanceInkLTRB:[527,632,610,672],dialogueButton:[131,66,63,20],advancedButton:[140,164,45,20]},qualification:'Whole source sequence plus finite original WGC geometric calibration only. Appearance ink is not its line box. Host font-dependent button widths are recorded rather than equated to native63/45; no exact native RGBA, camera, glyph-sampling or universal stack algorithm claim.'}),contentType:'application/json'});
});

test('advanced fit and overflowing collections converge to309301289 or reserved300292280 scopes without squeezing252 edits',async({page},testInfo)=>{
  // Match the observed non-education branch and use normal one-line host labels;
  // arbitrary fallback-font wrapping is not the native help-width oracle.
  await open(page,{page:'advanced',educationEdition:false,labels:{commandHelpA:'First help',commandHelpB:'Second help'}});
  const teacher=page.locator('#npc-editor-host .mc-npc-editor__teacher'),scroll=teacher.locator('.mc-npc-editor__advanced'),viewport=scroll.locator('.mc-scroll-area__viewport'),stack=scroll.locator('.mc-npc-editor__advanced-stack'),bar=scroll.locator('.mc-scrollbar[data-orientation="vertical"]');
  const value=await page.evaluate(()=>window.npcQA.settings.value),command={...value.actions[0]!,text:'',buttonName:'',buttonMode:false,onEnter:false,onExit:true};
  const many=[command,...Array.from({length:4},(_,index)=>({...command,id:`overflow-${index}`,text:`say ${index}`}))];
  const observations:unknown[]=[];
  for(const scale of[1,2]){
    // Native empty/help and single-command/no-help fit captures constrain the
    // no-gutter profile. Then exceed native viewport height deliberately: the
    // old9-unit gutter assertions remain mandatory for real overflow.
    for(const state of['empty','single','overflow','empty','single']as const){
      const overflow=state==='overflow',actions=state==='empty'?[]:overflow?many:[command];
      await configure(page,{scale,helpVisible:state==='empty',value:{...value,actions},actionStates:state==='single'?{command:{buttonNameVisible:false}}:{}});
      near(await rect(scroll,teacher,scale),[8,23,309,169]);
      if(overflow)await expect(bar).toBeVisible();else await expect(bar).toBeHidden();
      const width=overflow?300:309;
      await expect.poll(async()=>(await viewport.boundingBox())!.width/scale).toBe(width);
      near(await rect(viewport,teacher,scale),[8,23,width,169]);
      expect((await stack.boundingBox())!.width/scale).toBe(width-8);
      expect((await scroll.locator('.mc-npc-editor__add').boundingBox())!.width/scale).toBe(width-8);
      if(state==='empty'){
        const help=scroll.locator('.mc-npc-editor__help'),column=help.locator('.mc-npc-editor__help-column:not([hidden])'),text=column.locator('.mc-npc-editor__help-text');
        expect((await rect(help,teacher,scale))[1]).toBe(27);
        expect((await help.boundingBox())!.height/scale).toBe(37);
        expect((await column.boundingBox())!.height/scale).toBe(37);
        const textBox=await rect(text,column,scale);expect(textBox[1]).toBe(2.5);expect(textBox[3]).toBe(32);
        const lines=text.locator('p');await expect(lines).toHaveCount(2);
        expect((await lines.nth(0).boundingBox())!.height/scale).toBe(10);
        expect((await lines.nth(1).boundingBox())!.height/scale).toBe(10);
        expect((await rect(lines.nth(1),text,scale))[1]).toBe(22);
        expect((await rect(scroll.locator('.mc-npc-editor__add'),teacher,scale))[1]).toBe(76);
      }
      if(actions.length){
        const row=scroll.locator('[data-npc-action-id="command"]');
        expect((await row.boundingBox())!.width/scale).toBe(width-8);
        expect((await row.locator('.mc-npc-action-editor__stack').boundingBox())!.width/scale).toBe(width-20);
        expect((await row.locator('.mc-npc-action-editor__editbox').boundingBox())!.width/scale).toBe(252);
        expect((await row.locator('.mc-npc-action-editor__expand').boundingBox())!.width/scale).toBe(30);
        expect((await rect(scroll.locator('.mc-npc-editor__actions'),stack,scale))[1]).toBe(16);
      }
      if(overflow){
        expect([(await bar.boundingBox())!.width/scale,(await bar.boundingBox())!.height/scale]).toEqual([9,161]);
        expect((await bar.locator('.mc-scrollbar__track').boundingBox())!.width/scale).toBe(3);
        expect((await bar.locator('.mc-scrollbar__thumb').boundingBox())!.width/scale).toBe(5);
        await bar.focus();await bar.press('End');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
        await bar.press('Home');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBe(0);
      }else{
        expect(await viewport.evaluate(node=>node.scrollHeight<=node.clientHeight)).toBe(true);
        await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBe(0);
      }
      observations.push({scale,state,viewportWidth:width,stackWidth:width-8,templateWidth:actions.length?width-20:null,collectionCount:actions.length});
    }
  }
  await configure(page,{scale:1,helpVisible:false,value:{...value,actions:[command]},actionStates:{},maximizedActionId:'command'});near(await rect(teacher.locator('[data-npc-action-id="command"] .mc-npc-action-editor__editbox'),teacher,1),[8,23,309,169]);
  // Exercise the real accepted navigation lifecycle, not only initial compact
  // and initial maximized styles. React's unchanged default axis values must
  // survive the temporary override on this same native viewport node.
  await configure(page,{scale:1,helpVisible:false,value:{...value,actions:many},actionStates:{},maximizedActionId:null});
  await expect(bar).toBeVisible();await expect(viewport).toHaveCSS('overflow-x','hidden');await expect(viewport).toHaveCSS('overflow-y','auto');
  await viewport.evaluate(node=>{(window as unknown as{npcLifecycleViewport:Element}).npcLifecycleViewport=node;});
  await scroll.locator('[data-npc-action-id="command"] .mc-npc-action-editor__expand').click();
  await expect.poll(()=>page.evaluate(()=>window.npcQA.settings.maximizedActionId)).toBe('command');
  await expect(viewport).toHaveCSS('overflow-x','visible');await expect(viewport).toHaveCSS('overflow-y','visible');
  near(await rect(teacher.locator('[data-npc-action-id="command"] .mc-npc-action-editor__editbox'),teacher,1),[8,23,309,169]);
  const minimize=teacher.locator('.mc-npc-editor__indent > .mc-npc-close-holder > .mc-npc-close');
  await expect(minimize).toHaveAccessibleName('Minimize action');await minimize.click();
  await expect.poll(()=>page.evaluate(()=>window.npcQA.settings.maximizedActionId)).toBeNull();
  expect(await viewport.evaluate(node=>node===(window as unknown as{npcLifecycleViewport:Element}).npcLifecycleViewport&&window.npcQA.refs.advancedViewport===node)).toBe(true);
  await expect(viewport).toHaveCSS('overflow-x','hidden');await expect(viewport).toHaveCSS('overflow-y','auto');
  await expect(bar).toBeVisible();near(await rect(viewport,teacher,1),[8,23,300,169]);
  expect((await scroll.locator('[data-npc-action-id="command"] .mc-npc-action-editor__editbox').boundingBox())!.width).toBe(252);
  await bar.focus();await bar.press('End');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
  const lifecycle=await viewport.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.bottom+2);return{overflowX:getComputedStyle(node).overflowX,overflowY:getComputedStyle(node).overflowY,scrollTop:node.scrollTop,maxScroll:node.scrollHeight-node.clientHeight,actionHitBelowClip:!!hit?.closest('[data-npc-action-id]')};});
  expect(lifecycle.actionHitBelowClip).toBe(false);expect(lifecycle.scrollTop).toBe(lifecycle.maxScroll);
  await bar.press('Home');await expect.poll(()=>viewport.evaluate(node=>node.scrollTop)).toBe(0);
  await testInfo.attach('npc-advanced-fit-overflow-scopes',{body:JSON.stringify({observations,lifecycle,nativeFitWgc:['3d4e923352a7689c333e49d069082bdd0bdd4793f912f8a48477331f98e38720','f8049e97490b09fd157687539e4548480d4554bbc64d6f1672181b77d22f904f'],qualification:'Two finite original fit-state WGC captures constrain301-wide Add/card. Source normal309 parent, nestedminus8/minus12 and explicit9 scrollbar reservation are kept separate. Overflow keyboard/resize and accepted maximize/minimize lifecycle convergence are Web behavior; no native RGBA or hidden-engine controller claim.'}),contentType:'application/json'});
});

test('student inner97 section222 bubble80 portrait and207 viewport are source formulas while outer height is declared Web policy',async({page},testInfo)=>{
  await open(page,{showEditor:false,showDialogue:true,dialogueLayout:{contentTop:24,contentInset:8,titleTop:9,bottomPadding:8}});const root=page.locator('#npc-dialogue-host .mc-npc-dialogue');for(const scale of[1,2]){await configure(page,{scale});expect((await root.boundingBox())!.width/scale).toBe(320);expect((await root.locator('.mc-npc-dialogue__content').boundingBox())!.width/scale).toBe(304);const message=root.locator('.mc-npc-dialogue__message');expect((await message.boundingBox())!.height/scale).toBe(97);near(await rect(message.locator('.mc-npc-dialogue__portrait'),message,scale),[0,0,80,97]);near(await rect(message.locator('.mc-npc-dialogue__bubble'),message,scale),[82,0,222,97]);near(await rect(message.locator('.mc-npc-dialogue__point'),message,scale),[67,39.5,16,18]);near(await rect(message.locator('.mc-npc-dialogue__scroll'),message.locator('.mc-npc-dialogue__bubble'),scale),[5,4.5,212,86]);expect([(await message.locator('.mc-scroll-area__viewport').boundingBox())!.width/scale,(await message.locator('.mc-scroll-area__viewport').boundingBox())!.height/scale]).toEqual([207,86]);for(const cell of await root.locator('.mc-npc-dialogue__button-cell').all()){expect((await cell.boundingBox())!.height/scale).toBe(20);expect((await cell.locator('button').boundingBox())!.height/scale).toBe(18);}}
  const initialHeight=(await root.boundingBox())!.height/2;const actions=await page.evaluate(()=>window.npcQA.settings.dialogueActions);await configure(page,{dialogueActions:[...actions,...actions.map(item=>({...item,id:`extra-${item.id}`}))]});expect((await root.boundingBox())!.height/2-initialHeight).toBe(20);await testInfo.attach('student-source-versus-host-sizing',{body:JSON.stringify({source:{contentWidth:304,section:97,portraitWidth:80,bubbleWidth:222,point:[16,18],scroll:[212,86],viewport:[207,86]},host:{contentTop:24,contentInset:8,titleTop:9,bottomPadding:8,additionalRowHeight:20},qualification:'Inner source formulas only; content-size circular outerheight, global top/title defaults and hidden-child fitting have not been recovered from native engine.'}),contentType:'application/json'});
});

test('reachable NPC branches bind whole original bubble banner toggle reader and notification art with forced-color readability',async({page})=>{
  await open(page,{showEditor:false,showDialogue:true,showAction:true,showPicker:true,worldBuilder:false});const dialogue=page.locator('#npc-dialogue-host .mc-npc-dialogue'),action=page.locator('#npc-action-host .mc-npc-action-editor'),picker=page.locator('#npc-picker-host .mc-npc-skin-picker');
  expect(await boundSHA(page,dialogue.locator('.mc-npc-dialogue__bubble'),'::before','borderImageSource')).toBe(originals[3][1]);expect(await boundSHA(page,dialogue.locator('.mc-npc-dialogue__point'),null,'backgroundImage')).toBe(originals[4][1]);expect(await boundSHA(page,dialogue.locator('.mc-npc-dialogue__skin'),null,'borderImageSource')).toBe('45e365955de8800424ea35bfa589ca38535df6211c10d24bcde280cae09dc69f');expect(await boundSHA(page,picker,'::before','borderImageSource')).toBe('41c874a8ffb72a40b0404c6955388aed577aabc74118729336604c376689748f');
  const reader=dialogue.getByRole('button',{name:'Immersive Reader',exact:true});expect(createHash('sha256').update(await urlBytes(page,(await reader.locator('img').getAttribute('src'))!)).digest('hex')).toBe(originals[7][1]);
  const command=await page.evaluate(()=>window.npcQA.settings.action);await configure(page,{action:{...command,kind:'url'},actionState:{errorStatus:'InvalidUri'}});await expect(action.locator('.mc-npc-action-editor__notification')).toBeVisible();expect(await boundSHA(page,action.locator('.mc-npc-action-editor__notification'),'::before','borderImageSource')).toBe(originals[6][1]);await expect(action.locator('.mc-npc-action-editor__notification > span:last-child')).toHaveCSS('color','rgb(255, 255, 255)');
  await configure(page,{action:command,actionState:{errorStatus:'none'}});const toggle=action.getByRole('switch',{name:'Button Mode',exact:true}).locator('..');await page.mouse.move(1100,800);expect(await boundSHA(page,toggle.locator('.mc-switch'),null,'backgroundImage')).toBe(originals[8][1]);await toggle.hover();expect(await boundSHA(page,toggle.locator('.mc-switch'),null,'backgroundImage')).toBe(originals[9][1]);
  await page.emulateMedia({forcedColors:'active'});await expect(dialogue.locator('.mc-npc-dialogue__point')).toBeHidden();await reader.focus();await expect(reader).toBeFocused();await expect(reader).toHaveAccessibleName('Immersive Reader');await expect(action.getByRole('textbox',{name:'Standalone action text',exact:true})).toBeEditable();
});

test('actual back states and expand glyph tint match independent whole original PNG black POINT host planes strictly',async({page},testInfo)=>{
  await open(page,{page:'advanced',scale:2});const back=page.locator('#npc-editor-host .mc-npc-editor__teacher').getByRole('button',{name:'Back',exact:true});let pixels=0;const proofs:unknown[]=[];
  for(const[state,index]of [['default',0],['hover',1],['pressed',2]]as const){await page.mouse.move(1100,800);if(state!=='default')await back.hover();if(state==='pressed')await page.mouse.down();expect(await boundSHA(page,back,null,'backgroundImage')).toBe(originals[index][1]);await back.evaluate(node=>{(node as HTMLElement).style.backgroundColor='#000';});const actual=PNG.sync.read(await back.screenshot({caret:'initial',animations:'disabled'}));const bytes=await readFile(new URL(`../src/assets/npc/${originals[index][0]}.png`,import.meta.url));await page.evaluate(async data=>{document.getElementById('npc-source-plane')?.remove();const plane=document.createElement('div');plane.id='npc-source-plane';Object.assign(plane.style,{position:'fixed',left:'1100px',top:'500px',width:'42px',height:'42px',background:`#000 url("${data}") center / 30px 30px no-repeat`,imageRendering:'pixelated'});const image=new Image();image.src=data;await image.decode();document.body.append(plane);},`data:image/png;base64,${bytes.toString('base64')}`);const expected=PNG.sync.read(await page.locator('#npc-source-plane').screenshot({caret:'initial',animations:'disabled'}));expect([actual.width,actual.height,expected.width,expected.height]).toEqual([42,42,42,42]);let different=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))different++;expect(different).toBe(0);pixels+=actual.width*actual.height;proofs.push({kind:'back',state,pixels:actual.width*actual.height,differingPixels:different});if(state==='pressed')await page.mouse.move(1100,800);await page.mouse.up();}
  await configure(page,{showEditor:false,showAction:true});const button=page.locator('#npc-action-host .mc-npc-action-editor__expand'),icon=button.locator('[data-gui-icon="plus"]'),image=icon.locator('img');const source=await readFile(new URL('../src/assets/gui-icons/plus.png',import.meta.url));expect(createHash('sha256').update(source).digest('hex')).toBe('965fa4c152e09cdd8d61ead15b5eb2ecefd9e1c78cd49a9b652b84b78bf55f9f');await button.evaluate(node=>Object.assign((node as HTMLElement).style,{position:'fixed',left:'800px',top:'8px',zIndex:'999999'}));await image.evaluate(async node=>{(node as HTMLElement).style.backgroundColor='#000';await(node as HTMLImageElement).decode();});
  for(const[state,scalar]of [['default',.3],['hover',1],['pressed',1],['disabled',.7]]as const){if(state==='default')await page.mouse.move(0,0);if(state==='hover'||state==='pressed')await button.hover();if(state==='pressed')await page.mouse.down();if(state==='disabled')await configure(page,{disabled:true});const actual=PNG.sync.read(await image.screenshot({caret:'initial',animations:'disabled'}));await page.evaluate(async({data,scalar})=>{document.getElementById('npc-source-plane')?.remove();const image=new Image();image.id='npc-source-plane';image.src=data;Object.assign(image.style,{position:'fixed',left:'1000px',top:'180px',display:'block',width:'30px',height:'30px',backgroundColor:'#000',objectFit:'contain',imageRendering:'pixelated',filter:`brightness(${scalar})`});document.body.append(image);await image.decode();},{data:`data:image/png;base64,${source.toString('base64')}`,scalar});const expected=PNG.sync.read(await page.locator('#npc-source-plane').screenshot({caret:'initial',animations:'disabled'}));expect([actual.width,actual.height,expected.width,expected.height]).toEqual([30,30,30,30]);let different=0;for(let i=0;i<actual.data.length;i+=4)if([0,1,2,3].some(c=>actual.data[i+c]!==expected.data[i+c]))different++;expect(different).toBe(0);pixels+=actual.width*actual.height;proofs.push({kind:'plus',state,scalar,pixels:actual.width*actual.height,differingPixels:different});if(state==='pressed'){await page.mouse.move(1100,800);await page.mouse.up();}}
  await testInfo.attach('npc-whole-source-point-planes',{body:JSON.stringify({pixels,proofs,qualification:'Whole original source PNGs plus fixed source light-glyph .3/1/.7 tints on explicit CSS POINT black host planes. No production filter/RGB oracle, native shader rounding, character renderer or whole GUI certification.'}),contentType:'application/json'});
});
