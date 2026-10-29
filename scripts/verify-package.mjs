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
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as ui from 'mcbeui';
const components = ['GuiIcon','InventoryScreenFrame','SurvivalInventoryScreen','RecipeBook','RecipeBookEntry','CraftingScreen','RecipeFilterToggle','BitmapText','ItemGlint','InventoryToolbar','PlayerInventoryScreen','CreativeInventory','ArmorSlot','RecipeSearch','RecipeCategoryTabs','TradeOffer','TradingScreen','MountInventory','PlayerList','TouchControls','PauseMenu','DeathScreen','SettingsPanel','LoadingScreen','AchievementToast','WorldList','ServerList','PlayerCard','PackList','PackCard','BlockPreview','BannerPreview','ActionBar','Beacon','BeaconEffect','BossBar','ChatMessage','ChatPanel','Crafter','CrafterSlot','HeldItemTooltip','KeybindingField','Loom','NavigationList','RecipeSelectionGrid','Scoreboard','SearchField','SettingRow','Spinner','StatusEffect','Stonecutter','TitleOverlay','Toast','ToggleButton','Tooltip','AirBar','Alert','Anvil','ArmorBar','Badge','BlastFurnace','BrewingIndicator','BrewingStand','Button','CartographyTable','Checkbox','Chest','Combobox','ContainerFrame','CraftingTable','Crosshair','Dialog','Dispenser','Dropper','DurabilityBar','EnchantingBook','EnchantingRunes','EnchantingTable','EnchantmentOption','ExperienceBar','FuelIndicator','Furnace','Grindstone','HealthBar','Hopper','Hotbar','HungerBar','IconButton','Image','InventoryGrid','ItemCount','ItemImage','ItemSlot','ItemTooltip','NineSlice','Panel','PixelIcon','PlayerInventory','ProcessingArrow','Progress','RadioGroup','RecipeGrid','ResultSlot','ScrollArea','ScrollBar','Select','Separator','ShulkerBox','Slider','SlotPlaceholder','SmithingTable','Smoker','Switch','Tabs','Text','TextArea','TextField','WorkstationFrame'];
const dataExports = ['bannerPatternIds','bannerDyeColors','loomPatternIds','guiIconNames'];
const rendererFunctions = ['shadeItemGlint','renderItemGlint','renderBitmapGlyphs'];
assert.equal(components.length,118);
assert.equal(dataExports.length,4);
assert.equal(rendererFunctions.length,3);
assert.equal(Object.keys(ui).length,125);
assert(!Object.hasOwn(ui,'InventoryScreenFrameBase'),'Internal frame base must not become a public export.');
assert(!Object.hasOwn(ui,'ComboboxBase'),'Internal shared combobox base must not become a public export.');
assert(!Object.hasOwn(ui,'acquireSharedBitmapRenderer'),'Internal bitmap presentation leases must not become a public export.');
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
for (const asset of ['styles.css','textures.css','inventory.css','workstations.css','enchanting-book.css','processing.css','anvil.css','containers.css','image.css','brewing.css','special-workstations.css','scroll-area.css','hud.css','hud-textures.css','hud-overlays.css','hud-overlay-textures.css','advanced-workstations.css','advanced-workstation-textures.css', 'feedback.css', 'feedback-textures.css', 'settings-controls.css', 'settings-control-textures.css', 'game-lists.css', 'game-list-textures.css', 'system-screens.css', 'system-screens-textures.css', 'game-controls.css', 'game-control-textures.css', 'trading-mounts.css', 'trading-mount-textures.css', 'item-renderers.css', 'inventory-screens.css', 'inventory-screen-textures.css','recipe-book.css','recipe-book-textures.css','crafting-screen.css','inventory-screen-frame.css','fonts.css','mojangles.css','fonts/MCBEPixel-Regular.woff2','fonts/MCBECJK-12px-zh-hans.woff2','fonts/Monocraft-Regular.woff2','fonts/FusionPixel-12px-zh-hans.woff2','fonts/Monocraft-OFL.txt','fonts/Fusion-Pixel-OFL.txt','fonts/fusion-notices/LICENSES/galmuri/LICENSE.txt']) {
  assert((await stat(fileURLToPath(import.meta.resolve('mcbeui/'+asset)))).size > 0);
}
assert((await stat(new URL('./node_modules/mcbeui/dist/assets/enchanting/enchanting_table_book.png',import.meta.url))).size>0);
const packageRoot = new URL('./',import.meta.resolve('mcbeui/package.json'));
const componentCatalog = JSON.parse(await readFile(new URL('docs/component-catalog.json',packageRoot),'utf8'));
const documentedComponents = Object.values(componentCatalog.groups).flat().filter(entry=>entry.status==='implemented').map(entry=>entry.name);
assert.deepEqual(documentedComponents.sort(),components.slice().sort(),'Packed catalog must match component exports without counting data helpers.');
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
const rendererManifest = JSON.parse(await readFile(new URL('docs/item-renderers-geometry.json',packageRoot),'utf8'));
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
import { Anvil, BlastFurnace, Button, Checkbox, Chest, Combobox, ContainerFrame, CraftingTable, Dialog, Dispenser, Dropper, DurabilityBar, EnchantingBook, EnchantingRunes, EnchantingTable, EnchantmentOption, FuelIndicator, Furnace, Grindstone, Hopper, Image, InventoryGrid, ItemCount, ItemImage, ItemSlot, ItemTooltip, NineSlice, ProcessingArrow, RadioGroup, RecipeGrid, ResultSlot, ShulkerBox, Slider, SlotPlaceholder, Smoker, Tabs, Text, TextField } from 'mcbeui';
import type { ButtonProps, TabItem, EnchantmentOption as EnchantmentData, InventoryItem, ItemTooltipTextRenderer, EnchantingBookRendererState, WorkstationTextContext, WorkstationTextRenderer } from 'mcbeui';
import { BitmapText, renderBitmapGlyphs, GuiIcon, guiIconNames } from 'mcbeui';
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
  <Button {...props} ref={createRef<HTMLButtonElement>()}>Play</Button>
  <Text as="p" shadow ref={createRef<HTMLElement>()}>Minecraft</Text>
  <TextField label="World" name="world" ref={createRef<HTMLInputElement>()}/>
  <ItemSlot item={{name:'Diamond',count:64}} underlay={<span/>} ref={createRef<HTMLButtonElement>()}/>
  <InventoryGrid label="Inventory" items={[{name:'Diamond'}]} onSlotAction={(index,action)=>String(index)+action}/>
  <Grindstone inputs={[null,null]} onInputAction={(index,action)=>String(index)+action}/>
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
  <CraftingTable onInputAction={(index,action)=>String(index)+action} onTakeResult={action=>action.toUpperCase()}/>
  <Furnace input={null} fuel={null} progress={.5} fuelRemaining={.5} onInputAction={(slot,action)=>slot+action}/>
  <BlastFurnace title="Blast furnace"/>
  <Smoker title="Smoker"/>
  <Anvil name="Tool" onNameChange={name=>name.toUpperCase()} cost={{kind:'levels',levels:3}} onInputAction={(index,action)=>String(index)+action}/>
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
