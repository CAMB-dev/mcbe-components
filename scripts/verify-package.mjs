import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
assert(npmCli, 'Run with npm run verify:package so the current npm CLI can be reused.');
const npm = (args, cwd = root) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Build first, then test the actual packed files rather than source aliases.
npm(['run', 'build']);
const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json']))[0];
assert(!packed.files.some(file => /Mojangles[^/]*\.(ttf|otf|woff2?|ttc)$/i.test(file.path)), 'Local proprietary font must not enter the npm library.');
assert(!packed.files.some(file => /MCBE-Classic(?:-Unicode|-ASCII)?\.woff2$/i.test(file.path)), 'Local original-derived Classic fonts must stay outside the npm library.');
assert(!packed.files.some(file => /\.(?:otf|ttf|ttc)$/i.test(file.path)), 'Optional original HBUI and game font binaries must stay outside the npm library.');
assert(!packed.files.some(file => /loading-indicator\.gif$|animation-074ed0ba8c16bb30e36c\.gif$/i.test(file.path)), 'Private native loading GIF must stay outside the npm library.');
assert(!packed.files.some(file => /ascii_sga\.png$/i.test(file.path)), 'User-owned SGA atlas must not enter the npm library.');
assert(!packed.files.some(file => /(?:^|\/)glyph_[0-9a-f]{2}\.png$/i.test(file.path)), 'Private native Unicode atlas pages must stay outside the npm library.');
assert(!packed.files.some(file => /(?:^|\/)default8(?:_[12])?\.png$/i.test(file.path)), 'Private native ASCII atlas pages must stay outside the npm library.');
assert(!packed.files.some(file => /(?:^|\/)local-fonts\/unicode\//i.test(file.path)), 'Local Unicode sample metrics and provenance must stay outside the npm library.');
assert(!packed.files.some(file => /\.(?:cso|dxbc|dxil)$|\.material\.bin$/i.test(file.path)), 'Private native shader binaries must stay outside the npm library.');
assert(!packed.files.some(file => /^(?:demo|\.cache)\//.test(file.path)), 'Demo-only game assets and local references must not enter the npm library.');
const tarball = packed.filename;
const tarPath = join(root, tarball);
for (const major of [18, 19]) {
  const consumer = join(root, '.cache', `consumer-react${major}`);
  await mkdir(consumer, { recursive: true });
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: `mcbeui-consumer-react${major}`, private: true, type: 'module' }));
  npm(['install', '--no-audit', '--no-fund', tarPath, `react@^${major}.3.0`, `react-dom@^${major}.3.0`, `@types/react@^${major}.0.0`, `@types/react-dom@^${major}.0.0`], consumer);
  await writeFile(join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as ui from 'mcbeui';
const components = ['GuiIcon','InventoryScreenFrame','SurvivalInventoryScreen','RecipeBook','RecipeBookEntry','CraftingScreen','RecipeFilterToggle','BitmapText','ItemGlint','InventoryToolbar','PlayerInventoryScreen','CreativeInventory','ArmorSlot','RecipeSearch','RecipeCategoryTabs','TradeOffer','TradingScreen','MountInventory','PlayerList','TouchControls','PauseMenu','DeathScreen','SettingsPanel','LoadingScreen','AchievementToast','WorldList','ServerList','PlayerCard','PackList','PackCard','BlockPreview','BannerPreview','ActionBar','Beacon','BeaconEffect','BossBar','ChatMessage','ChatPanel','Crafter','CrafterSlot','HeldItemTooltip','KeybindingField','Loom','NavigationList','RecipeSelectionGrid','Scoreboard','SearchField','SettingRow','Spinner','StatusEffect','Stonecutter','TitleOverlay','Toast','ToggleButton','Tooltip','AirBar','Alert','Anvil','ArmorBar','Badge','BlastFurnace','BrewingIndicator','BrewingStand','Button','CartographyTable','Checkbox','Chest','Combobox','ContainerFrame','CraftingTable','Crosshair','Dialog','Dispenser','Dropper','DurabilityBar','EnchantingBook','EnchantingRunes','EnchantingTable','EnchantmentOption','ExperienceBar','FuelIndicator','Furnace','Grindstone','HealthBar','Hopper','Hotbar','HungerBar','IconButton','Image','InventoryGrid','ItemCount','ItemImage','ItemSlot','ItemTooltip','NineSlice','Panel','PixelIcon','PlayerInventory','ProcessingArrow','Progress','RadioGroup','RecipeGrid','ResultSlot','ScrollArea','ScrollBar','Select','Separator','ShulkerBox','Slider','SlotPlaceholder','SmithingTable','Smoker','Switch','Tabs','Text','TextArea','TextField','WorkstationFrame'];
const dataExports = ['bannerPatternIds','bannerDyeColors','loomPatternIds','guiIconNames','npcSkinNames','npcAppearanceOptions'];
components.push('GuiImageLayer','GuiLayer','BookReader','BookEditor','BookPage','BookPageTurnButton','SignTextSurface','SignEditor','JigsawEditor','JigsawPriorityFields','CommandBlockEditor','CommandInput','CommandOutputPanel','StructureEditor','XYZVectorInput','ServerActionForm','ServerCustomForm','NpcPortrait','NpcSkinPicker','NpcActionEditor','NpcDialogue','NpcEditor');
const rendererFunctions = ['shadeItemGlint','renderItemGlint','renderBitmapGlyphs','layoutGuiImages','renderGuiImages','layoutGuiText','renderGuiLayer','layoutGuiModel','createGuiCuboidModel','assembleGuiTextureAtlas','createNpcEntity'];
components.push('EmoteWheel','EmoteSlotPreview','EmoteWheelScreen');
components.push('DocumentViewer','DocumentHeading','DocumentParagraph');
components.push('PlayerPermissions','PermissionLevelSelect','PermissionToggleRow','PermissionPlayerRow');
assert.equal(components.length,150);
assert.equal(dataExports.length,6);
assert.equal(rendererFunctions.length,11);
assert.equal(Object.keys(ui).length,167);
assert(!Object.hasOwn(ui,'InventoryScreenFrameBase'),'Internal frame base must not become a public export.');
assert(!Object.hasOwn(ui,'ComboboxBase'),'Internal shared combobox base must not become a public export.');
assert(!Object.hasOwn(ui,'acquireSharedBitmapRenderer'),'Internal bitmap presentation leases must not become a public export.');
assert(!Object.hasOwn(ui,'workstationImageAssets'),'Internal workstation assets must not become a public export.');
assert(!Object.hasOwn(ui,'useEnchantingImageLayer'),'Internal workstation image adapter must not become a public export.');
for (const internal of ['renderPreparedGuiLayer','layoutSourceGuiLayer','packGuiHalf','packGuiUv','validateGuiTextureAtlasLayout']) assert(!Object.hasOwn(ui,internal),'Private GUI preparation must not become a public export: '+internal);
for (const internal of ['compileGuiEntitySource','layoutGuiEntity','guiEntityVertexShader','npcActorSkins','npcActorSourceFiles']) assert(!Object.hasOwn(ui,internal),'Private entity preparation must not become a public export: '+internal);
assert.deepEqual(Object.keys(ui).sort(), [...components,...dataExports,...rendererFunctions].sort());
const glintUniforms = {uvOffset:[0,0],uvScale:[1,1],uvRotation:[0,0],glintColor:[.25,.25,.25]};
const glintTexture = {width:1,height:1,data:new Uint8ClampedArray([255,255,255,255])};
assert.deepEqual(ui.shadeItemGlint([.5,.5],1,glintTexture,glintUniforms,'point-repeat'),[.25,.25,.25,1]);
assert.equal(ui.shadeItemGlint([.5,.5],0,glintTexture,glintUniforms,'bilinear-repeat'),null);
const glintResult = ui.renderItemGlint({width:1,height:1,data:new Uint8ClampedArray([32,64,96,255])},glintTexture,{uniforms:glintUniforms,glintSampler:'bilinear-repeat',blend:{source:'one',destination:'one'}});
assert.deepEqual([...glintResult.data],[96,128,160,255]);
assert.equal(ui.bannerPatternIds.length,42);
assert.equal(Object.keys(ui.bannerDyeColors).length,16);
assert.equal(ui.loomPatternIds.length,32);
assert(ui.loomPatternIds.every(id=>ui.bannerPatternIds.includes(id)));
const element = React.createElement;
// Classic JSON permission drafts only; no preset-to-bit/cheat policy or network action.
const packedPermissionPlayers=Object.freeze([Object.freeze({id:'alpha',name:'Caller Alpha'}),Object.freeze({id:'beta',name:'Caller Beta'})]);
const packedPermissionOptions=Object.freeze([Object.freeze({id:'build',label:'Build'}),Object.freeze({id:'mine',label:'Mine'}),Object.freeze({id:'unbound',label:'Unknown binding'})]);
const packedPermissionValues=Object.freeze({alpha:Object.freeze({level:'member',permissions:Object.freeze({build:true,mine:false})}),beta:Object.freeze({level:'custom',permissions:Object.freeze({build:false,mine:true})})});
const packedPermissionSnapshot=JSON.stringify(packedPermissionValues);let permissionRequests=0;
for(const selectedPlayerId of ['alpha','missing',null]){
 const markup=renderToString(element(ui.PlayerPermissions,{players:packedPermissionPlayers,permissionOptions:packedPermissionOptions,label:'Packed Classic permissions',selectedPlayerId,value:packedPermissionValues,readOnly:true,templateLocked:true,templateWarning:'Caller template warning',canEditPermissions:true,kickVisible:true,banVisible:true,emptyContent:'Unknown permission state',onValueChange:()=>permissionRequests++,onSelectedPlayerIdChange:()=>permissionRequests++,onBack:()=>permissionRequests++,onKickRequest:()=>permissionRequests++,onBanRequest:()=>permissionRequests++}));
 assert.match(markup,/data-profile="classic-json"/);assert.equal((markup.match(/role="scrollbar"/g)||[]).length,2);assert.match(markup,/Caller template warning/);
 assert(!/ permissionOptions=| selectedPlayerId=| canEditPermissions=| templateLocked=| permissionRefs=| levelRef=/.test(markup),'Permission bindings remain private to the composition.');
 assert(!markup.includes('data-permission-id="unbound"'),'Unknown permission keys are never painted as guessed false values.');
 if(selectedPlayerId==='alpha'){assert.match(markup,/data-permission-id="build"/);assert.match(markup,/aria-readonly="true"/);}else assert.match(markup,/Unknown permission state/);
}
const packedPermissionChecks=markup=>(markup.match(/<input[^>]*>/g)||[]).filter(tag=>tag.includes('data-permission-id=')).map(tag=>[tag.match(/data-permission-id="([^"]+)"/)?.[1],tag.includes(' checked=""')]);
for(const level of ['visitor','member','operator','custom']){
 const roleValues={...packedPermissionValues,alpha:{...packedPermissionValues.alpha,level}};
 const markup=renderToString(element(ui.PlayerPermissions,{players:packedPermissionPlayers,permissionOptions:packedPermissionOptions,label:'Independent permission role',value:roleValues}));
 assert.deepEqual(packedPermissionChecks(markup),[['build',true],['mine',false]],'Rendering a role does not rewrite independent permission booleans.');
}
for(const context of [{worldSettings:true},{inRealm:true}]){
 const markup=renderToString(element(ui.PermissionLevelSelect,{value:'custom',...context,labels:{label:'Caller permission level',visitor:undefined},readOnly:true}));
 assert.match(markup,/Custom[.][.][.]/);assert(!markup.includes('data-level="custom"'),'Source context hides Custom options without coercing the accepted face.');assert.match(markup,/aria-readonly="true"/);
}
assert.match(renderToString(element(ui.PermissionToggleRow,{label:'Caller ability',checked:true,stateLabel:'Caller state',readOnly:true})),/Caller state/);
assert.match(renderToString(element(ui.PermissionPlayerRow,{player:packedPermissionPlayers[0],selected:true})),/data-player-id="alpha"/);
assert.equal(permissionRequests,0,'SSR does not issue selection, permission, Back or moderation requests.');assert.equal(JSON.stringify(packedPermissionValues),packedPermissionSnapshot);
const documentGroups=[{id:'basics',label:'Basics',topics:[{id:'first',title:'First article',sectionTitle:'How to Play: First article',content:element(React.Fragment,null,element(ui.DocumentHeading,null,'Article heading'),element(ui.DocumentParagraph,{linePadding:6},'Live article text'))},{id:'second',title:'Second article',content:'Second content',disabled:true}]}];
for(const value of ['first',null,'unknown']){
 const markup=renderToString(element(ui.DocumentViewer,{groups:documentGroups,label:'Packed documents',value,size:[400,300],scale:2,scrollPolicy:'preserve',emptyContent:'No article',previousHint:{label:'Previous',glyph:'Host previous'},nextHint:{label:'Next',glyph:'Host next'}}));
 assert.match(markup,/mc-document-viewer/);assert.match(markup,/data-variant="document"/);assert.match(markup,/permissions_player_fade_overlay[.]png/);
 assert.equal((markup.match(/role="tabpanel"/g)||[]).length,2);assert.equal((markup.match(/role="scrollbar"/g)||[]).length,2);
 assert(!/ groups=| scrollPolicy=| previousHint=| navigationViewportRef=/.test(markup),'Document bindings remain private to composition.');
 if(value==='first'){assert.match(markup,/aria-selected="true"/);assert.match(markup,/How to Play: First article/);}else assert.match(markup,/No article/);
}
const emoteSlots=[
 {id:'wave',label:'Wave',preview:{kind:'text',text:'1'}},
 {id:'clap',label:'Clap',preview:{kind:'image',src:'/host-emote.png'}},
 {id:'empty',label:'Empty slot',preview:{kind:'empty'}},
 {id:'dance',label:'Dance',preview:{kind:'text',text:'4'}}
];
const emoteMarkup=renderToString(element(ui.EmoteWheel,{slots:emoteSlots,label:'Packed emotes',activeIndex:2,inputMode:'keyboard',scale:2,size:[256,200]}));
assert.match(emoteMarkup,/emote_wheel_updated_select_2[.]png/);
assert.equal((emoteMarkup.match(/<img[^>]*src="[^"]*emote_wheel_updated_(?:base|select_[0-3])[.]png"/g)||[]).length,1,'One whole wheel state frame; never layer selected-frame alpha over the base.');
assert.match(emoteMarkup,/icon_none[.]png/);assert.match(emoteMarkup,/host-emote[.]png/);assert.match(emoteMarkup,/Packed emotes/);
assert.equal((emoteMarkup.match(/<button/g)||[]).length,4,'Exactly four source cardinal slot buttons.');
assert(!/ activeIndex=| slots=| inputMode=| defaultActiveIndex=/.test(emoteMarkup),'Internal wheel props do not leak to native DOM attributes.');
const emoteCenter=markup=>markup.match(/<span[^>]*class="[^"]*mc-emote-wheel__name[^"]*"[^>]*>(.*?)<[/]span>/)?.[1];
assert.equal(emoteCenter(emoteMarkup),'','Empty slots keep their accessible name but no synthesized visual center name.');
const namedEmoteMarkup=renderToString(element(ui.EmoteWheel,{slots:emoteSlots,label:'Packed named emotes',activeIndex:0,centerLabel:'Explicit host center'}));
assert.equal(emoteCenter(namedEmoteMarkup),'Explicit host center');assert.match(namedEmoteMarkup,/aria-label="Wave"/);assert(!/ centerLabel=/.test(namedEmoteMarkup));
for(const inputMode of ['keyboard','touch','gamepad']){
 const markup=renderToString(element(ui.EmoteWheelScreen,{slots:emoteSlots,label:'Packed emote screen',inputMode,size:[400,300],activeIndex:2,centerLabel:'',gamepadInstruction:'Host controller instruction',gamepadStartGlyph:element('span',null,'Host glyph'),gamepadStartDescription:'Host Start',gamepadExitLabel:'Host exit'}));
 assert.match(markup,/mc-emote-wheel-screen__instruction-background/);assert.match(markup,/mc-emote-wheel-screen__change-row/);assert.match(markup,/Packed emote screen/);assert.equal(emoteCenter(markup),'');
 assert(!/ centerLabel=| gamepadInstruction=| gamepadExitLabel=| changeEmotesVisible=| wheelRef=/.test(markup),'Screen bindings and refs do not leak into DOM attributes.');
 if(inputMode==='gamepad'){assert.match(markup,/Host controller instruction/);assert.match(markup,/Host Start/);assert.match(markup,/Host exit/);}
 else assert.match(markup,/Change Emotes/);
}
for(const content of [{kind:'empty'},{kind:'text',text:'Fallback index'},{kind:'image',src:'/host-thumbnail.png'}]){
 const markup=renderToString(element(ui.EmoteSlotPreview,{content,scale:1,'aria-label':'Packed preview'}));
 assert.match(markup,/Packed preview/);
 if(content.kind==='empty')assert.match(markup,/icon_none[.]png/);
 if(content.kind==='text')assert.match(markup,/Fallback index/);
 if(content.kind==='image')assert.match(markup,/host-thumbnail[.]png/);
}
// Caller-selected finite camera/material inputs. These identity matrices are a
// normal package-consumption fixture, not native recovered camera/lighting.
const npcIdentity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const npcEntityOptions={model:npcIdentity(),view:npcIdentity(),projection:npcIdentity(),viewport:[0,0,64,64],scissor:[1,1,62,62],
  material:{kind:'npc-portrait',tileLightColor:[1,1,1,1],fogControl:[0,1,1],fogColor:[0,0,0],materialColor:[1,1,1,1],uvAnimation:[0,0,0,0],subPixelOffset:[0,0]}};
assert.equal(ui.npcSkinNames.length,60);assert(Object.isFrozen(ui.npcSkinNames));
assert.equal(new Set(ui.npcSkinNames).size,60);
assert(Array.isArray(ui.npcAppearanceOptions));assert.equal(ui.npcAppearanceOptions.length,60);assert(Object.isFrozen(ui.npcAppearanceOptions));
assert.equal(new Set(ui.npcAppearanceOptions.map(option=>option.variant)).size,60);
for(const option of ui.npcAppearanceOptions){
 assert.deepEqual(Object.keys(option).sort(),['skin','variant']);assert(Object.isFrozen(option));
 assert(Number.isSafeInteger(option.variant)&&option.variant>=0&&option.variant<60);
 assert.equal(option.skin,ui.npcSkinNames[option.variant]);
 assert.equal(ui.createNpcEntity({...npcEntityOptions,skin:option.variant}).texture,ui.createNpcEntity({...npcEntityOptions,skin:option.skin}).texture,'Appearance variant/name factories select the same source.');
}
assert.throws(()=>ui.npcAppearanceOptions.push(ui.npcAppearanceOptions[0]),TypeError,'Public appearance collection stays frozen.');
assert.throws(()=>{ui.npcAppearanceOptions[0].variant=59;},TypeError,'Public appearance records stay frozen.');
const npcEntity=ui.createNpcEntity(npcEntityOptions);
assert.equal(npcEntity.kind,'entity');assert.equal(npcEntity.source.profile,'npc-box64-rigid');
assert.deepEqual(npcEntity.source.textureSize,[64,64]);assert.equal(npcEntity.source.bones.length,10);
assert(Object.isFrozen(npcEntity.source)&&Object.isFrozen(npcEntity.source.bones));
assert.deepEqual(Object.keys(npcEntity.bonePose).sort(),npcEntity.source.bones.map(bone=>bone.name).sort());
assert(Object.values(npcEntity.bonePose).every(matrix=>matrix instanceof Float32Array&&matrix.length===16&&[...matrix].every(Number.isFinite)));
for(const [variant,skin]of ui.npcSkinNames.entries()){
  const aliasCommand=ui.createNpcEntity({...npcEntityOptions,skin}),variantCommand=ui.createNpcEntity({...npcEntityOptions,skin:variant});
  assert.equal(aliasCommand.texture,variantCommand.texture,'Strict original alias/source-index mapping: '+skin);
  assert.equal(typeof aliasCommand.texture,'string');assert.equal(new URL(aliasCommand.texture).protocol,'file:');
}
assert.equal(npcEntity.texture,ui.createNpcEntity({...npcEntityOptions,skin:ui.npcSkinNames[0]}).texture);
for(const skin of [-1,60,1.5,'NPC_1','npc_1.png',' npc_1','1'])assert.throws(()=>ui.createNpcEntity({...npcEntityOptions,skin}),RangeError);
const mixedCaseSkin=ui.npcSkinNames.find(skin=>/[A-Z]/.test(skin));assert(mixedCaseSkin);
assert.throws(()=>ui.createNpcEntity({...npcEntityOptions,skin:mixedCaseSkin.toLowerCase()}),RangeError,'Source alias case must remain exact.');
const npcCallerPose=Object.fromEntries(npcEntity.source.bones.map(bone=>[bone.name,npcIdentity()]));
const npcPosed=ui.createNpcEntity({...npcEntityOptions,bonePose:npcCallerPose});
for(const bone of npcEntity.source.bones){assert.deepEqual(npcPosed.bonePose[bone.name],npcCallerPose[bone.name]);assert.notEqual(npcPosed.bonePose[bone.name],npcCallerPose[bone.name]);}
const npcIncompletePose={...npcCallerPose};delete npcIncompletePose[npcEntity.source.bones[0].name];
assert.throws(()=>ui.createNpcEntity({...npcEntityOptions,bonePose:npcIncompletePose}),RangeError);
assert.notEqual(npcPosed.model,npcEntityOptions.model);assert.notEqual(npcPosed.view,npcEntityOptions.view);assert.notEqual(npcPosed.projection,npcEntityOptions.projection);
const npcDefaultAgain=ui.createNpcEntity(npcEntityOptions),firstBone=npcEntity.source.bones[0].name;
npcDefaultAgain.bonePose[firstBone][0]=999;
assert.notEqual(ui.createNpcEntity(npcEntityOptions).bonePose[firstBone][0],999,'Independent default pose matrices must not alias prior calls.');
const commandDraft = { hoverNote:'Packed', command:'say packed command', blockType:'repeat', condition:'conditional', redstone:'always_on', tickDelay:'-', executeFirstTick:true, trackOutput:false };
const packedAction = renderToString(element(ui.ServerActionForm,{title:'Packed actions',body:'Caller body',rows:[{id:'heading',type:'header',text:'Header'},{id:'hint',type:'label',text:'Hint'},{id:'line',type:'divider'},{id:'go',type:'button',text:'Go',icon:{state:'loading'}}]}));
assert(packedAction.includes('Packed actions') && packedAction.includes('Caller body') && packedAction.includes('Go'));
const packedFields = [{id:'hint',type:'label',text:'Hint'},{id:'header',type:'header',text:'Header'},{id:'line',type:'divider'},{id:'name',type:'input',label:'Name',tooltip:'Caller help'},{id:'on',type:'toggle',label:'On'},{id:'range',type:'slider',label:'Range',min:0,max:10,step:1},{id:'step',type:'step_slider',label:'Step',options:[{value:'a',label:'A'},{value:'b',label:'B'}]},{id:'drop',type:'dropdown',label:'Drop',options:[{value:'a',label:'A'}]},{id:'multi',type:'multiselect',label:'Multi',options:[{value:'a',label:'A'}]}];
const packedCustom = renderToString(element(ui.ServerCustomForm,{title:'Packed custom',fields:packedFields,defaultValue:{name:'Raw -',on:true,range:3,step:'b',drop:'a',multi:['a']}}));
assert(packedCustom.includes('Packed custom') && packedCustom.includes('Raw -') && !packedCustom.includes('NaN'));
const npcCommand = {id:'command',kind:'command',text:'say packed raw',buttonName:'Run',buttonMode:true,onEnter:true,onExit:false};
const npcUrl = {...npcCommand,id:'url',kind:'url',text:'https://example.invalid',buttonName:'Read'};
const npcDraft = {name:'Packed NPC',dialogue:'Packed dialogue',skinId:'one',actions:[npcCommand,npcUrl]};
assert(renderToString(element(ui.NpcPortrait,{actor:element('span',{},'Packed actor slot')})).includes('Packed actor slot'));
assert(renderToString(element(ui.NpcSkinPicker,{skins:[{id:'one',label:'One',actor:'Packed skin slot'}],defaultValue:'one'})).includes('Packed skin slot'));
assert(renderToString(element(ui.NpcActionEditor,{value:npcCommand})).includes('say packed raw'));
assert(renderToString(element(ui.NpcActionEditor,{value:npcUrl,state:{errorStatus:'InvalidUri'}})).includes('https://example.invalid'));
assert(renderToString(element(ui.NpcDialogue,{title:'Packed NPC',value:'Packed dialogue',actor:'Caller actor',actions:[{id:'go',label:'Packed action',kind:'command'}]})).includes('Packed dialogue'));
for (const page of ['basic','advanced','dialogue']) {
 const html=renderToString(element(ui.NpcEditor,{value:npcDraft,page,educationEdition:true,skins:[{id:'one',label:'One'}]}));
 assert(html.includes('Packed NPC') && !html.includes('NaN'));
}
const packedStructure = renderToString(element(ui.StructureEditor,{defaultValue:{name:'demo:packed_structure',saveSize:{x:'-',y:'2',z:'3'}},capabilities:{dataSupport:true,export3dSupport:true,filePickingSupported:true},preview:element('p',{},'Packed caller preview')}));
assert(packedStructure.includes('demo:packed_structure') && packedStructure.includes('Packed caller preview'));
assert(packedStructure.includes('data-structure-vector="saveSize"') && !packedStructure.includes('NaN'));
assert(renderToString(element(ui.XYZVectorInput,{label:'Packed position',defaultValue:{x:'-1',y:'2',z:'3'}})).includes('value="-1"'));
const packedHostBook = renderToString(element(ui.BookReader,{pages:['Only one','Two'],navigation:{previousAvailable:false,nextAvailable:true,onTurnRequest:()=>{}}}));
assert(packedHostBook.includes('data-direction="next" data-available="true"'));
const packedCommand = renderToString(element(ui.CommandBlockEditor,{defaultValue:commandDraft,previousOutput:'Packed previous output'}));
assert(packedCommand.includes('say packed command') && packedCommand.includes('Packed previous output'));
assert(renderToString(element(ui.CommandInput,{defaultValue:'Independent packed input'})).includes('Independent packed input'));
assert(renderToString(element(ui.CommandOutputPanel,{previousOutput:'Independent packed output'})).includes('Independent packed output'));
const jigsawDraft = { targetPool: 'demo:pool', name: 'demo:name', target: 'demo:target', finalBlock: 'minecraft:air', selectionPriority: '-', placementPriority: '-2147483648', joint: 'rollable' };
const consumerJigsaw = renderToString(element(ui.JigsawEditor, { defaultValue: jigsawDraft }));
assert(consumerJigsaw.includes('demo:pool') && consumerJigsaw.includes('minecraft:air') && consumerJigsaw.includes('-2147483648'));
assert(renderToString(element(ui.JigsawPriorityFields, { defaultValue: { selectionPriority: '-', placementPriority: '2' } })).includes('value="-"'));
const consumerBookReader = renderToString(element(ui.BookReader, { pages: ['Leaf one', 'Leaf two', 'Odd leaf'], spreadIndex: 1, 'aria-label': 'Consumer book' }));
assert(consumerBookReader.includes('Odd leaf') && !consumerBookReader.includes('Leaf one'));
const consumerBookEditor = renderToString(element(ui.BookEditor, { defaultPages: [], defaultAuthor: 'Consumer' }));
assert(consumerBookEditor.includes('<textarea') && consumerBookEditor.includes('data-page-index="0"'));
const consumerBookFontRoles = renderToString(element(ui.BookEditor, { defaultPages: ['Latin', 'Latin 像素'], fontMode: index => index === 0 ? 'latin' : 'unicode' }));
assert(consumerBookFontRoles.includes('data-book-font-mode="latin"') && consumerBookFontRoles.includes('data-book-font-mode="unicode"'));
const consumerBookCover = renderToString(element(ui.BookEditor, { defaultPages: ['Draft'], defaultMode: 'signing', defaultTitle: 'Consumer title', defaultAuthor: 'Consumer' }));
assert(consumerBookCover.includes('value="Consumer title"'));
assert(renderToString(element(ui.BookPageTurnButton, { direction: 'previous', available: false })).includes('disabled'));
const consumerSignSurface = renderToString(element(ui.SignTextSurface, { defaultValue: 'Consumer sign', variant: 'hanging', label: 'Consumer sign input' }));
assert(consumerSignSurface.includes('<textarea') && consumerSignSurface.includes('Consumer sign'));
assert(consumerSignSurface.includes('Consumer sign input'));
assert(!consumerSignSurface.includes('<canvas'), 'Sign surface must retain its real input.');
assert.equal(renderToString(element(ui.SignEditor, { open: false })), '', 'Closed modal is SSR-safe.');
const imageLayout = ui.layoutGuiImages({width:17,height:11,guiScale:2,images:[{rect:[.3,.2,2.1,1.9]}]});
assert.deepEqual(imageLayout.logicalStage,[9,6]);
assert.deepEqual(imageLayout.projectionSize,[8.5,5.5]);
assert.deepEqual(imageLayout.meshes[0].drawRect,[0,0,2.5,2]);
assert.deepEqual(imageLayout.meshes[0].vertices[0],{position:[0,2],uvRaw:[0,65535]});
assert.throws(()=>ui.renderGuiImages({width:0,height:11,guiScale:2,images:[]}),RangeError);
const imageMarkup = renderToString(element(ui.GuiImageLayer,{width:17,height:11,guiScale:2,images:[{rect:[0,0,1,1],texture:glintTexture}],label:'Host image layer'}));
assert.match(imageMarkup,/role="img"/);
assert.match(imageMarkup,/Host image layer/);
assert.match(imageMarkup,/data-render-state="loading"/);
const packedFont = {pages:['/caller-packed-font.png'],pageSizes:[128],cellHeight:12,lineHeight:10,glyphs:{'1':{page:0,x:8,y:36,width:8,height:12,advance:6,offsetY:-3}}};
const packedText = {kind:'text',text:'1',font:packedFont,origin:[.3,.2],fontScale:1,sampling:'point',shader:'bitmap',color:[127,255,31,255],shadow:{offset:[1,1],tint:[.25,.25,.25,1]}};
const packedLayout = ui.layoutGuiText({width:17,height:11,guiScale:2,...packedText});
assert.equal(packedLayout.logicalWidth,6);
assert.deepEqual(packedLayout.runs.map(run=>run.pass),['shadow','main']);
assert.deepEqual(packedLayout.runs[1].paintOrigin,[0,0]);
assert.deepEqual(packedLayout.runs[1].vertices[0],{position:[0,9,0],uvRaw:[4096,18432],rgba:[127,255,31,255]});
assert.deepEqual(packedLayout.runs[0].tint,[.25,.25,.25,1]);
assert.throws(()=>ui.renderGuiLayer({width:0,height:11,guiScale:2,commands:[]}),RangeError);
assert.throws(()=>ui.renderGuiLayer({width:17,height:11,guiScale:2,commands:[{...packedText,pages:new Map([[0,glintTexture]])}]}),RangeError);
assert.throws(()=>ui.renderGuiLayer({width:17,height:11,guiScale:2,commands:[{kind:'sprite',rect:[0,0,1,1],texture:glintTexture,color:[255,255,255,256]}]}),RangeError);
const layerMarkup=renderToString(element(ui.GuiLayer,{width:17,height:11,guiScale:2,commands:[packedText],label:'Host composed GUI'}));
assert.match(layerMarkup,/mc-gui-layer/);
assert.match(layerMarkup,/data-render-state="loading"/);
assert.match(layerMarkup,/role="img"/);
const spriteMarkup=renderToString(element(ui.GuiLayer,{width:17,height:11,guiScale:2,commands:[{kind:'sprite',rect:[0,0,1,1],texture:glintTexture,color:[127,255,31,0]}],label:'Source sprite'}));
assert.match(spriteMarkup,/data-render-state="loading"/);
assert.match(spriteMarkup,/Source sprite/);
const sourceCuboid=ui.createGuiCuboidModel([0,0,0],[16,8,16],{colors:{east:[127,127,127,255]}});
const modelProjection={yaw:45,pitch:30,scale:.625,offset:[8,9],originQuantization:'physical-floor'};
const sourceModel={kind:'model',model:sourceCuboid,origin:[.3,.2],projection:modelProjection,textureSizes:{all:[16,16]},textures:{all:'/caller-stone.png'}};
const modelLayout=ui.layoutGuiModel({width:640,height:480,guiScale:2,...sourceModel});
assert.deepEqual(modelLayout.paintOrigin,[0,0]);
assert.equal(modelLayout.runs.length,3);
assert.deepEqual(modelLayout.runs[1].color,[127,127,127,255]);
assert.throws(()=>ui.createGuiCuboidModel([0,0,0],[17,8,16]),RangeError);
const modelMarkup=renderToString(element(ui.GuiLayer,{width:640,height:480,guiScale:2,commands:[sourceModel],label:'Caller source model'}));
assert.match(modelMarkup,/data-render-state="loading"/);
assert.match(modelMarkup,/Caller source model/);
const assembledAtlas=ui.assembleGuiTextureAtlas({width:2,height:1,tiles:[{origin:[1,0],texture:glintTexture}]});
assert.deepEqual([...assembledAtlas.data],[0,0,0,0,255,255,255,255]);
assert.throws(()=>ui.assembleGuiTextureAtlas({width:1,height:1,tiles:[{origin:[0,0],texture:glintTexture},{origin:[0,0],texture:glintTexture}]}),RangeError);
const atlasMarkup=renderToString(element(ui.GuiLayer,{width:17,height:11,guiScale:2,commands:[{kind:'sprite',rect:[0,0,2,1],texture:{kind:'atlas',width:2,height:1,tiles:[{origin:[1,0],size:[1,1],texture:glintTexture}]}}],label:'Original source atlas'}));
assert.match(atlasMarkup,/data-render-state="loading"/);
assert.match(atlasMarkup,/Original source atlas/);
const imageSsrWarnings = [], previousConsoleError = console.error;
const ssrIoCalls = [], ssrIoNames = ['fetch','Image','createImageBitmap','OffscreenCanvas'];
const previousSsrIo = new Map(ssrIoNames.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
let imageWorkstationMarkup;
try {
  console.error=(...args)=>imageSsrWarnings.push(args.map(String).join(' '));
  for (const name of ssrIoNames) Object.defineProperty(globalThis,name,{configurable:true,writable:true,value:function(){ssrIoCalls.push(name);throw new Error('Unexpected SSR I/O: '+name);}});
  const npcEntitySsr=renderToString(element(ui.GuiLayer,{width:64,height:64,guiScale:1,commands:[ui.createNpcEntity(npcEntityOptions),npcPosed],label:'Packed source NPC entity'}));
  assert.match(npcEntitySsr,/mc-gui-layer/);assert.match(npcEntitySsr,/data-render-state="loading"/);assert.match(npcEntitySsr,/Packed source NPC entity/);
  assert(!/ bonePose=| material=| projection=/.test(npcEntitySsr),'Entity descriptors must not leak into DOM attributes.');
  renderToString(element(ui.EnchantingTable,{title:'Default host frame',options:[]}));
  imageWorkstationMarkup=renderToString(element(ui.EnchantingTable,{title:'Host native frame',options:[],imageRender:{frame:{width:2570,height:1402,guiScale:5},origin:[169,57.5],displayScale:2.5}}));
  const textStyle={font:packedFont,fontScale:1,sampling:'point',shader:'bitmap'};
  const combined=renderToString(element(ui.EnchantingTable,{title:'1',inventoryLabel:'1',options:[{id:'a',label:'One',level:1,runeText:'1'}],imageRender:{frame:{width:2570,height:1402,guiScale:5},text:{metrics:{lineHeight:10,paintOffset:[0,1]},labels:textStyle,costs:textStyle,runes:textStyle}}}));
  assert.match(combined,/mc-gui-layer/);
  assert.match(combined,/data-text-labels="true"/);
  assert(!/ runeText=| imageRender=/.test(combined));
  const defaultGrindstone=renderToString(element(ui.Grindstone,{title:'Default repair frame',inputs:[null,null],result:null}));
  const repairFrame={frame:{width:2570,height:1402,guiScale:5},origin:[169,57.5],displayScale:2.5};
  const sourceGrindstone=renderToString(element(ui.Grindstone,{title:'Source repair frame',imageRender:repairFrame,onClose:()=>{}}));
  const repairModelItem={name:'Caller block',icon:element('span',{'data-fallback-model':'kept'},'Caller block art'),guiModel:{model:sourceCuboid,projection:modelProjection,textureSizes:{all:[16,16]},textures:{all:{kind:'atlas',width:16,height:16,tiles:[{origin:[0,0],size:[16,16],texture:'/caller-stone.png'}]}}}};
  const repairItems={inputs:[{name:'Caller tool',image:'/caller-tool.png',count:2,durability:.5},repairModelItem],result:{name:'Caller result',image:'/caller-result.png'}};
  const repairText={metrics:{lineHeight:10,paintOffset:[0,1]},labels:textStyle};
  const fullGrindstone=renderToString(element(ui.Grindstone,{...repairItems,title:'1',inventoryLabel:'1',invalid:true,imageRender:{...repairFrame,text:repairText,itemImages:true,itemModels:true}}));
  for (const markup of [defaultGrindstone,sourceGrindstone,fullGrindstone]) {
    assert.equal((markup.match(/class="mc-slot(?: |")/g)??[]).length,39,'Grindstone must preserve three repair slots and36 inventory/hotbar slots.');
    assert(!/ imageRender=| guiModel=| itemImages=| itemModels=/.test(markup),'Source configuration must not leak into DOM attributes.');
  }
  assert(!defaultGrindstone.includes('mc-grindstone-image-layer'),'Default Grindstone keeps the CSS path.');
  assert.match(sourceGrindstone,/mc-grindstone-image-layer/);
  assert.match(sourceGrindstone,/data-render-state="loading"/);
  assert.match(fullGrindstone,/data-text-labels="true"/);
  assert.match(fullGrindstone,/data-item-images="0 2"/);
  assert.match(fullGrindstone,/data-item-models="1"/);
  assert.match(fullGrindstone,/data-fallback-model="kept"/);
  assert.match(fullGrindstone,/Items cannot be combined/);
  assert.match(fullGrindstone,/50% durability/);
  for (const badProfile of [
    {...repairFrame,text:{...repairText,labels:{...textStyle,fontScale:0}},itemImages:true,itemModels:true},
    {...repairFrame,text:repairText,itemImages:true,itemModels:true},
  ]) {
    const fallback=renderToString(element(ui.Grindstone,{...repairItems,title:badProfile.text.labels.fontScale===0?'1':'2',inventoryLabel:'1',imageRender:badProfile}));
    assert.match(fallback,/mc-grindstone-image-error/);
    assert(!fallback.includes('mc-grindstone-image-layer'),'Invalid text must fall back atomically instead of painting only items/models.');
    assert.match(fallback,/data-image-display-scale="2.5"/);
    assert.match(fallback,/data-fallback-model="kept"/);
    assert.equal((fallback.match(/class="mc-slot(?: |")/g)??[]).length,39);
    assert(!/ imageRender=| guiModel=/.test(fallback));
  }
  const anvilRenameLabel='Host item name';
  const assertRenameInput=(markup,value,readOnly=false,disabled=false)=>{
    const inputs=markup.match(/<input [^>]*>/g)??[];
    assert.equal(inputs.length,1,'Anvil retains exactly one real HTML input.');
    const input=inputs[0],lower=input.toLowerCase();
    assert(input.includes('class="mc-anvil__name-input"')&&input.includes('value="'+value+'"')&&input.includes('aria-label="'+anvilRenameLabel+'"'));
    assert(lower.includes('maxlength="30"')&&lower.includes('autocomplete="off"')&&lower.includes('spellcheck="false"'));
    assert.equal(lower.includes(' readonly='),readOnly);assert.equal(lower.includes(' disabled='),disabled);
  };
  const defaultAnvil=renderToString(element(ui.Anvil,{name:'Original name',renameLabel:anvilRenameLabel,onNameChange:()=>{}}));
  const sourceAnvil=renderToString(element(ui.Anvil,{name:'Source name',renameLabel:anvilRenameLabel,onNameChange:()=>{},imageRender:repairFrame,onClose:()=>{}}));
  const anvilLabel={...textStyle,metrics:{lineHeight:10,paintOffset:[0,1]}};
  const anvilText={title:anvilLabel,inventory:anvilLabel,
    name:{...textStyle,paintOffset:[0,1],clipQuantization:'floor-min-ceil-max'},
    cost:{...anvilLabel,color:[127,255,31,255],failureColor:[255,85,85,255],shadow:{offset:[1,1],tint:[.25,.25,.25,1]}}};
  const anvilProfile={...repairFrame,text:anvilText,itemImages:true,itemModels:true};
  const fullAnvil=renderToString(element(ui.Anvil,{...repairItems,title:'1',inventoryLabel:'1',name:'1',renameLabel:anvilRenameLabel,renameReadOnly:true,
    cost:{kind:'levels',levels:1,label:'1'},invalid:true,imageRender:anvilProfile}));
  const disabledAnvil=renderToString(element(ui.Anvil,{name:'Disabled name',renameLabel:anvilRenameLabel,renameDisabled:true,imageRender:repairFrame}));
  for (const markup of [defaultAnvil,sourceAnvil,fullAnvil,disabledAnvil]) {
    assert.equal((markup.match(/class="mc-slot(?: |")/g)??[]).length,39,'Anvil retains three repair slots and36 inventory/hotbar slots.');
    assert(!/ imageRender=| guiModel=| itemImages=| itemModels=/.test(markup),'Anvil source options must not become DOM attributes.');
  }
  assertRenameInput(defaultAnvil,'Original name');assertRenameInput(sourceAnvil,'Source name');
  assertRenameInput(fullAnvil,'1',true);assertRenameInput(disabledAnvil,'Disabled name',false,true);
  assert(!defaultAnvil.includes('mc-anvil-image-layer'),'Default Anvil retains the normal CSS/input path.');
  assert.match(sourceAnvil,/mc-anvil-image-layer/);assert.match(sourceAnvil,/data-render-state="loading"/);
  for (const role of ['title','inventory','name','cost']) assert(fullAnvil.includes('data-text-'+role+'="true"'),'Packed Anvil source text role: '+role);
  assert.match(fullAnvil,/data-item-images="0 2"/);assert.match(fullAnvil,/data-item-models="1"/);
  assert.match(fullAnvil,/data-fallback-model="kept"/);assert.match(fullAnvil,/role="status"/);assert.match(fullAnvil,/Items cannot be combined/);
  for (const bad of [
    {profile:{...anvilProfile,text:{...anvilText,title:{...anvilLabel,metrics:{lineHeight:0,paintOffset:[0,1]}}}},name:'1'},
    {profile:anvilProfile,name:'2'},
  ]) {
    const fallback=renderToString(element(ui.Anvil,{...repairItems,title:'1',inventoryLabel:'1',name:bad.name,renameLabel:anvilRenameLabel,
      cost:{kind:'levels',levels:1,label:'1'},imageRender:bad.profile}));
    assert.match(fallback,/mc-anvil-image-error/);assert(!fallback.includes('mc-anvil-image-layer'),'A bad Anvil text request falls back atomically, including item/model paint.');
    assert.match(fallback,/data-image-display-scale="2.5"/);assert.match(fallback,/data-fallback-model="kept"/);
    assert.equal((fallback.match(/class="mc-slot(?: |")/g)??[]).length,39);assertRenameInput(fallback,bad.name);
    assert(!/ imageRender=| guiModel=/.test(fallback));
  }
  const craftingBook={title:'1',entries:[],categoryId:'search',query:'1',searchPlaceholder:'1',onQueryChange:()=>{}};
  const craftingFrame={frame:{width:2570,height:1402,guiScale:5},origin:[94,57.5],displayScale:2.5,imagePhysicalPrecision:'float32'};
  const craftingTextStyle={...textStyle,metrics:{lineHeight:8,paintOffset:[0,0]}};
  const craftingInputText={...craftingTextStyle,clipQuantization:'logical-stage-floor',scissor:[0,0,2570,1402]};
  const craftingProfile={...craftingFrame,itemImages:true,itemModels:true,text:{crafting:craftingTextStyle,inventory:craftingTextStyle,
    recipeTitle:craftingTextStyle,query:craftingInputText,placeholder:{...craftingInputText,clipQuantization:'floor-min-ceil-max'},
    inventoryCount:craftingTextStyle,recipeCount:craftingTextStyle}};
  const craftingItems={inputs:[{name:'Caller ingredient',image:'/caller-ingredient.png',count:11,durability:.5},repairModelItem],
    result:{name:'Caller craft result',image:'/caller-craft-result.png'},inventoryLabel:'1',
    inventory:[{name:'Caller inventory item',image:'/caller-inventory.png',count:11}],hotbar:[repairModelItem]};
  const assertCraftingSsr=(markup,hasSearch=true)=>{
    const start=markup.indexOf('class="mc-inventory-screen-frame__right'),end=markup.indexOf('class="mc-inventory-toolbar');
    assert(start>=0&&end>start,'Crafting retains a distinct right pane and toolbar.');
    assert.equal((markup.slice(start,end).match(/class="mc-slot(?: |")/g)??[]).length,46,'Crafting retains9 inputs,1 result,27 inventory and9 hotbar slots, independently of recipe entries.');
    assert(!/ imageRender=| imagePhysicalPrecision=| guiModel=| itemImages=| itemModels=/i.test(markup),'Crafting source profile options must not leak into DOM attributes.');
    const search=(markup.match(/<input [^>]*>/g)??[]).find(input=>input.includes('type="search"'));
    if(hasSearch)assert(search?.includes('value="1"')||search?.includes('placeholder="1"'),'Crafting source keeps the actual HTML search input.');
    else assert.equal(search,undefined,'Compact Crafting does not mount a hidden recipe search input.');
  };
  const defaultCrafting=renderToString(element(ui.CraftingScreen,{title:'1',recipeBook:craftingBook,crafting:craftingItems}));
  const sourceCrafting=renderToString(element(ui.CraftingScreen,{title:'1',recipeBook:craftingBook,crafting:craftingItems,imageRender:craftingFrame}));
  const sourceRecipe={id:'caller-recipe',label:'Caller recipe',item:{name:'Caller recipe image',image:'/caller-recipe.png',count:11},craftableCount:11};
  const fullCrafting=renderToString(element(ui.CraftingScreen,{title:'1',recipeBook:{...craftingBook,entries:[sourceRecipe]},crafting:craftingItems,imageRender:craftingProfile}));
  const placeholderCrafting=renderToString(element(ui.CraftingScreen,{title:'1',recipeBook:{...craftingBook,query:''},crafting:craftingItems,imageRender:craftingProfile}));
  const compactCrafting=renderToString(element(ui.CraftingScreen,{title:'1',recipeBook:craftingBook,crafting:craftingItems,layout:'survival',showClose:false,imageRender:craftingProfile}));
  for(const markup of [defaultCrafting,sourceCrafting,fullCrafting,placeholderCrafting])assertCraftingSsr(markup);
  assertCraftingSsr(compactCrafting,false);
  assert(!defaultCrafting.includes('mc-crafting-image-layer'),'Default CraftingScreen keeps the CSS/semantic path without an opt-in canvas.');
  for(const markup of [sourceCrafting,fullCrafting,placeholderCrafting,compactCrafting]){
    assert.match(markup,/mc-crafting-image-window/);assert.match(markup,/mc-crafting-image-layer/);assert.match(markup,/data-render-state="loading"/);
    assert.match(markup,/data-right-slots="46"/);assert.match(markup,/data-frame-origin="94,57.5"/);
    assert(!markup.includes('data-mc-source-item='),'SSR must not claim client-ready item ownership before a canvas is ready.');
    assert.match(markup,/data-fallback-model="kept"/);
  }
  for(const role of ['crafting','inventory','recipe-title','query'])assert(fullCrafting.includes('data-text-'+role+'="true"'),'Packed Crafting source text role: '+role);
  assert.match(fullCrafting,/data-recipe-count="1"/);assert.match(fullCrafting,/data-recipe-id="caller-recipe"/);
  assert.match(placeholderCrafting,/data-text-query="true"/);assert(!compactCrafting.includes('data-text-recipe-title='),'Compact source has no recipe-book title role.');
  for(const bad of [
    {title:'1',profile:{...craftingProfile,text:{...craftingProfile.text,crafting:{...craftingTextStyle,fontScale:0}}}},
    {title:'2',profile:craftingProfile},
    {title:'1',profile:{...craftingProfile,text:{...craftingProfile.text,query:{...craftingInputText,clipQuantization:'invalid'}}}},
  ]){
    const fallback=renderToString(element(ui.CraftingScreen,{title:bad.title,recipeBook:craftingBook,crafting:craftingItems,imageRender:bad.profile}));
    assertCraftingSsr(fallback);assert.match(fallback,/mc-crafting-image-error/);assert(!fallback.includes('mc-crafting-image-layer'),'Invalid Crafting text falls back atomically rather than painting a partial item/model layer.');
    assert.match(fallback,/data-fallback-model="kept"/);
  }
  assert.deepEqual(ssrIoCalls,[],'Default/source/text/item/model/fallback SSR must not fetch, decode images or allocate a GPU canvas.');
} finally {
  console.error=previousConsoleError;
  for (const name of ssrIoNames) {const descriptor=previousSsrIo.get(name);if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}
assert.deepEqual(imageSsrWarnings,[],'Default and image-profile workstations must remain SSR warning-free.');
assert.match(imageWorkstationMarkup,/Host native frame/);
assert(!/ imageRender=/.test(imageWorkstationMarkup),'Image profile must not leak into HTML attributes.');
const recipeEntry = {id:'stone',label:'Host stone recipe',item:{name:'Stone',count:64},craftableCount:0,modifier:'expand'};
const recipeBookProps = {title:'Craftable recipes',entries:[recipeEntry],categoryId:'search',query:'host supplies filtered entries',craftableOnly:true};
const recipeBookMarkup = renderToString(element(ui.RecipeBook,recipeBookProps));
assert.match(recipeBookMarkup,/data-recipe-id="stone"/);
assert.match(recipeBookMarkup,/Host stone recipe/);
assert.match(recipeBookMarkup,/data-modifier="expand"/);
const bitmapFont = {pages:['/caller-owned-atlas.png'],glyphs:{A:{page:0,x:0,y:0,width:1,height:1,advance:1}},lineHeight:1};
const bitmapMarkup = renderToString(element(ui.BitmapText,{font:bitmapFont,sampling:'point',shader:'bitmap',color:'#ffffff'},'A'));
const emptyGpu = ui.renderBitmapGlyphs({width:0,height:0,pages:new Map(),runs:[]});
assert.equal(emptyGpu.alphaMode,'premultiplied');
assert.equal(emptyGpu.data.length,0);
emptyGpu.dispose();
const bitmapGpuMarkup = renderToString(element(ui.BitmapText,{font:bitmapFont,sampling:'point',shader:'bitmap',renderer:'webgl',profile:'atlas-rect',background:'#102030'},'A'));
const bitmapSharedMarkup = renderToString(element(ui.BitmapText,{font:bitmapFont,sampling:'point',shader:'bitmap',renderer:'webgl-shared',profile:'atlas-rect',background:'#102030'},'A'));
assert.match(bitmapSharedMarkup,/data-renderer="webgl-shared"/);
assert.match(bitmapSharedMarkup,/data-render-state="loading"/);
assert(bitmapSharedMarkup.includes('>A</span>'));
assert.match(bitmapGpuMarkup,/A/);
assert.match(bitmapMarkup,/mc-bitmap-text/);
assert(bitmapMarkup.includes('>A</span>'));
assert.match(bitmapMarkup,/data-render-state="loading"/);
const advanceMarkup = renderToString(element(ui.BitmapText,{font:bitmapFont,sampling:'point',shader:'bitmap',layout:'advance'},'A'));
assert(advanceMarkup.includes('>A</span>'));
assert(!/ layout=/.test(advanceMarkup), 'Layout mode must not leak into HTML attributes.');
const workstationCalls=[];
const workstationMarkup=renderToString(element(ui.EnchantingTable,{title:'Host title',inventoryLabel:'Host inventory',
  options:[{id:'first',label:'First',level:1},{id:'second',label:'Second',level:2,disabled:true},{id:'third',label:'Third',level:3}],
  renderText:(text,context)=>{workstationCalls.push({text,...context});return element('canvas',{'data-text-kind':context.kind});}}));
assert.equal(workstationCalls.length,5);
assert.deepEqual(workstationCalls.filter(value=>value.kind==='enchantment-cost').map(value=>[value.text,value.id,value.tier,value.disabled,value.align]),
  [['1','first',1,false,'end'],['2','second',2,true,'end'],['3','third',3,false,'end']]);
assert(workstationMarkup.includes('>Host title</span>') && workstationMarkup.includes('>Host inventory</span>'));
assert.equal((workstationMarkup.match(/class="mc-workstation-text__semantic"/g)??[]).length,5);
const itemRendererCalls=[], overrideRendererCalls=[];
const itemTextRenderer=(text,context)=>{itemRendererCalls.push([text,context.kind,context.index]);return element('mark',{'data-item-rendered':context.kind},text);};
const overrideTextRenderer=(text,context)=>{overrideRendererCalls.push([text,context.kind,context.index]);return element('mark',{'data-override-rendered':context.kind},text);};
const rendererItem={name:'Consumer sword',durability:.5,tooltipTextRenderer:itemTextRenderer,lore:['Host string lore',element('strong',{'data-rich-node':'preserved',key:'rich'},'Rich node lore')]};
const overrideMarkup=renderToString(element(ui.ItemTooltip,{item:rendererItem,renderText:overrideTextRenderer}));
assert.deepEqual(itemRendererCalls,[]);
assert.deepEqual(overrideRendererCalls,[['Consumer sword','name',0],['Host string lore','lore',0]]);
assert(overrideMarkup.includes('<strong data-rich-node="preserved">Rich node lore</strong>'));
assert(!/durability/i.test(overrideMarkup));
const inheritedMarkup=renderToString(element(ui.ItemTooltip,{item:rendererItem}));
assert.deepEqual(itemRendererCalls,[['Consumer sword','name',0],['Host string lore','lore',0]]);
assert.match(inheritedMarkup,/data-item-rendered="name"/);
const tooltipMarkup = renderToString(element(ui.ItemTooltip,{id:'consumer-tooltip',item:{name:'Consumer sword',nameColor:'#55ffff',durability:.5,lore:[element('span',{key:'enchantment',style:{color:'#aaaaaa'}},'Sharpness I')]}}));
assert.match(tooltipMarkup,/role="tooltip"/);
assert.match(tooltipMarkup,/id="consumer-tooltip"/);
assert.match(tooltipMarkup,/Consumer sword/);
assert.match(tooltipMarkup,/Sharpness I/);
assert(!/durability/i.test(tooltipMarkup),'ItemTooltip must not invent a durability line.');
const output = renderToString(element(ui.Panel, {title:'Settings'},
  element(ui.TextField, {label:'World name', name:'worldName', defaultValue:'My world'}),
  element(ui.Checkbox, {label:'Coordinates', defaultChecked:true, name:'coordinates'}),
  element(ui.Button, {variant:'primary'}, 'Play'),
  element(ui.Text,{shadow:true},'Minecraft'),
  element(ui.BitmapText,{font:bitmapFont,sampling:'bilinear',shader:'bitmap-smooth'},'A'),
  element(ui.InventoryGrid,{label:'Inventory',items:[{name:'Diamond',count:64}],size:9}),
  element(ui.Grindstone,{inputs:[null,null],result:null}),
  element(ui.EnchantingTable,{options:[{id:'unbreaking',label:'Unbreaking',level:3}]}),
  element(ui.EnchantingRunes,{text:'AIZ',atlasUrl:'/caller-owned-ascii_sga.png'}),
  element(ui.EnchantingBook,{}),
  element(ui.EnchantmentOption,{id:'standalone',label:'Unbreaking',level:3}),
  element(ui.ItemImage,{src:'/caller-owned-item.png'}),
  element(ui.ItemCount,{count:64}),
  element(ui.DurabilityBar,{value:3,max:4}),
  element(ui.SlotPlaceholder,{}),
  element(ui.ResultSlot,{item:null,size:'large'}),
  element(ui.ProcessingArrow,{progress:.5}),
  element(ui.FuelIndicator,{progress:.5}),
  element(ui.RecipeGrid,{label:'Recipe',items:[]}),
  element(ui.CraftingTable,{}),
  element(ui.RecipeBook,recipeBookProps),
  element(ui.RecipeBookEntry,{entry:recipeEntry}),
  element(ui.RecipeFilterToggle,{craftableOnly:true}),
  element(ui.InventoryScreenFrame,{title:'Caller frame',book:element('span',{},'Caller book')},element('span',{},'Caller right pane')),
  element(ui.SurvivalInventoryScreen,{recipeBook:recipeBookProps,inventory:{needsCraftingTable:true,craftingTablePreview:element('span',{},'Caller crafting-table renderer')}}),
  element(ui.CraftingScreen,{recipeBook:recipeBookProps}),
  element(ui.CraftingScreen,{recipeBook:recipeBookProps,layout:'survival',crafting:{inputs:[],result:null}}),
  element(ui.Furnace,{}),
  element(ui.BlastFurnace,{}),
  element(ui.Smoker,{}),
  element(ui.Anvil,{name:'Tool',cost:{kind:'levels',levels:3}}),
  element(ui.ContainerFrame,{title:'Container'}),
  element(ui.Chest,{rows:6}),
  element(ui.Hopper,{}),
  element(ui.Dispenser,{}),
  element(ui.Dropper,{}),
  element(ui.ShulkerBox,{}),
  element(ui.BrewingStand,{progress:.5,bubbles:.25,fuelRemaining:.75}),
  element(ui.BrewingIndicator,{variant:'bubbles',progress:.5}),
  element(ui.SmithingTable,{overlayFrame:0}),
  element(ui.CartographyTable,{name:'Map',mode:'extend'}),
  element(ui.ScrollArea,{label:'Content',style:{height:100}},'Scrollable content'),
  element(ui.ScrollBar,{label:'Offset',controls:'consumer-content',value:10,max:100,pageSize:20,onValueChange:()=>{}}),
  element(ui.HealthBar,{value:19}),
  element(ui.HungerBar,{value:17,effect:true}),
  element(ui.ArmorBar,{value:1}),
  element(ui.AirBar,{states:['full','pop','hidden']}),
  element(ui.ExperienceBar,{progress:.5,level:3}),
  element(ui.Hotbar,{items:[],defaultSelectedIndex:2}),
  element(ui.Crosshair,{}),
  element(ui.BossBar,{name:'Wither',value:.75,color:[1,.5,1]}),
  element(ui.ChatMessage,{},'Hello from the Overworld'),
  element(ui.ChatPanel,{messages:[{id:'message',text:'Hello'}],input:true}),
  element(ui.Scoreboard,{title:'Objectives',entries:[{id:'player',name:'Player',score:3}]}),
  element(ui.StatusEffect,{name:'Speed',effect:'speed',duration:'1:30'}),
  element(ui.ActionBar,{},'Respawn point set'),
  element(ui.TitleOverlay,{title:'Adventure',subtitle:'Begin your journey'}),
  element(ui.HeldItemTooltip,{},'Diamond sword'),
  element(ui.Stonecutter,{recipes:[{id:'slab',label:'Stone slab'}]}),
  element(ui.Loom,{patterns:[{id:'stripe',label:'Stripe'}]}),
  element(ui.Beacon,{effects:{speed:{enabled:true,selected:true}},extraEffect:'speed'}),
  element(ui.Crafter,{disabledSlots:[1],powered:true}),
  element(ui.RecipeSelectionGrid,{label:'Recipes',options:[{id:'slab',label:'Slab'}]}),
  element(ui.CrafterSlot,{index:1,enabled:false}),
  element(ui.BeaconEffect,{effect:'speed',selected:true}),
  element(ui.ToggleButton,{defaultPressed:true},'Coordinates'),
  element(ui.SearchField,{label:'Search recipes',defaultValue:'stone'}),
  element(ui.NavigationList,{label:'Settings sections',items:[{value:'game',label:'Game'}]}),
  element(ui.SettingRow,{label:'Coordinates',children:control=>element('input',{...control,type:'checkbox'})}),
  element(ui.KeybindingField,{label:'Move forward',name:'forward',defaultValue:'KeyW'}),
  element(ui.Spinner,{frame:9,label:'Loading terrain'}),
  element(ui.Tooltip,{content:'Tooltip description'},element(ui.Button,{},'Tooltip trigger')),
  element(ui.Toast,{open:true,onOpenChange:()=>{},title:'World saved',description:'Your progress is saved.'}),
  element(ui.WorldList,{label:'Worlds',worlds:[{id:'world',name:'My world',gameMode:'Survival'}]}),
  element(ui.ServerList,{label:'Servers',servers:[{id:'server',name:'My server',status:'online'}]}),
  element(ui.PlayerCard,{name:'Player',onProfile:()=>{}}),
  element(ui.PackCard,{pack:{id:'pack',name:'Resources',active:true},selected:true,onActiveChange:()=>{}}),
  element(ui.PackList,{label:'Resource packs',packs:[{id:'pack',name:'Resources',active:true}]}),
  element(ui.SettingsPanel,{sections:[{value:'game',label:'Game',content:'Survival'}]}),
  element(ui.LoadingScreen,{title:'Loading world',message:'Preparing terrain',value:50}),
  element(ui.AchievementToast,{open:true,onOpenChange:()=>{},title:'Taking inventory'}),
  element(ui.PlayerList,{players:[{id:'player',name:'Player',online:true}]}),
  element(ui.TouchControls,{actions:['jump','interact']}),
  element(ui.PauseMenu,{actions:['resume','settings']}),
  element(ui.DeathScreen,{deathMessage:'Player fell from a high place'}),
  element(ui.TradeOffer,{offer:{id:'bread',label:'Emeralds for bread',costs:[{item:{name:'Emerald',count:4},originalCount:5}],result:{name:'Bread',count:1}}}),
  element(ui.TradingScreen,{tiers:[],inputs:[null,null],levelProgress:.5,detailButtons:[true,true,true],runeAtlasUrl:'/caller-owned-runes.png'}),
  element(ui.MountInventory,{equipment:[{kind:'saddle'}],chested:true,storageColumns:3}),
  element(ui.ItemGlint,{imageSrc:'/caller-item.png',uniforms:glintUniforms,glintSampler:'point-repeat',blend:{source:'one',destination:'one'}}),
  element(ui.BlockPreview,{block:'stone-stairs',label:'Stone stairs'}),
  element(ui.BlockPreview,{block:'enchanting-table',label:'Enchanting table'}),
  element(ui.BannerPreview,{baseColor:'white',patterns:[{id:'border',color:'red'}]}),
  element(ui.PlayerInventoryScreen,{armor:[null,null,null,null],crafting:[]}),
  element(ui.CreativeInventory,{items:[{name:'Stone'}],defaultCategoryId:'search'}),
  element(ui.ArmorSlot,{kind:'helmet'}),
  element(ui.RecipeSearch,{defaultValue:'stone'}),
  element(ui.RecipeCategoryTabs,{}),
  element(ui.InventoryToolbar,{defaultValue:'creative'}),
  element(ui.Image,{src:'/caller-owned-item.png',alt:'Item',sourceSize:[16,16],scale:2}),
  element(ui.NineSlice,{src:'/caller-frame.png',sourceSize:[10,10],slice:2,destinationBorder:1,scale:2},element(ui.Button,{},'Framed action')),
  element(ui.Combobox, {label:'Difficulty',name:'difficulty',defaultValue:'normal',options:[{value:'normal',label:'Normal'}]}),
  element(ui.Tabs, {label:'Settings', items:[{value:'game',label:'Game',content:'Survival'}]}),
  element(ui.Dialog, {open:true,onOpenChange:()=>{},title:'SSR-safe dialog'})
));
assert.match(output, /mc-button--primary/);
assert.match(output, /World name/);
assert.match(output, /role="tablist"/);
for (const className of ['mc-inventory-screen-frame','mc-survival-inventory-screen','mc-recipe-book','mc-recipe-book-entry','mc-crafting-screen','mc-recipe-filter-toggle','mc-bitmap-text','mc-brewing','mc-smithing','mc-cartography','mc-scroll-area','mc-scrollbar','mc-hud-stat','mc-experience-bar','mc-hotbar','mc-crosshair','mc-boss-bar','mc-chat-message','mc-chat-panel','mc-scoreboard','mc-status-effect','mc-action-bar','mc-title-overlay','mc-held-item-tooltip','mc-stonecutter','mc-loom','mc-beacon','mc-crafter','mc-recipe-selection-grid','mc-crafter-slot','mc-beacon-effect','mc-toggle-button','mc-search-field','mc-navigation-list','mc-setting-row','mc-keybinding','mc-spinner','mc-tooltip-trigger','mc-toast','mc-world-list','mc-server-list','mc-player-card','mc-pack-card','mc-pack-list','mc-settings-panel','mc-loading-screen','mc-achievement-toast','mc-player-list','mc-touch-controls','mc-pause-menu','mc-death-screen','mc-trade-offer','mc-trading','mc-mount-inventory','mc-block-preview','mc-banner-preview','mc-item-glint','mc-player-screen','mc-creative-inventory','mc-armor-slot','mc-recipe-search','mc-recipe-categories','mc-inventory-toolbar']) assert(output.includes(className), 'Missing SSR markup: '+className);
const fontCss = await readFile(fileURLToPath(import.meta.resolve('mcbeui/fonts.css')), 'utf8');
assert.match(fontCss, /Monocraft-Regular.woff2/);
for (const asset of ['styles.css','textures.css','inventory.css','workstations.css','enchanting-book.css','processing.css','anvil.css','containers.css','image.css','brewing.css','special-workstations.css','scroll-area.css','hud.css','hud-textures.css','hud-overlays.css','hud-overlay-textures.css','advanced-workstations.css','advanced-workstation-textures.css', 'feedback.css', 'feedback-textures.css', 'settings-controls.css', 'settings-control-textures.css', 'game-lists.css', 'game-list-textures.css', 'system-screens.css', 'system-screens-textures.css', 'game-controls.css', 'game-control-textures.css', 'trading-mounts.css', 'trading-mount-textures.css', 'item-renderers.css', 'inventory-screens.css', 'inventory-screen-textures.css','recipe-book.css','recipe-book-textures.css','crafting-screen.css','inventory-screen-frame.css','book.css','sign.css','jigsaw.css','command-block.css','structure-editor.css','server-forms.css','npc.css','emote-wheel.css','emote-wheel-screen.css','document-viewer.css','player-permissions.css','fonts.css','mojangles.css','classic-fonts.css','fonts/MCBEPixel-Regular.woff2','fonts/MCBECJK-12px-zh-hans.woff2','fonts/Monocraft-Regular.woff2','fonts/FusionPixel-12px-zh-hans.woff2','fonts/Monocraft-OFL.txt','fonts/Fusion-Pixel-OFL.txt','fonts/fusion-notices/LICENSES/galmuri/LICENSE.txt']) {
  assert((await stat(fileURLToPath(import.meta.resolve('mcbeui/'+asset)))).size > 0);
}
assert((await stat(new URL('./node_modules/mcbeui/dist/assets/enchanting/enchanting_table_book.png',import.meta.url))).size>0);
const packageRoot = new URL('./',import.meta.resolve('mcbeui/package.json'));
const catalog=JSON.parse(await readFile(new URL('docs/component-catalog.json',packageRoot),'utf8'));
assert.equal(catalog.publicExports.components,components.length);assert.equal(catalog.publicExports.runtimeValues,Object.keys(ui).length);assert.equal(catalog.publicExports.dataValues,dataExports.length);
assert.deepEqual(Object.values(catalog.groups).flat().filter(value=>value.status==='implemented').map(value=>value.name).sort(),[...components].sort(),'Published component catalog matches actual exports.');
const componentCatalog = JSON.parse(await readFile(new URL('docs/component-catalog.json',packageRoot),'utf8'));
const documentedComponents = Object.values(componentCatalog.groups).flat().filter(entry=>entry.status==='implemented').map(entry=>entry.name);
assert.deepEqual(documentedComponents.sort(),components.slice().sort(),'Packed catalog must match component exports without counting data helpers.');
assert(!Object.hasOwn(ui, 'bookAssets'), 'Book source registry must stay private.');
assert(!Object.hasOwn(ui, 'signAssets'), 'Sign source registry must stay private.');
const bookManifest = JSON.parse(await readFile(new URL('docs/book-assets.json',packageRoot),'utf8'));
assert.equal(bookManifest.resources.length,32);
assert.equal(bookManifest.textureMetadata.length,8);
for (const asset of [...bookManifest.resources, ...bookManifest.textureMetadata, bookManifest.license]) {
  const bytes = await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
}
const signManifest = JSON.parse(await readFile(new URL('docs/sign-assets.json',packageRoot),'utf8'));
assert.equal(signManifest.resources.length,26);
assert.equal(signManifest.textureMetadata.length,0);
for (const asset of [...signManifest.resources,signManifest.license]) {
  const bytes = await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole Sign source: '+asset.entry);
}
assert(!Object.hasOwn(ui, 'jigsawImageAssets'), 'Jigsaw source registry must stay private.');
const jigsawManifest = JSON.parse(await readFile(new URL('docs/jigsaw-assets.json',packageRoot),'utf8'));
assert.equal(jigsawManifest.resources.length,4);
assert.equal(jigsawManifest.textureMetadata.length,3);
for (const asset of [...jigsawManifest.resources,...jigsawManifest.textureMetadata,jigsawManifest.license]) {
  const bytes = await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole Jigsaw source: '+asset.entry);
}
assert(!Object.hasOwn(ui, 'commandBlockImageAssets'), 'Command Block source registry must stay private.');
const commandManifest = JSON.parse(await readFile(new URL('docs/command-block-assets.json',packageRoot),'utf8'));
assert.equal(commandManifest.resources.length,6);
assert.equal(commandManifest.textureMetadata.length,2);
for (const asset of [...commandManifest.resources,...commandManifest.textureMetadata,commandManifest.license]) {
  const bytes = await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole Command Block source: '+asset.entry);
}
assert(!Object.hasOwn(ui, 'structureEditorImageAssets'), 'Structure Editor source registry must stay private.');
const structureManifest = JSON.parse(await readFile(new URL('docs/structure-editor-assets.json',packageRoot),'utf8'));
assert.equal(structureManifest.resources.length,1);
assert.equal(structureManifest.textureMetadata.length,0);
for (const asset of [...structureManifest.resources,...structureManifest.textureMetadata,structureManifest.license]) {
  const bytes = await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole Structure Editor source: '+asset.entry);
}
assert(!Object.hasOwn(ui, 'serverFormImageAssets'), 'Server Forms source registry must stay private.');
const serverManifest = JSON.parse(await readFile(new URL('docs/server-form-assets.json',packageRoot),'utf8'));
assert.equal(serverManifest.resources.length,3);
assert.equal(serverManifest.textureMetadata.length,1);
for (const asset of [...serverManifest.resources,...serverManifest.textureMetadata,serverManifest.license]) {
  const bytes = await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole Server Forms source: '+asset.entry);
}
const guiIcons = JSON.parse(await readFile(new URL('docs/gui-icons.json',packageRoot),'utf8'));
assert.equal(ui.guiIconNames.length,150); assert(Object.isFrozen(ui.guiIconNames));
assert.deepEqual([...ui.guiIconNames].sort(),Object.keys(guiIcons.assets).sort());
for (const name of ui.guiIconNames) {
  const asset = guiIcons.assets[name];
  const bytes = await readFile(new URL(asset.assetPath.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed GUI icon: '+name);
  const markup = renderToString(element(ui.GuiIcon,{name,scale:2,label:name}));
  const imageSource = markup.match(/<img[^>]+src="([^"]+)"/)[1].replaceAll('&amp;','&');
  assert.equal(createHash('sha256').update(await readFile(new URL(imageSource))).digest('hex'),asset.sha256,'Consumer GuiIcon URL: '+name);
  assert(markup.includes('role="img"'));
}
assert(!Object.hasOwn(ui,'documentViewerAssets'),'Document source registry must remain private.');
const documentManifest=JSON.parse(await readFile(new URL('docs/document-viewer-assets.json',packageRoot),'utf8'));
assert.equal(documentManifest.schemaVersion,1);assert.equal(documentManifest.resources.length,28);assert.equal(documentManifest.textureMetadata.length,14);assert.equal(documentManifest.sourceFiles.length,8);
const documentWholeAssets=[...documentManifest.resources,...documentManifest.textureMetadata,...documentManifest.sourceFiles,documentManifest.license];
assert.equal(documentWholeAssets.length,51);assert.equal(new Set(documentWholeAssets.map(asset=>asset.destination)).size,51);
assert.deepEqual((await readdir(new URL('dist/assets/document-viewer/',packageRoot))).sort(),documentWholeAssets.map(asset=>asset.destination.split('/').at(-1)).sort());
for(const asset of documentWholeAssets){
 assert(asset.destination.startsWith('src/assets/document-viewer/'));assert(!asset.destination.includes('..'));
 const bytes=await readFile(new URL(asset.destination.replace(/^src[/]/,'dist/'),packageRoot));
 assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole document source: '+asset.entry);
}
const documentWhite=documentManifest.resources.find(asset=>asset.key==='backgroundWhite');
assert.equal(documentWhite.entry,'resource_pack/textures/ui/permissions_player_fade_overlay.png');assert.equal(documentWhite.sha256,'5ef05eb8f2100ac885c96aced008715e1225634d327162b88625672be82547e5');
assert(!Object.hasOwn(ui,'playerPermissionsAssets'),'Player Permissions source materials must remain private.');
const permissionManifest=JSON.parse(await readFile(new URL('docs/player-permissions-assets.json',packageRoot),'utf8'));
assert.equal(permissionManifest.schemaVersion,1);assert.equal(permissionManifest.fixedSource.sha256,'d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
assert.equal(permissionManifest.resources.length,57);assert.equal(permissionManifest.sourceFiles.length,30);
assert.equal(permissionManifest.sourceFiles.filter(asset=>asset.kind==='whole-png-metadata').length,22);assert.equal(permissionManifest.sourceFiles.filter(asset=>asset.kind==='whole-ui-source').length,7);
const permissionWholeAssets=[...permissionManifest.resources,...permissionManifest.sourceFiles];
assert.equal(permissionWholeAssets.length,87);assert.equal(new Set(permissionWholeAssets.map(asset=>asset.destination)).size,87);
assert.deepEqual((await readdir(new URL('dist/assets/player-permissions/',packageRoot))).sort(),permissionWholeAssets.map(asset=>asset.destination.split('/').at(-1)).sort(),'All87 original permission PNG/metadata/UI/license files are retained, with no extra private resources.');
for(const asset of permissionWholeAssets){
 assert.match(asset.destination,/^src[/]assets[/]player-permissions[/][^/]+$/);assert(!asset.destination.includes('..'));
 const bytes=await readFile(new URL(asset.destination.replace(/^src[/]/,'dist/'),packageRoot));
 assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole Classic permissions source: '+asset.entry);
}
const permissionLicense=permissionManifest.sourceFiles.filter(asset=>asset.kind==='whole-license');assert.equal(permissionLicense.length,1);assert.equal(permissionLicense[0].bytes,222);assert.equal(permissionLicense[0].sha256,'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');
assert(!permissionWholeAssets.some(asset=>/[.](?:ttf|otf|ttc|woff2?|cso|dxbc|dxil)$/i.test(asset.destination)),'Permission bank does not contain private fonts or captured shader binaries.');
assert(!Object.hasOwn(ui,'emoteWheelAssets'),'Emote-wheel source registry must remain private.');
const emoteManifest=JSON.parse(await readFile(new URL('docs/emote-wheel-assets.json',packageRoot),'utf8'));
assert.equal(emoteManifest.schemaVersion,1);assert.equal(emoteManifest.resources.length,14);
assert.equal(emoteManifest.textureMetadata.length,7);assert.equal(emoteManifest.sourceFiles.length,8);
const emoteWholeAssets=[...emoteManifest.resources,...emoteManifest.textureMetadata,...emoteManifest.sourceFiles,emoteManifest.license];
assert.equal(emoteWholeAssets.length,30);assert.equal(new Set(emoteWholeAssets.map(asset=>asset.destination)).size,30);
assert.deepEqual((await readdir(new URL('dist/assets/emote-wheel/',packageRoot))).sort(),emoteWholeAssets.map(asset=>asset.destination.split('/').at(-1)).sort(),'Packed emote bank retains every whole original PNG, metadata, UI/lang source and license.');
for(const asset of emoteWholeAssets){
 const bytes=await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
 assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole emote source: '+asset.entry);
}
assert(!Object.hasOwn(ui,'npcImageAssets'),'NPC source registry must remain private.');
const npcManifest=JSON.parse(await readFile(new URL('docs/npc-assets.json',packageRoot),'utf8'));
assert.equal(npcManifest.resources.length,10);
assert.equal(npcManifest.textureMetadata.length,2);
for (const asset of [...npcManifest.resources,...npcManifest.textureMetadata,npcManifest.license]) {
 const bytes=await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
 assert.equal(bytes.length,asset.bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole NPC source: '+asset.entry);
}
const npcActorManifest=JSON.parse(await readFile(new URL('docs/npc-actor-assets.json',packageRoot),'utf8'));
assert.equal(npcActorManifest.skins.length,60);assert.equal(npcActorManifest.sourceFiles.length,6);assert.equal(npcActorManifest.summary.ownedFiles,67);
assert.deepEqual([...ui.npcSkinNames],npcActorManifest.skins.map(skin=>skin.alias),'Public NPC aliases retain complete source controller order/case.');
const npcWholeAssets=[...npcActorManifest.skins,...npcActorManifest.sourceFiles,npcActorManifest.license];
assert.equal(npcWholeAssets.length,67);assert.equal(new Set(npcWholeAssets.map(asset=>asset.destination)).size,67);
const npcAssetDirectory=new URL('dist/assets/npc-actor/',packageRoot);
assert.deepEqual((await readdir(npcAssetDirectory)).sort(),npcWholeAssets.map(asset=>asset.destination.split('/').at(-1)).sort(),'Packed NPC bank contains exactly60 whole PNGs,6 source JSONs and the original license.');
for(const asset of npcWholeAssets){
 const bytes=await readFile(new URL(asset.destination.replace(/^src\\//,'dist/'),packageRoot));
 assert.equal(bytes.length,asset.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed whole NPC actor source: '+asset.entry);
}
for(const [variant,skin]of npcActorManifest.skins.entries()){
 assert.equal(skin.variantArrayIndex,variant);assert.deepEqual(skin.dimensions,[64,64]);
 for(const selected of [skin.alias,variant]){
  const command=ui.createNpcEntity({...npcEntityOptions,skin:selected}),url=new URL(command.texture);
  assert.equal(url.href,new URL(skin.destination.replace(/^src\\//,'dist/'),packageRoot).href,'Installed NPC URL must preserve the exact source filename/case.');
  const bytes=await readFile(url);assert.equal(bytes.length,skin.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),skin.sha256,'Installed helper source PNG: '+skin.alias);
 }
}
const npcSharedLicense=await readFile(new URL(npcActorManifest.sharedLicense.path.replace(/^src\\//,'dist/'),packageRoot));
assert.equal(npcSharedLicense.length,npcActorManifest.sharedLicense.bytes);assert.equal(createHash('sha256').update(npcSharedLicense).digest('hex'),npcActorManifest.sharedLicense.sha256);
const npcGeometryAsset=npcActorManifest.sourceFiles.find(asset=>asset.role==='geometry');
const npcBehaviorAsset=npcActorManifest.sourceFiles.find(asset=>asset.role==='behaviorEntity');
assert(npcBehaviorAsset);assert.equal(npcBehaviorAsset.entry,'behavior_pack/entities/npc.json');assert.equal(npcBehaviorAsset.bytes,5098);
assert.equal(npcBehaviorAsset.sha256,'1dfce74b80b8603d183eae864d209256b301bc2d4901753ccf25a0ae3d1f68b4');
const npcBehaviorSource=JSON.parse(await readFile(new URL(npcBehaviorAsset.destination.replace(/^src\\//,'dist/'),packageRoot),'utf8'));
const npcSkinList=npcBehaviorSource['minecraft:entity'].components['minecraft:npc'].npc_data.skin_list;
assert(Array.isArray(npcSkinList));assert.equal(npcSkinList.length,60);
const npcControllerAsset=npcActorManifest.sourceFiles.find(asset=>asset.role==='renderController');assert(npcControllerAsset);
const npcControllerSource=JSON.parse(await readFile(new URL(npcControllerAsset.destination.replace(/^src\\//,'dist/'),packageRoot),'utf8'));
const npcControllerAliases=npcControllerSource.render_controllers['controller.render.npc'].arrays.textures['Array.skins'].map(name=>{
 assert.equal(typeof name,'string');assert(name.startsWith('Texture.'));return name.slice('Texture.'.length);
});
assert.equal(npcControllerAliases.length,60);assert.deepEqual([...ui.npcSkinNames],npcControllerAliases,'npcSkinNames remains source controller order, independently of appearance UI order.');
const npcExpectedAppearance=npcSkinList.map(entry=>{
 assert.deepEqual(Object.keys(entry),['variant']);assert(Number.isSafeInteger(entry.variant)&&entry.variant>=0&&entry.variant<60);
 return {variant:entry.variant,skin:npcControllerAliases[entry.variant]};
});
assert.equal(new Set(npcExpectedAppearance.map(option=>option.variant)).size,60);
assert.deepEqual([...ui.npcAppearanceOptions],npcExpectedAppearance,'Appearance UI order comes from the complete packed behavior skin_list, not controller-array positions.');
const npcSourceGeometry=JSON.parse(await readFile(new URL(npcGeometryAsset.destination.replace(/^src\\//,'dist/'),packageRoot),'utf8'))['geometry.npc'];
assert.deepEqual(npcEntity.source.bones.map(bone=>bone.name),npcSourceGeometry.bones.map(bone=>bone.name));
for(const [index,bone]of npcEntity.source.bones.entries()){
 const original=npcSourceGeometry.bones[index];assert.deepEqual(bone.pivot,original.pivot);assert.deepEqual(bone.cubes,original.cubes);
}
assert.notDeepEqual(npcEntity.bonePose.arms,npcCallerPose.arms,'Omitted pose uses the authored folded-idle pose rather than the explicit identity pose.');
const rendererManifest = JSON.parse(await readFile(new URL('docs/item-renderers-geometry.json',packageRoot),'utf8'));
const workstationImages = JSON.parse(await readFile(new URL('docs/workstation-image-assets.json',packageRoot),'utf8'));
assert.equal(workstationImages.assetCount,28);
assert.equal(workstationImages.registryKeyCount,29);
const bundle = await readFile(new URL('dist/index.js',packageRoot),'utf8');
const embeddedImages = new Set([...bundle.matchAll(/data:image\\/png;base64,([A-Za-z0-9+/=]+)/g)].map(match=>createHash('sha256').update(Buffer.from(match[1],'base64')).digest('hex')));
for (const image of workstationImages.assets) assert(embeddedImages.has(image.sha256),'Packed original workstation PNG: '+image.source);
const workstationLicense = await readFile(new URL('dist/assets/Minecraft-Sample-LICENSE.md',packageRoot));
assert.equal(createHash('sha256').update(workstationLicense).digest('hex'),workstationImages.license.sha256);
for (const asset of [...rendererManifest.assets,rendererManifest.license]) {
  const bytes = await readFile(new URL(asset.file.replace(/^src\\//,'dist/'),packageRoot));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,'Packed renderer asset: '+asset.file);
}
for (const [file,sha256] of [
  ['dist/assets/glint/enchanted_item_glint.png','99cf0defcbe422c8b91a42886f469d89cfbaba157371d8142d01ba7e8055a631'],
  ['dist/assets/glint/LICENSE.md','ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'],
  ['dist/assets/gui-icons/LICENSE.md','ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d'],
]) {
  const bytes = await readFile(new URL(file,packageRoot));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,'Packed original glint resource: '+file);
}
console.log('React '+React.version+': ESM, '+components.length+' components + '+dataExports.length+' data exports + '+rendererFunctions.length+' renderer functions, SSR, styles, fonts, renderer assets and licenses PASS');
`);
  console.log(execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer, encoding: 'utf8' }).trim());
  await writeFile(join(consumer, 'consumer.tsx'), `
import { createRef } from 'react';
import { SignEditor, SignTextSurface } from 'mcbeui';
import type { SignEditorProps, SignTextSurfaceProps, SignCloseDetail } from 'mcbeui';
const consumerSignClose = (value: string, detail: SignCloseDetail) => value.length > 0 && detail.reason === 'escape';
const consumerSignProps: SignTextSurfaceProps = { variant: 'hanging', wood: 'oak', defaultValue: 'Consumer sign', textareaRef: createRef<HTMLTextAreaElement>(), onValueChange: (value, event) => value + event.currentTarget.value };
const consumerSignModalProps: SignEditorProps = { ...consumerSignProps, defaultOpen: false, exitBehavior: 'commit', onCommit: consumerSignClose, dialogRef: createRef<HTMLDialogElement>() };
const consumerSignElements = <><SignTextSurface {...consumerSignProps} ref={createRef<HTMLDivElement>()}/><SignEditor {...consumerSignModalProps} ref={createRef<HTMLDivElement>()}/></>;
import { ServerActionForm, ServerCustomForm } from 'mcbeui';
import type { ServerActionRow, ServerCustomField, ServerCustomFormValues, ServerActionFormProps, ServerCustomFormProps, BookPageNumberFontMode } from 'mcbeui';
const serverRows: readonly ServerActionRow[] = [{id:'go',type:'button',text:'Go',icon:{state:'none'}}];
const serverFields: readonly ServerCustomField[] = [{id:'name',type:'input',label:'Name'},{id:'step',type:'step_slider',label:'Step',options:[{value:'a',label:'A'}]},{id:'multi',type:'multiselect',label:'Multi',options:[{value:'a',label:'A'}]}];
const serverValues: ServerCustomFormValues = {name:'Raw -',step:'a',multi:['a']};
const serverActionProps: ServerActionFormProps = {title:'Actions',rows:serverRows,onAction:(id,detail)=>id+detail.row.text+detail.index,onCancel:detail=>detail.reason};
const serverCustomProps: ServerCustomFormProps = {title:'Custom',fields:serverFields,value:serverValues,inputRefs:{name:createRef<HTMLInputElement>()},multiselectRefs:{multi:createRef<HTMLButtonElement>()},onValueChange:(next,detail)=>String(next[detail.id]),onSubmit:accepted=>accepted.name,onCancel:(accepted,detail)=>String(accepted.name)+detail.reason};
const serverElements = <><ServerActionForm {...serverActionProps} ref={createRef<HTMLElement>()}/><ServerCustomForm {...serverCustomProps} ref={createRef<HTMLElement>()}/></>;
import { NpcPortrait, NpcSkinPicker, NpcActionEditor, NpcDialogue, NpcEditor } from 'mcbeui';
import { EmoteWheel, EmoteSlotPreview } from 'mcbeui';
import { EmoteWheelScreen } from 'mcbeui';
import type { EmoteWheelScreenProps, EmoteWheelScreenLabels, EmoteWheelScreenCloseDetail } from 'mcbeui';
import type { EmoteIndex, EmotePreviewContent, EmoteSlot, EmoteWheelProps, EmoteSlotPreviewProps } from 'mcbeui';
const typedEmoteIndex: EmoteIndex=2;
const typedEmoteContent: EmotePreviewContent={kind:'text',text:'1'};
const typedEmoteSlot: EmoteSlot={id:'wave',label:'Wave',preview:typedEmoteContent};
const typedEmoteSlots: EmoteWheelProps['slots']=[typedEmoteSlot,{id:'clap',label:'Clap',preview:{kind:'image',src:'/host.png'}},{id:'empty',label:'Empty',preview:{kind:'empty'}},{id:'dance',label:'Dance',preview:{kind:'text',text:'4'}}];
// @ts-expect-error Source slot tuple cannot be shortened to three entries.
const invalidEmoteSlots: EmoteWheelProps['slots']=[typedEmoteSlot,typedEmoteSlot,typedEmoteSlot];
// @ts-expect-error Source slot tuple is readonly.
typedEmoteSlots[0]=typedEmoteSlot;
// @ts-expect-error Only the four source cardinal indices are valid.
const invalidEmoteIndex: EmoteIndex=4;
const typedEmoteProps: EmoteWheelProps={slots:typedEmoteSlots,label:'Typed wheel',size:[256,200],activeIndex:typedEmoteIndex,onActiveIndexChange:(index,detail)=>String(index)+detail.cause+detail.event.type,onActivate:(index,slot,event)=>String(index)+slot.id+event.type,onCancel:event=>event.key,hints:{keyboard:['1','2','3','4'],gamepad:{mode:'quick',faces:[<span>Up</span>,<span>Right</span>,<span>Down</span>,<span>Left</span>]}},buttonRefs:{0:createRef<HTMLButtonElement>()}};
const typedEmotePreviewProps: EmoteSlotPreviewProps={content:typedEmoteContent,scale:2};
const typedEmoteElements=<><EmoteWheel {...typedEmoteProps} ref={createRef<HTMLDivElement>()}/><EmoteSlotPreview {...typedEmotePreviewProps} ref={createRef<HTMLDivElement>()}/></>;
const typedScreenLabels: Partial<EmoteWheelScreenLabels>={keyboardInstruction:'Source keyboard hint',touchInstruction:undefined};
const typedScreenProps: EmoteWheelScreenProps={slots:typedEmoteSlots,label:'Typed screen',size:[400,300],scale:2,activeIndex:typedEmoteIndex,centerLabel:'',labels:typedScreenLabels,gamepadInstruction:'Host instructions',gamepadStartGlyph:<span>Host glyph</span>,gamepadStartDescription:'Host Start',gamepadExitLabel:'Host exit',wheelRef:createRef<HTMLDivElement>(),changeButtonRef:createRef<HTMLButtonElement>(),changeEmotesVisible:false,changeEmotesDisabled:true,onChangeEmotes:event=>event.currentTarget.name,onCloseRequest:(detail:EmoteWheelScreenCloseDetail)=>detail.reason+detail.event.type};
const typedScreenElement=<EmoteWheelScreen {...typedScreenProps} ref={createRef<HTMLDivElement>()}/>;
import { DocumentViewer, DocumentHeading, DocumentParagraph } from 'mcbeui';
import type { DocumentTopic, DocumentGroup, DocumentHint, DocumentValueChangeDetail, DocumentScrollPosition, DocumentViewerProps, DocumentHeadingProps, DocumentParagraphProps } from 'mcbeui';
const typedDocumentTopic:DocumentTopic={id:'start',title:'Start',sectionTitle:'How to Play: Start',content:<><DocumentHeading>Heading</DocumentHeading><DocumentParagraph linePadding={6}>Text</DocumentParagraph></>,showArrow:true};
const typedDocumentGroups:readonly DocumentGroup[]=[{id:'group',label:'Group',topics:[typedDocumentTopic]}];
const typedDocumentHint:DocumentHint={label:'Previous',glyph:<span>Host glyph</span>,description:'Previous'};
const typedDocumentProps:DocumentViewerProps={groups:typedDocumentGroups,label:'Manual',value:null,defaultValue:null,previousHint:typedDocumentHint,navigationViewportRef:createRef<HTMLDivElement>(),contentViewportRef:createRef<HTMLDivElement>(),topicRefs:{start:createRef<HTMLButtonElement>()},size:[400,300] as const,scale:2,scrollPolicy:'preserve',onValueChange:(id,detail:DocumentValueChangeDetail)=>id+detail.reason+detail.event.type,onScrollPositionChange:(pane,position:DocumentScrollPosition)=>pane+position.scrollTop+position.topicId,onBack:event=>event.type};
const typedDocumentHeadingProps:DocumentHeadingProps={scale:2,children:'Heading'};
const typedDocumentParagraphProps:DocumentParagraphProps={scale:2,linePadding:12,children:'Text'};
const typedDocumentElements=<><DocumentViewer {...typedDocumentProps} ref={createRef<HTMLElement>()}/><DocumentHeading {...typedDocumentHeadingProps} ref={createRef<HTMLHeadingElement>()}/><DocumentParagraph {...typedDocumentParagraphProps} ref={createRef<HTMLParagraphElement>()}/></>;
// @ts-expect-error Topic collections are readonly.
typedDocumentGroups[0].topics.push(typedDocumentTopic);
// @ts-expect-error Scroll reset is a bounded policy.
const badDocumentPolicy:DocumentViewerProps['scrollPolicy']='native';

import { PlayerPermissions, PermissionLevelSelect, PermissionToggleRow, PermissionPlayerRow } from 'mcbeui';
import type { PermissionLevel, PermissionLevelLabels, PermissionLevelSelectProps, PermissionToggleRowProps, PermissionPlayer, PermissionPlayerRowProps, PlayerPermissionOption, PlayerPermissionState, PlayerPermissionsValue, PlayerPermissionsChangeDetail, PlayerPermissionsLabels, PlayerPermissionsProps } from 'mcbeui';
const typedPermissionLevel:PermissionLevel='custom';
const typedPermissionPlayers:readonly PermissionPlayer[]=[{id:'alpha',name:'Caller Alpha',avatarSrc:'/caller-avatar.png',avatarVisible:true,localIconVisible:true,levelIcon:<span>Host icon</span>}];
const typedPermissionOptions:readonly PlayerPermissionOption[]=[{id:'build',label:'Build',stateLabel:'Independent state'},{id:'mine',label:'Mine',disabled:true}];
const typedPermissionState:PlayerPermissionState={level:typedPermissionLevel,permissions:{build:true,mine:false}};
const typedPermissionValues:PlayerPermissionsValue={alpha:typedPermissionState};
const typedPermissionLabels:Partial<PlayerPermissionsLabels>={title:'Caller permissions',back:undefined};
const typedPermissionLevelLabels:Partial<PermissionLevelLabels>={label:'Permission level',custom:'Host Custom',visitor:undefined};
const typedPermissionProps:PlayerPermissionsProps={players:typedPermissionPlayers,permissionOptions:typedPermissionOptions,label:'Classic permissions',selectedPlayerId:null,defaultSelectedPlayerId:null,value:typedPermissionValues,labels:typedPermissionLabels,levelLabels:typedPermissionLevelLabels,size:[400,300] as const,scale:2,readOnly:true,canEditPermissions:false,templateLocked:true,templateWarning:'Host policy',optionsVisible:true,kickVisible:true,kickEnabled:false,banVisible:true,banEnabled:false,worldSettings:true,inRealm:true,gamepad:true,gamepadBackGlyph:<span>Host controller</span>,gamepadBackText:'Back',selectorFocused:false,contentFocused:true,playersViewportRef:createRef<HTMLDivElement>(),permissionsViewportRef:createRef<HTMLDivElement>(),playerRefs:{alpha:createRef<HTMLButtonElement>()},permissionRefs:{build:createRef<HTMLInputElement>()},levelRef:createRef<HTMLButtonElement>(),onSelectedPlayerIdChange:(id,event)=>id+event.type,onValueChange:(next,detail:PlayerPermissionsChangeDetail)=>String(next[detail.playerId]?.level)+detail.reason+detail.permissionId+detail.event.type,onKickRequest:(player,event)=>player.id+event.type,onBanRequest:(player,event)=>player.id+event.type,onBack:event=>event.type,onScrollPositionChange:(pane,position)=>pane+position.scrollTop};
const typedPermissionSelect:PermissionLevelSelectProps={value:typedPermissionLevel,defaultValue:null,worldSettings:true,inRealm:true,readOnly:true,labels:typedPermissionLevelLabels,selectedLabel:'Independent face',selectedIcon:<span>Host face icon</span>,onValueChange:(level,event)=>level+event.type};
const typedPermissionToggle:PermissionToggleRowProps={label:'Build',checked:true,defaultChecked:false,stateLabel:'Host state',readOnly:true,onCheckedChange:(checked,event)=>String(checked)+event.currentTarget.checked};
const typedPermissionPlayer:PermissionPlayerRowProps={player:typedPermissionPlayers[0]!,selected:true,inactive:true,onClick:event=>event.currentTarget.value};
const typedPermissionElements=<><PlayerPermissions {...typedPermissionProps} ref={createRef<HTMLElement>()}/><PermissionLevelSelect {...typedPermissionSelect} ref={createRef<HTMLButtonElement>()}/><PermissionToggleRow {...typedPermissionToggle} ref={createRef<HTMLInputElement>()}/><PermissionPlayerRow {...typedPermissionPlayer} ref={createRef<HTMLButtonElement>()}/></>;
// @ts-expect-error Permission roles are source branch names, not arbitrary engine role strings.
const badPermissionLevel:PermissionLevel='owner';
// @ts-expect-error Permission records retain boolean draft values, never string coercion.
const badPermissionBoolean:PlayerPermissionState={level:'member',permissions:{build:'true'}};
// @ts-expect-error Player schemas are readonly host data.
typedPermissionPlayers.push({id:'other',name:'Other'});
// @ts-expect-error Accepted role snapshots are readonly.
typedPermissionState.level='operator';
// @ts-expect-error Accepted ability snapshots are readonly.
typedPermissionState.permissions.build=false;

import type { NpcActionValue, NpcEditorValue, NpcEditorProps, NpcActionEditorProps, NpcDialogueProps, NpcSkinPickerProps, NpcPortraitProps } from 'mcbeui';
import { createNpcEntity, npcSkinNames, npcAppearanceOptions } from 'mcbeui';
import type { NpcSkinName, NpcEntityVariant, NpcEntityOptions, NpcAppearanceOption, GuiEntityCube, GuiEntityBone, GuiEntitySource, GuiNpcPortraitMaterial, GuiEntityGeometry, GuiEntityMesh, GuiEntityLayoutOptions, GuiEntityLayout } from 'mcbeui';
const typedNpcSkin: NpcSkinName = 'npc_BusinessMobs_5';
const typedNpcVariant: NpcEntityVariant = 59;
const typedNpcNames: readonly NpcSkinName[] = npcSkinNames;
const typedNpcIdentity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const typedNpcMaterial: GuiNpcPortraitMaterial = {kind:'npc-portrait',tileLightColor:[1,1,1,1],fogControl:[0,1,1],fogColor:[0,0,0],materialColor:[1,1,1,1],uvAnimation:[0,0,0,0],subPixelOffset:[0,0]};
const typedNpcOptions: NpcEntityOptions = {skin:typedNpcSkin,model:typedNpcIdentity(),view:typedNpcIdentity(),projection:typedNpcIdentity(),viewport:[0,0,64,64],scissor:[1,1,62,62],material:typedNpcMaterial};
const typedNpcCommand: Extract<GuiLayerCommand,{kind:'entity'}> = createNpcEntity(typedNpcOptions);
const typedNpcVariantCommand: GuiLayerCommand = createNpcEntity({...typedNpcOptions,skin:typedNpcVariant});
const typedNpcAppearanceList: readonly NpcAppearanceOption[] = npcAppearanceOptions;
const typedNpcAppearance: NpcAppearanceOption = typedNpcAppearanceList[0]!;
const typedNpcAppearanceSkin: NpcSkinName = typedNpcAppearance.skin;
const typedNpcAppearanceVariant: NpcEntityVariant = typedNpcAppearance.variant;
const typedNpcAppearanceCommand: GuiLayerCommand = createNpcEntity({...typedNpcOptions,skin:typedNpcAppearanceVariant});
// @ts-expect-error public appearance collection is readonly.
typedNpcAppearanceList.push(typedNpcAppearance);
// @ts-expect-error public appearance variant is readonly.
typedNpcAppearance.variant=typedNpcAppearanceVariant;
const typedNpcSource: GuiEntitySource = typedNpcCommand.source;
const typedNpcBone: GuiEntityBone = typedNpcSource.bones[0]!;
const typedNpcCube: GuiEntityCube = typedNpcBone.cubes[0]!;
const typedNpcGeometry: GuiEntityGeometry = typedNpcCommand;
const typedNpcLayer = <GuiLayer width={64} height={64} guiScale={1} commands={[typedNpcCommand,typedNpcVariantCommand]} label="Typed source NPC"/>;
// Type-only entity layout names are public; their compiler/layout runtime is private.
type TypedNpcMeshConsumer = (mesh: GuiEntityMesh) => GuiEntityMesh['boneNames'];
type TypedNpcLayoutConsumer = (input: GuiEntityLayoutOptions) => GuiEntityLayout['viewport'];
const npcCommand: NpcActionValue = {id:'cmd',kind:'command',text:'say raw',buttonName:'Run',buttonMode:true,onEnter:false,onExit:true};
const npcValue: NpcEditorValue = {name:'Caller NPC',dialogue:'Caller raw dialogue',skinId:'skin',actions:[npcCommand]};
const npcEditorProps: NpcEditorProps = {value:npcValue,educationEdition:true,nameRef:createRef<HTMLInputElement>(),dialogueRef:createRef<HTMLTextAreaElement>(),actionTextareaRefs:{cmd:createRef<HTMLTextAreaElement>()},onValueChange:(next,detail)=>next.name+detail.reason,onPageChange:(next,detail)=>next+detail.reason,onMaximizedActionChange:(id,detail)=>id+detail.reason,onClose:(next,detail)=>next.name+detail.reason};
const npcActionProps: NpcActionEditorProps = {value:npcCommand,textareaRef:createRef<HTMLTextAreaElement>(),buttonNameRef:createRef<HTMLInputElement>(),toggleRefs:{onEnter:createRef<HTMLInputElement>()},onValueChange:(next,detail)=>String(next[detail.field]),onMaximizedChange:(next,detail)=>String(next)+detail.reason};
const npcDialogueProps: NpcDialogueProps = {value:'Raw dialogue',worldBuilder:true,textareaRef:createRef<HTMLTextAreaElement>(),onAction:(id,detail)=>id+detail.action.label+detail.index};
const npcSkinProps: NpcSkinPickerProps = {skins:[{id:'skin',label:'One',actor:<span>Host actor</span>}],onValueChange:(id,detail)=>id+detail.skin.id,onPageChange:(page,detail)=>String(page)+detail.direction};
const npcPortraitProps: NpcPortraitProps = {actor:<span>Host actor</span>,variant:'dialogue',size:[80,97]};
const npcElements = <><NpcPortrait {...npcPortraitProps} ref={createRef<HTMLDivElement>()}/><NpcSkinPicker {...npcSkinProps} ref={createRef<HTMLDivElement>()}/><NpcActionEditor {...npcActionProps} ref={createRef<HTMLElement>()}/><NpcDialogue {...npcDialogueProps} ref={createRef<HTMLElement>()}/><NpcEditor {...npcEditorProps} ref={createRef<HTMLElement>()}/></>;
const pageNumberMode: BookPageNumberFontMode = 'auto';
import { StructureEditor, XYZVectorInput } from 'mcbeui';
import type { StructureEditorValue, StructureEditorProps, XYZValue, XYZVectorInputProps, BookNavigationControl } from 'mcbeui';
const structurePoint: XYZValue = {x:'-',y:'2',z:'3'};
const structureDraft: StructureEditorProps['defaultValue'] = {name:'demo:packed',saveSize:structurePoint};
const structureChange = (next: StructureEditorValue) => next.saveSize.x;
const structureProps: StructureEditorProps = {defaultValue:structureDraft,onValueChange:structureChange,inputRefs:{'saveSize.x':createRef<HTMLInputElement>()},onAction:(action,next)=>action+next.name,preview:<p>Caller-owned preview</p>,onPreviewTurn:detail=>String(detail.deltaX)};
const xyzProps: XYZVectorInputProps = {label:'Position',value:structurePoint,onValueChange:(next,detail)=>next[detail.axis],inputRefs:{x:createRef<HTMLInputElement>()}};
const structureConsumers = <><StructureEditor {...structureProps} ref={createRef<HTMLElement>()}/><XYZVectorInput {...xyzProps} ref={createRef<HTMLFieldSetElement>()}/></>;
const hostBookNavigation: BookNavigationControl = {previousAvailable:false,nextAvailable:true,onTurnRequest:(direction,accepted,event)=>direction+accepted.title+event.type};
import { CommandBlockEditor, CommandInput, CommandOutputPanel } from 'mcbeui';
import type { CommandBlockValue, CommandBlockEditorProps, CommandInputProps, CommandPreviousInfo } from 'mcbeui';
const commandValue: CommandBlockValue = {hoverNote:'Packed',command:'say accepted',tickDelay:'-',blockType:'repeat',condition:'conditional',redstone:'always_on',executeFirstTick:true,trackOutput:true};
const commandProps: CommandBlockEditorProps = {value:commandValue,viewportSize:[400,300],cancelEnabled:false,trackOutputEnabled:true,textareaRef:createRef<HTMLTextAreaElement>(),onValueChange:(next,detail)=>String(next[detail.field]),onExpandedChange:(next,detail)=>String(next)+detail.reason,onPasteRequest:next=>next.command,onClose:(next,detail)=>next.hoverNote+detail.reason};
const commandInputProps: CommandInputProps = {value:'say input',textareaRef:createRef<HTMLTextAreaElement>(),onValueChange:next=>next,onPasteRequest:next=>next};
const commandInfo: CommandPreviousInfo = {blockType:'Repeat',condition:'Conditional',redstone:'Always Active'};
const commandConsumers = <><CommandBlockEditor {...commandProps} ref={createRef<HTMLElement>()}/><CommandInput {...commandInputProps} ref={createRef<HTMLDivElement>()}/><CommandOutputPanel previousInfo={commandInfo} previousOutput="Accepted output" outputRef={createRef<HTMLPreElement>()} ref={createRef<HTMLDivElement>()}/></>;
import { JigsawEditor, JigsawPriorityFields } from 'mcbeui';
import type { JigsawValue, JigsawPriorities, JigsawEditorProps } from 'mcbeui';
const jigsawValue: JigsawValue = { targetPool:'demo:pool', name:'demo:name', target:'demo:target', finalBlock:'minecraft:air', selectionPriority:'-', placementPriority:'-2147483648', joint:'rollable' };
const jigsawProps: JigsawEditorProps = { value:jigsawValue, size:[320,260], inputRefs:{targetPool:createRef<HTMLInputElement>()}, onValueChange:(next,detail)=>next[detail.field], onDone:next=>next.finalBlock, onCancel:(next,detail)=>next.name+detail.reason };
const jigsawConsumer = <><JigsawEditor {...jigsawProps} ref={createRef<HTMLElement>()}/><JigsawPriorityFields defaultValue={{selectionPriority:'0',placementPriority:'-1'} satisfies JigsawPriorities} ref={createRef<HTMLFieldSetElement>()}/></>;
import { BookReader, BookEditor, BookPage, BookPageTurnButton } from 'mcbeui';
import type { BookReaderProps, BookEditorProps, BookDocumentSnapshot, BookLabels, BookFontMode } from 'mcbeui';
const consumerBookSnapshot = (snapshot: BookDocumentSnapshot) => snapshot.pages.join('') + snapshot.mode;
const consumerBookLabels: Partial<BookLabels> = { previous: 'Previous spread', next: 'Next spread' };
const consumerBookProps: BookReaderProps = { pages: ['One', 'Two'], layout: { unitScale: 2 }, navigation:hostBookNavigation, pageNumberFontMode:pageNumberMode, labels: consumerBookLabels, onFinish: consumerBookSnapshot };
const consumerBookFontMode: BookFontMode = 'auto';
const consumerEditProps: BookEditorProps = { defaultPages: [], defaultTitle: 'A book', defaultAuthor: 'Player', onSign: consumerBookSnapshot, textareaRef: () => createRef<HTMLTextAreaElement>(), fontMode: index => index % 2 ? 'unicode' : consumerBookFontMode };
const consumerBookElements = <><BookReader {...consumerBookProps} ref={createRef<HTMLElement>()}/><BookEditor {...consumerEditProps} ref={createRef<HTMLElement>()}/><BookPage side="left" text="Page" ref={createRef<HTMLDivElement>()} textareaRef={createRef<HTMLTextAreaElement>()}/><BookPageTurnButton direction="next" ref={createRef<HTMLButtonElement>()}/></>;
import { Anvil, BlastFurnace, Button, Checkbox, Chest, Combobox, ContainerFrame, CraftingTable, Dialog, Dispenser, Dropper, DurabilityBar, EnchantingBook, EnchantingRunes, EnchantingTable, EnchantmentOption, FuelIndicator, Furnace, Grindstone, Hopper, Image, InventoryGrid, ItemCount, ItemImage, ItemSlot, ItemTooltip, NineSlice, ProcessingArrow, RadioGroup, RecipeGrid, ResultSlot, ShulkerBox, Slider, SlotPlaceholder, Smoker, Tabs, Text, TextField } from 'mcbeui';
import type { ButtonProps, TabItem, EnchantmentOption as EnchantmentData, InventoryItem, ItemTooltipTextRenderer, EnchantingBookRendererState, WorkstationTextContext, WorkstationTextRenderer } from 'mcbeui';
import { BitmapText, renderBitmapGlyphs, GuiIcon, guiIconNames, GuiImageLayer, layoutGuiImages, renderGuiImages } from 'mcbeui';
import { GuiLayer, layoutGuiText, renderGuiLayer, layoutGuiModel, createGuiCuboidModel, assembleGuiTextureAtlas } from 'mcbeui';
import type { GuiTextureAtlasSource, GuiTextureAtlas, GuiLayerTextureSource, GuiLayerTexture } from 'mcbeui';
import type { GuiModelFace, GuiModelMesh, GuiModelProjection, GuiModelGeometry, GuiModelLayoutOptions, GuiModelRun, GuiModelLayout, GuiModelItem, GuiCuboidFace, GuiCuboidModelOptions } from 'mcbeui';
import type { GuiTextRgba8, GuiTextFont, GuiTextGeometry, GuiTextLayoutOptions, GuiTextRun, GuiTextLayout, GuiSpriteGeometry, GuiLayerCommand, GuiLayerProps, GuiLayerGeometryCommand, GuiLayerLayoutOptions, GuiLayerLayoutCommand, GuiLayerLayout, GuiLayerDraw, GuiLayerRenderOptions, GuiLayerRenderResult, EnchantingTableTextRenderStyle, EnchantingTableTextRenderProfile } from 'mcbeui';
import type { GuiImage, GuiImageLayerProps, GuiImageLayerState, GuiImageRect, GuiImageRgba, GuiImageNineSlice, GuiImageGeometry, GuiImageLayoutOptions, GuiImageVertex, GuiImageMesh, GuiImageLayout, GuiImageTexture, GuiImageDraw, GuiImageBackground, GuiImageRenderOptions, GuiImageRenderResult, EnchantingTableImageRenderProfile } from 'mcbeui';
import type { GrindstoneImageRenderProfile, GrindstoneTextRenderProfile, GrindstoneTextRenderStyle } from 'mcbeui';
import type { AnvilImageRenderProfile, AnvilTextRenderProfile, AnvilTextRenderStyle } from 'mcbeui';
import type { CraftingScreenImageRenderProfile, CraftingScreenTextStyle, CraftingScreenInputTextStyle } from 'mcbeui';
import { Select } from 'mcbeui';
import type { GuiIconProps, GuiIconName, BitmapTextProps, BitmapTextRenderer, BitmapTextProfile, BitmapFont, BitmapGlyph, BitmapGlyphRun, BitmapGlyphRenderOptions, BitmapGlyphRenderResult, BitmapRgba, BitmapTargetRect, BitmapAtlasQuad, BitmapAtlasRun, BitmapUnicodeVertex, BitmapUnicodeRun, BitmapGlyphBackground } from 'mcbeui';
import { AirBar, ArmorBar, BrewingIndicator, BrewingStand, CartographyTable, Crosshair, ExperienceBar, HealthBar, Hotbar, HungerBar, ScrollArea, ScrollBar, SmithingTable } from 'mcbeui';
import type { AirBubbleState, BrewingSlot, CartographyMode, ScrollPosition } from 'mcbeui';
import { BossBar, ChatMessage, ChatPanel, Scoreboard, StatusEffect, ActionBar, TitleOverlay, HeldItemTooltip } from 'mcbeui';
import type { BossBarColor, ChatMessageData, ScoreboardEntry, BedrockStatusEffect } from 'mcbeui';
import { Stonecutter, Loom, Beacon, Crafter, RecipeSelectionGrid, CrafterSlot, BeaconEffect, ToggleButton, SearchField, NavigationList, SettingRow, KeybindingField } from 'mcbeui';
import type { RecipeSelectionOption, BeaconEffectState, BeaconEffectId, BeaconPrimaryEffect, NavigationItem, SettingControlProps } from 'mcbeui';
import { Spinner, Tooltip, Toast } from 'mcbeui';
import { WorldList, ServerList, PlayerCard, PackList, PackCard } from 'mcbeui';
import type { GameListImage, WorldListItem, ServerListItem, PackListItem } from 'mcbeui';
import { SettingsPanel, LoadingScreen, AchievementToast } from 'mcbeui';
import type { SettingsSection } from 'mcbeui';
import { PlayerList, TouchControls, PauseMenu, DeathScreen, TradeOffer, TradingScreen, MountInventory } from 'mcbeui';
import type { GamePlayer, TouchAction, TouchMovement, PauseMenuAction, TradeCost, TradeOfferData, TradeTier, MountEquipmentSlot, MountEquipmentKind } from 'mcbeui';
import { BlockPreview, BannerPreview, bannerPatternIds, bannerDyeColors, loomPatternIds } from 'mcbeui';
import { ItemGlint, shadeItemGlint, renderItemGlint } from 'mcbeui';
import type { ItemGlintSampler, ItemGlintUniforms, ItemGlintBlend, ItemGlintRenderOptions, ItemGlintPassColor, ItemGlintProps } from 'mcbeui';
import type { BlockKind, BannerDye, RendererColor, BannerPatternLayer, BannerPatternId, ItemMesh, ItemMeshFace, ItemCamera, ItemLighting, Vec3, Uv, PixelTexture } from 'mcbeui';
import { PlayerInventoryScreen, CreativeInventory, ArmorSlot, RecipeSearch, RecipeCategoryTabs, InventoryToolbar } from 'mcbeui';
import type { ArmorSlotKind, RecipeCategory, InventoryLayout } from 'mcbeui';
import { RecipeBook, RecipeBookEntry, RecipeFilterToggle, CraftingScreen, InventoryScreenFrame, SurvivalInventoryScreen } from 'mcbeui';
import type { RecipeBookProps, RecipeBookEntryProps, RecipeBookItem, RecipeBookAction, RecipeFilterToggleProps, CraftingScreenProps, CraftingLayout, InventoryScreenFrameProps, InventoryScreenLayout, SurvivalInventoryScreenProps } from 'mcbeui';
const recipeBookItem: RecipeBookItem = {id:'stone',item:{name:'Stone',count:64},label:'Stone recipe',craftableCount:0,backgroundImage:'/caller-recipe-background.png',backgroundSlice:1,modifier:'expand',preview:<span>Caller item art</span>};
const recipeBookProps: RecipeBookProps = {title:'Craftable',entries:[recipeBookItem],categoryId:'search',query:'stone',craftableOnly:true,selectedId:'stone',onCategoryChange:id=>id.toUpperCase(),onQueryChange:query=>query.toLowerCase(),onCraftableOnlyChange:value=>Boolean(value),onRecipeAction:(id,action:RecipeBookAction)=>id+action};
const recipeBookEntryProps: RecipeBookEntryProps = {entry:recipeBookItem,selected:true,onRecipeAction:(id,action)=>id+action};
const recipeFilterProps: RecipeFilterToggleProps = {craftableOnly:true,onCraftableOnlyChange:value=>Boolean(value),label:'Craftable recipes only'};
const inventoryFrameLayout: InventoryScreenLayout = 'recipe-book';
const inventoryFrameProps: InventoryScreenFrameProps = {title:'Caller inventory frame',book:<RecipeBook {...recipeBookProps}/>,children:<div>Caller right pane</div>,layout:inventoryFrameLayout,onLayoutChange:layout=>layout.toUpperCase(),onHelp:()=>{},onClose:()=>{},showClose:false};
const survivalScreenProps: SurvivalInventoryScreenProps = {recipeBook:recipeBookProps,inventory:{needsCraftingTable:true,craftingTablePreview:<span>Caller crafting-table renderer</span>,armor:[null,null,null,null]},defaultLayout:'survival',onLayoutChange:layout=>layout.toUpperCase(),onHelp:()=>{},onClose:()=>{}};
const craftingScreenProps: CraftingScreenProps = {recipeBook:recipeBookProps,layout:'recipe-book',onLayoutChange:(layout:CraftingLayout)=>layout.toUpperCase(),crafting:{inputs:[],result:null,onInputAction:(index,action)=>String(index)+action},onHelp:()=>{},onClose:()=>{}};
const bitmapGlyph: BitmapGlyph = {page:0,x:0,y:0,width:1,height:1,advance:1,offsetX:0,offsetY:0};
const bitmapFont: BitmapFont = {pages:['/caller-owned-atlas.png'],glyphs:{A:bitmapGlyph},lineHeight:1};
const bitmapProps: BitmapTextProps = {font:bitmapFont,sampling:'point',shader:'bitmap',children:'A',color:'#ffffff',shadow:{color:'#000000',offsetX:1,offsetY:1}};
export const logicalBitmapProps: BitmapTextProps = {...bitmapProps,layout:'advance'};
const originalIcon: GuiIconName = guiIconNames[0]!;
const iconProps: GuiIconProps = {name:originalIcon,scale:2,label:'Original icon'};
const workstationText: WorkstationTextRenderer = (text,context:WorkstationTextContext)=><span data-kind={context.kind} data-tier={context.kind==='enchantment-cost'?context.tier:undefined} data-disabled={context.kind==='enchantment-cost'?context.disabled:undefined}>{text}</span>;
const textRenderer: ItemTooltipTextRenderer = (text,context)=><span data-kind={context.kind} data-index={context.index}>{text}</span>;
const rendererItem: InventoryItem = {name:'A',durability:.5,lore:['A',<strong>Rich node lore</strong>],tooltipTextRenderer:textRenderer};
const props: ButtonProps = {variant:'primary',size:'sm',type:'submit'};
const items: TabItem[] = [{value:'game',label:'Game',content:'Survival'}];
const enchantment: EnchantmentData = {id:'standalone',label:'Unbreaking',level:3};
const listImage: GameListImage = {src:'/caller-thumbnail.png',sourceSize:[16,16]};
const sampleWorld: WorldListItem = {id:'world',name:'My world',thumbnail:listImage,gameMode:'Survival'};
const sampleServer: ServerListItem = {id:'server',name:'My server',status:'online'};
const samplePack: PackListItem = {id:'pack',name:'Resources',active:true};
const settingsSections: SettingsSection[] = [{value:'game',label:'Game',content:<Text>Survival</Text>}];
const players: GamePlayer[] = [{id:'player',name:'Player',online:true}];
const tradeCost: TradeCost = {item:{name:'Emerald',count:4},originalCount:5};
const tradeOffer: TradeOfferData = {id:'bread',label:'Emeralds for bread',costs:[tradeCost],result:{name:'Bread',count:1}};
const tradeTiers: TradeTier[] = [{id:'novice',label:'Novice',offers:[tradeOffer]}];
const mountEquipment: MountEquipmentSlot[] = [{kind:'saddle' satisfies MountEquipmentKind,item:null}];
const dye: BannerDye = 'red', rendererColor: RendererColor = dye;
const patternId: BannerPatternId = loomPatternIds[0];
const bannerLayers: BannerPatternLayer[] = [{id:patternId,color:rendererColor}];
const vertex: Vec3 = [0,0,0], uv: Uv = [0,16];
const face: ItemMeshFace = {vertices:[vertex,[16,0,0],[16,16,0],[0,16,0]],uv:[uv,[16,16],[16,0],[0,0]],texture:'all'};
const mesh: ItemMesh = {faces:[face]}, camera: ItemCamera = {yaw:-30,pitch:20,padding:2}, lighting: ItemLighting = {top:1,left:.6,right:.8};
const adapterTexture: PixelTexture = {width:1,height:1,data:new Uint8ClampedArray([255,255,255,255])};
const imageRect: GuiImageRect = [0,0,4,4], imageColor: GuiImageRgba = [1,1,1,1];
const imageSlice: GuiImageNineSlice = {insets:1,baseSize:[2,2]};
const imageGeometry: GuiImageGeometry = {rect:imageRect,nineSlice:imageSlice,tint:imageColor,physicalPrecision:'float32'};
const imageTexture: GuiImageTexture = adapterTexture;
const imageDraw: GuiImageDraw = {...imageGeometry,texture:imageTexture};
const guiImage: GuiImage = {...imageGeometry,texture:'/caller-image.png'};
const preciseImageCommand: GuiLayerCommand = {kind:'image',...guiImage};
const imageBackground: GuiImageBackground = {kind:'solid',color:imageColor};
export const imageOptions: GuiImageLayoutOptions = {width:17,height:11,guiScale:2,images:[imageGeometry],outputRect:[0,0,8,8]};
export const imageLayout: GuiImageLayout = layoutGuiImages(imageOptions);
export const imageMesh: GuiImageMesh = imageLayout.meshes[0]!;
export const imageVertex: GuiImageVertex = imageMesh.vertices[0]!;
export const guiImageRenderer: (options:GuiImageRenderOptions)=>GuiImageRenderResult = renderGuiImages;
export function renderOffscreenImages(canvas:OffscreenCanvas):GuiImageRenderResult {
  return renderGuiImages({...imageOptions,images:[imageDraw],background:imageBackground,canvas,output:'framebuffer'});
}
const imageProps: GuiImageLayerProps = {...imageOptions,images:[guiImage],label:'Caller GUI',onRenderStateChange:(state:GuiImageLayerState)=>state.toUpperCase(),onRenderError:error=>error.message.toUpperCase()};
const imageRenderProfile: EnchantingTableImageRenderProfile = {frame:{width:2570,height:1402,guiScale:5},origin:[169,57.5],displayScale:2.5};
const textBytes: GuiTextRgba8 = [127,255,31,255];
const packedFont: GuiTextFont = {pages:['/caller-packed-font.png'],pageSizes:[128],cellHeight:12,lineHeight:10,glyphs:{'1':{page:0,x:8,y:36,width:8,height:12,advance:6,offsetY:-3}}};
const sourceText: GuiTextGeometry = {text:'1',font:packedFont,origin:[0,0],fontScale:1,color:textBytes,sampling:'point',shader:'bitmap',shadow:{offset:[1,1],tint:[.25,.25,.25,1]}};
export const textOptions: GuiTextLayoutOptions = {width:640,height:480,guiScale:2,...sourceText};
export const textLayout: GuiTextLayout = layoutGuiText(textOptions);
export const textRun: GuiTextRun = textLayout.runs[0]!;
const layerSource: GuiLayerGeometryCommand = {kind:'text',...sourceText};
const layerCommand: GuiLayerCommand = {...layerSource,pages:new Map([[0,'/caller-packed-font.png']])};
const sourceSprite: GuiSpriteGeometry = {rect:[1,2,16,16],color:[128,64,255,0],tint:[.5,1,.25,1]};
const spriteCommand: GuiLayerCommand = {kind:'sprite',...sourceSprite,texture:'/caller-sprite.png'};
const cuboidColors: GuiCuboidModelOptions = {colors:{up:[255,255,255,255],east:[127,127,127,255]}};
const cuboid: GuiModelMesh = createGuiCuboidModel([0,0,0],[16,8,16],cuboidColors);
export const cuboidDirection: GuiCuboidFace = 'east';
export const cuboidFace: GuiModelFace = cuboid.faces[0]!;
const modelProjection: GuiModelProjection = {yaw:45,pitch:30,scale:.625,offset:[8,9],originQuantization:'physical-floor'};
const modelGeometry: GuiModelGeometry = {model:cuboid,origin:[0,0],projection:modelProjection,textureSizes:{all:[16,16]}};
const modelOptions: GuiModelLayoutOptions = {...modelGeometry,width:640,height:480,guiScale:2};
export const modelLayout: GuiModelLayout = layoutGuiModel(modelOptions);
export const modelRun: GuiModelRun = modelLayout.runs[0]!;
const modelItem: GuiModelItem = {model:cuboid,projection:modelProjection,textureSizes:{all:[16,16]},textures:{all:'/caller-stone.png'}};
const modelCommand: GuiLayerCommand = {kind:'model',...modelGeometry,textures:modelItem.textures};
export const sourceAtlas: GuiTextureAtlasSource = {kind:'atlas',width:2,height:1,tiles:[{origin:[1,0],size:[1,1],texture:'/caller-one-pixel.png'}]};
export const textureSource: GuiLayerTextureSource = sourceAtlas;
export const decodedAtlas: GuiTextureAtlas = {kind:'atlas',width:2,height:1,tiles:[{origin:[1,0],texture:adapterTexture}]};
export const decodedTexture: GuiLayerTexture = decodedAtlas;
export const atlasPixels: PixelTexture = assembleGuiTextureAtlas({width:2,height:1,tiles:[{origin:[1,0],texture:adapterTexture}]});
export function offscreenAtlas(canvas:OffscreenCanvas):GuiLayerRenderResult {return renderGuiLayer({width:640,height:480,guiScale:2,commands:[{kind:'sprite',rect:[0,0,2,1],texture:decodedAtlas}],canvas});}
export const layerOptions: GuiLayerLayoutOptions = {width:640,height:480,guiScale:2,commands:[layerSource]};
const layerDraw: GuiLayerDraw = {kind:'text',...sourceText,pages:new Map([[0,adapterTexture]])};
export const guiLayerRenderer: (options:GuiLayerRenderOptions)=>GuiLayerRenderResult = renderGuiLayer;
export function composedOffscreen(canvas:OffscreenCanvas):GuiLayerRenderResult {
  return renderGuiLayer({...layerOptions,commands:[layerDraw],canvas});
}
export function inspectComposedLayout(layout:GuiLayerLayout):GuiLayerLayoutCommand|undefined {return layout.commands[0];}
const layerProps: GuiLayerProps = {...layerOptions,commands:[preciseImageCommand,layerCommand,spriteCommand,modelCommand],label:'Caller composed GUI',onRenderStateChange:state=>state.toUpperCase()};
const textStyle: EnchantingTableTextRenderStyle = {font:packedFont,fontScale:1,sampling:'point',shader:'bitmap'};
const textProfile: EnchantingTableTextRenderProfile = {metrics:{lineHeight:10,paintOffset:[0,1]},labels:textStyle,costs:{...textStyle,disabledColor:[137,94,91,255]},runes:textStyle};
const grindstoneTextStyle: GrindstoneTextRenderStyle = {...textStyle,font:packedFont};
const grindstoneTextProfile: GrindstoneTextRenderProfile = {metrics:{lineHeight:10,paintOffset:[0,1]},labels:grindstoneTextStyle};
const grindstoneProfile: GrindstoneImageRenderProfile = {...imageRenderProfile,text:grindstoneTextProfile,itemImages:true,itemModels:true};
const grindstoneAtlas: GuiTextureAtlasSource = {...sourceAtlas,width:16,height:16,tiles:[{origin:[0,0],size:[16,16],texture:'/caller-stone.png'}]};
const grindstoneBlock: InventoryItem = {name:'Caller source block',icon:<span>Caller fallback art</span>,guiModel:{...modelItem,textures:{all:grindstoneAtlas}}};
const anvilTextStyle: AnvilTextRenderStyle = {...textStyle,font:packedFont};
const anvilTextProfile: AnvilTextRenderProfile = {
  title:{...anvilTextStyle,metrics:{lineHeight:10,paintOffset:[0,1]}},
  inventory:{...anvilTextStyle,metrics:{lineHeight:10,paintOffset:[0,1]}},
  name:{...anvilTextStyle,paintOffset:[0,1],clipQuantization:'floor-min-ceil-max'},
  cost:{...anvilTextStyle,metrics:{lineHeight:10,paintOffset:[0,1]},color:[127,255,31,255],failureColor:[255,85,85,255],shadow:{offset:[1,1],tint:[.25,.25,.25,1]}},
};
const anvilProfile: AnvilImageRenderProfile = {...imageRenderProfile,text:anvilTextProfile,itemImages:true,itemModels:true};
const craftingTextStyle: CraftingScreenTextStyle = {...textStyle,metrics:{lineHeight:8,paintOffset:[0,0]}};
const craftingInputText: CraftingScreenInputTextStyle = {...craftingTextStyle,clipQuantization:'logical-stage-floor',scissor:[0,0,2570,1402]};
const craftingImageProfile: CraftingScreenImageRenderProfile = {...imageRenderProfile,origin:[94,57.5],imagePhysicalPrecision:'float32',itemImages:true,itemModels:true,
  text:{crafting:craftingTextStyle,inventory:craftingTextStyle,recipeTitle:craftingTextStyle,query:craftingInputText,
    placeholder:{...craftingInputText,clipQuantization:'floor-min-ceil-max'},inventoryCount:craftingTextStyle,recipeCount:craftingTextStyle}};
const glintUniforms: ItemGlintUniforms = {uvOffset:[0,0],uvScale:[1,1],uvRotation:[0,0],glintColor:[.25,.25,.25],tintColor:[1,1,1,1],hudOpacity:1};
const glintSampler: ItemGlintSampler = 'point-repeat', glintBlend: ItemGlintBlend = {source:'source-alpha',destination:'one-minus-source-alpha'};
const glintOptions: ItemGlintRenderOptions = {uniforms:glintUniforms,glintSampler,blend:glintBlend,width:1,height:1};
const glintPass: ItemGlintPassColor | null = shadeItemGlint([.5,.5],1,adapterTexture,glintUniforms,glintSampler);
const glintPixels: PixelTexture = renderItemGlint(adapterTexture,adapterTexture,glintOptions);
const glintProps: ItemGlintProps = {imageSrc:'/caller-item.png',uniforms:glintUniforms,glintSampler,blend:glintBlend};
const recipeCategories: RecipeCategory[] = [{id:'construction',label:'Construction'},{id:'search',label:'Search'}];
const bookIdentity: readonly number[] = Object.freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const bookRendererState: EnchantingBookRendererState = {projection:bookIdentity,view:bookIdentity,model:bookIdentity,bones:Object.freeze(Array.from({length:7},()=>bookIdentity)),tileLightColor:[1,1,1,1],overlayColor:[0,0,0,0]};
const gpuColor: BitmapRgba = [1,1,1,1];
const gpuRect: BitmapTargetRect = [0,0,1,1];
const gpuQuad: BitmapAtlasQuad = {x:0,y:0,width:1,height:1,atlasRect:gpuRect,color:gpuColor};
const gpuAtlas: BitmapAtlasRun = {profile:'atlas-rect',page:0,sampling:'point',shader:'bitmap',quads:[gpuQuad],viewport:gpuRect,scissor:gpuRect};
const gpuVertex: BitmapUnicodeVertex = {position:[0,0,0],uvRaw:[0,0],rgba:[255,255,255,255]};
const gpuUnicode: BitmapUnicodeRun = {profile:'bedrock-unicode',page:0,sampling:'bilinear',shader:'bitmap-smooth',vertices:[gpuVertex],indices:[],glyphHeight:1/16,halfTexelOffset:1/512};
const gpuBackground: BitmapGlyphBackground = {kind:'solid',color:gpuColor};
const gpuRuns: readonly BitmapGlyphRun[] = [gpuAtlas,gpuUnicode];
const gpuBackend: BitmapTextRenderer = 'webgl';
const gpuProfile: BitmapTextProfile = 'atlas-rect';
export const gpuRenderer: (options: BitmapGlyphRenderOptions)=>BitmapGlyphRenderResult = renderBitmapGlyphs;
export const sharedBitmapBackend: BitmapTextRenderer = 'webgl-shared';
export function renderOffscreenFont(canvas: OffscreenCanvas): BitmapGlyphRenderResult {
  return renderBitmapGlyphs({width:0,height:0,pages:new Map(),runs:[],canvas});
}
export const emptyGpuOptions: BitmapGlyphRenderOptions = {width:0,height:0,pages:new Map(),runs:[],background:gpuBackground,output:'framebuffer'};
export const demo = <>
  <GuiImageLayer {...imageProps} ref={createRef<HTMLCanvasElement>()}/>
  <GuiLayer {...layerProps} ref={createRef<HTMLCanvasElement>()}/>
  <EnchantingTable title="1" inventoryLabel="1" options={[{id:'one',label:'One',level:1,runeText:'1'}]} imageRender={{...imageRenderProfile,text:textProfile,itemImages:true,itemModels:true}} item={{name:'Caller item',image:'/caller-item.png',guiModel:modelItem}}/>
  <EnchantingTable options={[]} imageRender={imageRenderProfile} ref={createRef<HTMLElement>()}/>
  <Button {...props} ref={createRef<HTMLButtonElement>()}>Play</Button>
  <Text as="p" shadow ref={createRef<HTMLElement>()}>Minecraft</Text>
  <TextField label="World" name="world" ref={createRef<HTMLInputElement>()}/>
  <ItemSlot item={{name:'Diamond',count:64}} underlay={<span/>} ref={createRef<HTMLButtonElement>()}/>
  <InventoryGrid label="Inventory" items={[{name:'Diamond'}]} onSlotAction={(index,action)=>String(index)+action}/>
  <Grindstone inputs={[null,null]} onInputAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <Grindstone title="1" inventoryLabel="1" imageRender={grindstoneProfile} inputs={[{name:'Caller tool',image:'/caller-tool.png',count:2,durability:.5},grindstoneBlock]} result={{name:'Caller result',image:'/caller-result.png'}} onInputAction={(index,action)=>String(index)+action} onTakeResult={action=>action.toUpperCase()} onClose={()=>{}} ref={createRef<HTMLElement>()}/>
  <Grindstone title="1" inventoryLabel="1" imageRender={{...grindstoneProfile,text:{...grindstoneTextProfile,labels:{...grindstoneTextStyle,fontScale:0}}}} inputs={[grindstoneBlock,null]} ref={createRef<HTMLElement>()}/>
  <EnchantingTable options={[{id:'unbreaking',label:'Unbreaking',level:3}]} onEnchant={id=>id.toUpperCase()}/>
  <EnchantingTable options={[{id:'unbreaking',label:'Unbreaking',level:3}]} renderText={workstationText}/>
  <EnchantingBook pageFlip={.25} lighting="calibrated" pitch={20} ref={createRef<HTMLCanvasElement>()}/>
  <EnchantingBook lighting="unlit"/>
  <EnchantingBook rendererState={bookRendererState} onRendererError={message=>message.toUpperCase()}/>
  <EnchantingRunes text="AIZ" atlasUrl="/caller-atlas.png" ref={createRef<HTMLSpanElement>()}/>
  <EnchantmentOption {...enchantment} ref={createRef<HTMLButtonElement>()} onEnchant={id=>id.toUpperCase()}/>
  <EnchantmentOption {...enchantment} renderText={workstationText}/>
  <GuiIcon {...iconProps} ref={createRef<HTMLSpanElement>()}/>
  <ItemImage src="/caller-item.png" ref={createRef<HTMLSpanElement>()}/>
  <ItemCount count={64} ref={createRef<HTMLSpanElement>()}/>
  <DurabilityBar value={3} max={4} ref={createRef<HTMLSpanElement>()}/>
  <SlotPlaceholder ref={createRef<HTMLSpanElement>()}/>
  <ResultSlot size="large" onTake={action=>action.toUpperCase()} ref={createRef<HTMLButtonElement>()}/>
  <ProcessingArrow progress={.5} ref={createRef<HTMLDivElement>()}/>
  <FuelIndicator progress={.5} ref={createRef<HTMLDivElement>()}/>
  <RecipeGrid label="Recipe" items={[]} columns={3} rows={3} onSlotAction={(index,action)=>String(index)+action}/>
  <RecipeBook {...recipeBookProps} ref={createRef<HTMLDivElement>()}/>
  <RecipeBookEntry {...recipeBookEntryProps} ref={createRef<HTMLButtonElement>()}/>
  <RecipeFilterToggle {...recipeFilterProps} ref={createRef<HTMLButtonElement>()}/>
  <InventoryScreenFrame {...inventoryFrameProps} ref={createRef<HTMLElement>()}/>
  <SurvivalInventoryScreen {...survivalScreenProps} ref={createRef<HTMLElement>()}/>
  <SurvivalInventoryScreen recipeBook={recipeBookProps} layout="recipe-book" showClose={false} ref={createRef<HTMLElement>()}/>
  <CraftingScreen {...craftingScreenProps} ref={createRef<HTMLElement>()}/>
  <CraftingScreen recipeBook={recipeBookProps} defaultLayout="survival" showClose={false} ref={createRef<HTMLElement>()}/>
  <CraftingScreen {...craftingScreenProps} title="1" imageRender={craftingImageProfile}
    recipeBook={{...recipeBookProps,title:'1',query:'1',searchPlaceholder:'1'}}
    crafting={{inputs:[{name:'Caller ingredient',image:'/caller-ingredient.png',count:11},grindstoneBlock],result:null,inventoryLabel:'1',hotbar:[grindstoneBlock]}}
    ref={createRef<HTMLElement>()}/>
  <CraftingScreen {...craftingScreenProps} layout="survival" imageRender={{...craftingImageProfile,itemImages:false,itemModels:false,text:{crafting:craftingTextStyle}}}
    onLayoutChange={layout=>layout.toUpperCase()} ref={createRef<HTMLElement>()}/>
  <CraftingTable onInputAction={(index,action)=>String(index)+action} onTakeResult={action=>action.toUpperCase()}/>
  <Furnace input={null} fuel={null} progress={.5} fuelRemaining={.5} onInputAction={(slot,action)=>slot+action}/>
  <BlastFurnace title="Blast furnace"/>
  <Smoker title="Smoker"/>
  <Anvil name="Tool" onNameChange={name=>name.toUpperCase()} cost={{kind:'levels',levels:3}} onInputAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <Anvil title="1" inventoryLabel="1" name="1" onNameChange={value=>value.toUpperCase()} renameLabel="Caller item name" imageRender={anvilProfile} inputs={[{name:'Caller tool',image:'/caller-tool.png'},grindstoneBlock]} result={{name:'Caller result',image:'/caller-result.png'}} cost={{kind:'levels',levels:1,label:'1'}} onTakeResult={action=>action.toUpperCase()} ref={createRef<HTMLElement>()}/>
  <Anvil name="1" renameReadOnly imageRender={{...anvilProfile,text:{name:anvilTextProfile.name}}} ref={createRef<HTMLElement>()}/>
  <Anvil name="1" renameDisabled imageRender={{...anvilProfile,text:{title:{...anvilTextProfile.title!,metrics:{lineHeight:0,paintOffset:[0,1]}}}}} ref={createRef<HTMLElement>()}/>
  <ContainerFrame title="Container" height={332} ref={createRef<HTMLElement>()}/>
  <Chest rows={6} items={[]} onSelectionChange={index=>index.toFixed(0)} onSlotAction={(index,action)=>String(index)+action}/>
  <Hopper items={[]} inventorySelectedIndex={0} onInventorySelectionChange={index=>index.toFixed(0)}/>
  <Dispenser/><Dropper/><ShulkerBox/>
  <BrewingIndicator variant="fuel" progress={.5} ref={createRef<HTMLDivElement>()}/>
  <BrewingStand selectedSlot="ingredient" onSelectionChange={(slot: BrewingSlot)=>String(slot)} onSlotAction={(slot,action)=>String(slot)+action} ref={createRef<HTMLElement>()}/>
  <SmithingTable inputs={[null,null,null]} overlayFrame={1} preview={<span/>} onInputAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <CartographyTable name="Map" mode={'extend' satisfies CartographyMode} onNameChange={name=>name.toUpperCase()} onTakeResult={action=>action.toUpperCase()} ref={createRef<HTMLElement>()}/>
  <ScrollArea label="Content" orientation="both" viewportRef={createRef<HTMLDivElement>()} onScrollPositionChange={(position: ScrollPosition)=>position.scrollTop.toFixed(0)} ref={createRef<HTMLDivElement>()}>Content</ScrollArea>
  <ScrollBar label="Offset" controls="content" value={0} max={100} pageSize={20} onValueChange={value=>value.toFixed(0)} ref={createRef<HTMLDivElement>()}/>
  <HealthBar value={19} variant="poison" ref={createRef<HTMLDivElement>()}/>
  <HungerBar value={17} effect flashing ref={createRef<HTMLDivElement>()}/>
  <ArmorBar value={1} ref={createRef<HTMLDivElement>()}/>
  <AirBar states={['full','pop'] satisfies AirBubbleState[]} ref={createRef<HTMLDivElement>()}/>
  <ExperienceBar progress={.5} level={3} ref={createRef<HTMLDivElement>()}/>
  <Hotbar selectedIndex={0} onSelectionChange={index=>index.toFixed(0)} onSlotAction={(index,action)=>String(index)+action} ref={createRef<HTMLDivElement>()}/>
  <Crosshair blendMode="normal" ref={createRef<HTMLSpanElement>()}/>
  <BossBar name="Wither" value={.75} color={[1,.5,1] satisfies BossBarColor} ref={createRef<HTMLDivElement>()}/>
  <ChatMessage backgroundOpacity={.5} ref={createRef<HTMLDivElement>()}>Hello</ChatMessage>
  <ChatPanel messages={[{id:'message',text:'Hello'}] satisfies ChatMessageData[]} input onSend={message=>message.toUpperCase()} onValueChange={value=>value.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <Scoreboard title="Objectives" entries={[{id:'player',name:'Player',score:3}] satisfies ScoreboardEntry[]} ref={createRef<HTMLDivElement>()}/>
  <StatusEffect name="Speed" effect={'speed' satisfies BedrockStatusEffect} duration="1:30" ref={createRef<HTMLSpanElement>()}/>
  <ActionBar showBackground ref={createRef<HTMLDivElement>()}>Saved</ActionBar>
  <TitleOverlay title="Adventure" subtitle="Begin" ref={createRef<HTMLDivElement>()}/>
  <HeldItemTooltip ref={createRef<HTMLDivElement>()}>Diamond sword</HeldItemTooltip>
  <Stonecutter recipes={[{id:'slab',label:'Slab'}]} onRecipeSelect={id=>id.toUpperCase()} onInputAction={action=>action.toUpperCase()} ref={createRef<HTMLElement>()}/>
  <Loom inputs={[null,null,null]} patterns={[]} bannerPreview={<span/>} onPatternSelect={id=>id.toUpperCase()} onInputAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <Beacon effects={{speed:{enabled:true,selected:true} satisfies BeaconEffectState}} extraEffect={'speed' satisfies BeaconPrimaryEffect} onEffectSelect={(effect: BeaconEffectId)=>effect.toUpperCase()} onConfirm={()=>{}} ref={createRef<HTMLElement>()}/>
  <Crafter disabledSlots={[1]} powered onSlotEnabledChange={(index,enabled)=>String(index)+enabled} onSlotAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <RecipeSelectionGrid label="Recipes" options={[{id:'slab',label:'Slab'}] satisfies RecipeSelectionOption[]} onSelect={id=>id.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <CrafterSlot index={1} enabled={false} onEnabledChange={enabled=>Boolean(enabled)} ref={createRef<HTMLButtonElement>()}/>
  <BeaconEffect effect="speed" selected ref={createRef<HTMLButtonElement>()}/>
  <ToggleButton pressed onPressedChange={pressed=>Boolean(pressed)} ref={createRef<HTMLButtonElement>()}>Coordinates</ToggleButton>
  <SearchField label="Search recipes" defaultValue="stone" onValueChange={value=>value.toUpperCase()} onSearch={value=>value.toUpperCase()} ref={createRef<HTMLInputElement>()}/>
  <NavigationList label="Settings" items={[{value:'game',label:'Game'}] satisfies NavigationItem[]} onValueChange={value=>value.toUpperCase()} ref={createRef<HTMLElement>()}/>
  <SettingRow label="Coordinates" ref={createRef<HTMLDivElement>()}>{(control: SettingControlProps)=><input {...control} type="checkbox"/>}</SettingRow>
  <KeybindingField label="Forward" defaultValue="KeyW" name="forward" onValueChange={value=>value.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <Spinner frame={9} label="Loading terrain" ref={createRef<HTMLSpanElement>()}/>
  <Tooltip content="Description" onOpenChange={open=>Boolean(open)} ref={createRef<HTMLSpanElement>()}><Button>Inspect</Button></Tooltip>
  <Toast open onOpenChange={open=>Boolean(open)} title="World saved" description="Progress saved" ref={createRef<HTMLDivElement>()}/>
  <WorldList label="Worlds" worlds={[sampleWorld]} onPlay={world=>world.id.toUpperCase()} onEdit={world=>world.id.toUpperCase()} onDelete={world=>world.id.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <ServerList label="Servers" servers={[sampleServer]} onConnect={server=>server.id.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <PlayerCard name="Player" avatar={listImage} renderSkin={()=><span/>} onPermissions={()=>{}} ref={createRef<HTMLDivElement>()}/>
  <PackCard pack={samplePack} selected onActiveChange={active=>Boolean(active)} onMoveUp={()=>{}} ref={createRef<HTMLDivElement>()}/>
  <PackList label="Packs" packs={[samplePack]} onActiveChange={(pack,active)=>pack.id+active} onReorder={(ids,pack)=>ids.join(',')+pack.id} ref={createRef<HTMLDivElement>()}/>
  <SettingsPanel sections={settingsSections} onValueChange={value=>value.toUpperCase()} onBack={()=>{}} ref={createRef<HTMLElement>()}/>
  <LoadingScreen title="Loading world" variant="world-modal" scale={2} branding={null} loadingFrame={1} value={.5} max={1} backgroundVariant="classic" spinnerFrame={1} onCancel={()=>{}} ref={createRef<HTMLElement>()}/>
  <LoadingScreen title="Compact loading" variant="compact"/>
  <AchievementToast open title="Taking inventory" onOpenChange={open=>Boolean(open)} ref={createRef<HTMLDivElement>()}/>
  <PlayerList players={players} onSelect={id=>id.toUpperCase()} onInvite={()=>{}} ref={createRef<HTMLDivElement>()}/>
  <TouchControls actions={['jump','interact']} onAction={(action: TouchAction,pressed)=>action+pressed} onMove={(movement: TouchMovement)=>movement.x+movement.y} ref={createRef<HTMLDivElement>()}/>
  <PauseMenu actions={['resume','settings']} players={players} onAction={(action: PauseMenuAction)=>action.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <DeathScreen variant="native" guiScale={2} deathMessage="Player fell from a high place" loadingIndicator={<span/>} onRespawn={()=>{}} onQuit={()=>{}} ref={createRef<HTMLDivElement>()}/>
  <DeathScreen variant="classic" state="loading"/>
  <TradeOffer offer={tradeOffer} onSelect={(id,action)=>id+action} ref={createRef<HTMLButtonElement>()}/>
  <TradingScreen tiers={tradeTiers} inputs={[null,null]} slotValidity={[true,false,true]} detailButtons={[true,true,true]} runeAtlasUrl="/caller-owned-runes.png" onDetails={slot=>String(slot)} onOfferSelect={(id,action)=>id+action} onTrade={()=>{}} ref={createRef<HTMLElement>()}/>
  <MountInventory equipment={mountEquipment} chested storageColumns={3} onEquipmentAction={(index,action)=>String(index)+action} onStorageSelectionChange={index=>index.toFixed(0)} ref={createRef<HTMLElement>()}/>
  <ItemGlint {...glintProps} onReady={()=>{}} onRenderError={error=>error.message} data-pass-alpha={glintPass?.[3]} data-pixel-width={glintPixels.width} ref={createRef<HTMLCanvasElement>()}/>
  <BitmapText {...bitmapProps} onReady={()=>{}} onRenderError={error=>error.message} ref={createRef<HTMLSpanElement>()}/>
  <BitmapText {...bitmapProps} renderer={gpuBackend} profile={gpuProfile} background="#1b0c1b" ref={createRef<HTMLSpanElement>()}/>
  <ItemTooltip item={rendererItem} renderText={textRenderer} ref={createRef<HTMLDivElement>()}/>
  <ItemSlot item={rendererItem}/>
  <ItemTooltip item={{name:'Consumer sword',nameColor:'#55ffff',durability:.5,lore:[<span>Sharpness I</span>]}} ref={createRef<HTMLDivElement>()}/>
  <BlockPreview block={'enchanting-table' satisfies BlockKind}/>
  <BlockPreview block={'stone-stairs' satisfies BlockKind} model={mesh} camera={camera} lighting={lighting} onRenderError={error=>error.message} data-pixel-width={adapterTexture.width} ref={createRef<HTMLCanvasElement>()}/>
  <BannerPreview baseColor={bannerDyeColors.white} patterns={bannerLayers} fabricShading={false} ref={createRef<HTMLCanvasElement>()}/>
  <BannerPreview view="item" patterns={bannerPatternIds.slice(0,1).map((id): BannerPatternLayer=>({id,color:dye}))}/>
  <PlayerInventoryScreen needsCraftingTable craftingTablePreview={<span>Caller renderer</span>} armor={[null,null,null,null]} playerPreview={<span/>} onArmorAction={(kind: ArmorSlotKind,action)=>kind+action} onCraftingAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <CreativeInventory items={[{name:'Stone'}]} chrome="full" layout="creative" onLayoutChange={(layout: InventoryLayout)=>layout.toUpperCase()} categories={recipeCategories} onCategoryChange={id=>id.toUpperCase()} onQueryChange={query=>query.toUpperCase()} onItemAction={(index,action)=>String(index)+action} ref={createRef<HTMLElement>()}/>
  <ArmorSlot kind="helmet" item={null} ref={createRef<HTMLButtonElement>()}/>
  <RecipeSearch craftableOnly onCraftableOnlyChange={value=>Boolean(value)} onValueChange={value=>value.toUpperCase()} ref={createRef<HTMLInputElement>()}/>
  <RecipeCategoryTabs categories={recipeCategories} panelId="consumer-items" onValueChange={id=>id.toUpperCase()} ref={createRef<HTMLDivElement>()}/>
  <InventoryToolbar layouts={['creative','recipe-book','survival']} showClose={false} value="creative" onValueChange={(layout: InventoryLayout)=>layout.toUpperCase()} onHelp={()=>{}} onClose={()=>{}} ref={createRef<HTMLDivElement>()}/>
  <Image src="/caller-item.png" alt="Item" sourceSize={[16,16]} scale={2} ref={createRef<HTMLImageElement>()}/>
  <NineSlice src="/caller-frame.png" sourceSize={[10,10]} slice={2} destinationBorder={1} size={[18,18]} scale={2} ref={createRef<HTMLDivElement>()}><Button>Framed action</Button></NineSlice>
  <Checkbox label="Enabled" indeterminate ref={createRef<HTMLInputElement>()}/>
  <Combobox label="Difficulty" name="difficulty" ref={createRef<HTMLButtonElement>()} options={[{value:'normal',label:'Normal'}]} onValueChange={value=>value.toUpperCase()}/>
  <Slider label="Distance" defaultValue={12} min={4} max={32} onValueChange={n=>n.toFixed(0)}/>
  <RadioGroup label="Mode" options={[{value:'survival',label:'Survival'}]} />
  <Tabs label="Settings" items={items}/>
  <Select label="Native-compatible selection" name="selection" multiple defaultValue={['a']} options={[{value:'a',label:'A'}]} ref={createRef<HTMLSelectElement>()} onChange={event=>Array.from(event.currentTarget.selectedOptions,option=>option.value)}/>
  <Dialog open={false} onOpenChange={next=>Boolean(next)} title="World" width={420} height="calc(100vh - 80px)" style={{maxWidth:'90vw'}} />
</>;
`);
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(process.execPath, [tsc, '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--jsx', 'react-jsx', 'consumer.tsx'], { cwd: consumer, encoding: 'utf8' });
  console.log(`React ${major}: installed package TypeScript consumer PASS`);
}
console.log(`Verified tarball: ${tarPath}`);
