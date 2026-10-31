import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
assert(npmCli, 'Run with npm run verify:package so the current npm CLI can be reused.');
const npm = (args, cwd = root) => execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// Build first, then test the actual packed files rather than source aliases.
npm(['run', 'build']);
execFileSync(process.execPath, [join(root, 'scripts', 'verify-inline-assets.mjs')], { cwd: root, stdio: 'inherit' });
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
// Known installed OreUI inputs are host-private. Check payload identity even if
// renamed, and decoded inline resources as well as filenames. No private bytes
// or machine-local paths are stored in this verifier.
const privateOreResourceHashes = new Set([
  "93e0cb5945ef2269b2ccaa8a20f35d16a304fe00abb7b8df1baeedbcc293c5ea",
  "878da56bc0bfb8fd8d91f81f7a26833f422f130534dcaffd4623516f2bd7b4e2",
  "1361cddb111bd73e907ea9d053f1db72546dc2625d41e568f64f53cd72343987",
  "dd68aea834f5d64008465aa51564f715f45ae1bbc005d036ae1ddab382dec395",
  "3ac46d75d4fe3aae7412d18e09047b70073a8e779488f72560c09f8c474fecc6",
  "1dd0c122794d0ac5c504e853143e078bd295f24b3a0d6ddd23dba2ca70b6e815",
  "8c37936063c7c8ab747a939e13833894f9edc80dd41b98874ca8f3938a33c32f",
  "410f13fa3da564e72f029cb17ed3912610b2cd6881163ce515fb50719bfa1a81",
  "f98a65f40260be3b232a766c43764e381104673fb217b9c13a3dc02a2b1250bb",
  "93eb7b1d429dee7e96872d8be885c4fd7b7bd839da0840b61a2837901ffd691b",
  "e92c03ccd433f175ec1842c7b077c9492f12e4576f9d482c9714122bd1398ced",
  "5522c1ce9a4d53702cc3906a7c080f50c78d9c83f1e5207839a03de9b209630c",
  "97c85e4f1bc270d804123731e089a8960472380305a2277c29e91c0dcb076f31",
  "c3f86c09969be4abb9797f71b160f5debb4a7cf2753a7e6a78e440f5fddf72f6",
  "137dda4d1f90e14afeae77b6b9002bdf25615295f7ae1bfb9d3ae6a7bb82cd9c",
  "9e7efe423b6cc8a1c1fa92756bd181675cffa51a4728bce386b0081cad1bb979",
  "04fb7a7ea41955c53cf51c0e6dc9e0928b29b7a8150fdcd83d04765742528ab5",
  "e0097d6d3811a68e3730a4ac70821015c86d002b8ef4c81a0cc5002764586cb3",
  "5c2fda186f2dc06d3947a2518fad3137c18f96ab837b80ddd9a4f7fa8e9c0f91",
  "3175909945fe1ec269705fa9bd735774bcbf30b16111cf846f9e46a5222e131b",
  "8adba96d834dd787fb3cd64071d69c73403732a47ae71f3fa23b648119eedd98",
  "d1aebd460585d4a9793fe28c2b80c604983715d139be998fcfcd228db544e4dc",
  "fa1fb229c2a598948e69429cfe17e5289faffbce3da7b3c0000d87e7b9e5ff40",
  "eb60e6c039372648610c76da88d9cee029feef38f2a1fe3c4975c24d0cc3d47c",
  "44d4d8da98052275ecca16e03f9aa46ddd29e3c560d0fcae60b87a012fe574c7",
  "a38c0b4d4fc96e276b52572535c692bb53bfb4db0008928431521e6569145713",
  "b4efc9b2c1ae0b96df100cf3cedbb5f19502fcda7f0491767410ecb844ef9257",
  "2f405a864a112f18425972643c95d5976b4fbfb3aca414143011da76bb6b5083"
]);
assert(!packed.files.some(file => /permission-(?:visitor|member|operator|custom)@0[.]5x[.]icon-|(?:Minecraft-(?:Ten|Seven)|NotoSansSC-Regular)-[0-9a-f]+[.](?:otf|woff2?)$|(?:no-player-profile|arrowBack(?:Disabled)?|crossWhite|checkWhite|onImage|offImage|online-badge)-[0-9a-f]+[.]png|chevron-down@0[.]5x[.]icon-|(?:^|\/)(?:local-ore|hbui)(?:\/|$)/i.test(file.path)), 'Private modern role icons, fonts and HBUI resources must remain host-owned.');
// The old181-value package already included lowercase15px white.png through
// these two Crafting sources. This is not a Screenshot material default. Pin
// the existing source content (LF normalization only, for Git checkout EOLs)
// rather than globally blacklisting an otherwise legitimate original PNG.
for (const [file, expectedLfSHA] of [
  ['src/crafting-image-assets.ts','3536ef49513b833d1ae6e8568b57c95ffa7c96026d5560c3067811d612d1b4e1'],
  ['src/inventory-screen-textures.css','a61f22c010846d26422e9ea8178a5ebca77bbdd6178f2e6c06af51846397e7e8'],
]) {
  const source = (await readFile(join(root,file),'utf8')).replace(/\r\n/g,'\n');
  assert.equal(createHash('sha256').update(source).digest('hex'),expectedLfSHA,'Existing lowercase White source provenance: '+file);
}
assert(!packed.files.some(file => /(?:^|[/])screenshot-assets(?:[/]|$)/.test(file.path)), 'Screenshot demo specimens must not become a packed asset bank.');
for (const file of packed.files) {
  const bytes = await readFile(join(root, file.path));
  if (/^dist[/]assets[/]/.test(file.path)) assert.notEqual(createHash('sha256').update(bytes).digest('hex'),'e666f27bda2c08c810a18b699397f8f0df5ffee87157a14bb96157e4a6b27fc3','Unresolved White specimen must not be introduced as a new physical library asset: '+file.path);
  assert(!privateOreResourceHashes.has(createHash('sha256').update(bytes).digest('hex')), 'Private OreUI whole source/resource leaked under a packed filename: '+file.path);
  if (/[.](?:js|mjs|json|css|html|map|md)$/i.test(file.path)) {
    for (const match of bytes.toString('utf8').matchAll(/data:[^,\s"'()]+;base64,([A-Za-z0-9+/=]+)/g)) {
      assert(!privateOreResourceHashes.has(createHash('sha256').update(Buffer.from(match[1], 'base64')).digest('hex')), 'Private OreUI resource leaked as inline data: '+file.path);
    }
  }
}
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
components.push('OrePlayerPermissions','OrePermissionLevelSelect','OrePermissionToggleRow','OrePlayerCard','OreSwitch');
components.push('ChalkboardEditor','ChalkboardTextField','ChalkboardLock');
components.push('StartMenu','StartMenuTitle','StartMenuActionStack','StartMenuAuxiliaryActions','StartMenuProfile','StartMenuFooter');
components.push('StorageManagement','StorageToolbar','StorageCategory','StorageItem','StorageItemActions','StorageSelectionFooter','StorageDependencyDialog','StorageSharingProgress','ScreenshotFlash');
components.push('UGCViewer','UGCItemCard','ImmersiveReader','ImmersiveReaderButton');
components.push('Portfolio','PortfolioPhoto','PortfolioCaptionField','PortfolioPickerItem','PortfolioPageTurnButton','PortfolioPicker');
assert.equal(components.length,183);
assert.equal(dataExports.length,6);
assert.equal(rendererFunctions.length,11);
assert.equal(Object.keys(ui).length,200);
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
const packedPngUrl = async asset => 'data:image/png;base64,' + (await readFile(new URL('./assets/' + asset, import.meta.resolve('mcbeui')))).toString('base64');
const documentBannerUrl = await packedPngUrl('document-viewer/permissions_player_fade_overlay.png');
const emptyEmoteUrl = await packedPngUrl('emote-wheel/icon_none.png');
const wheelStateUrls = await Promise.all(['base','select_0','select_1','select_2','select_3'].map(state => packedPngUrl('emote-wheel/emote_wheel_updated_' + state + '.png')));
// Modern OreUI components consume host labels/artwork; SSR performs no IO or requests.
const packedOrePlayers=Object.freeze([Object.freeze({id:'ore-alpha',name:'Caller Ore Alpha',avatar:element('span',null,'Host avatar')}),Object.freeze({id:'ore-beta',name:'Caller Ore Beta',isHosting:true})]);
const packedOreOptions=Object.freeze([Object.freeze({id:'build',title:'Build blocks',description:'Caller build description'}),Object.freeze({id:'mine',title:'Mine blocks'}),Object.freeze({id:'unbound',title:'Unknown caller ability'})]);
const packedOreValues=Object.freeze({'ore-alpha':Object.freeze({level:'custom',permissions:Object.freeze({build:true,mine:false})})});
const packedOreSnapshot=JSON.stringify(packedOreValues);let oreRequests=0,oreIO=0;
const oreFetch=globalThis.fetch;globalThis.fetch=()=>{oreIO++;throw new Error('Packed OreUI SSR attempted IO.');};
try {
 for(const [viewportSize,breakpoint] of [[[1440,1000],'desktop'],[[500,800],'tablet'],[[300,800],'narrow']]){
  const markup=renderToString(element(ui.OrePlayerPermissions,{label:'Caller modern permissions',scrollInputMode:'touch',players:packedOrePlayers,permissionOptions:packedOreOptions,value:packedOreValues,selectedPlayerId:'ore-alpha',viewportSize,guiScale:1,locale:'zh_CN',roleIcons:{custom:element('span',null,'Host role')},dropdownIcons:{close:element('span',null,'Host close'),check:element('span',null,'Host check'),chevron:element('span',null,'Host chevron')},toggleIcons:{on:element('span',null,'Host on'),off:element('span',null,'Host off'),thumb:element('span',null,'Host thumb')},backIcon:element('span',null,'Host back'),canKickPlayer:true,kickVisible:true,readOnly:true,templateWarning:'Caller policy',onValueChange:()=>oreRequests++,onSelectedPlayerIdChange:()=>oreRequests++,onBack:()=>oreRequests++,onKickRequest:()=>oreRequests++}));
  assert.match(markup,/mc-ore-player-permissions/);assert(markup.includes('data-breakpoint="'+breakpoint+'"'));assert.match(markup,/Host avatar/);assert.match(markup,/Caller build description/);assert.match(markup,/Caller policy/);assert.match(markup,/aria-readonly="true"/);
  assert(!/ viewportSize=| permissionOptions=| roleIcons=| canKickPlayer=| guiScale=/.test(markup),'OreUI source bindings must not leak as DOM attributes.');
  assert.equal((markup.match(/data-permission-id="build"/g)||[]).length,1);
 }
 const empty=renderToString(element(ui.OrePlayerPermissions,{label:'Unknown caller',players:packedOrePlayers,permissionOptions:packedOreOptions,value:packedOreValues,selectedPlayerId:null,viewportSize:[1440,1000],emptyContent:'No accepted player'}));assert.match(empty,/No accepted player/);
 for(const availableWidth of [200,600]){
  const markup=renderToString(element(ui.OrePermissionLevelSelect,{value:'custom',viewportSize:[1440,1000],availableWidth,labels:{title:'Caller level',customDescription:'Caller custom explanation'},icons:{custom:element('span',null,'Caller role icon')},dropdownIcons:{chevron:element('span',null,'Caller chevron')},readOnly:true}));
  assert(markup.includes('data-presentation="'+(availableWidth>=300?'segmented':'modal')+'"'));assert.match(markup,/Caller custom explanation/);
 }
 for(const level of ['visitor','member','operator','custom']){
  const markup=renderToString(element(ui.OrePlayerPermissions,{label:'Independent modern state',players:packedOrePlayers,permissionOptions:packedOreOptions,value:{...packedOreValues,'ore-alpha':{...packedOreValues['ore-alpha'],level}},selectedPlayerId:'ore-alpha',viewportSize:[1440,1000]}));
  const bits=[...markup.matchAll(/data-permission-id="(?:build|mine)"[^]*?<input([^>]+)>/g)].map(match=>match[1].includes('checked=""'));assert.deepEqual(bits,[true,false],'Modern roles do not synthesize permission presets.');
 }
 assert.match(renderToString(element(ui.OreSwitch,{'aria-label':'Caller switch',checked:true,readOnly:true,thumbIcon:element('span',null,'Host thumb')})),/Host thumb/);
 assert.match(renderToString(element(ui.OrePermissionToggleRow,{title:'Caller permission row',description:'Caller row description',checked:false,readOnly:true})),/Caller row description/);
 assert.match(renderToString(element(ui.OrePlayerCard,{player:packedOrePlayers[0],selected:true,subtitle:'Host subtitle',levelIcon:element('span',null,'Host card role')})),/Host subtitle/);
 const oreHanMarkup=renderToString(element(ui.OrePermissionToggleRow,{title:'建造 Build',description:'宿主说明',locale:'zh_CN',textLineBox:'fallback',checked:false}));
 assert.match(oreHanMarkup,/建造 Build/);assert.match(oreHanMarkup,/宿主说明/);assert(oreHanMarkup.includes('data-ore-text-linebox="fallback"'));assert(!/ textLineBox=/.test(oreHanMarkup),'Text policy is not a DOM attribute.');
 assert(!renderToString(element(ui.OrePermissionToggleRow,{title:'建造 Build',locale:'zh_CN'})).includes('data-ore-text-linebox='),'Default text structure remains primary.');
 assert.throws(()=>renderToString(element(ui.OrePermissionToggleRow,{title:'Host',textLineBox:'automatic'})),TypeError);
 assert.throws(()=>renderToString(element(ui.OrePermissionLevelSelect,{value:'owner',viewportSize:[1440,1000]})),/permission level/);
} finally {globalThis.fetch=oreFetch;}
assert.equal(oreIO,0);assert.equal(oreRequests,0);assert.equal(JSON.stringify(packedOreValues),packedOreSnapshot,'Modern SSR preserves caller snapshots.');
// Resolved Classic Start snapshots and renderer seams never invoke account/world/browser services during SSR.
const packedStartOn=Object.freeze({included:true,visible:true,enabled:true});
const packedStartHidden=Object.freeze({...packedStartOn,visible:false});
const packedStartButton=(action,label)=>Object.freeze({state:packedStartOn,action,label,target:'button.host_'+action});
const packedStartActions={normal:{state:packedStartOn,rows:{play:{state:packedStartOn,button:packedStartButton('play','Caller Play')},settings:{state:packedStartOn,button:packedStartButton('settings','Caller Settings')}}},newPlayer:{state:packedStartHidden,rows:{trialSpacerIncluded:false,getStarted:{state:packedStartOn,button:packedStartButton('get-started','Caller Get Started')},mainMenu:{state:packedStartOn,button:packedStartButton('main-menu','Caller Main Menu')}}}};
const packedStartAuxiliary={state:packedStartOn,upper:{state:packedStartHidden,signInProfile:'standard',signIn:packedStartButton('sign-in','Caller Sign In'),gamertag:{state:packedStartHidden,text:'Caller player'}},lower:{state:packedStartOn,inbox:{button:packedStartButton('inbox','Caller Inbox'),iconState:2,unread:{state:packedStartOn}}}};
const packedStartProfile={viewer:{state:packedStartOn,portrait:{state:packedStartOn,content:element('span',null,'Caller portrait renderer')}},controls:{state:packedStartOn,dressingRoom:{button:packedStartButton('dressing-room','Caller Dressing Room'),profile:'text'}}};
const packedStartFooter={copyright:'Caller copyright',version:'Caller version',development:{state:packedStartHidden,text:'Caller development'}};
const packedStartProps={label:'Caller Classic Start',size:[400,240],visible:true,canQuit:true,title:{profile:'win10'},actions:packedStartActions,auxiliary:packedStartAuxiliary,profile:packedStartProfile,footer:packedStartFooter};
const packedStartSnapshot=JSON.stringify(packedStartProps);let startIO=0,startRequests=0;const startFetch=globalThis.fetch;globalThis.fetch=()=>{startIO++;throw Error('Start SSR attempted IO');};
try{
 const markup=renderToString(element(ui.StartMenu,{...packedStartProps,onAction:()=>startRequests++,onExitRequest:()=>startRequests++}));
 for(const text of ['mc-start-menu','Caller Play','Caller portrait renderer','Caller version','Caller Inbox'])assert(markup.includes(text),'Packed Start missing '+text);
 assert(!/ canQuit=| titleProfile=| guiScale=/.test(markup));
 for(const profile of ['win10','osx','pocket-console'])assert(renderToString(element(ui.StartMenuTitle,{size:[400,240],profile})).includes('mc-start-title'));
 for(const profile of ['education-desktop','education-mobile'])assert(renderToString(element(ui.StartMenuTitle,{size:[400,240],profile,logoContent:element('span',null,'Caller education artwork')})).includes('Caller education artwork'));
 assert(renderToString(element(ui.StartMenuActionStack,packedStartActions)).includes('Caller Settings'));
 assert(renderToString(element(ui.StartMenuAuxiliaryActions,{...packedStartAuxiliary,size:[400,240]})).includes('Caller Inbox'));
 assert(renderToString(element(ui.StartMenuProfile,{...packedStartProfile,size:[400,240]})).includes('Caller Dressing Room'));
 assert(renderToString(element(ui.StartMenuFooter,{...packedStartFooter,width:398})).includes('Caller copyright'));
 assert.throws(()=>renderToString(element(ui.StartMenuTitle,{size:[400,240],profile:'education-desktop'})),/logo|artwork|education/i);
 assert.throws(()=>renderToString(element(ui.StartMenu,{...packedStartProps,scale:0})),RangeError);
}finally{globalThis.fetch=startFetch;}
assert.equal(startIO,0);assert.equal(startRequests,0);assert.equal(JSON.stringify(packedStartProps),packedStartSnapshot,'Start SSR keeps caller presentation snapshots intact.');
// Chalkboard dimensions and resolved edit permission are caller bindings; SSR never mutates or performs IO.
const packedBoard=Object.freeze({text:['Caller board','宿主文本'].join(String.fromCharCode(10)),locked:true});const packedBoardSnapshot=JSON.stringify(packedBoard);let boardIO=0,boardRequests=0;const boardFetch=globalThis.fetch;globalThis.fetch=()=>{boardIO++;throw new Error('Packed Chalkboard SSR attempted IO.');};
try {
 const boardMarkup=renderToString(element(ui.ChalkboardEditor,{panelSize:[280,180],textBoxSize:[264,120],maxLength:37,title:'Caller board',textEnabled:true,lockVisible:true,lockLabel:'Caller lock',closeVisible:true,value:packedBoard,confirmHint:element('span',null,'Caller confirm'),onValueChange:()=>boardRequests++,onCloseRequest:()=>boardRequests++}));
 assert.match(boardMarkup,/mc-chalkboard-editor/);assert.match(boardMarkup,/Caller lock/);assert.match(boardMarkup,/Caller confirm/);assert(!/<textarea[^>]*disabled/.test(boardMarkup),'Locked is not a resolved edit permission.');
 assert.match(renderToString(element(ui.ChalkboardTextField,{size:[100,50],maxLength:1,label:'Caller field',textEnabled:true,value:'Accepted longer value'})),/Accepted longer value/);
 assert.match(renderToString(element(ui.ChalkboardLock,{label:'Caller standalone lock',checked:true,readOnly:true})),/aria-readonly="true"/);
 assert.throws(()=>renderToString(element(ui.ChalkboardEditor,{panelSize:[16,31],textBoxSize:[10,10],maxLength:3,title:'Bad geometry',textEnabled:true,lockVisible:false,lockLabel:'Lock',closeVisible:false})),RangeError);
}finally{globalThis.fetch=boardFetch;}
assert.equal(boardIO,0);assert.equal(boardRequests,0);assert.equal(JSON.stringify(packedBoard),packedBoardSnapshot);
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
 assert.match(markup,/mc-document-viewer/);assert.match(markup,/data-variant="document"/);assert(markup.includes(documentBannerUrl),'Document banner retains its original packed bytes.');
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
assert(emoteMarkup.includes(wheelStateUrls[3]),'Selected wheel retains original packed bytes.');
assert.equal((emoteMarkup.match(/<img[^>]*>/g)||[]).filter(tag => wheelStateUrls.some(url => tag.includes('src="'+url+'"'))).length,1,'One whole wheel state frame; never layer selected-frame alpha over the base.');
assert(emoteMarkup.includes(emptyEmoteUrl));assert.match(emoteMarkup,/host-emote[.]png/);assert.match(emoteMarkup,/Packed emotes/);
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
 if(content.kind==='empty')assert(markup.includes(emptyEmoteUrl));
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
  assert.equal(typeof aliasCommand.texture,'string');assert(aliasCommand.texture.startsWith('data:image/png;base64,'),'Bundled NPC textures must remain deployable after dependency optimization.');
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
ssrIoNames.push('ResizeObserver','MutationObserver','requestAnimationFrame','cancelAnimationFrame','matchMedia');
const previousSsrIo = new Map(ssrIoNames.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
let imageWorkstationMarkup, packedStorageMarkup;
let storageEffects=0;
let packedPortfolioMarkup,packedPortfolioPhotoMarkup,packedPortfolioPickerMarkup;
let packedUgcReaderMarkup, packedImmersiveReaderMarkup, ugcReaderEffects=0;
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
  // Installed Storage/Screenshot seams: SSR must neither mutate snapshots nor run browser services.
  const storageOn=Object.freeze({included:true,visible:true,enabled:true});
  const storageControl=Object.freeze({state:storageOn,label:'Caller storage action',target:'button.host_storage',ref:()=>{storageEffects++;},nativeProps:{'aria-label':'Caller storage action'}});
  const storageControls=Object.freeze({generateTextureList:storageControl,delete:storageControl,share:storageControl,dependencies:storageControl});
  const storageItem=Object.freeze({id:'host-item',name:'Caller storage item',sizeText:'Host 12 MB',state:storageOn,image:{src:'/host-storage.png',sourceSize:[16,16]},checkboxVisible:true,optionsVisible:true,optionsModal:true,lockVisible:true,signals:{warning:true,error:true,update:true},actions:storageControls});
  const storageToolbar=Object.freeze({state:storageOn,location:{state:storageOn,label:'Caller location',externalLabel:'External',appdataLabel:'Application'},clearCache:storageControl,clearLayoutCache:storageControl,clearDownloadCache:storageControl,clearScreenshotsCache:storageControl,deleteLocalScreenshots:storageControl,multiselect:{state:storageOn,label:'Caller multiselect',ref:()=>{storageEffects++;}}});
  const storageMigration=Object.freeze({sync:storageControl,description:'Caller migration',conversionDescription:'Caller conversion',conversionVisible:true,loadingVisible:true,loadingLabel:'Caller loading',loadingFrame:9});
  const storageCategories=['world','world-template','resource','behavior','skin','cache'].map(kind=>({id:kind,kind,label:'Caller '+kind,sizeText:'Host size',state:storageOn,items:[{...storageItem,id:'item-'+kind}]}));
  const storageLegacy={id:'legacy',kind:'legacy-world',label:'Caller legacy',sizeText:'Host size',state:storageOn,items:[],migration:storageMigration};
  const storagePreview={...storageLegacy,id:'preview',kind:'retail-to-preview-world'};
  const storageValue={location:'external',multiselect:true,expandedIds:storageCategories.map(category=>category.id).concat(['legacy','preview','orphan']),selectedIds:['item-world','orphan']};
  const storagePopupButton={...storageControl,target:'button.host_resolved',rect:[0,0,150,30]};
  const storageGroups=[{id:'dependency',item:storageItem,breakLabel:'Caller used by',dependents:[{...storageItem,id:'dependent'}],remove:storageControl}];
  const storageDependency={open:true,frame:[400,300],profile:'desktop',title:'Caller dependencies',description:'Caller dependency details',groups:storageGroups,continueButton:storagePopupButton,cancelButton:{...storagePopupButton,rect:[170,0,150,30]},continueScrollLabel:'Caller scroll to continue',continueReady:false,viewportRef:()=>{storageEffects++;}};
  const storageSharing={open:true,frame:[400,300],title:'Caller sharing',currentLabel:'Caller current',totalLabel:'Caller total',progressLabel:'Caller progress',progress:.25,button:storageControl};
  const storageProps={size:[400,300],label:'Caller storage region',state:storageOn,standardVisible:true,categoryPanelVisible:true,toolbar:storageToolbar,categories:storageCategories,legacyWorlds:storageLegacy,retailToPreviewWorlds:storagePreview,deleteControl:storageControl,value:storageValue,inputMode:'touch',touchThumbVisible:true,minThumbSize:7,onAction:()=>{storageEffects++;},onValueChange:()=>{storageEffects++;},ref:()=>{storageEffects++;}};
  const freezeStorage=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeStorage);Object.freeze(value);}return value;};
  [storageProps,storageDependency,storageSharing].forEach(freezeStorage);
  const storageBefore=JSON.stringify([storageProps,storageDependency,storageSharing]);
  packedStorageMarkup=renderToString(element(ui.StorageManagement,storageProps));
  assert.match(packedStorageMarkup,/role="region"/);assert.match(packedStorageMarkup,/aria-label="Caller storage region"/);
  assert.match(packedStorageMarkup,/data-storage-item-id="item-world"/);assert.match(packedStorageMarkup,/type="checkbox"/);assert.match(packedStorageMarkup,/aria-expanded="true"/);
  for(const category of [...storageCategories,storageLegacy,storagePreview])assert(packedStorageMarkup.includes('data-kind="'+category.kind+'"'));
  const storageSsrCases=[
    ['StorageToolbar',{...storageToolbar,value:storageValue,locationRef:()=>{storageEffects++;}},'mc-storage-toolbar'],
    ['StorageCategory',{category:storageCategories[0],expanded:true,selectedIds:storageValue.selectedIds,toggleRef:()=>{storageEffects++;}},'mc-storage-category'],
    ['StorageItem',{item:storageItem,kind:'world',selected:true,selectionRef:()=>{storageEffects++;},selectionProps:{'aria-label':'Caller selected item'}},'mc-storage-item'],
    ['StorageItemActions',{width:300,itemId:'host-item',controls:storageControls,visible:true,modal:true},'mc-storage-item-actions'],
    ['StorageSelectionFooter',{visible:true,deleteControl:storageControl},'mc-storage-selection-footer'],
    ['StorageDependencyDialog',storageDependency,'mc-storage-dependency'],
    ['StorageSharingProgress',storageSharing,'mc-storage-sharing'],
  ];
  for(const [name,props,marker]of storageSsrCases){
    const markup=renderToString(element(ui[name],{...props,onAction:()=>{storageEffects++;},ref:()=>{storageEffects++;}}));
    assert(markup.includes(marker),'Installed SSR '+name);
    assert(!/ (?:state|categories|controls|continueButton|cancelButton|touchThumbVisible|minThumbSize|onAction)=/.test(markup),'Resolved Storage props do not leak into HTML.');
    if(name==='StorageDependencyDialog'||name==='StorageSharingProgress'){assert.match(markup,/role="dialog"/);assert.match(markup,/aria-modal="true"/);}
    if(name==='StorageSharingProgress'){assert.match(markup,/role="progressbar"/);assert.match(markup,/aria-valuenow="25"/);}
    if(name==='StorageItem')assert.match(markup,/aria-label="Caller selected item"/);
  }
  const readonlyStorage=renderToString(element(ui.StorageManagement,{...storageProps,readOnly:true,disabled:true}));
  assert.match(readonlyStorage,/aria-readonly="true"/);assert.match(readonlyStorage,/disabled=""/);
  assert.equal(renderToString(element(ui.StorageManagement,{...storageProps,state:{...storageOn,included:false}})),'');
  for(const bad of [
    ()=>element(ui.StorageCategory,{category:{...storageLegacy,migration:undefined}}),
    ()=>element(ui.StorageManagement,{...storageProps,legacyWorlds:{...storageLegacy,kind:'cache'}}),
    ()=>element(ui.StorageManagement,{...storageProps,state:{visible:true,enabled:true}}),
    ()=>element(ui.StorageDependencyDialog,{...storageDependency,continueButton:storageControl}),
    ()=>element(ui.StorageDependencyDialog,{...storageDependency,continueButton:{...storagePopupButton,target:undefined}}),
    ()=>element(ui.StorageSharingProgress,{...storageSharing,progress:1.1}),
    ()=>element(ui.StorageManagement,{...storageProps,inputMode:'wheel'}),
    ()=>element(ui.StorageManagement,{...storageProps,minThumbSize:0}),
  ])assert.throws(()=>renderToString(bad()),'Invalid required Storage inputs must fail before browser I/O.');
  assert.equal(JSON.stringify([storageProps,storageDependency,storageSharing]),storageBefore,'Storage SSR preserves accepted input, hidden/orphan IDs and host geometry.');
  const flashImage=Object.freeze({src:'/host-resolved-White.png',sourceSize:Object.freeze([15,15])});
  const flashProps=Object.freeze({size:Object.freeze([320,180]),scale:2,durationMs:400,flashImage,trigger:'host-capture',onFinished:()=>{storageEffects++;},ref:()=>{storageEffects++;}});
  const flashBefore=JSON.stringify(flashProps);
  const flashMarkup=renderToString(element(ui.ScreenshotFlash,flashProps));
  assert.match(flashMarkup,/aria-hidden="true"/);assert.match(flashMarkup,/tabindex="-1"/);assert.match(flashMarkup,/pointer-events:none/);assert.match(flashMarkup,/data-alpha="1"/);
  assert.match(flashMarkup,/mc-screenshot-flash__background/);assert.match(flashMarkup,/src="\\/host-resolved-White.png"/);assert.match(flashMarkup,/width="15" height="15"/);
  assert.equal((flashMarkup.match(/<img /g)??[]).length,2,'Only the source feed and explicit host material are rendered.');
  assert(!flashMarkup.includes('white-candidate.png'),'Screenshot must not resolve the demo specimen implicitly.');
  assert(!/ (?:durationMs|flashImage|control|trigger)=/.test(flashMarkup),'Screenshot controls must not leak into HTML.');
  for(const [control,alpha]of [[{kind:'alpha',value:.25},.25],[{kind:'progress',value:.5},.96875],[{kind:'progress',value:1},0]]){
    const markup=renderToString(element(ui.ScreenshotFlash,{...flashProps,size:'parent',scale:undefined,control}));
    assert(markup.includes('data-alpha="'+alpha+'"'));assert.match(markup,/mc-screenshot-flash__background/);
  }
  for(const state of [{trigger:null},{visible:false},{cancelled:true},{hidden:true}])assert(!renderToString(element(ui.ScreenshotFlash,{...flashProps,...state})).includes('<img'),'Inactive flash has no material image but retains an inert root.');
  for(const invalid of [{durationMs:undefined},{durationMs:-1},{flashImage:undefined},{flashImage:{src:'',sourceSize:[15,15]}},{size:'parent'},{control:{kind:'progress',value:2}}])assert.throws(()=>renderToString(element(ui.ScreenshotFlash,{...flashProps,...invalid})));
  assert.equal(JSON.stringify(flashProps),flashBefore);assert.equal(storageEffects,0,'SSR calls no host requests, finish callbacks, or DOM refs.');

  const ugcMaterial=Object.freeze({src:'/host-resolved-uppercase-White.png',sourceSize:Object.freeze([2,2])});
  const ugcItems=Object.freeze([
    Object.freeze({id:'__proto__',label:'Caller first item',image:Object.freeze({src:'/host-first-thumbnail.png',sourceSize:Object.freeze([16,9]),alt:'Caller thumbnail'}),labelHeight:10}),
    Object.freeze({id:'constructor',label:'Caller second item',imageContent:element('span',{'data-host-image':'second'},'Caller renderer')}),
    Object.freeze({id:'hidden',label:'Caller hidden item',hidden:true}),
  ]);
  const ugcRequest=()=>{ugcReaderEffects++;};
  const ugcProps=Object.freeze({title:'Caller UGC',searchLabel:'Caller search',searchPlaceholder:'Caller placeholder',items:ugcItems,imageFrameMaterial:ugcMaterial,maxGridItems:1,query:'unrelated',onAction:ugcRequest,onQueryChange:ugcRequest,ref:ugcRequest,searchRef:ugcRequest,scrollViewportRef:ugcRequest,closeRef:ugcRequest,itemRefs:Object.freeze({['__proto__']:ugcRequest}),itemContainerRefs:Object.freeze({['__proto__']:ugcRequest})});
  const ugcBefore=JSON.stringify(ugcProps);
  packedUgcReaderMarkup=renderToString(element(ui.UGCViewer,ugcProps));
  assert.match(packedUgcReaderMarkup,/aria-label="Caller UGC"/);assert.match(packedUgcReaderMarkup,/aria-label="Caller search"/);
  assert.match(packedUgcReaderMarkup,/maxlength="14"/i);assert.match(packedUgcReaderMarkup,/value="unrelated"/);
  assert.match(packedUgcReaderMarkup,/data-ugc-item-id="__proto__"/);
  assert(!packedUgcReaderMarkup.includes('data-ugc-item-id="constructor"'),'Capacity is an explicit host cap, not query filtering or mutation.');
  assert.match(packedUgcReaderMarkup,/host-resolved-uppercase-White.png/);
  assert(!/ (?:imageFrameMaterial|maxGridItems|items|inputMode|searchProps)=/.test(packedUgcReaderMarkup));
  for(const inputMode of ['mouse','touch']){
    const markup=renderToString(element(ui.UGCViewer,{...ugcProps,inputMode,touchThumbVisible:true,minThumbSize:7,maxGridItems:2,query:'',readOnly:true,disabled:true,modal:true}));
    assert.match(markup,/role="dialog"/);assert.match(markup,/aria-modal="true"/);assert.match(markup,/readonly=""/i);assert.match(markup,/disabled=""/);
    assert.match(markup,/data-ugc-item-id="constructor"/);assert.match(markup,/Caller renderer/);assert.match(markup,/Caller placeholder/);
  }
  const ugcCardMarkup=renderToString(element(ui.UGCItemCard,{item:ugcItems[0],width:100,imageFrameMaterial:ugcMaterial,onAction:ugcRequest,ref:ugcRequest,containerRef:ugcRequest}));
  assert.match(ugcCardMarkup,/aria-label="Caller first item"/);assert.match(ugcCardMarkup,/mc-ugc-item-card__button/);assert.match(ugcCardMarkup,/Caller thumbnail/);
  for(const patch of [{maxGridItems:undefined},{maxGridItems:-1},{maxGridItems:1.5},{imageFrameMaterial:undefined},{imageFrameMaterial:{src:'',sourceSize:[2,2]}},{items:[ugcItems[0],ugcItems[0]]}])assert.throws(()=>renderToString(element(ui.UGCViewer,{...ugcProps,...patch})));
  assert.throws(()=>renderToString(element(ui.UGCItemCard,{item:ugcItems[0],width:100})),TypeError);
  assert.equal(JSON.stringify(ugcProps),ugcBefore,'UGC SSR preserves accepted IDs, cap, query and host material.');
  const readerBindings=Object.freeze({running:false,loading:true,error:true,canRetry:false});
  const readerSlots=Object.freeze({webView:element('div',{'data-host-reader':'persistent'},'Caller real reader'),loadingVisual:element('span',{'data-host-loading':'whole'},'Caller loading visual')});
  const readerProps=Object.freeze({size:Object.freeze([400,300]),popupLayout:Object.freeze({kind:'child-sum',titleWidth:100}),bindings:readerBindings,...readerSlots,errorText:'Caller error text',labels:Object.freeze({title:'Caller reader title'}),onAction:ugcRequest,ref:ugcRequest,webViewRef:ugcRequest,buttonRefs:Object.freeze({'loading-cancel':ugcRequest,retry:ugcRequest,'error-cancel':ugcRequest,ok:ugcRequest})});
  const readerBefore=JSON.stringify(readerProps);
  packedImmersiveReaderMarkup=renderToString(element(ui.ImmersiveReader,readerProps));
  assert.match(packedImmersiveReaderMarkup,/aria-label="Caller reader title"/);assert.match(packedImmersiveReaderMarkup,/data-popup-layout="child-sum"/);
  assert.match(packedImmersiveReaderMarkup,/Caller real reader/);assert.match(packedImmersiveReaderMarkup,/Caller loading visual/);assert.match(packedImmersiveReaderMarkup,/Caller error text/);
  assert.match(packedImmersiveReaderMarkup,/role="status"/);assert.match(packedImmersiveReaderMarkup,/role="alert"/);
  assert(!/ (?:bindings|popupLayout|webView|loadingVisual|contentRect|buttonRefs)=/.test(packedImmersiveReaderMarkup));
  for(let bits=0;bits<16;bits++){
    const bindings=Object.freeze({running:!!(bits&1),loading:!!(bits&2),error:!!(bits&4),canRetry:!!(bits&8)});
    const markup=renderToString(element(ui.ImmersiveReader,{...readerProps,bindings,popupLayout:{kind:'resolved',size:[280,160]},modal:true,readOnly:true}));
    for(const [key,attribute]of [['running','running'],['loading','loading'],['error','error'],['canRetry','can-retry']])assert(markup.includes('data-'+attribute+'="'+bindings[key]+'"'),'Reader bindings stay independent: '+bits+'/'+key);
    assert.match(markup,/role="dialog"/);assert.match(markup,/data-host-reader="persistent"/);assert.match(markup,/data-host-loading="whole"/);
  }
  const readerButtonMarkup=renderToString(element(ui.ImmersiveReaderButton,{label:'Caller reader button',onActivate:ugcRequest,ref:ugcRequest,readOnly:true}));
  assert.match(readerButtonMarkup,/aria-label="Caller reader button"/);assert.match(readerButtonMarkup,/data-reader-target="button.immersive_reader"/);assert.match(readerButtonMarkup,/width="19" height="19"/);
  for(const patch of [{popupLayout:undefined},{popupLayout:{kind:'inferred'}},{webView:undefined},{loadingVisual:undefined},{bindings:{running:false,loading:true,error:false}},{bindings:{...readerBindings,canRetry:1}},{contentRect:[0,0,401,300]}])assert.throws(()=>renderToString(element(ui.ImmersiveReader,{...readerProps,...patch})));
  assert.doesNotThrow(()=>renderToString(element(ui.ImmersiveReader,{...readerProps,webView:null,loadingVisual:null})), 'Explicit null host slots are allowed without resolving a fake service or animation.');
  assert.equal(JSON.stringify(readerProps),readerBefore,'Reader bindings, popup layout and opaque host nodes remain caller-owned.');
  assert.equal(ugcReaderEffects,0,'No SSR requests, ref calls, lifecycle completion or service activation.');

  // Portfolio requires explicit controller bindings, materials and layout.
  const portfolioEffects={requests:0,refs:0},portfolioRequest=()=>{portfolioEffects.requests++;},portfolioRef=()=>{portfolioEffects.refs++;};
  const portfolioHostImage=Object.freeze({src:'/host-whole-photo.png',sourceSize:Object.freeze([128,128]),alt:'Caller whole photo'});
  const portfolioFrame=Object.freeze({src:'/host-whole-transparent-frame.png',sourceSize:Object.freeze([5,5])});
  const portfolioDivider=Object.freeze({src:'/host-whole-divider.png',sourceSize:Object.freeze([15,15])});
  const portfolioStates=Object.freeze({normal:portfolioHostImage,hover:portfolioHostImage,pressed:portfolioHostImage});
  const portfolioLeaves=Object.freeze([
    Object.freeze({id:'__proto__',image:portfolioHostImage,caption:'Caller caption\\n第二行',captionEnabled:true,captionColor:'#123456',visible:true}),
    Object.freeze({id:'constructor',imageContent:element('span',{'data-portfolio-host':'opaque'},'Host renderer'),caption:'Second caption',captionEnabled:false,captionColor:'#654321',visible:false}),
  ]);
  const portfolioRows=Object.freeze([
    Object.freeze({id:'row-proto',dividerVisible:true,cells:Object.freeze([
      Object.freeze({id:'__proto__',label:'Caller visible screenshot',visible:true,image:portfolioHostImage}),
      Object.freeze({id:'constructor',label:'Caller hidden screenshot',visible:false,image:portfolioHostImage}),
      Object.freeze({id:'third',label:'Caller third screenshot',visible:true,imageContent:element('span',null,'Third host renderer')}),
    ])}),Object.freeze({id:'row-empty',dividerVisible:false,cells:Object.freeze([])}),
  ]);
  const portfolioLabels=Object.freeze({title:'Caller Portfolio',previous:'Previous photos',next:'Next photos',close:'Close Portfolio',deleteLeft:'Delete left',deleteRight:'Delete right',convertLeft:'Convert left',convertRight:'Convert right',add:'Add photo',export:'Export photos',reader:'Read captions',captionLeft:'Left caption',captionRight:'Right caption',captionPlaceholder:'Caller placeholder',noPhotos:'Caller empty alert'});
  const portfolioBindings=Object.freeze({viewing:true,picking:true,previousVisible:true,nextVisible:true,leftPhotoVisible:true,rightPhotoVisible:true,exportVisible:true,noPhotosAlertVisible:true});
  const portfolioPicker=Object.freeze({rows:portfolioRows,frameMaterial:portfolioFrame,dividerMaterial:portfolioDivider,headerLabel:'Caller inventory',headerHeight:12,noPhotosAlertVisible:true,emptyLabel:'Caller picker empty',viewportRef:portfolioRef,closeRef:portfolioRef,itemRefs:Object.freeze({['__proto__']:portfolioRef}),itemContainerRefs:Object.freeze({['__proto__']:portfolioRef})});
  const portfolioProps=Object.freeze({size:Object.freeze([384,260]),layout:Object.freeze({kind:'nominal',readerButtonSize:Object.freeze([20,20])}),bindings:portfolioBindings,leaves:portfolioLeaves,pageLabels:Object.freeze(['Host left number','Host right number']),labels:portfolioLabels,frameMaterial:portfolioFrame,pageMaterials:Object.freeze({previous:portfolioStates,next:portfolioStates}),convertMaterials:portfolioStates,picker:portfolioPicker,ref:portfolioRef,captionRefs:Object.freeze({left:portfolioRef,right:portfolioRef}),onAction:portfolioRequest,onCaptionChange:portfolioRequest});
  const portfolioBefore=JSON.stringify(portfolioProps);
  packedPortfolioMarkup=renderToString(element(ui.Portfolio,portfolioProps));
  assert.match(packedPortfolioMarkup,/aria-label="Caller Portfolio"/);assert.match(packedPortfolioMarkup,/data-viewing="true"/);assert.match(packedPortfolioMarkup,/data-picking="true"/);
  assert.match(packedPortfolioMarkup,/data-layout-resolution="nominal"/);assert.match(packedPortfolioMarkup,/maxlength="1000"/i);assert.match(packedPortfolioMarkup,/Caller caption/);
  assert.match(packedPortfolioMarkup,/Host left number/);assert.match(packedPortfolioMarkup,/Host right number/);assert.match(packedPortfolioMarkup,/Caller empty alert/);
  assert.match(packedPortfolioMarkup,/color:#123456/);assert.match(packedPortfolioMarkup,/host-whole-transparent-frame.png/);assert.match(packedPortfolioMarkup,/data-columns="3"/);assert.match(packedPortfolioMarkup,/data-columns="0"/);
  assert(!/ (?:bindings|leaves|pageLabels|pageMaterials|convertMaterials|frameMaterial|readerButtonSize|captionRefs|noPhotosAlertVisible)=/.test(packedPortfolioMarkup),'Portfolio source/API descriptors stay off DOM attributes.');
  const portfolioFlagKeys=['viewing','picking','previousVisible','nextVisible','leftPhotoVisible','rightPhotoVisible','exportVisible','noPhotosAlertVisible'];
  const portfolioTag=(markup,selector)=>{const result=markup.match(selector);assert(result,'Expected Portfolio source node');return result[0];};
  for(let bits=0;bits<256;bits++){
    const flags=Object.freeze(Object.fromEntries(portfolioFlagKeys.map((key,index)=>[key,!!(bits&(1<<index))])));
    const markup=renderToString(element(ui.Portfolio,{...portfolioProps,bindings:flags,modal:true}));
    assert(markup.includes('data-viewing="'+flags.viewing+'"'));assert(markup.includes('data-picking="'+flags.picking+'"'));
    assert.equal(/ hidden=""/.test(portfolioTag(markup,/<div[^>]*class="mc-portfolio__viewing"[^>]*>/)),!flags.viewing);
    const pickerTag=portfolioTag(markup,/<div[^>]*class="mc-portfolio-picker mc-portfolio__picker [^"]*"[^>]*>/);
    assert.equal(/ hidden=""/.test(pickerTag),!flags.picking);
    for(const[action,visible]of [['previous',flags.previousVisible],['next',flags.nextVisible],['delete-left',flags.leftPhotoVisible],['delete-right',flags.rightPhotoVisible],['convert-left',flags.leftPhotoVisible],['convert-right',flags.rightPhotoVisible],['export',flags.exportVisible],['reader',flags.exportVisible]]){
      const tag=portfolioTag(markup,new RegExp('<button[^>]*data-portfolio-action="'+action+'"[^>]*>'));
      assert.equal(/ hidden=""/.test(tag),!visible,'Independent '+action+' visibility at flags'+bits);
    }
    assert.equal(/aria-modal="true"/.test(markup),flags.viewing||flags.picking,'Web modal requires a visible branch');
  }
  const portfolioResolved=renderToString(element(ui.Portfolio,{...portfolioProps,bindings:{...portfolioBindings,picking:false},layout:{kind:'resolved',contentSize:[320,231],bookSize:[320,207],pageSize:[160,207],bookOffset:[0,-10],footerSize:[320,207],pickerSize:[225,231],readerButtonSize:[22,18]},readOnly:true,disabled:true}));
  assert.match(portfolioResolved,/data-layout-resolution="resolved"/);assert.match(portfolioResolved,/readonly=""/i);assert.match(portfolioResolved,/disabled=""/);
  const portfolioCaptionMarkup=renderToString(element(ui.PortfolioCaptionField,{label:'Caller standalone caption',placeholder:'Caller caption hint',value:'Accepted\\ncaption',textColor:'#234567',size:[102,22],scale:2,onValueChange:portfolioRequest,ref:portfolioRef,containerRef:portfolioRef,readOnly:true}));
  assert.match(portfolioCaptionMarkup,/aria-label="Caller standalone caption"/);assert.match(portfolioCaptionMarkup,/maxlength="1000"/i);assert.match(portfolioCaptionMarkup,/Accepted\\ncaption/);assert.match(portfolioCaptionMarkup,/readonly=""/i);
  packedPortfolioPhotoMarkup=renderToString(element(ui.PortfolioPhoto,{image:portfolioHostImage,frameMaterial:portfolioFrame,caption:element('span',null,'Opaque caption slot'),ref:portfolioRef}));
  assert.match(packedPortfolioPhotoMarkup,/Caller whole photo/);assert.match(packedPortfolioPhotoMarkup,/Opaque caption slot/);assert.equal((packedPortfolioPhotoMarkup.match(/mc-portfolio-photo__corner--/g)||[]).length,4);
  packedPortfolioPickerMarkup=renderToString(element(ui.PortfolioPicker,{...portfolioPicker,inputMode:'touch',touchThumbVisible:true,minThumbSize:6,onAction:portfolioRequest,ref:portfolioRef}));
  assert.match(packedPortfolioPickerMarkup,/data-input-mode="touch"/);assert.match(packedPortfolioPickerMarkup,/data-columns="3"/);assert.match(packedPortfolioPickerMarkup,/data-portfolio-slot-id="constructor"/);assert.match(packedPortfolioPickerMarkup,/Caller picker empty/);
  const portfolioItemMarkup=renderToString(element(ui.PortfolioPickerItem,{itemId:'__proto__',label:'Caller standalone screenshot',frameMaterial:portfolioFrame,image:portfolioHostImage,readOnly:true,onPick:portfolioRequest,ref:portfolioRef,containerRef:portfolioRef}));
  assert.match(portfolioItemMarkup,/data-portfolio-item-id="__proto__"/);assert.match(portfolioItemMarkup,/aria-disabled="true"/);
  for(const direction of ['previous','next']){
    const markup=renderToString(element(ui.PortfolioPageTurnButton,{direction,label:'Caller '+direction,materials:portfolioStates,readOnly:true,ref:portfolioRef,onTurn:portfolioRequest}));
    assert.match(markup,new RegExp('data-direction="'+direction+'"'));assert(!/ disabled=""/.test(markup),'Read-only navigation remains available.');
  }
  for(const patch of [{bindings:undefined},{bindings:{...portfolioBindings,picking:undefined}},{leaves:[]},{leaves:[portfolioLeaves[0],portfolioLeaves[0]]},{layout:undefined},{layout:{kind:'nominal'}},{frameMaterial:undefined},{pageMaterials:{previous:portfolioStates}},{convertMaterials:undefined}])assert.throws(()=>renderToString(element(ui.Portfolio,{...portfolioProps,...patch})));
  assert.throws(()=>renderToString(element(ui.PortfolioCaptionField,{label:'Caption',placeholder:'Hint',value:'Text'})),TypeError);
  assert.throws(()=>renderToString(element(ui.PortfolioPhoto,{image:portfolioHostImage})),TypeError);
  assert.throws(()=>renderToString(element(ui.PortfolioPickerItem,{itemId:'id',label:'Label',image:portfolioHostImage})),TypeError);
  assert.throws(()=>renderToString(element(ui.PortfolioPageTurnButton,{direction:'previous',label:'Previous'})),TypeError);
  for(const patch of [{rows:undefined},{dividerMaterial:undefined},{frameMaterial:undefined},{headerHeight:undefined},{rows:[{id:'row',dividerVisible:false,cells:[{id:'id',label:'Item'}]}]}])assert.throws(()=>renderToString(element(ui.PortfolioPicker,{...portfolioPicker,...patch})));
  assert.equal(JSON.stringify(portfolioProps),portfolioBefore,'Portfolio SSR preserves readonly controller and opaque host input descriptors.');
  assert.deepEqual(portfolioEffects,{requests:0,refs:0},'Portfolio SSR calls neither callbacks nor DOM refs.');

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
for (const asset of ['styles.css','textures.css','inventory.css','workstations.css','enchanting-book.css','processing.css','anvil.css','containers.css','image.css','brewing.css','special-workstations.css','scroll-area.css','hud.css','hud-textures.css','hud-overlays.css','hud-overlay-textures.css','advanced-workstations.css','advanced-workstation-textures.css', 'feedback.css', 'feedback-textures.css', 'settings-controls.css', 'settings-control-textures.css', 'game-lists.css', 'game-list-textures.css', 'system-screens.css', 'system-screens-textures.css', 'game-controls.css', 'game-control-textures.css', 'trading-mounts.css', 'trading-mount-textures.css', 'item-renderers.css', 'inventory-screens.css', 'inventory-screen-textures.css','recipe-book.css','recipe-book-textures.css','crafting-screen.css','inventory-screen-frame.css','book.css','sign.css','jigsaw.css','command-block.css','structure-editor.css','server-forms.css','npc.css','emote-wheel.css','emote-wheel-screen.css','document-viewer.css','player-permissions.css','ore-player-permissions.css','chalkboard.css','start-menu.css','storage-management.css','screenshot-flash.css','ugc-viewer.css','immersive-reader.css','portfolio.css','portfolio-parts.css','portfolio-picker.css','portfolio-skin.css','fonts.css','mojangles.css','classic-fonts.css','fonts/MCBEPixel-Regular.woff2','fonts/MCBECJK-12px-zh-hans.woff2','fonts/Monocraft-Regular.woff2','fonts/FusionPixel-12px-zh-hans.woff2','fonts/Monocraft-OFL.txt','fonts/Fusion-Pixel-OFL.txt','fonts/fusion-notices/LICENSES/galmuri/LICENSE.txt']) {
  assert((await stat(fileURLToPath(import.meta.resolve('mcbeui/'+asset)))).size > 0);
}
assert((await stat(new URL('./node_modules/mcbeui/dist/assets/enchanting/enchanting_table_book.png',import.meta.url))).size>0);
const packageRoot = new URL('./',import.meta.resolve('mcbeui/package.json'));

assert(!Object.hasOwn(ui,'storageAssets'),'Storage material registry must remain private.');
const storageManifest=JSON.parse(await readFile(new URL('docs/storage-assets.json',packageRoot),'utf8'));
assert.equal(storageManifest.schemaVersion,1);
assert.equal(storageManifest.fixedSource.sha256,'d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
const expectedStorageImages=[["lightNormal",131,"313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376"],["lightHover",85,"e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8"],["lightPressed",84,"47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983"],["lightDisabled",88,"5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f"],["focusWhite",105,"bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8"],["categoryUnchecked",131,"313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376"],["categoryChecked",155,"c3e928f9c58b6cf42399686ba71f5656de59a2dadcdd6cee9b26111ec5200c52"],["categoryUncheckedHover",85,"e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8"],["categoryCheckedHover",84,"47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983"],["gray",67,"e21915e60b32df0c5bd7fa8153571c1d8899a20de2973ee92f8aab8f11c35797"],["black",84,"492d761d357b4fbdd29d0bc7a06a6423b5b0842d47c2d069ca90a9746ff5117e"],["worldRowDark",137,"fc332fee4a0f800491f1e6ad4925e175e556bcfcba5d587678dc1731f1780548"],["checkboxCheck",149,"8c96d1fccfc21f611859cfe71d04f4f98b7aea9753cfbcf2d6e3257b56700062"],["checkboxSpace",129,"73cd8740b2c5deade8396c855d7c30d80a56186f0aeafd00bdc5a8d330a2e014"],["checkboxCheckHover",152,"29b33214de8a4621a2b882eaeb5adcce22053e97669cac459bf167a70bdec8c2"],["checkboxSpaceHover",126,"bd5babf3900537bda4f887be0cd22abbaea656959d32b88517d3943e5d95c0a6"],["defaultIndent",120,"35f98c105d7eb71519be92e9afd5c7cbd8239dd1addf40bb4a79fad472d5e395"],["worldScreenshotFocus",105,"bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8"],["arrowDown",1169,"b95f69c158c8c8c1bb7df278abf8edb86c12e8de9d99f00877c4ebcdeaa17be6"],["arrowRight",1142,"4b7d2d5d5f7beed2eeeeebac93637b16ea1282c2796ecec8a27565fe07ac1b6f"],["multiselect",174,"cfacf43834fadd6fb85c4add4940ea549d42ab3db2aa96c760eb91edb471ba40"],["invertedMultiselect",278,"4380b3795d9e6aae6b972e55861796bfd3b14c3a64b3bd6b7916617a85682383"],["trayBanners",82,"41c874a8ffb72a40b0404c6955388aed577aabc74118729336604c376689748f"],["lock",95,"fa54afb188ed482b1f6cd63c3bf433f767c67f8c5094df92a11ab838776c2322"],["warning",152,"e5c481628adec8b4e60aff01b26b330dc2433a87e5534454d17a77c5e404afba"],["error",148,"1b274eea56592b90fcb3ce90f112d2cea9d4f1a31536fd7eeb8a432c740e1c1e"],["updateGlyph",148,"74cc87e0d1d258db4592cacdc908d6bdc74f95429c914bfddccc4abca1059a52"],["dialogHollow2",314,"eef0d1cf13c5102332927197ff14417f015480cc76c3a18c598843925ee7479f"],["control",71,"7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab"],["progressEmpty",180,"531bb4ca58b8bae327756840c19074ff6bbee08f0b479b17af2c960c041569c0"],["progressFull",103,"91978c74425ac8fad80e0f531610b28f621e14a618892c59e869c19f3c6149d1"],["progressNub",160,"c81011ab8abed25f6aa48b52e1a6bfac2a193d2a753f594428774c3321c5eb55"],["loadingBar",323,"703e02f1e7013d642a81225b98bf08f1bdfc69e003b0b7d4a6132635da747aef"],["dropdownBackground",154,"22acaa35bef8444642054c0bc3c5e0d69eb188bb8ccb26f354d59f85c2055010"],["dropdownChevron",172,"f661ee43ad1096cd996fdbaf33f96453f583e759da6af4bdbc5d9a843ca22ebe"],["dropdownChevronHover",136,"44535c4efb28008a1fff518e34c040652bd1e6edafcf5e47e89b1e8fa82c6bdd"],["radioOff",129,"73cd8740b2c5deade8396c855d7c30d80a56186f0aeafd00bdc5a8d330a2e014"],["radioOn",163,"9f89aee03e8573999bc835495d4cea6bb7705f4011cf9e0fae86df62ac91a813"],["radioOffHover",126,"bd5babf3900537bda4f887be0cd22abbaea656959d32b88517d3943e5d95c0a6"],["radioOnHover",157,"4aaa602b5428d97827c8242c0193b28f5641b38e37d0313f712612475d627d3a"],["dropdownSelectedBackground",69,"dda80223416cd6d050a44a88eda0dee7c28600e0b85aef936f8d836949e08e78"],["dropdownHoverBackground",69,"fdb875e1b090cb2dbedbf1c9ffe730d0c92d8eb6bed8a786fd38a7fa3d88f607"],["deleteGlyph",199,"43a57e20e6e1e045ffdc008ae1982004a610482d31a76811cb44d6f3e608e376"]];
assert.deepEqual(storageManifest.resources.map(asset=>[asset.key,asset.bytes,asset.sha256]),expectedStorageImages,'All43 authored material identities retain complete original bytes.');
const expectedStorageNewFiles=[{"path":"src/assets/storage-management/arrowDown.png","bytes":1169,"sha256":"b95f69c158c8c8c1bb7df278abf8edb86c12e8de9d99f00877c4ebcdeaa17be6"},{"path":"src/assets/storage-management/multiselection.png","bytes":174,"sha256":"cfacf43834fadd6fb85c4add4940ea549d42ab3db2aa96c760eb91edb471ba40"},{"path":"src/assets/storage-management/invertedmultiselecticon.png","bytes":278,"sha256":"4380b3795d9e6aae6b972e55861796bfd3b14c3a64b3bd6b7916617a85682383"},{"path":"src/assets/storage-management/dialog_background_hollow_2.png","bytes":314,"sha256":"eef0d1cf13c5102332927197ff14417f015480cc76c3a18c598843925ee7479f"},{"path":"src/assets/storage-management/dialog_background_hollow_2.json","bytes":95,"sha256":"584c51df61b2ee49c96bfe566c555e7c9974708a18c9ab37ce73f88af383db40"},{"path":"src/assets/storage-management/experiencebarempty.json","bytes":92,"sha256":"de67894f88e78223fa154d60fbd826da1349d35dbfe3b0d8dae5d6365161243f"},{"path":"src/assets/storage-management/experiencebarfull.json","bytes":92,"sha256":"8ec618d73df58faa04e6ce31c88b77d88d6af1c2ae30d290eb25b57aa4601876"},{"path":"src/assets/storage-management/loading_bar.json","bytes":39,"sha256":"38bc67e02f506f01308a16c9be27bbe203ea6da76cd02961571801327ad5f665"},{"path":"src/assets/storage-management/LICENSE.md","bytes":222,"sha256":"ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d"}];
assert.deepEqual(storageManifest.newFiles,expectedStorageNewFiles);
assert.equal(storageManifest.newFiles.length,9);assert.equal(storageManifest.newFiles.reduce((sum,file)=>sum+file.bytes,0),2475);
assert.deepEqual((await readdir(new URL('dist/assets/storage-management/',packageRoot))).sort(),expectedStorageNewFiles.map(file=>file.path.split('/').at(-1)).sort(),'Only the9 approved whole files enter the new physical Storage bank.');
const storageRuntimeUrls=new Map([...packedStorageMarkup.replaceAll('&quot;','"').matchAll(/--mc-storage-([A-Za-z0-9]+):url\\("([^"]+)"\\)/g)].map(match=>[match[1],match[2]]));
assert.deepEqual([...storageRuntimeUrls.keys()].sort(),expectedStorageImages.map(asset=>asset[0]).sort(),'SSR exposes every actual private registry URL without exporting the registry.');
const storageReadUrl=async url=>url.startsWith('data:image/png;base64,')?Buffer.from(url.slice('data:image/png;base64,'.length),'base64'):readFile(new URL(url));
const checkStorageFile=async(asset,path)=>{
 assert(/^src[/]assets[/]/.test(path)&&!path.includes('..'),'Storage asset path must stay inside the public bank.');
 const bytes=await readFile(new URL(path.replace(/^src[/]/,'dist/'),packageRoot));
 assert.equal(bytes.length,asset.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,path);return bytes;
};
for(const file of storageManifest.newFiles)await checkStorageFile(file,file.path);
let storageInlineCount=0;
for(const asset of storageManifest.resources){
 const runtime=await storageReadUrl(storageRuntimeUrls.get(asset.key));
 assert.equal(runtime.length,asset.bytes,asset.key);assert.equal(createHash('sha256').update(runtime).digest('hex'),asset.sha256,'Installed Storage URL whole-byte identity: '+asset.key);
 assert.equal(runtime.readUInt32BE(16),asset.dimensions[0]);assert.equal(runtime.readUInt32BE(20),asset.dimensions[1]);
 if(asset.destination)assert.deepEqual(await checkStorageFile(asset,asset.destination),runtime,'Physical original and installed registry agree: '+asset.key);
 if(asset.metadata?.destination)await checkStorageFile(asset.metadata,asset.metadata.destination);
 if(asset.delivery==='inline-whole-existing-css-png'){
  storageInlineCount++;assert.equal(asset.newPhysicalPNG,false);
  assert(asset.existingEmbeddedWholeMatches.length>0);
  for(const match of asset.existingEmbeddedWholeMatches){
   const css=await readFile(new URL(match.path.replace(/^src[/]/,'dist/'),packageRoot),'utf8');
   // A data URI contains its own semicolon, so locate its complete base64 body in the full stylesheet.
   assert(css.includes(match.cssVariable+':'));
   const bodies=[...css.matchAll(/data:image[/]png;base64,([A-Za-z0-9+/=]+)/g)].map(found=>Buffer.from(found[1],'base64'));
   assert(bodies.some(body=>body.equals(runtime)),'Whole inline original remains byte-identical to its existing stylesheet: '+asset.key);
  }
 }
}
assert.equal(storageInlineCount,5);
const screenshotManifest=JSON.parse(await readFile(new URL('docs/screenshot-flash-source.json',packageRoot),'utf8'));
assert.equal(screenshotManifest.source.sha256,'123aa4b7cc34f80de987dbed8221045d6a26a6e810a47d863a27ec5b2ec1c810');
assert.equal(screenshotManifest.source.definitions,4);
assert.equal(screenshotManifest.flashMaterial.libraryDefault,null);assert.equal(screenshotManifest.flashMaterial.exactFixedArchiveImage,false);
assert.equal(screenshotManifest.flashMaterial.casefoldCandidate.runtimeAliasCertified,false);
assert.equal(screenshotManifest.flashMaterial.casefoldCandidate.notAddedToScreenshotAssetBank,true);
assert.equal(screenshotManifest.flashMaterial.casefoldCandidate.notDefaultScreenshotTexture,true);
assert.deepEqual(screenshotManifest.flashMaterial.casefoldCandidate.existingLegacyEmbeddings.map(entry=>entry.path),['src/crafting-image-assets.ts','src/inventory-screen-textures.css']);
const screenshotBackground=await readFile(new URL(screenshotManifest.background.productionReuse.replace(/^src[/]/,'dist/'),packageRoot));
assert.equal(screenshotBackground.length,71);assert.equal(createHash('sha256').update(screenshotBackground).digest('hex'),'7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab');
assert.equal(screenshotManifest.background.sourceAlpha,.8);


for(const internal of ['ugcReaderAssets','ugcAssets','immersiveReaderAssets','deferClassicEvent','useClassicModal','useClassicNodeRef'])assert(!Object.hasOwn(ui,internal),'UGC/Reader registry and lifecycle helpers stay private: '+internal);
const ugcReaderManifest=JSON.parse(await readFile(new URL('docs/ugc-reader-assets.json',packageRoot),'utf8'));
assert.equal(ugcReaderManifest.source.archiveSHA256,'d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
assert.deepEqual(ugcReaderManifest.counts,{semanticKeys:21,ugcSubsetKeys:17,readerSubsetKeys:9,wholePNG:21,rawMetadata:16,physicalExistingPNG:19,embeddedOnlyPNG:2,newPhysicalFiles:0});
const expectedUgcReaderResources=[["dialogHollow3",260,"cf16fa7c6598d90d9b3f43b3ce7779de065c07fb29568d860588694ffe596e5b",[18,33],"src/assets/command-block/dialog_background_hollow_3.png",{"path":"resource_pack/textures/ui/dialog_background_hollow_3.json","bytes":94,"sha256":"36700ca1326d14a269b2052c27d95115200897bee9c27b4d36e75fe893973415","raw":{"nineslice_size":[8,23,8,8],"base_size":[18,33]},"existingWholeFiles":["src/assets/command-block/dialog_background_hollow_3.json"]}],["control",71,"7997672f3c99b3bb967ad8fb2e3c19290f16a542e49d6a3572e6fd1bc355c4ab",[2,2],"src/assets/jigsaw/control.png",{"path":"resource_pack/textures/ui/control.json","bytes":60,"sha256":"97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989","raw":{"nineslice_size":1,"base_size":[2,2]},"existingWholeFiles":["src/assets/document-viewer/disabledButtonNoBorder.json","src/assets/document-viewer/permissions_player_fade_overlay.json","src/assets/emote-wheel/Black.json","src/assets/emote-wheel/disabledButtonNoBorder.json","src/assets/jigsaw/control.json","src/assets/player-permissions/disabledButtonNoBorder.json","src/assets/player-permissions/permissions_player_fade_overlay.json"]}],["closeNormal",163,"5160569f357e661d38495b3f84c89f84b30cc6fdd87c796b65f457cae529054c",[15,15],"src/assets/book/close_button_default.png",null],["closeHover",164,"16c89ba672607da0c452dacc79129f8eee995555bd061f51a1cb5bbab57bb877",[15,15],"src/assets/book/close_button_hover.png",null],["closePressed",1416,"9abf4fcaf21fbbfa09ee1aeb8599288d5a781b57b08b3e4b2848b54cb217aa03",[15,15],"src/assets/book/close_button_pressed.png",null],["darkNormal",137,"fc332fee4a0f800491f1e6ad4925e175e556bcfcba5d587678dc1731f1780548",[4,4],"src/assets/player-permissions/button_borderless_dark.png",{"path":"resource_pack/textures/ui/button_borderless_dark.json","bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"]}],["darkHover",151,"40c380b48b04c5a9b222b0f9f95ecaa7fb97295d2e776f1094a323886d4f849b",[4,4],"src/assets/player-permissions/button_borderless_darkhover.png",{"path":"resource_pack/textures/ui/button_borderless_darkhover.json","bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"]}],["darkPressed",145,"f2037494b69a14f90f008cc0d5f74c8280bac9bc2bfba9f4405ead8c103c9532",[4,4],"src/assets/player-permissions/button_borderless_darkpressed.png",{"path":"resource_pack/textures/ui/button_borderless_darkpressed.json","bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"]}],["buttonDisabled",88,"5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f",[2,2],"src/assets/document-viewer/disabledButtonNoBorder.png",{"path":"resource_pack/textures/ui/disabledButtonNoBorder.json","bytes":60,"sha256":"97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989","raw":{"nineslice_size":1,"base_size":[2,2]},"existingWholeFiles":["src/assets/document-viewer/disabledButtonNoBorder.json","src/assets/document-viewer/permissions_player_fade_overlay.json","src/assets/emote-wheel/Black.json","src/assets/emote-wheel/disabledButtonNoBorder.json","src/assets/jigsaw/control.json","src/assets/player-permissions/disabledButtonNoBorder.json","src/assets/player-permissions/permissions_player_fade_overlay.json"]}],["focusWhite",105,"bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8",[5,5],"src/assets/document-viewer/focus_border_white.png",{"path":"resource_pack/textures/ui/focus_border_white.json","bytes":60,"sha256":"d41fce86c98c18b03d8cb349ea5b50e4648c0cbf4b739b2ad7b6d236a83b3407","raw":{"nineslice_size":1,"base_size":[5,5]},"existingWholeFiles":["src/assets/document-viewer/focus_border_white.json","src/assets/emote-wheel/focus_border_white.json","src/assets/player-permissions/focus_border_white.json","src/assets/player-permissions/square_image_border_white.json"]}],["editNormal",126,"c4968ec9277dcdd363c28c1338a6e202d15f8464c14331fddb9c5014c9eaa109",[6,6],null,{"path":"resource_pack/textures/ui/edit_box_indent.json","bytes":60,"sha256":"77d81df6c51e2edc8a4fb4ffe6fbf9d00762c4edb21f8fd5ba7e9c02b94102b6","raw":{"nineslice_size":2,"base_size":[6,6]},"existingWholeFiles":[]}],["editHover",125,"7b02fa8f0b08581bd0319d1757578303c160cc77a2a0910ec3231dc642b6e2eb",[6,6],null,{"path":"resource_pack/textures/ui/edit_box_indent_hover.json","bytes":60,"sha256":"77d81df6c51e2edc8a4fb4ffe6fbf9d00762c4edb21f8fd5ba7e9c02b94102b6","raw":{"nineslice_size":2,"base_size":[6,6]},"existingWholeFiles":[]}],["search",328,"f7981e0ddec7fa63165ce4ecc7530800be9083232325fc580688cc10e6e29e49",[16,16],"src/assets/gui-icons/search.png",null],["scrollTrack",70,"eab268e0814cb9db1e2c8e158cea2d54a9b5f07fe0b7b74f82d5a67fa32cc6be",[1,1],"src/assets/document-viewer/ScrollRail.png",{"path":"resource_pack/textures/ui/ScrollRail.json","bytes":60,"sha256":"384aa89ff2d02cd552f6d7913fa5d35337570cb4475934b563846bcb2cd7c7f6","raw":{"nineslice_size":1,"base_size":[1,1]},"existingWholeFiles":["src/assets/document-viewer/ScrollRail.json","src/assets/document-viewer/touchScrollBox.json","src/assets/player-permissions/ScrollRail.json","src/assets/player-permissions/touchScrollBox.json","src/assets/server-forms/list_item_divider_line_light.json"]}],["scrollThumb",89,"f5e26f4b26c2edadd36e8a8bec2018b86558525f9920168d8d2c277bd210f46a",[3,5],"src/assets/document-viewer/ScrollHandle.png",{"path":"resource_pack/textures/ui/ScrollHandle.json","bytes":91,"sha256":"08856911c52b8d9e90c4906df474bf3785813187971a0d2b57b0d3a7e82c4a77","raw":{"nineslice_size":[1,2,1,2],"base_size":[3,5]},"existingWholeFiles":["src/assets/document-viewer/ScrollHandle.json","src/assets/player-permissions/ScrollHandle.json"]}],["touchScrollThumb",863,"86743f082bc3cdfbe4971aad9491069f4338576ec6ad9a23dddac614d5148efe",[1,1],"src/assets/document-viewer/touchScrollBox.png",{"path":"resource_pack/textures/ui/touchScrollBox.json","bytes":60,"sha256":"384aa89ff2d02cd552f6d7913fa5d35337570cb4475934b563846bcb2cd7c7f6","raw":{"nineslice_size":1,"base_size":[1,1]},"existingWholeFiles":["src/assets/document-viewer/ScrollRail.json","src/assets/document-viewer/touchScrollBox.json","src/assets/player-permissions/ScrollRail.json","src/assets/player-permissions/touchScrollBox.json","src/assets/server-forms/list_item_divider_line_light.json"]}],["reader",229,"afdb8dbfda225fd18bf4feee56ba775377df4b23a9b6f6f97a93b2e6710c5ea2",[19,19],"src/assets/npc/immersive_reader.png",null],["screenBackground",80,"e612514247e30fdaf71b8ab025ca2162c2ac18816b648b73c4ac7a1f441d13ab",[1,1],"src/assets/player-permissions/screen_background.png",{"path":"resource_pack/textures/ui/screen_background.json","bytes":60,"sha256":"0c675190fa587a78c4c1ba6f133668bb487f4ceb8f82c84781cabfafdac02e1c","raw":{"nineslice_size":0,"base_size":[1,1]},"existingWholeFiles":["src/assets/player-permissions/screen_background.json"]}],["lightNormal",131,"313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376",[4,4],"src/assets/document-viewer/button_borderless_light.png",{"path":"resource_pack/textures/ui/button_borderless_light.json","bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"]}],["lightHover",85,"e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8",[4,4],"src/assets/document-viewer/button_borderless_lighthover.png",{"path":"resource_pack/textures/ui/button_borderless_lighthover.json","bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"]}],["lightPressed",84,"47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983",[4,4],"src/assets/document-viewer/button_borderless_lightpressed.png",{"path":"resource_pack/textures/ui/button_borderless_lightpressed.json","bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"]}]];
assert.deepEqual(ugcReaderManifest.resources.map(asset=>[asset.key,asset.bytes,asset.sha256,asset.dimensions,asset.existingDestination,asset.metadata]),expectedUgcReaderResources,'Pinned complete21 original material identities and16 raw metadata clauses.');
const ugcUrls=new Map([...packedUgcReaderMarkup.replaceAll('&quot;','"').matchAll(/--mc-ugc-([A-Za-z0-9]+):url\\("([^"]+)"\\)/g)].map(match=>[match[1],match[2]]));
const readerUrls=new Map([...packedImmersiveReaderMarkup.replaceAll('&quot;','"').matchAll(/--mc-reader-([A-Za-z0-9]+):url\\("([^"]+)"\\)/g)].map(match=>[match[1],match[2]]));
const actualUgcReaderKeys=new Set([...ugcUrls.keys(),...readerUrls.keys()]);
assert.deepEqual([...actualUgcReaderKeys].sort(),ugcReaderManifest.resources.map(asset=>asset.key).sort());
assert.equal(readerUrls.size,9);
const ugcReaderBundle=await readFile(new URL('dist/index.js',packageRoot),'utf8');
const ugcReaderInlineBodies=[...ugcReaderBundle.matchAll(/data:image[/]png;base64,([A-Za-z0-9+/=]+)/g)].map(match=>Buffer.from(match[1],'base64'));
let ugcReaderPhysical=0,ugcReaderEmbedded=0,ugcReaderMetadata=0;
for(const asset of ugcReaderManifest.resources){
 const runtime=await storageReadUrl(ugcUrls.get(asset.key)??readerUrls.get(asset.key));
 assert.equal(runtime.length,asset.bytes,asset.key);assert.equal(createHash('sha256').update(runtime).digest('hex'),asset.sha256,asset.key);
 assert.deepEqual([runtime.readUInt32BE(16),runtime.readUInt32BE(20)],asset.dimensions,asset.key);
 for(const scope of asset.scope){const map=scope==='ugc'?ugcUrls:readerUrls;assert(map.has(asset.key),'Installed original is available to its source family: '+scope+'/'+asset.key);assert.deepEqual(await storageReadUrl(map.get(asset.key)),runtime);}
 assert.equal(asset.physicalNewFiles,0);assert.equal(asset.proposedNewPhysicalPNG,false);
 if(asset.existingDestination){ugcReaderPhysical++;assert.deepEqual(await checkStorageFile(asset,asset.existingDestination),runtime);}
 else{
  ugcReaderEmbedded++;assert(ugcReaderInlineBodies.some(body=>body.equals(runtime)),'Existing workstation whole image stays embedded byte-identically: '+asset.key);
  const cssMatches=asset.embeddedWholeBodies.filter(match=>match.path.endsWith('.css'));assert(cssMatches.length>0);
  for(const match of cssMatches){
   const css=await readFile(new URL(match.path.replace(/^src[/]/,'dist/'),packageRoot),'utf8');
   assert(css.includes(match.cssVariable+':'));
   assert([...css.matchAll(/data:image[/]png;base64,([A-Za-z0-9+/=]+)/g)].some(found=>Buffer.from(found[1],'base64').equals(runtime)),'Existing CSS whole-body identity: '+asset.key);
  }
 }
 if(asset.metadata){
  ugcReaderMetadata++;
  for(const file of asset.metadata.existingWholeFiles)await checkStorageFile(asset.metadata,file);
  // The two embedded-only edit-box originals have no separate metadata file;
  // their exact source metadata SHA and literal fields are pinned above.
 }
}
assert.equal(ugcReaderPhysical,19);assert.equal(ugcReaderEmbedded,2);assert.equal(ugcReaderMetadata,16);
const ugcReaderLicense=await readFile(new URL(ugcReaderManifest.license.existingPath.replace(/^src[/]/,'dist/'),packageRoot));
assert.equal(ugcReaderLicense.length,ugcReaderManifest.license.bytes);assert.equal(createHash('sha256').update(ugcReaderLicense).digest('hex'),ugcReaderManifest.license.sha256);
assert.deepEqual(ugcReaderManifest.missing.map(asset=>asset.key),['imageFrameWhite','readerBookAnimation']);
assert(!actualUgcReaderKeys.has('imageFrameWhite')&&!actualUgcReaderKeys.has('readerBookAnimation'),'Missing resources are caller seams, not library defaults.');

// Portfolio's private23-key registry retains whole original assets and raw metadata.
for(const internal of ['portfolioAssets','PortfolioSkin'])assert(!Object.hasOwn(ui,internal),'Portfolio helpers and resource maps are private: '+internal);
const portfolioManifest=JSON.parse(await readFile(new URL('docs/portfolio-assets.json',packageRoot),'utf8'));
assert.equal(portfolioManifest.source.archiveSHA256,'d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf');
assert.deepEqual(portfolioManifest.counts,{semanticKeys:23,wholePNG:23,physicalExistingPNG:16,embeddedOnlyPNG:1,newPhysicalPNG:6,rawMetadata:12,newPhysicalMetadata:2,newLicenseFiles:1,newPhysicalFiles:9});
const expectedPortfolioResources=[["book_binding",97,"a8aa7c69d1916831f315143b231c0a75c3e8ed37885b3e02c5ac6d07d1c3b513",[5,2],"src/assets/portfolio/book_binding.png",null,"new-whole-original-physical",{"bytes":91,"sha256":"00a184d61eaec29f001c440a8af9a44e20182bf9270af8a8d467fdbb10c927d0","raw":{"nineslice_size":[0,0,0,1],"base_size":[5,2]},"existingWholeFiles":[],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/book_binding.json","destination":"src/assets/portfolio/book_binding.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/book_binding.json"}],["book_frame",635,"161556489468a5f8d2040c03ca3ec9fffe849196e73243d1371c703fc6b01036",[42,42],"src/assets/portfolio/book_frame.png",null,"new-whole-original-physical",{"bytes":63,"sha256":"4ff7e55ca1035bae25e749e7104fc55a7d08bdcb00d316b179ce3d35d0956ead","raw":{"nineslice_size":21,"base_size":[42,42]},"existingWholeFiles":[],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/book_frame.json","destination":"src/assets/portfolio/book_frame.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/book_frame.json"}],["book_spine",97,"574abad8bc565244e99d69a522ef8c9cd030604fc6b52d08e773c2c4fb0c50ba",[8,1],null,"src/assets/book/book_spine.png","existing-whole-original-physical",{"bytes":76,"sha256":"86694989347928ead15ba47f2e912dc1cfbbd999aa963c543cb010289ae648a7","raw":{"nineslice_size":[4,1,4,1],"base_size":[8,2]},"existingWholeFiles":["src/assets/book/book_spine.json"],"physicalBaseMismatch":true,"path":"resource_pack/textures/ui/book_spine.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/book_spine.json"}],["book_trash_default",182,"ebadf8235a65ee290c18a862c538b6700f67ac65a480576d7853fda57ad19671",[16,16],null,"src/assets/book/book_trash_default.png","existing-whole-original-physical",null],["close_button_default",163,"5160569f357e661d38495b3f84c89f84b30cc6fdd87c796b65f457cae529054c",[15,15],null,"src/assets/book/close_button_default.png","existing-whole-original-physical",null],["close_button_hover",164,"16c89ba672607da0c452dacc79129f8eee995555bd061f51a1cb5bbab57bb877",[15,15],null,"src/assets/book/close_button_hover.png","existing-whole-original-physical",null],["close_button_pressed",1416,"9abf4fcaf21fbbfa09ee1aeb8599288d5a781b57b08b3e4b2848b54cb217aa03",[15,15],null,"src/assets/book/close_button_pressed.png","existing-whole-original-physical",null],["photo_corner_bl",148,"8b30ce01626375e38c1930ff81428d52918b426b391c40b4dd46d5efca812868",[19,19],"src/assets/portfolio/photo_corner_bl.png",null,"new-whole-original-physical",null],["photo_corner_br",157,"fbb5480c38cbf14b279d934a3865ca6950706a2f678d9d2fc4214464e4f108aa",[19,19],"src/assets/portfolio/photo_corner_br.png",null,"new-whole-original-physical",null],["photo_corner_tl",162,"1b0073035aca07f2bfbd29490d978439f1c41e7f81b17c924eeb0a367b915575",[19,19],"src/assets/portfolio/photo_corner_tl.png",null,"new-whole-original-physical",null],["photo_corner_tr",151,"93a5705968503ccbab8936f3699813c844d8af99999cf3312630a4bc64c16372",[19,19],"src/assets/portfolio/photo_corner_tr.png",null,"new-whole-original-physical",null],["trash_hover",179,"3fa17ecc575f5f0c940e6f5ec1c6be71841ab285b17f9010dac2671ee14d8547",[16,16],null,"src/assets/book/trash_hover.png","existing-whole-original-physical",null],["trash_pressed",186,"cd3d86db98985b34f6b0834f3e18fbcdbbbac2a0588775f26af76eb4d0f72d55",[16,16],null,"src/assets/book/trash_pressed.png","existing-whole-original-physical",null],["button_borderless_light",131,"313b607889ba3d224cf599420087876ccb3f4572b304dc1ba6c25825f7d2c376",[4,4],null,"src/assets/document-viewer/button_borderless_light.png","existing-whole-original-physical",{"bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/button_borderless_light.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/button_borderless_light.json"}],["button_borderless_lighthover",85,"e4cdc816ebbfae2bea1e870fbde0c59effd680cdec388ba1e66424645573aea8",[4,4],null,"src/assets/document-viewer/button_borderless_lighthover.png","existing-whole-original-physical",{"bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/button_borderless_lighthover.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/button_borderless_lighthover.json"}],["button_borderless_lightpressed",84,"47f6ed1760ae8e407cdbb6b7207a5ee45b8a0db861f16f0696c5cf61c9961983",[4,4],null,"src/assets/document-viewer/button_borderless_lightpressed.png","existing-whole-original-physical",{"bytes":60,"sha256":"622158df366964d9ddeac5ed9938a43522da68d02c060335b853c9730103ad65","raw":{"nineslice_size":1,"base_size":[4,4]},"existingWholeFiles":["src/assets/book/book_texteditbox_hover.json","src/assets/document-viewer/banners_no_border.json","src/assets/document-viewer/button_borderless_light.json","src/assets/document-viewer/button_borderless_lighthover.json","src/assets/document-viewer/button_borderless_lightpressed.json","src/assets/document-viewer/button_borderless_lightpressednohover.json","src/assets/emote-wheel/button_borderless_light.json","src/assets/emote-wheel/button_borderless_lighthover.json","src/assets/emote-wheel/button_borderless_lightpressed.json","src/assets/player-permissions/Banners.json","src/assets/player-permissions/button_borderless_dark.json","src/assets/player-permissions/button_borderless_darkhover.json","src/assets/player-permissions/button_borderless_darkpressed.json","src/assets/player-permissions/button_borderless_darkpressednohover.json","src/assets/player-permissions/button_borderless_light.json","src/assets/player-permissions/button_borderless_lighthover.json","src/assets/player-permissions/button_borderless_lightpressed.json","src/assets/player-permissions/button_borderless_lightpressednohover.json","src/assets/player-permissions/text_label_box.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/button_borderless_lightpressed.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/button_borderless_lightpressed.json"}],["disabledButtonNoBorder",88,"5a04f3b69f14cd1750b6c818310964e91f4962afc38cfe7bef41ad3c0fb4b27f",[2,2],null,"src/assets/document-viewer/disabledButtonNoBorder.png","existing-whole-original-physical",{"bytes":60,"sha256":"97fdfacd4bf3d22a981aceec2cbc74876d7f9166f34064b6ecbdf293de1b7989","raw":{"nineslice_size":1,"base_size":[2,2]},"existingWholeFiles":["src/assets/document-viewer/disabledButtonNoBorder.json","src/assets/document-viewer/permissions_player_fade_overlay.json","src/assets/emote-wheel/Black.json","src/assets/emote-wheel/disabledButtonNoBorder.json","src/assets/jigsaw/control.json","src/assets/player-permissions/disabledButtonNoBorder.json","src/assets/player-permissions/permissions_player_fade_overlay.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/disabledButtonNoBorder.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/disabledButtonNoBorder.json"}],["focus_border_white",105,"bbf995d02bd710bed1ffef07d128e140e57b018d37ed34e050a995f1c500a5d8",[5,5],null,"src/assets/document-viewer/focus_border_white.png","existing-whole-original-physical",{"bytes":60,"sha256":"d41fce86c98c18b03d8cb349ea5b50e4648c0cbf4b739b2ad7b6d236a83b3407","raw":{"nineslice_size":1,"base_size":[5,5]},"existingWholeFiles":["src/assets/document-viewer/focus_border_white.json","src/assets/emote-wheel/focus_border_white.json","src/assets/player-permissions/focus_border_white.json","src/assets/player-permissions/square_image_border_white.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/focus_border_white.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/focus_border_white.json"}],["immersive_reader",229,"afdb8dbfda225fd18bf4feee56ba775377df4b23a9b6f6f97a93b2e6710c5ea2",[19,19],null,"src/assets/npc/immersive_reader.png","existing-whole-original-physical",null],["edit_box_indent",126,"c4968ec9277dcdd363c28c1338a6e202d15f8464c14331fddb9c5014c9eaa109",[6,6],null,null,"existing-whole-original-embedded",{"bytes":60,"sha256":"77d81df6c51e2edc8a4fb4ffe6fbf9d00762c4edb21f8fd5ba7e9c02b94102b6","raw":{"nineslice_size":2,"base_size":[6,6]},"existingWholeFiles":[],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/edit_box_indent.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/edit_box_indent.json"}],["ScrollRail",70,"eab268e0814cb9db1e2c8e158cea2d54a9b5f07fe0b7b74f82d5a67fa32cc6be",[1,1],null,"src/assets/document-viewer/ScrollRail.png","existing-whole-original-physical",{"bytes":60,"sha256":"384aa89ff2d02cd552f6d7913fa5d35337570cb4475934b563846bcb2cd7c7f6","raw":{"nineslice_size":1,"base_size":[1,1]},"existingWholeFiles":["src/assets/document-viewer/ScrollRail.json","src/assets/document-viewer/touchScrollBox.json","src/assets/player-permissions/ScrollRail.json","src/assets/player-permissions/touchScrollBox.json","src/assets/server-forms/list_item_divider_line_light.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/ScrollRail.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/ScrollRail.json"}],["ScrollHandle",89,"f5e26f4b26c2edadd36e8a8bec2018b86558525f9920168d8d2c277bd210f46a",[3,5],null,"src/assets/document-viewer/ScrollHandle.png","existing-whole-original-physical",{"bytes":91,"sha256":"08856911c52b8d9e90c4906df474bf3785813187971a0d2b57b0d3a7e82c4a77","raw":{"nineslice_size":[1,2,1,2],"base_size":[3,5]},"existingWholeFiles":["src/assets/document-viewer/ScrollHandle.json","src/assets/player-permissions/ScrollHandle.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/ScrollHandle.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/ScrollHandle.json"}],["touchScrollBox",863,"86743f082bc3cdfbe4971aad9491069f4338576ec6ad9a23dddac614d5148efe",[1,1],null,"src/assets/document-viewer/touchScrollBox.png","existing-whole-original-physical",{"bytes":60,"sha256":"384aa89ff2d02cd552f6d7913fa5d35337570cb4475934b563846bcb2cd7c7f6","raw":{"nineslice_size":1,"base_size":[1,1]},"existingWholeFiles":["src/assets/document-viewer/ScrollRail.json","src/assets/document-viewer/touchScrollBox.json","src/assets/player-permissions/ScrollRail.json","src/assets/player-permissions/touchScrollBox.json","src/assets/server-forms/list_item_divider_line_light.json"],"physicalBaseMismatch":false,"path":"resource_pack/textures/ui/touchScrollBox.json","fixedURL":"https://raw.githubusercontent.com/Mojang/bedrock-samples/15701fa9c13923f12662984c32c124327e40e3d3/resource_pack/textures/ui/touchScrollBox.json"}]];
assert.deepEqual(portfolioManifest.resources.map(asset=>[asset.key,asset.bytes,asset.sha256,asset.dimensions,asset.destination??null,asset.existingDestination??null,asset.delivery,asset.metadata??null]),expectedPortfolioResources,'Pinned23 whole Portfolio materials, including physical/base mismatch and raw metadata.');
const expectedPortfolioNewFiles=[{"path":"src/assets/portfolio/book_binding.png","bytes":97,"sha256":"a8aa7c69d1916831f315143b231c0a75c3e8ed37885b3e02c5ac6d07d1c3b513"},{"path":"src/assets/portfolio/book_binding.json","bytes":91,"sha256":"00a184d61eaec29f001c440a8af9a44e20182bf9270af8a8d467fdbb10c927d0"},{"path":"src/assets/portfolio/book_frame.png","bytes":635,"sha256":"161556489468a5f8d2040c03ca3ec9fffe849196e73243d1371c703fc6b01036"},{"path":"src/assets/portfolio/book_frame.json","bytes":63,"sha256":"4ff7e55ca1035bae25e749e7104fc55a7d08bdcb00d316b179ce3d35d0956ead"},{"path":"src/assets/portfolio/photo_corner_bl.png","bytes":148,"sha256":"8b30ce01626375e38c1930ff81428d52918b426b391c40b4dd46d5efca812868"},{"path":"src/assets/portfolio/photo_corner_br.png","bytes":157,"sha256":"fbb5480c38cbf14b279d934a3865ca6950706a2f678d9d2fc4214464e4f108aa"},{"path":"src/assets/portfolio/photo_corner_tl.png","bytes":162,"sha256":"1b0073035aca07f2bfbd29490d978439f1c41e7f81b17c924eeb0a367b915575"},{"path":"src/assets/portfolio/photo_corner_tr.png","bytes":151,"sha256":"93a5705968503ccbab8936f3699813c844d8af99999cf3312630a4bc64c16372"},{"path":"src/assets/portfolio/LICENSE.md","bytes":222,"sha256":"ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d"}];
assert.deepEqual((await readdir(new URL('dist/assets/portfolio/',packageRoot))).sort(),expectedPortfolioNewFiles.map(asset=>asset.path.split('/').at(-1)).sort(),'Only six approved PNGs, two raw metadata files and original license enter the Portfolio bank.');
for(const file of expectedPortfolioNewFiles)await checkStorageFile(file,file.path);
const portfolioMarkup=[packedPortfolioMarkup,packedPortfolioPhotoMarkup,packedPortfolioPickerMarkup].join('\\n').replaceAll('&quot;','"').replaceAll('&amp;','&');
const portfolioURLs=[...portfolioMarkup.matchAll(/(?:src="([^"]+)"|url\\("([^"]+)"\\))/g)].map(match=>match[1]??match[2]);
const portfolioRuntimeBodies=[];
for(const url of new Set(portfolioURLs))if(url.startsWith('data:image/png;base64,')||url.startsWith('file:'))portfolioRuntimeBodies.push(await storageReadUrl(url));
let portfolioNewPNG=0,portfolioExistingPNG=0,portfolioEmbeddedPNG=0,portfolioRawMetadata=0;
for(const asset of portfolioManifest.resources){
 const file=asset.destination??asset.existingDestination;
 let bytes;
 if(file){bytes=await checkStorageFile(asset,file);if(asset.destination)portfolioNewPNG++;else portfolioExistingPNG++;}
 else{portfolioEmbeddedPNG++;bytes=ugcReaderInlineBodies.find(body=>createHash('sha256').update(body).digest('hex')===asset.sha256);assert(bytes,'Existing full embedded Portfolio material remains in the actual bundle: '+asset.key);assert.equal(asset.existingExpression,'ugcReaderAssets.editNormal.url');}
 assert.equal(bytes.length,asset.bytes);assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],asset.dimensions);
 if(['book_frame','book_binding','book_spine','photo_corner_bl','photo_corner_br','photo_corner_tl','photo_corner_tr'].includes(asset.key))assert(portfolioRuntimeBodies.some(body=>body.equals(bytes)),'Actual Portfolio SSR image material URL resolves to whole original: '+asset.key);
 if(asset.metadata){portfolioRawMetadata++;const metadata=asset.metadata;for(const path of [...metadata.existingWholeFiles,...(metadata.destination?[metadata.destination]:[])]){const raw=await checkStorageFile(metadata,path);assert.deepEqual(JSON.parse(raw.toString('utf8')),metadata.raw);}if(!metadata.destination&&!metadata.existingWholeFiles.length)assert.equal(asset.key,'edit_box_indent','Only an existing embedded-only edit indent has no physical metadata file.');}
}
assert.equal(portfolioNewPNG,6);assert.equal(portfolioExistingPNG,16);assert.equal(portfolioEmbeddedPNG,1);assert.equal(portfolioRawMetadata,12);
const portfolioSpine=portfolioManifest.resources.find(asset=>asset.key==='book_spine');assert.deepEqual(portfolioSpine.dimensions,[8,1]);assert.deepEqual(portfolioSpine.metadata.raw.base_size,[8,2]);assert.equal(portfolioSpine.metadata.physicalBaseMismatch,true);
assert.deepEqual(portfolioManifest.missingTextures.map(asset=>asset.path),["resource_pack/textures/ui/portfolio_convertpicture_default","resource_pack/textures/ui/portfolio_convertpicture_hover","resource_pack/textures/ui/portfolio_convertpicture_pressed","resource_pack/textures/ui/portfolio_pageleft_default","resource_pack/textures/ui/portfolio_pageleft_hover","resource_pack/textures/ui/portfolio_pageleft_pressed","resource_pack/textures/ui/portfolio_pageright_default","resource_pack/textures/ui/portfolio_pageright_hover","resource_pack/textures/ui/portfolio_pageright_pressed"]);
assert(portfolioManifest.missingTextures.every(asset=>asset.requiredHostResource&&!asset.generatedOrAliasedDefault&&asset.allExtensionVariants.length===0&&asset.casefoldPNGs.length===0));
assert.deepEqual(portfolioManifest.dormantDefinitionsNotBundled.map(asset=>asset.texture),['textures/ui/header_bar']);
assert(!portfolioManifest.resources.some(asset=>/portfolio_pageleft|portfolio_pageright|portfolio_convertpicture|header_bar|White$/.test(asset.key)),'Missing and dormant source art does not become a fabricated default.');
const portfolioLicense=await checkStorageFile(portfolioManifest.license,portfolioManifest.license.path);assert.equal(portfolioLicense.length,222);assert.equal(createHash('sha256').update(portfolioLicense).digest('hex'),'ca18c0dede68ce24ea1cd6f9df0813579b6f9f979787983a50baec99345f975d');

const startAssets=JSON.parse(await readFile(new URL('docs/start-menu-assets.json',packageRoot),'utf8'));
assert.equal(startAssets.resources.length,37);assert.equal(startAssets.missing.length,6);
assert(!Object.hasOwn(ui,'startMenuAssets'),'Private Start image registry must not be a root export.');
for(const resource of [...startAssets.referencedWholeFiles,{path:startAssets.license.destination,sha256:startAssets.license.sha256,bytes:startAssets.license.bytes}]){
 const relative=resource.path.replace(/^src[/]/,'dist/');const bytes=await readFile(new URL(relative,packageRoot));
 assert.equal(bytes.length,resource.bytes,relative);assert.equal(createHash('sha256').update(bytes).digest('hex'),resource.sha256,relative);
}
assert(startAssets.resources.find(resource=>resource.key==='title').dimensions.join('x')==='1937x333');
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
  assert(imageSource.startsWith('data:image/png;base64,'),'Published GuiIcon URL must survive dependency relocation.');
  assert.equal(createHash('sha256').update(Buffer.from(imageSource.slice('data:image/png;base64,'.length),'base64')).digest('hex'),asset.sha256,'Consumer GuiIcon URL: '+name);
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
  const command=ui.createNpcEntity({...npcEntityOptions,skin:selected});
  assert(command.texture.startsWith('data:image/png;base64,'),'Installed NPC URL is an absolute original-byte image, independent of the optimized JavaScript location.');
  const bytes=Buffer.from(command.texture.slice('data:image/png;base64,'.length),'base64');assert.equal(bytes.length,skin.bytes);
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
import { Portfolio, PortfolioPhoto, PortfolioCaptionField, PortfolioPickerItem, PortfolioPageTurnButton, PortfolioPicker } from 'mcbeui';
import type { PortfolioSide, PortfolioLeaf, PortfolioBindings, PortfolioLayoutResolution, PortfolioAction, PortfolioActionTarget, PortfolioActionDetail, PortfolioLeafCaptionDetail, PortfolioLabels, PortfolioProps, PortfolioImageSource, PortfolioStateImages, PortfolioCaptionChangeDetail, PortfolioCaptionFieldProps, PortfolioPhotoProps, PortfolioPickDetail, PortfolioPickerItemProps, PortfolioPageDirection, PortfolioPageTurnDetail, PortfolioPageTurnButtonProps, PortfolioPickerCell, PortfolioPickerRow, PortfolioPickerActionDetail, PortfolioPickerProps } from 'mcbeui';
const consumerPortfolioImage:PortfolioImageSource={src:'/host-whole.png',sourceSize:[128,128],alt:'Host photo',nativeProps:{onLoad:event=>{const image:HTMLImageElement=event.currentTarget;return image.naturalWidth;}}};
const consumerPortfolioFrame:PortfolioImageSource={src:'/host-transparent-frame.png',sourceSize:[5,5]};
const consumerPortfolioStates:PortfolioStateImages={normal:consumerPortfolioImage,hover:consumerPortfolioImage,pressed:consumerPortfolioImage};
const consumerPortfolioSide:PortfolioSide='left';
const consumerPortfolioLeaf:PortfolioLeaf={id:'__proto__',image:consumerPortfolioImage,caption:'Accepted text',captionEnabled:true,captionColor:'#123456',visible:true};
const consumerPortfolioBindings:PortfolioBindings={viewing:true,picking:true,previousVisible:true,nextVisible:true,leftPhotoVisible:true,rightPhotoVisible:false,exportVisible:true,noPhotosAlertVisible:false};
const consumerPortfolioLayout:PortfolioLayoutResolution={kind:'nominal',readerButtonSize:[20,20]};
const consumerPortfolioAction:PortfolioAction='delete-left';
const consumerPortfolioTarget:PortfolioActionTarget='button.portfolio_delete_photo_left';
const consumerPortfolioLabels:PortfolioLabels={title:'Portfolio',previous:'Previous',next:'Next',close:'Close',deleteLeft:'Delete left',deleteRight:'Delete right',convertLeft:'Convert left',convertRight:'Convert right',add:'Add',export:'Export',reader:'Read captions',captionLeft:'Left caption',captionRight:'Right caption',captionPlaceholder:'Caption',noPhotos:'No photos'};
const consumerPortfolioCaptionChange=(value:string,detail:PortfolioCaptionChangeDetail)=>{const input:HTMLTextAreaElement=detail.input;const owner:HTMLTextAreaElement=detail.event.currentTarget;return value+input.value+owner.id;};
const consumerPortfolioCaption:PortfolioCaptionFieldProps={label:'Caption',placeholder:'Add caption',value:'Accepted',textColor:'#234567',onValueChange:consumerPortfolioCaptionChange,containerRef:createRef<HTMLDivElement>(),onChange:event=>{const input:HTMLTextAreaElement=event.currentTarget;return input.selectionStart;},onCompositionStart:event=>event.currentTarget.value};
const consumerPortfolioPhoto:PortfolioPhotoProps={image:consumerPortfolioImage,frameMaterial:consumerPortfolioFrame,caption:<PortfolioCaptionField {...consumerPortfolioCaption}/>,onClick:event=>{const owner:HTMLDivElement=event.currentTarget;return owner.id;}};
const consumerPortfolioPick=(detail:PortfolioPickDetail)=>{const owner:HTMLButtonElement=detail.event.currentTarget;return detail.target+detail.itemId+owner.id+detail.image?.sourceSize[0];};
const consumerPortfolioItem:PortfolioPickerItemProps={itemId:'__proto__',label:'Screenshot',image:consumerPortfolioImage,frameMaterial:consumerPortfolioFrame,onPick:consumerPortfolioPick,containerRef:createRef<HTMLDivElement>(),onClick:event=>{const button:HTMLButtonElement=event.currentTarget;event.preventDefault();return button.disabled;}};
const consumerPortfolioDirection:PortfolioPageDirection='previous';
const consumerPortfolioTurn=(detail:PortfolioPageTurnDetail)=>{const owner:HTMLButtonElement=detail.event.currentTarget;return detail.direction+detail.target+owner.id;};
const consumerPortfolioTurnProps:PortfolioPageTurnButtonProps={direction:consumerPortfolioDirection,label:'Previous',materials:consumerPortfolioStates,readOnly:true,onTurn:consumerPortfolioTurn};
const consumerPortfolioCell:PortfolioPickerCell={id:'__proto__',label:'Screenshot',visible:true,image:consumerPortfolioImage};
const consumerPortfolioRow:PortfolioPickerRow={id:'caller-row',cells:[consumerPortfolioCell],dividerVisible:true};
const consumerPortfolioPickerAction=(detail:PortfolioPickerActionDetail)=>{const owner:HTMLButtonElement=detail.event.currentTarget;return detail.target+owner.id+(detail.action==='pick'?detail.rowId+detail.itemId+detail.columnIndex:'close');};
const consumerPortfolioPicker:PortfolioPickerProps={rows:[consumerPortfolioRow],frameMaterial:consumerPortfolioFrame,dividerMaterial:consumerPortfolioImage,headerLabel:'Inventory',headerHeight:12,noPhotosAlertVisible:false,emptyLabel:'No screenshots',onAction:consumerPortfolioPickerAction,viewportRef:createRef<HTMLDivElement>(),itemRefs:{['__proto__']:createRef<HTMLButtonElement>()},itemContainerRefs:{['__proto__']:createRef<HTMLDivElement>()},closeRef:createRef<HTMLButtonElement>(),viewportProps:{onScroll:event=>{const viewport:HTMLDivElement=event.currentTarget;return viewport.scrollTop;}},closeProps:{onClick:event=>event.preventDefault()}};
const consumerPortfolioRequest=(detail:PortfolioActionDetail)=>{const owner:HTMLElement=detail.event.currentTarget;return detail.action+detail.target+owner.id+detail.control.id+detail.leaf?.id;};
const consumerPortfolioLeafCaption=(side:PortfolioSide,value:string,detail:PortfolioLeafCaptionDetail)=>{const input:HTMLTextAreaElement=detail.event.currentTarget;return side+value+detail.binding+detail.leaf.id+input.value;};
const consumerPortfolioProps:PortfolioProps={size:[384,260],layout:consumerPortfolioLayout,bindings:consumerPortfolioBindings,leaves:[consumerPortfolioLeaf,null],pageLabels:['One','Two'],labels:consumerPortfolioLabels,frameMaterial:consumerPortfolioFrame,pageMaterials:{previous:consumerPortfolioStates,next:consumerPortfolioStates},convertMaterials:consumerPortfolioStates,picker:consumerPortfolioPicker,onAction:consumerPortfolioRequest,onCaptionChange:consumerPortfolioLeafCaption,captionRefs:{[consumerPortfolioSide]:createRef<HTMLTextAreaElement>()},captionProps:{left:{onChange:event=>event.currentTarget.selectionStart}},buttonProps:{[consumerPortfolioAction]:{name:consumerPortfolioTarget,onClick:event=>{const button:HTMLButtonElement=event.currentTarget;event.preventDefault();return button.name;}}}};
export const portfolioConsumer=<>
  <Portfolio {...consumerPortfolioProps} ref={createRef<HTMLElement>()}/>
  <Portfolio {...consumerPortfolioProps} layout={{kind:'resolved',contentSize:[320,231],bookSize:[320,207],pageSize:[160,207],bookOffset:[0,-10],footerSize:[320,207],pickerSize:[225,231],readerButtonSize:[22,18]}}/>
  <PortfolioPhoto {...consumerPortfolioPhoto} ref={createRef<HTMLDivElement>()}/>
  <PortfolioCaptionField {...consumerPortfolioCaption} ref={createRef<HTMLTextAreaElement>()}/>
  <PortfolioPickerItem {...consumerPortfolioItem} ref={createRef<HTMLButtonElement>()}/>
  <PortfolioPageTurnButton {...consumerPortfolioTurnProps} ref={createRef<HTMLButtonElement>()}/>
  <PortfolioPicker {...consumerPortfolioPicker} ref={createRef<HTMLDivElement>()}/>
</>;
// @ts-expect-error All source flags are independently required; no viewing/picking enum.
const invalidPortfolioBindings:PortfolioBindings={viewing:true,picking:false};
// @ts-expect-error The reader instance %sm size must be explicitly resolved.
const invalidPortfolioLayout:PortfolioLayoutResolution={kind:'nominal'};
// @ts-expect-error Leaves must explicitly describe both source slots.
const invalidPortfolioLeaves:PortfolioProps={...consumerPortfolioProps,leaves:[consumerPortfolioLeaf]};
// @ts-expect-error The dynamic screenshot frame is required for a photo.
const invalidPortfolioPhoto:PortfolioPhotoProps={image:consumerPortfolioImage};
// @ts-expect-error Caption colour is a dynamic global host binding, not brown by default.
const invalidPortfolioCaption:PortfolioCaptionFieldProps={label:'Caption',placeholder:'Hint',value:'Text'};
// @ts-expect-error Missing original Portfolio arrows have no library material default.
const invalidPortfolioTurn:PortfolioPageTurnButtonProps={direction:'previous',label:'Previous'};
// @ts-expect-error All three caller state images are required.
const invalidPortfolioStates:PortfolioStateImages={normal:consumerPortfolioImage,hover:consumerPortfolioImage};
// @ts-expect-error Picker exact-White resolution must be explicit.
const invalidPortfolioDivider:PortfolioPickerProps={rows:[],frameMaterial:consumerPortfolioFrame,headerLabel:'Inventory',headerHeight:12,noPhotosAlertVisible:false,emptyLabel:'Empty'};
// @ts-expect-error Picker text child-sum height requires explicit resolution.
const invalidPortfolioHeader:PortfolioPickerProps={rows:[],frameMaterial:consumerPortfolioFrame,dividerMaterial:consumerPortfolioImage,headerLabel:'Inventory',noPhotosAlertVisible:false,emptyLabel:'Empty'};
// @ts-expect-error Picker item visibility is an independent source binding.
const invalidPortfolioCell:PortfolioPickerCell={id:'id',label:'Cell'};


import { UGCViewer, UGCItemCard, ImmersiveReader, ImmersiveReaderButton } from 'mcbeui';
import type { UGCImageSource, UGCImageFrameMaterial, UGCItem, UGCActionDetail, UGCActionHandler, UGCItemCardProps, UGCQueryChangeDetail, UGCSearchInputProps, UGCViewerProps, ImmersiveReaderBindings, ImmersiveReaderLabels, ImmersiveReaderPopupLayout, ImmersiveReaderAction, ImmersiveReaderTextAction, ImmersiveReaderActionDetail, ImmersiveReaderActionHandler, ImmersiveReaderNativeButtonProps, ImmersiveReaderButtonProps, ImmersiveReaderProps } from 'mcbeui';
const consumerUGCImage:UGCImageSource={src:'/caller-thumbnail.png',sourceSize:[16,9],alt:'Caller thumbnail',nativeProps:{onLoad:event=>{const image:HTMLImageElement=event.currentTarget;return image.naturalWidth;}}};
const consumerUGCMaterial:UGCImageFrameMaterial={src:'/caller-resolved-White.png',sourceSize:[2,2]};
const consumerUGCItem:UGCItem={id:'__proto__',label:'Caller item',image:consumerUGCImage,labelHeight:10};
const consumerUGCAction:UGCActionHandler=(detail:UGCActionDetail)=>{const current:HTMLElement=detail.event.currentTarget;return detail.target+detail.reason+current.id+detail.item?.id;};
const consumerUGCSearchProps:UGCSearchInputProps={name:'host-query',onChange:event=>{const input:HTMLInputElement=event.currentTarget;return input.value;},onCompositionStart:event=>event.currentTarget.selectionStart};
const consumerUGCQuery=(query:string,detail:UGCQueryChangeDetail)=>{const input:HTMLInputElement=detail.input;const owner:HTMLElement=detail.event.currentTarget;return query+input.value+owner.id;};
const consumerUGCCard:UGCItemCardProps={item:consumerUGCItem,width:100,imageFrameMaterial:consumerUGCMaterial,containerRef:createRef<HTMLDivElement>(),onAction:consumerUGCAction,onClick:event=>{const button:HTMLButtonElement=event.currentTarget;event.preventDefault();return button.name;}};
const consumerUGCProps:UGCViewerProps={title:'Caller UGC',searchLabel:'Search',searchPlaceholder:'Caller placeholder',items:[consumerUGCItem],imageFrameMaterial:consumerUGCMaterial,maxGridItems:1,query:'host',onQueryChange:consumerUGCQuery,onAction:consumerUGCAction,size:[384,234],scale:2,inputMode:'touch',touchThumbVisible:true,minThumbSize:6,searchProps:consumerUGCSearchProps,searchRef:createRef<HTMLInputElement>(),scrollViewportRef:createRef<HTMLDivElement>(),closeRef:createRef<HTMLButtonElement>(),itemRefs:{['__proto__']:createRef<HTMLButtonElement>()},itemContainerRefs:{['__proto__']:createRef<HTMLDivElement>()},modal:true,readOnly:true,onClick:event=>{const root:HTMLElement=event.currentTarget;return root.id;}};
const consumerReaderBindings:ImmersiveReaderBindings={running:false,loading:true,error:true,canRetry:false};
const consumerReaderLabels:ImmersiveReaderLabels={title:'Caller reader',loading:'Caller loading',retry:'Retry',cancel:'Cancel',ok:'OK'};
const consumerReaderPopup:ImmersiveReaderPopupLayout={kind:'child-sum',titleWidth:100};
const consumerReaderAction:ImmersiveReaderAction='activate';
const consumerReaderTextAction:ImmersiveReaderTextAction='retry';
const consumerReaderHandler:ImmersiveReaderActionHandler=(detail:ImmersiveReaderActionDetail)=>{const owner:HTMLElement=detail.event.currentTarget;return detail.target+detail.action+owner.id+detail.control.id+String(detail.bindings?.running);};
const consumerReaderNative:ImmersiveReaderNativeButtonProps={name:'host-reader-retry',onClick:event=>{const button:HTMLButtonElement=event.currentTarget;event.preventDefault();return button.disabled;}};
const consumerReaderButton:ImmersiveReaderButtonProps={label:'Host reader',size:[16,16],scale:2,onActivate:consumerReaderHandler,onClick:consumerReaderNative.onClick};
const consumerReaderProps:ImmersiveReaderProps={size:[400,300],scale:2,contentRect:[0,0,400,300],popupLayout:consumerReaderPopup,bindings:consumerReaderBindings,labels:consumerReaderLabels,errorText:'Caller error',webView:<div data-host="actual-renderer">Caller renderer</div>,loadingVisual:<span>Caller whole visual</span>,webViewRef:createRef<HTMLDivElement>(),buttonRefs:{retry:createRef<HTMLButtonElement>()},buttonProps:{[consumerReaderTextAction]:consumerReaderNative},onAction:consumerReaderHandler,modal:true,onKeyDown:event=>{const root:HTMLDivElement=event.currentTarget;return root.id+event.key;}};
export const ugcReaderConsumer=<>
  <UGCViewer {...consumerUGCProps} ref={createRef<HTMLElement>()}/>
  <UGCItemCard {...consumerUGCCard} ref={createRef<HTMLButtonElement>()}/>
  <ImmersiveReaderButton {...consumerReaderButton} data-host-action={consumerReaderAction} ref={createRef<HTMLButtonElement>()}/>
  <ImmersiveReader {...consumerReaderProps} ref={createRef<HTMLDivElement>()}/>
  <ImmersiveReader {...consumerReaderProps} popupLayout={{kind:'resolved',size:[280,160]}} webView={null} loadingVisual={null}/>
</>;
// @ts-expect-error An unresolved uppercase White material is never supplied implicitly.
const invalidUGCMaterial:UGCViewerProps={title:'UGC',searchLabel:'Search',searchPlaceholder:'Search',items:[],maxGridItems:0};
// @ts-expect-error The controller capacity has no inferred native default.
const invalidUGCCapacity:UGCViewerProps={title:'UGC',searchLabel:'Search',searchPlaceholder:'Search',items:[],imageFrameMaterial:consumerUGCMaterial};
// @ts-expect-error Independent card also requires a whole caller-resolved material.
const invalidUGCCard:UGCItemCardProps={item:consumerUGCItem,width:100};
// @ts-expect-error Native bindings require all four independent source flags.
const invalidReaderBindings:ImmersiveReaderBindings={running:false,loading:true,error:false};
// @ts-expect-error Source popup %c geometry needs an explicit host/Web resolution.
const invalidReaderPopup:ImmersiveReaderProps={size:[400,300],bindings:consumerReaderBindings,webView:null,loadingVisual:null,errorText:'Error'};
// @ts-expect-error A host renderer slot must be supplied explicitly, even when null.
const invalidReaderView:ImmersiveReaderProps={size:[400,300],popupLayout:consumerReaderPopup,bindings:consumerReaderBindings,loadingVisual:null,errorText:'Error'};
// @ts-expect-error Missing book_animation does not produce a default visual.
const invalidReaderLoading:ImmersiveReaderProps={size:[400,300],popupLayout:consumerReaderPopup,bindings:consumerReaderBindings,webView:null,errorText:'Error'};
// @ts-expect-error Arbitrary inferred popup modes are not a public source contract.
const invalidReaderLayout:ImmersiveReaderPopupLayout={kind:'auto'};

import { StorageManagement, StorageToolbar, StorageCategory, StorageItem, StorageItemActions, StorageSelectionFooter, StorageDependencyDialog, StorageSharingProgress, ScreenshotFlash } from 'mcbeui';
import type { StorageControlState, StorageImageSource, StorageLocation, StorageCategoryKind, StorageSignals, StorageAction, StorageToolbarValue, StorageManagementValue, StorageActionDetail, StorageActionHandler, StorageActionControl, StorageItemActionControls, StorageItemMetadata, StorageItemData, StorageMigrationState, StorageCategoryData, StorageMigrationCategoryData, StorageChangeDetail, StorageToolbarOptions, StorageToolbarProps, StorageItemActionsProps, StorageSelectionInputProps, StorageItemProps, StorageCategoryProps, StorageSelectionFooterProps, StorageDependencyGroup, StorageResolvedPopupButton, StorageDependencyDialogProps, StorageSharingProgressProps, StorageManagementProps, ScreenshotFlashTrigger, ScreenshotFlashEasing, ScreenshotFlashControl, ScreenshotFlashImage, ScreenshotFlashFinishedDetail, ScreenshotFlashProps } from 'mcbeui';
const typedStorageState:StorageControlState={included:true,visible:true,enabled:true};
const typedStorageImage:StorageImageSource={src:'/host-storage.png',sourceSize:[16,16],alt:'Caller image'};
const typedStorageLocation:StorageLocation='external';
const typedStorageKind:StorageCategoryKind='world';
const typedStorageSignals:StorageSignals={warning:true,error:false,update:true};
const typedStorageAction:StorageAction='delete-item';
const typedStorageHandler:StorageActionHandler=(detail:StorageActionDetail)=>{const target:HTMLElement=detail.event.currentTarget;return detail.action+detail.target+target.id+String(detail.value?.selectedIds.length);};
const typedStorageControl:StorageActionControl={state:typedStorageState,label:'Host action',target:'button.host',ref:createRef<HTMLButtonElement>(),nativeProps:{onClick:event=>{const button:HTMLButtonElement=event.currentTarget;button.focus();event.preventDefault();}}};
const typedStorageControls:StorageItemActionControls={generateTextureList:typedStorageControl,delete:typedStorageControl,share:typedStorageControl,dependencies:typedStorageControl};
const typedStorageMetadata:StorageItemMetadata={id:'caller-world',name:'Caller world',sizeText:'12 MB',state:typedStorageState,image:typedStorageImage,signals:typedStorageSignals,lockVisible:true};
const typedStorageItem:StorageItemData={...typedStorageMetadata,checkboxVisible:true,optionsVisible:true,optionsModal:true,actions:typedStorageControls};
const typedStorageMigration:StorageMigrationState={sync:typedStorageControl,description:'Host description',conversionDescription:'Host conversion',conversionVisible:false,loadingVisible:true,loadingLabel:'Host loading',loadingFrame:3};
const typedStorageCategory:StorageCategoryData={id:'worlds',kind:'world',label:'Worlds',sizeText:'12 MB',state:typedStorageState,items:[typedStorageItem],signals:typedStorageSignals};
const typedStorageLegacy:StorageMigrationCategoryData&{readonly kind:'legacy-world'}={...typedStorageCategory,id:'legacy',kind:'legacy-world',items:[],migration:typedStorageMigration};
const typedStoragePreview:StorageMigrationCategoryData&{readonly kind:'retail-to-preview-world'}={...typedStorageLegacy,id:'preview',kind:'retail-to-preview-world'};
const typedStorageToolbarValue:StorageToolbarValue={location:typedStorageLocation,multiselect:true};
const typedStorageValue:StorageManagementValue={...typedStorageToolbarValue,expandedIds:['worlds','orphan'],selectedIds:['caller-world','orphan']};
const typedStorageChange=(next:StorageManagementValue,detail:StorageChangeDetail)=>{const current:HTMLElement=detail.event.currentTarget;return next.selectedIds.length+current.childElementCount+detail.field.length;};
const typedStorageOptions:StorageToolbarOptions={state:typedStorageState,location:{state:typedStorageState,label:'Location',externalLabel:'External',appdataLabel:'Application'},clearCache:typedStorageControl,clearLayoutCache:typedStorageControl,clearDownloadCache:typedStorageControl,clearScreenshotsCache:typedStorageControl,deleteLocalScreenshots:typedStorageControl,multiselect:{state:typedStorageState,label:'Select multiple',ref:createRef<HTMLInputElement>()}};
const typedStorageToolbarProps:StorageToolbarProps={...typedStorageOptions,value:typedStorageToolbarValue,onValueChange:(next,detail)=>next.location+detail.event.currentTarget.id,locationRef:createRef<HTMLButtonElement>(),inputMode:'touch',touchThumbVisible:true,minThumbSize:6,onAction:typedStorageHandler};
const typedStorageSelectionProps:StorageSelectionInputProps={'aria-label':'Host item selection',onChange:event=>{const input:HTMLInputElement=event.currentTarget;return input.checked;}};
const typedStorageItemProps:StorageItemProps={item:typedStorageItem,kind:typedStorageKind,selected:true,selectionProps:typedStorageSelectionProps,selectionRef:createRef<HTMLInputElement>(),onSelectedChange:(selected,event)=>String(selected)+event.currentTarget.id,onAction:typedStorageHandler};
const typedStorageCategoryProps:StorageCategoryProps={category:typedStorageCategory,expanded:true,selectedIds:typedStorageValue.selectedIds,onExpandedChange:(next,event)=>String(next)+event.currentTarget.id,onSelectedIdsChange:(ids,id,event)=>ids.join(',')+id+event.currentTarget.id,toggleRef:createRef<HTMLButtonElement>(),itemRefs:{'caller-world':createRef<HTMLDivElement>()},selectionRefs:{'caller-world':createRef<HTMLInputElement>()}};
const typedStorageTrayProps:StorageItemActionsProps={width:300,itemId:'caller-world',controls:typedStorageControls,visible:true,modal:true,onAction:typedStorageHandler};
const typedStorageFooterProps:StorageSelectionFooterProps={visible:true,deleteControl:typedStorageControl,onAction:typedStorageHandler};
const typedStorageGroup:StorageDependencyGroup={id:'dependency',item:typedStorageMetadata,breakLabel:'Used by',dependents:[{...typedStorageMetadata,id:'dependent'}],remove:typedStorageControl};
const typedStoragePopup:StorageResolvedPopupButton={...typedStorageControl,target:'host.resolved_continue',rect:[0,0,150,30]};
const typedStorageDependencyProps:StorageDependencyDialogProps={open:true,frame:[400,300],profile:'desktop',title:'Dependencies',description:'Host description',groups:[typedStorageGroup],continueButton:typedStoragePopup,cancelButton:{...typedStoragePopup,target:'host.resolved_cancel',rect:[170,0,150,30]},continueScrollLabel:'Scroll to continue',continueReady:false,onReachedEndChange:ready=>Boolean(ready),continueScrollRef:createRef<HTMLButtonElement>(),viewportRef:createRef<HTMLDivElement>(),inputMode:'touch',touchThumbVisible:true,minThumbSize:6,onAction:typedStorageHandler};
const typedStorageSharingProps:StorageSharingProgressProps={open:true,frame:[400,300],title:'Sharing',currentLabel:'Current',totalLabel:'Total',progressLabel:'Host progress',progress:.5,button:typedStorageControl,onAction:typedStorageHandler};
const typedStorageManagementProps:StorageManagementProps={size:[400,300],label:'Storage',state:typedStorageState,standardVisible:true,categoryPanelVisible:true,toolbar:typedStorageOptions,categories:[typedStorageCategory],legacyWorlds:typedStorageLegacy,retailToPreviewWorlds:typedStoragePreview,deleteControl:typedStorageControl,value:typedStorageValue,onValueChange:typedStorageChange,onAction:typedStorageHandler,viewportRef:createRef<HTMLDivElement>(),toolbarRef:createRef<HTMLDivElement>(),footerRef:createRef<HTMLDivElement>(),locationRef:createRef<HTMLButtonElement>(),categoryRefs:{worlds:createRef<HTMLElement>()},itemRefs:{'caller-world':createRef<HTMLDivElement>()},selectionRefs:{'caller-world':createRef<HTMLInputElement>()},dependencyDialog:typedStorageDependencyProps,sharingProgress:typedStorageSharingProps,inputMode:'touch',touchThumbVisible:true,minThumbSize:6,readOnly:true};
const typedFlashTrigger:ScreenshotFlashTrigger='host-frame';
const typedFlashEasing:ScreenshotFlashEasing=progress=>progress;
const typedFlashControl:ScreenshotFlashControl={kind:'progress',value:.5};
const typedFlashImage:ScreenshotFlashImage={src:'/runtime-resolved-White.png',sourceSize:[15,15]};
const typedFlashFinished=(detail:ScreenshotFlashFinishedDetail)=>detail.trigger+detail.mode+detail.elapsedMs+String(detail.reducedMotion);
const typedFlashProps:ScreenshotFlashProps={size:[320,180],scale:2,durationMs:500,flashImage:typedFlashImage,trigger:typedFlashTrigger,easing:typedFlashEasing,control:typedFlashControl,onFinished:typedFlashFinished,motion:'animate',onClick:event=>{const node:HTMLDivElement=event.currentTarget;return node.id;}};
export const storageAndScreenshotConsumer=<>
  <StorageManagement {...typedStorageManagementProps} ref={createRef<HTMLElement>()}/>
  <StorageToolbar {...typedStorageToolbarProps} ref={createRef<HTMLDivElement>()}/>
  <StorageCategory {...typedStorageCategoryProps} ref={createRef<HTMLElement>()}/>
  <StorageItem {...typedStorageItemProps} ref={createRef<HTMLDivElement>()}/>
  <StorageItemActions {...typedStorageTrayProps} ref={createRef<HTMLDivElement>()}/>
  <StorageSelectionFooter {...typedStorageFooterProps} ref={createRef<HTMLDivElement>()}/>
  <StorageDependencyDialog {...typedStorageDependencyProps} ref={createRef<HTMLDivElement>()}/>
  <StorageSharingProgress {...typedStorageSharingProps} ref={createRef<HTMLDivElement>()}/>
  <ScreenshotFlash {...typedFlashProps} ref={createRef<HTMLDivElement>()}/>
  <ScreenshotFlash durationMs={0} flashImage={typedFlashImage} size="parent" trigger={null} ref={node=>{if(node)node.dataset.consumer='host';}}/>
  <ScrollArea variant="touch" minThumbSize={6} thumbVisible={false} viewportRef={createRef<HTMLDivElement>()} label="Touch content">Host content</ScrollArea>
  <ScrollBar variant="touch" minThumbSize={6} thumbVisible value={1} max={10} pageSize={5} controls="caller-scroll-content" onValueChange={value=>value.toFixed(0)} label="Touch bar" ref={createRef<HTMLDivElement>()}/>
</>;
// @ts-expect-error A migration branch cannot be given a standard category kind.
const invalidStorageMigration:StorageManagementProps={...typedStorageManagementProps,legacyWorlds:{...typedStorageLegacy,kind:'world'}};
// @ts-expect-error Unrecovered popup target and rectangle are both required host input.
const invalidStoragePopup:StorageResolvedPopupButton={state:typedStorageState,label:'Missing geometry'};
// @ts-expect-error Even with a rectangle, an explicit host-resolved target is required.
const invalidStoragePopupTarget:StorageResolvedPopupButton={state:typedStorageState,label:'Missing target',rect:[0,0,150,30]};
// @ts-expect-error Even with a target, an explicit host-resolved rectangle is required.
const invalidStoragePopupRect:StorageResolvedPopupButton={state:typedStorageState,label:'Missing rectangle',target:'host.target'};
// @ts-expect-error Parent coordinates are already resolved; scale is forbidden.
const invalidParentFlash:ScreenshotFlashProps={size:'parent',scale:2,durationMs:500,flashImage:typedFlashImage,trigger:1};
// @ts-expect-error Source/global files define no duration default.
const invalidFlashDuration:ScreenshotFlashProps={size:[320,180],flashImage:typedFlashImage,trigger:1};
// @ts-expect-error No implicit White material or casefold alias is supplied by the library.
const invalidFlashImage:ScreenshotFlashProps={size:[320,180],durationMs:500,trigger:1};

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

import { StartMenu, StartMenuTitle, StartMenuActionStack, StartMenuAuxiliaryActions, StartMenuProfile, StartMenuFooter } from 'mcbeui';
import type { StartMenuControlState, StartMenuFrame, StartMenuTitleProfile, StartMenuActionId, StartMenuActionDetail, StartMenuActionHandler, StartMenuImageSource, StartMenuButton, StartMenuDynamicBanner, StartMenuButtonArt, StartMenuButtonRow, StartMenuArtButtonRow, StartMenuStoreRow, StartMenuNormalRows, StartMenuNewPlayerRows, StartMenuActionStackProps, StartMenuTitleProps, StartMenuInbox, StartMenuProfileButton, StartMenuGathering, StartMenuAuxiliaryActionsProps, StartMenuPortraitRequest, StartMenuProfileProps, StartMenuFooterProps, StartMenuExternalPopup, StartMenuProps } from 'mcbeui';
const typedStartState:StartMenuControlState={included:true,visible:true,enabled:true};
const typedStartFrame:StartMenuFrame={size:[400,240],scale:2};
const typedStartTitleProfile:StartMenuTitleProfile='win10';
const typedStartImage:StartMenuImageSource={src:'/caller.png',sourceSize:[16,16],alt:'Caller art'};
const typedStartId:StartMenuActionId='play';
const typedStartAction:StartMenuActionHandler=(detail:StartMenuActionDetail)=>detail.target+detail.action+detail.button.tagName+detail.event.currentTarget.tagName;
const typedStartButton:StartMenuButton={state:typedStartState,label:'Caller Play',action:typedStartId,target:'button.host_play',ref:createRef<HTMLButtonElement>(),nativeProps:{onClick:event=>event.preventDefault()}};
const typedStartBanner:StartMenuDynamicBanner={state:typedStartState,image:typedStartImage,insets:[1,2,3,4],text:'Caller banner'};
const typedStartArt:StartMenuButtonArt={state:typedStartState,normalBackground:<span>Caller frame</span>,hoverForeground:<span>Caller hover art</span>,label:'Caller art label'};
const typedStartRow:StartMenuButtonRow={state:typedStartState,button:typedStartButton};
const typedStartArtRow:StartMenuArtButtonRow={...typedStartRow,art:typedStartArt,banner:typedStartBanner};
const typedStartStore:StartMenuStoreRow={...typedStartArtRow,newOffersBadge:{state:typedStartState,label:<span>Caller tag</span>}};
const typedStartNormal:StartMenuNormalRows={play:typedStartArtRow,settings:typedStartRow,store:typedStartStore};
const typedStartNewPlayer:StartMenuNewPlayerRows={trialSpacerIncluded:false,getStarted:typedStartRow,mainMenu:typedStartRow};
const typedStartActions:StartMenuActionStackProps={normal:{state:typedStartState,rows:typedStartNormal},newPlayer:{state:{...typedStartState,visible:false},rows:typedStartNewPlayer},onAction:typedStartAction};
const typedStartTitle:StartMenuTitleProps={...typedStartFrame,profile:typedStartTitleProfile,splash:<span>Caller splash renderer</span>};
const typedStartInbox:StartMenuInbox={button:typedStartButton,iconState:0,animatedBell:<span>Caller animation frame</span>,unread:{state:typedStartState}};
const typedStartProfileButton:StartMenuProfileButton={button:typedStartButton,showGamerpic:true,gamerpic:<span>Caller gamerpic</span>};
const typedStartGathering:StartMenuGathering={state:typedStartState,badge:{state:typedStartState,content:<span>Caller event art</span>},caption:'Caller event',button:typedStartButton};
const typedStartAux:StartMenuAuxiliaryActionsProps={...typedStartFrame,state:typedStartState,gathering:typedStartGathering,upper:{state:typedStartState,signInProfile:'nx-ps',signIn:typedStartButton,gamertag:{state:typedStartState,text:'Caller gamertag'}},lower:{state:typedStartState,inbox:typedStartInbox,profileA:typedStartProfileButton},onAction:typedStartAction};
const typedStartPortrait=(detail:StartMenuPortraitRequest)=>String(detail.deltaX)+detail.phase+detail.event.type;
const typedStartProfile:StartMenuProfileProps={...typedStartFrame,viewer:{state:typedStartState,portrait:{state:typedStartState,content:<span>Caller portrait</span>},onTurnRequest:typedStartPortrait},controls:{state:typedStartState,dressingRoom:{button:typedStartButton,profile:'text'},profileB:typedStartProfileButton}};
const typedStartFooter:StartMenuFooterProps={width:398,copyright:'Caller copyright',version:'Caller version',development:{state:typedStartState,text:'Caller dev'}};
const typedStartPopup:StartMenuExternalPopup={state:typedStartState,title:'Caller confirmation',body:'Caller explanation',close:{state:typedStartState,label:'Close'},externalButton:typedStartButton,backButton:typedStartButton,layout:{panelSize:[230,220],bodyWidth:214},onCloseRequest:event=>event.preventDefault()};
const typedStart:StartMenuProps={...typedStartFrame,label:'Caller Start',visible:true,canQuit:true,title:typedStartTitle,actions:typedStartActions,auxiliary:typedStartAux,profile:typedStartProfile,footer:typedStartFooter,externalPopup:typedStartPopup,onAction:typedStartAction,onExitRequest:event=>event.preventDefault()};
const typedStartParts=<><StartMenu {...typedStart} ref={createRef<HTMLElement>()}/><StartMenuTitle {...typedStartTitle} ref={createRef<HTMLDivElement>()}/><StartMenuActionStack {...typedStartActions} ref={createRef<HTMLDivElement>()}/><StartMenuAuxiliaryActions {...typedStartAux} ref={createRef<HTMLDivElement>()}/><StartMenuProfile {...typedStartProfile} ref={createRef<HTMLDivElement>()}/><StartMenuFooter {...typedStartFooter} ref={createRef<HTMLDivElement>()}/></>;
// @ts-expect-error No platform inference fills in the required title profile.
const missingStartProfile:StartMenuTitleProps={size:[400,240]};
// @ts-expect-error Runtime presentation states remain distinct and explicit.
const incompleteStartState:StartMenuControlState={visible:true};
// @ts-expect-error No unknown engine input enum is accepted as an action id.
const invalidStartAction:StartMenuActionId='automatic';
import { ChalkboardEditor, ChalkboardTextField, ChalkboardLock } from 'mcbeui';
import type { ChalkboardEditorProps, ChalkboardValue, ChalkboardChangeDetail, ChalkboardCloseDetail, ChalkboardTextFieldProps, ChalkboardLockProps, ChalkboardFontMode, ChalkboardTextareaProps, ChalkboardLockInputProps } from 'mcbeui';
const typedBoardValue:ChalkboardValue={text:'Caller text',locked:true};
const typedBoardField:ChalkboardTextFieldProps={size:[264,120],maxLength:37,label:'Caller field',textEnabled:true,value:typedBoardValue.text,fontMode:'unicode' satisfies ChalkboardFontMode,textareaProps:{name:'board',spellCheck:false} satisfies ChalkboardTextareaProps,containerRef:createRef<HTMLDivElement>(),onValueChange:(text,event)=>text+event.currentTarget.value};
const typedBoardLock:ChalkboardLockProps={label:'Caller lock',checked:true,readOnly:true,rootProps:{'aria-label':'Caller lock row'},onCheckedChange:(checked,event)=>String(checked)+event.type};
const typedBoardProps:ChalkboardEditorProps={panelSize:[280,180],textBoxSize:[264,120],maxLength:37,title:'Board',textEnabled:true,lockVisible:true,lockLabel:'Lock',closeVisible:true,value:typedBoardValue,defaultValue:typedBoardValue,textareaRef:createRef<HTMLTextAreaElement>(),lockRef:createRef<HTMLInputElement>(),closeRef:createRef<HTMLButtonElement>(),textFieldRef:createRef<HTMLDivElement>(),lockInputProps:{name:'lock'} satisfies ChalkboardLockInputProps,confirmHint:<span>Host confirm</span>,onValueChange:(next,detail:ChalkboardChangeDetail)=>detail.field==='text'?next.text+detail.event.currentTarget.value:String(next.locked)+detail.event.currentTarget.checked,onCloseRequest:(accepted,detail:ChalkboardCloseDetail)=>accepted.text+detail.reason+detail.event.type};
const typedBoardElements=<><ChalkboardEditor {...typedBoardProps} ref={createRef<HTMLElement>()}/><ChalkboardTextField {...typedBoardField} ref={createRef<HTMLTextAreaElement>()}/><ChalkboardLock {...typedBoardLock} ref={createRef<HTMLInputElement>()}/></>;
// @ts-expect-error textEnabled is an independent required resolved host binding.
const badBoardProps:ChalkboardEditorProps={panelSize:[280,180],textBoxSize:[264,120],maxLength:37,title:'Board',lockVisible:true,lockLabel:'Lock',closeVisible:true};
// @ts-expect-error lock value is boolean, not a server permission string.
const badBoardValue:ChalkboardValue={text:'Caller text',locked:'operator'};
import { OrePlayerPermissions, OrePermissionLevelSelect, OrePermissionToggleRow, OrePlayerCard, OreSwitch } from 'mcbeui';
import type { OrePermissionAppearance, OrePermissionTextLineBox, OrePermissionTextAppearance, OrePermissionPlayer, OrePermissionOption, OrePermissionLevelLabels, OreSwitchProps, OrePermissionToggleRowProps, OrePlayerCardProps, OrePermissionLevelSelectProps, OrePermissionSafeArea, OrePlayerPermissionsLabels, OrePlayerPermissionsProps } from 'mcbeui';
const typedOreAppearance:OrePermissionAppearance={guiScale:1.5,locale:'zh_CN'};
const typedOreLineBox:OrePermissionTextLineBox='fallback';
const typedOreText:OrePermissionTextAppearance={...typedOreAppearance,textLineBox:typedOreLineBox};
// @ts-expect-error The line-box contract is a finite host choice.
const invalidOreText:OrePermissionTextAppearance={textLineBox:'automatic'};
// @ts-expect-error The icon-only switch does not own text line boxes.
const switchTextPolicy:OreSwitchProps={textLineBox:'fallback'};
const typedOrePlayers:readonly OrePermissionPlayer[]=[{id:'ore-alpha',name:'Host name',avatar:<span>Host avatar</span>,avatarSrc:'/host-avatar.png',subtitle:'Host role',levelIcon:<span>Host icon</span>,isHosting:false}];
const typedOreOptions:readonly OrePermissionOption[]=[{id:'build',title:'Build',description:'Host description'}];
const typedOreSafeArea:OrePermissionSafeArea={x:.95,y:.95,positionX:0,positionY:0};
const typedOreLabels:Partial<OrePlayerPermissionsLabels>={title:'Modern permissions',back:undefined};
const typedOreLevelLabels:Partial<OrePermissionLevelLabels>={title:'Role',customDescription:'Host custom policy',visitor:undefined};
const typedOreProps:OrePlayerPermissionsProps={...typedOreAppearance,label:'Modern host permissions',scrollInputMode:'touch',players:typedOrePlayers,permissionOptions:typedOreOptions,viewportSize:[1440,1000] as const,size:[700,700] as const,safeArea:typedOreSafeArea,extraBottomInset:10,selectedPlayerId:'ore-alpha',defaultSelectedPlayerId:null,value:{'ore-alpha':{level:'custom',permissions:{build:true}}},labels:typedOreLabels,levelLabels:typedOreLevelLabels,roleIcons:{custom:<span>Host role art</span>},dropdownIcons:{close:<span>Close</span>,check:<span>Check</span>,chevron:<span>Chevron</span>},toggleIcons:{on:<span>On</span>,off:<span>Off</span>,thumb:<span>Thumb</span>},backIcon:<span>Host back art</span>,disabledLevels:['operator'],canEditPermissions:true,canKickPlayer:true,kickVisible:true,kickEnabled:false,readOnly:true,templateWarning:'Host warning',errorContent:undefined,emptyContent:'No player',playersViewportRef:createRef<HTMLDivElement>(),permissionsViewportRef:createRef<HTMLDivElement>(),playerRefs:{'ore-alpha':createRef<HTMLButtonElement>()},permissionRefs:{build:createRef<HTMLInputElement>()},levelRef:createRef<HTMLDivElement>(),levelTriggerRef:createRef<HTMLButtonElement>(),onSelectedPlayerIdChange:(id,event)=>id+event.type,onValueChange:(next,detail)=>String(next[detail.playerId]?.level)+detail.reason,onBack:event=>event.type,onKickRequest:(player,event)=>player.id+event.type};
const typedOreSelect:OrePermissionLevelSelectProps={...typedOreAppearance,value:'custom',defaultValue:null,viewportSize:[1440,1000],availableWidth:500,labels:typedOreLevelLabels,icons:{custom:<span>Host icon</span>},dropdownIcons:{close:<span>Close</span>,check:<span>Check</span>,chevron:<span>Chevron</span>},disabledLevels:['operator'],triggerRef:createRef<HTMLButtonElement>(),optionRefs:{custom:createRef<HTMLButtonElement>()},onValueChange:(level,event)=>level+event.type};
const typedOreSwitch:OreSwitchProps={...typedOreAppearance,'aria-label':'Host switch',checked:true,defaultChecked:false,thumbIcon:<span>Host thumb</span>,onIcon:<span>On</span>,offIcon:<span>Off</span>,onCheckedChange:(checked,event)=>String(checked)+event.currentTarget.checked};
const typedOreRow:OrePermissionToggleRowProps={...typedOreText,title:'Build',description:'Host description',checked:true,inputRef:createRef<HTMLInputElement>(),inputProps:{name:'host-build','aria-label':'Build'},onCheckedChange:(checked,event)=>String(checked)+event.type};
const typedOreCard:OrePlayerCardProps={...typedOreAppearance,player:typedOrePlayers[0]!,selected:true,subtitle:'Host subtitle',levelIcon:<span>Host icon</span>};
const typedOreElements=<><OrePlayerPermissions {...typedOreProps} ref={createRef<HTMLElement>()}/><OrePermissionLevelSelect {...typedOreSelect} ref={createRef<HTMLDivElement>()}/><OrePermissionToggleRow {...typedOreRow} ref={createRef<HTMLDivElement>()}/><OrePlayerCard {...typedOreCard} ref={createRef<HTMLButtonElement>()}/><OreSwitch {...typedOreSwitch} ref={createRef<HTMLInputElement>()}/></>;
// @ts-expect-error Modern window breakpoint requires explicit source-window dimensions.
const missingOreViewport:OrePlayerPermissionsProps={label:'Missing window',players:typedOrePlayers,permissionOptions:typedOreOptions};
// @ts-expect-error Scroll mode is an explicit finite host input.
const invalidOreScrollMode:OrePlayerPermissionsProps['scrollInputMode']='gamepad';
// @ts-expect-error Modern accepted switch values remain booleans.
const invalidOreChecked:OreSwitchProps={checked:'true'};
// @ts-expect-error Host schemas remain readonly.
typedOrePlayers.push({id:'other',name:'Other'});
// @ts-expect-error Modern permission levels reuse the finite role union.
const invalidOreRole:OrePermissionLevelSelectProps={value:'owner',viewportSize:[1440,1000]};
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
