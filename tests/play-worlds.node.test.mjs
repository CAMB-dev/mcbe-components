import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

// CPU TypeScript module loading, with no product build, browser, image decode
// or network. Each actual React peer receives one consistent module graph.
const require=createRequire(import.meta.url),root=process.cwd();
function loader(peer){const cache=new Map();return function load(filename){
  filename=path.resolve(root,filename);if(cache.has(filename))return cache.get(filename).exports;
  const module={exports:{}};cache.set(filename,module);
  const source=readFileSync(filename,'utf8').replaceAll('import.meta.url',JSON.stringify(pathToFileURL(filename).href));
  const js=ts.transpileModule(source,{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const local=id=>{if(!id.startsWith('.'))return peer(id);const stem=path.resolve(path.dirname(filename),id);if(/\.(png|woff2?|ttf|otf)$/.test(stem))return pathToFileURL(stem).href;const target=[stem,stem+'.ts',stem+'.tsx',stem+'.js',stem+'.json'].find(existsSync);if(!target)throw Error('Unresolved CPU module '+stem);return target.endsWith('.json')?peer(target):load(target);};
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename})(local,module,module.exports);return module.exports;
};}
const worldFlagKeys='deviceSunsetting showNewPlayScreenOptIn personalRealmsGridVisible realmLabelVisible realmsSignInVisible freePreviewVisible freePreviewNewOfferVisible createOnRealmsVisible loadingPersonalRealmsVisible realmTrialVisible nintendoFirstPurchaseVisible multiplayerBlockedVisible openAccountUriVisible openAccountGamecoreVisible localWorldsVisible noLocalWorlds noLocalSwitchSettingVisible noLocalSwitchVisible noLocalHelpVisible betaRetailLocalWorldsVisible syncLegacyWorldsButtonVisible loadingLegacyWorldsVisible legacyWorldsVisible betaRetailLegacyWorldsVisible'.split(' ');
const friendFlagKeys='deviceSunsetting addFriendButtonVisible joinByCodeVisible notificationVisible joinableRealmsPanelVisible friendsRealmsVisible realmsSignInVisible loadingFriendsRealmsVisible offlineAuthCodeVisible noFriendsRealmsVisible friendsGridVisible noFriendsMessageVisible crossPlatformFriendsGridVisible noCrossPlatformFriendsMessageVisible generalNoMultiplayerVisible lanGridVisible openAccountGamecoreVisible'.split(' ');
const worldLabelKeys='worlds legacyWorlds betaLocal betaLegacy realms create quickPlay optIn import signIn freePreview createOnRealms trial nintendoPurchase noLocal noLocalSwitch storageType storageExternal storagePackage help noLocalHelp syncLegacy dontSeeLegacy crossPlatformDisabled blocked accountSettings accountGamecore warningMoreInfo editWorld deleteWorld migrateWorld storageUsage'.split(' ');
const friendLabelKeys='addFriend joinByCode notification joinableRealms signIn offlineAuthCode noFriendsRealms friends noFriends findCrossPlatformFriend crossPlatformFriends noCrossPlatformFriends generalNoMultiplayer lan accountGamecore crossPlatformDisabled warningMoreInfo'.split(' ');
const labelObject=keys=>Object.fromEntries(keys.map(key=>[key,'Host '+key]));
const flags=(keys,value=false)=>Object.fromEntries(keys.map(key=>[key,value]));
const world={id:'world-opaque',name:'World 中文',date:'2026-11-02',gameMode:'Survival',fileSize:'5 MB',thumbnail:{src:'/host/whole-world.png',sourceSize:[480,270]},enabled:true,payload:{identity:'opaque'},lockVisible:true};
const network={id:'network-opaque',name:'Friend world',details:'Host provider details',playerCount:'002 / 008',enabled:true,payload:{identity:'network'},gameOnline:true,gameUnavailable:true,gameOffline:true,statusLabel:'Host status',hardcoreVisible:true,hardcoreLabel:'Hardcore',headerIconVisible:true,headerIcon:{src:'/host/header-whole.png',sourceSize:[10,10]},hideNetworkIcon:false,networkIcon:{src:'/host/platform-whole.png',sourceSize:[14,14]}};
const empty={items:[],rowCount:0},one={items:[world],rowCount:1},netOne={items:[network],rowCount:1};
const loading={message:'Host loading message',height:39,frame:7,barsVisible:true,placeholderRows:3};
const provider={isRealmsEnabled:true,crossPlatformEnabled:false,educationEdition:false,worldPickerScreen:false,localWorldUpload:false,worldArchiveSupport:true,supportsLegacyWorlds:true,autoFetchLegacyWorlds:false,legacyWorldsShareStorage:false,legacyWorldsSupportsMigration:false};
function worldProps(){return {size:[270,210],scale:2,inputMode:'mouse',provider:{...provider},flags:flags(worldFlagKeys),labels:labelObject(worldLabelKeys),localWorlds:one,legacyWorlds:one,betaRetailLocalWorlds:one,betaRetailLegacyWorlds:one,loadingPersonalRealms:{...loading},loadingLegacyWorlds:{...loading},warning:{text:'Host device warning',height:36,moreInfoWidth:55},storage:{enabled:true,value:'external',toggleLabel:'Host storage toggle'},storageUsage:{contentHeight:34,localClipRatio:.25,legacyClipRatio:.6,clipPolicy:'visible-fraction-web'}};}
function friendProps(){return {size:[270,210],scale:2,inputMode:'mouse',provider:{isRealmsEnabled:true,crossPlatformEnabled:false,supportsAddFriend:true,nxOs:false,isPs4:false,editorMode:false,educationEdition:false,addFriendNotVisible:false,inboxEnabled:true},flags:flags(friendFlagKeys),labels:labelObject(friendLabelKeys),friends:netOne,crossPlatformFriends:netOne,lan:netOne,loadingFriendsRealms:{...loading},warning:{text:'Host warning',height:36,moreInfoWidth:55},notificationCount:'0004'};}
function families(el){const content=name=>el('span',{'data-host-family':name},'Required host family '+name),dep=(sourcePath,height=30)=>({sourcePath,height,content:content(sourcePath)});return {personalRealms:dep('play.realms_world_item_grid/personal_realms'),freePreview:dep('play.realms_trial_content_panel/free_preview'),trial:dep('play.realms_trial_content_panel/trial'),nintendoPurchase:dep('play.realms_trial_content_panel/nintendo_first_purchase'),newOffer:dep('common_store.new_offer_icon',12)};}
const attr=(html,name)=>html.match(new RegExp('\\s'+name+'="([^"]*)"'))?.[1];
const peers=[require];for(const major of[18,19])try{const peer=createRequire(path.join(root,`.cache/consumer-react${major}/package.json`));if(!peers.some(r=>r('react').version===peer('react').version))peers.push(peer);}catch{}

for(const peer of peers){
  const React=peer('react'),el=React.createElement,ssr=peer('react-dom/server').renderToStaticMarkup,load=loader(peer),ui=load('src/play-worlds.tsx'),parts=load('src/play-screen-parts.tsx');
  test(`source local/legacy/beta rows retain29 pitch30 paint, independent legacy branches and raw actions (${React.version})`,()=>{
    for(const share of[false,true])for(const migrate of[false,true]){
      const html=ssr(el(ui.PlayWorldRow,{item:world,collection:'legacy_worlds',index:7,width:253,scale:2,labels:{edit:'Edit',delete:'Delete',migrate:'Migrate'},legacyShareStorage:share,legacySupportsMigration:migrate}));
      assert(html.includes('width:506px;height:58px'));assert(html.includes('height:60px'));assert.equal((html.match(/data-source-branch=/g)??[]).length,share&&migrate?2:1);
      assert.equal(html.includes('button.menu_legacy_world_item_delete'),share);assert.equal(html.includes('button.menu_legacy_world_item_migrate'),migrate);assert(html.includes('button.convert_legacy_world'));
      if(share)assert(html.includes('width:44px;height:32px'));
      assert(html.includes('data-source-picture-width="173.91%y"'));assert(html.includes('data-source-y-policy="resolved-height-web"'));assert(html.includes('width:76.5204px;height:44px'));
    }
    for(const upload of[false,true]){const html=ssr(el(ui.PlayWorldRow,{item:world,collection:'local_worlds',index:2,width:253,scale:2,labels:{edit:'Edit',delete:'Delete',migrate:'Migrate'},localWorldUpload:upload}));assert(html.includes(upload?'button.local_world_upload':'button.menu_start_local_world'));assert(html.includes('button.menu_local_world_item_edit'));}
    for(const collection of['beta_retail_local_worlds','beta_retail_legacy_worlds'])assert(ssr(el(ui.PlayWorldRow,{item:world,collection,index:0,width:253,scale:2,labels:{edit:'Edit',delete:'Delete',migrate:'Migrate'}})).includes(collection==='beta_retail_local_worlds'?'button.import_beta_retail_local_world':'button.import_beta_retail_legacy_world'));
  });
  test(`network source statuses remain independent,30 pitch31 paint and raw player-count text (${React.version})`,()=>{
    const html=ssr(el(ui.PlayNetworkWorldRow,{item:network,collection:'friends_network_worlds',index:3,width:253,scale:2,crossPlatformEnabled:false}));
    assert(html.includes('width:506px;height:60px'));assert(html.includes('height:62px'));assert(html.includes('002 / 008'));assert.equal((html.match(/class="mc-play-network-row__online"/g)??[]).length,1);assert.equal((html.match(/class="mc-play-network-row__offline"/g)??[]).length,2);assert(html.includes('mc-play-network-row__tts-border'));assert(html.includes('/host/platform-whole.png'));
    const ignored=ssr(el(ui.PlayNetworkWorldRow,{item:network,collection:'friends_network_worlds',index:0,width:253,scale:2,crossPlatformEnabled:false,ignoreCrossplay:true}));assert(!ignored.includes('mc-play-network-row__tts-border'));
  });
  test(`Worlds owned source order keeps all collections in main stack and storage alone in20 percent (${React.version})`,()=>{
    const p=worldProps();p.flags=flags(worldFlagKeys,true);p.externalFamilies=families(el);p.provider={...p.provider,legacyWorldsShareStorage:true,legacyWorldsSupportsMigration:true};
    const html=ssr(el(ui.PlayWorldsContent,p));const order=['padding_0','play_screen_warning','header_button','worlds_crossplatform_disabled_panel','realms_panel','realms_multiplayer_blocked_panel','worlds_label','grid','beta_retail_local_padding','beta_retail_local_worlds_label','beta_retail_local_grid','loading_legacy_worlds_panel_padding','legacy_worlds_button','loading_legacy_worlds_panel','padding_2','upgrade_legacy_worlds_label','legacy_world_item_grid','beta_retail_legacy_padding','beta_retail_legacy_worlds_label','beta_retail_legacy_grid','pad_hack_panel'];let previous=-1;for(const name of order){const at=html.indexOf(`data-play-node="${name}"`);assert(at>previous,`source order ${name}`);previous=at;}
    assert(html.includes('height:336px'));assert(html.includes('height:84px'));assert(html.includes('play.legacy_world_content_status_area_panel'));assert(html.indexOf('data-play-node="legacy_world_item_grid"')<html.indexOf('mc-play-worlds__storage-scroll'));
    assert.equal((html.match(/data-source-layer="[123]"/g)??[]).length,3);assert(html.includes('data-raw-clip-ratio="0.25"'));assert(html.includes('data-raw-clip-ratio="0.6"'));assert(html.includes('clip-path:inset(0 75% 0 0)'));assert(html.includes('data-clip-policy="visible-fraction-web"'));
    assert(html.includes('button.menu_open_uri'));assert(html.includes('button.open_account_setting_gamecore'));assert(html.includes('button.create_on_realms_button'));assert(html.includes('data-family-implementation="external-host-dependency"'));
    const left=ssr(el(ui.PlayWorldsContent,{...p,storageUsage:{...p.storageUsage,clipPolicy:'left-removal-web'}}));assert(left.includes('clip-path:inset(0 0 0 25%)'));
  });
  test(`independent empty/loading/auth visibility never comes from collection length (${React.version})`,()=>{
    const p=worldProps();p.provider.localWorldUpload=true;p.flags.localWorldsVisible=true;p.flags.noLocalWorlds=true;p.flags.loadingLegacyWorldsVisible=true;
    const html=ssr(el(ui.PlayWorldsContent,p));assert(html.includes('World 中文'));assert(html.includes('Host noLocal'));assert(html.includes('Host loading message'));assert(!html.includes('data-play-node="header_button"'));
    const emptyHtml=ssr(el(ui.PlayWorldsContent,{...p,localWorlds:empty,flags:{...p.flags,noLocalWorlds:false,loadingLegacyWorldsVisible:false}}));assert(!emptyHtml.includes('Host noLocal'));assert(!emptyHtml.includes('mc-play-loading'));
    const inactive=ssr(el(ui.PlayWorldsContent,{...p,hidden:true,flags:{...p.flags,personalRealmsGridVisible:true}}));assert(!inactive.includes('mc-play-source-scroll'));
  });
  test(`all four Worlds labels may be false while positive independent grid dimensions keep rows (${React.version})`,()=>{
    const p=worldProps();p.localWorlds={items:[world],rowCount:9,indices:[7]};
    const html=ssr(el(ui.PlayWorldsContent,p));assert.equal((html.match(/data-world-id="world-opaque"/g)??[]).length,4);
    for(const label of['worlds_label','beta_retail_local_worlds_label','upgrade_legacy_worlds_label','beta_retail_legacy_worlds_label'])assert(!html.includes(`data-play-node="${label}"`));
    for(const grid of['grid','beta_retail_local_grid','legacy_world_item_grid','beta_retail_legacy_grid'])assert(html.includes(`data-play-node="${grid}"`));
    assert(html.includes('height:522px'));assert(html.includes('top:406px'));assert(html.includes('width:504px;height:58px'));
    for(const indices of[[],[9],[NaN],[1,1]])assert.throws(()=>ssr(el(ui.PlayWorldsContent,{...p,localWorlds:{items:[world],rowCount:9,indices}})),e=>e instanceof TypeError||e instanceof RangeError);
    for(const collection of['legacy_worlds','beta_retail_local_worlds','beta_retail_legacy_worlds']){const html=ssr(el(ui.PlayWorldRow,{item:{...world,realmsPlusExpired:true},collection,index:0,width:252,scale:2,labels:{edit:'Edit',delete:'Delete',migrate:'Migrate'}}));assert(!html.includes('mc-play-world-row__realms-plus'));}
  });
  test(`Friends complete owned branches respect platform/education gates and keep provider families explicit (${React.version})`,()=>{
    const p=friendProps();p.flags=flags(friendFlagKeys,true);p.provider.nxOs=true;p.externalFamilies={friendsRealms:{sourcePath:'play.realms_world_item_grid/friends_realms',height:30,content:el('span',null,'External Realms provider')}};
    const html=ssr(el(ui.PlayFriendsContent,p));for(const source of['friends_screen_warning','header_button','friends_crossplatform_disabled_panel','joinable_realms_panel','friends_grid','no_friends_grid_message','switch_find_cross_platform_friend_button','cross_platform_friends_grid','no_cross_platform_friends_grid_message','general_no_multiplayer_grid_message','lan_grid','open_account_setting_button_gamecore'])assert(html.includes(`data-play-node="${source}"`),source);
    for(const target of['button.menu_network_join_by_code','button.menu_invite_notification','button.menu_sign_in_to_view_realms','button.get_offline_authcode','button.menu_network_world_item','button.open_account_setting_gamecore'])assert(html.includes(target));assert(html.includes('aria-label="Host notification 0004"'));
    const ignored=ssr(el(ui.PlayFriendsContent,{...p,provider:{...p.provider,nxOs:false,isPs4:false,editorMode:true,educationEdition:true}}));assert(!ignored.includes('data-play-node="joinable_realms_panel"'));assert(!ignored.includes('data-play-node="cross_platform_friends_grid"'));assert(!ignored.includes('data-play-node="no_friends_grid_message"'));assert(ignored.includes('data-play-node="general_no_multiplayer_grid_message"'));
    const onlyBell=friendProps();onlyBell.flags.notificationVisible=true;const bell=ssr(el(ui.PlayFriendsContent,onlyBell));assert(bell.includes('width:40px;height:40px'));assert(bell.includes('data-source-control="start.notification_button_text_panel"'));assert(bell.includes('data-source-anchor="top_right:center"'));assert(bell.includes('invite_number_background.png'));assert(bell.includes('mc-play-friends__notification-count-text">0004'));assert.equal(ui.planPlayFriendsContent(friendProps()).headerHeight,0);assert.equal(ui.planPlayFriendsContent(onlyBell).headerHeight,30);
  });
  test(`visible missing external assets/families and invalid geometry fail before host React content (${React.version})`,()=>{
    let renders=0;const Child=()=>{renders++;return 'Host family';};const p=worldProps();p.flags.personalRealmsGridVisible=true;p.externalFamilies={personalRealms:{sourcePath:'play.realms_world_item_grid/personal_realms',height:30,content:el(Child)}};
    for(const patch of[{flags:{...p.flags,realmTrialVisible:true}},{provider:{...p.provider,legacyWorldsShareStorage:true},storageUsage:undefined},{size:[100,210]},{scale:1.5},{inputMode:'keyboard'},{localWorlds:{items:[world],rowCount:0}},{flags:{...p.flags,localWorldsVisible:'true'}},{loadingLegacyWorlds:{...loading,frame:10}},{children:el(Child)}])assert.throws(()=>ssr(el(ui.PlayWorldsContent,{...p,...patch})),e=>e instanceof TypeError||e instanceof RangeError);
    assert.equal(renders,0);assert.throws(()=>ssr(el(ui.PlayWorldsContent,{...p,externalFamilies:{personalRealms:{sourcePath:'wrong',height:30,content:el(Child)}}})),/external family/);
    const friends=friendProps();friends.flags.joinableRealmsPanelVisible=true;assert.throws(()=>ssr(el(ui.PlayFriendsContent,friends)),/friends_realms/);
    assert.throws(()=>ssr(el(ui.PlayNetworkWorldRow,{item:{...network,headerIcon:null},collection:'friends_network_worlds',index:0,width:253,scale:2,crossPlatformEnabled:true})),/header icon/);
  });
  test(`ownership overlay and all rows/panes SSR do not invoke timers, IO, callbacks or refs (${React.version})`,()=>{
    const descriptors=new Map(),attempts=[],errors=[],before=console.error;let calls=0,refs=0;console.error=(...args)=>errors.push(args.join(' '));
    for(const key of['fetch','Image','createImageBitmap','OffscreenCanvas','requestAnimationFrame','setTimeout','setInterval']){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value(){attempts.push(key);throw Error('SSR side effect');}});}
    try{const p=worldProps();p.flags.localWorldsVisible=true;p.localWorlds={rowCount:1,items:[{...world,ownership:{visible:true,text:'Verifying ownership',frame:9}}]};const html=ssr(el(ui.PlayWorldsContent,{...p,ref:()=>refs++,onAction:()=>calls++}));assert(html.includes('Verifying ownership'));assert(html.includes('mc-play-world-row__ownership'));assert(!html.includes('payload='));assert(!html.includes('localWorlds='));assert(!html.includes('provider='));ssr(el(ui.PlayFriendsContent,{...friendProps(),ref:()=>refs++,onAction:()=>calls++}));ssr(el(parts.PlaySourceScroll,{size:[270,210],scale:2,inputMode:'touch',label:'Touch',ref:()=>refs++,viewportRef:()=>refs++}));assert.equal(refs,0);assert.equal(calls,0);assert.deepEqual(attempts,[]);assert.deepEqual(errors,[]);}finally{console.error=before;for(const[key,d]of descriptors)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}
  });
  test(`private source scroll declares exact mouse/touch layouts and honors the host font token (${React.version})`,()=>{
    for(const inputMode of['mouse','touch'])for(const sourceLayout of['offsets','server-pane']){const html=ssr(el(parts.PlaySourceScroll,{size:[270,210],scale:3,inputMode,sourceLayout,label:'Source scroll',style:{'--mc-font-size':'20px'}}));assert(html.includes(`data-input-mode="${inputMode}"`));assert(html.includes(`data-source-layout="${sourceLayout}"`));assert(html.includes('--mc-font-size:20px'));assert(!html.includes('--mc-font-size:24px'));assert(html.includes('data-variant="'+(inputMode==='mouse'?'document':'touch')+'"'));}
  });
  test(`independent raw scroll layering retains1px pane loss before bar and content reservation (${React.version})`,()=>{
    const mouse=parts.planPlaySourceScrollGeometry([270,210],2,'mouse');assert.deepEqual(mouse.outer,{x:2,y:2,width:266,height:206});assert.equal(mouse.paneWidth,265);assert.equal(mouse.viewportWidth,256);assert.equal(mouse.contentWidth,252);
    const touch=parts.planPlaySourceScrollGeometry([270,210],2,'touch');assert.equal(touch.paneWidth,265);assert.equal(touch.viewportWidth,265);assert.equal(touch.contentWidth,261);assert.equal(touch.barReserved,0);
    assert.equal(parts.planPlaySourceScrollGeometry([270,210],2,'touch','offsets',true).contentWidth,262);
    const server=parts.planPlaySourceScrollGeometry([150,210],2,'mouse','server-pane');assert.deepEqual(server.outer,{x:0,y:2,width:150,height:206});assert.equal(server.paneWidth,149);assert.equal(server.contentWidth,136);
    const html=ssr(el(parts.PlaySourceScroll,{size:[270,210],scale:2,inputMode:'mouse',label:'Source'}));assert(html.includes('data-play-source-layer="offsets" style="left:4px;top:4px;width:532px;height:412px"'));assert(html.includes('width:530px;height:412px'));
  });
  test(`background SSR is inert and the reused ClassicSkin fills raw zero-centre materials (${React.version})`,()=>{
    const {ClassicSkin}=load('src/classic-skin.tsx');
    for(const path of['textures/ui/control','textures/ui/White','textures/ui/mainbanners']){
      const asset=parts.playAsset(path),fallback=ssr(el(parts.PlaySourceBackground,{asset,scale:2}));assert(fallback.includes('data-material-paint="ssr-fallback"'));assert(fallback.includes('mc-play-source-background__fallback'));
      const patches=ssr(el(ClassicSkin,{asset,width:12,height:8,scale:2,baseClass:'mc-play-source-skin'}));assert.equal((patches.match(/class="mc-play-source-skin__clip"/g)??[]).length,9);assert(patches.includes('left:2px;top:2px;width:20px;height:12px'));assert(patches.includes(asset.url));assert(!/NaN|Infinity/.test(patches));
    }
  });
}

// Exercise actual private lifecycle/event code with finite owner-window task
// queues. No DOM/browser substitute is used as a pixel or engine oracle.
function harness(){let cursor=0,slots=[];const jsx=(type,props,key)=>({type,props,key}),React={forwardRef:render=>({render}),useRef:value=>slots[cursor++]??(slots[cursor-1]={current:value}),useCallback:fn=>fn,useEffect:fn=>{fn();},useLayoutEffect:fn=>{fn();}},actual=loader(require),partsModule={exports:{}},lifecycle={exports:{}};
  const classic=ts.transpileModule(readFileSync(path.join(root,'src/classic-screen-lifecycle.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+classic+'\n})')(id=>id==='react'?React:{lockModalScroll:()=>()=>{}},lifecycle,lifecycle.exports);
  const js=ts.transpileModule(readFileSync(path.join(root,'src/play-screen-parts.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const dependencies={react:React,'react/jsx-runtime':{jsx,jsxs:jsx},'./components':{Button:'button'},'./image':{Image:'image'},'./scroll-area':{ScrollArea:'scroll'},'./classic-skin':actual('src/classic-skin.tsx'),'./play-screen-assets':actual('src/play-screen-assets.ts'),'./progress-assets':actual('src/progress-assets.ts'),'./classic-screen-lifecycle':lifecycle.exports};
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})')(id=>dependencies[id]??require(id),partsModule,partsModule.exports);
  const tasks=[],microtasks=[],owner={isConnected:true,closest:()=>null,ownerDocument:{defaultView:{setTimeout:fn=>tasks.push(fn),queueMicrotask:fn=>microtasks.push(fn)}}};
  return{owner,render(props,ref){cursor=0;return partsModule.exports.PlaySourceButton.render({label:'Host action',target:'button.menu_start_local_world',scale:2,...props},ref);},flush(){while(tasks.length)tasks.shift()();while(microtasks.length)microtasks.shift()();},event(){const e={type:'click',currentTarget:owner,nativeEvent:{defaultPrevented:false},defaultPrevented:false,persist(){},preventDefault(){e.defaultPrevented=true;e.nativeEvent.defaultPrevented=true;},stopPropagation(){},isDefaultPrevented(){return e.defaultPrevented;},isPropagationStopped(){return false;}};return e;}};
}
test('native and late veto precede requests, while event/control/payload identity survives owner scheduling',()=>{
  for(const veto of['early','native-late','none']){const h=harness(),requests=[],payload={secretIdentity:Symbol('opaque')};const tree=h.render({collection:'local_worlds',index:7,itemId:'id',payload,onAction:detail=>requests.push(detail),onClick:event=>{if(veto==='early')event.preventDefault();}}),event=h.event();tree.props.onClick(event);event.currentTarget=null;if(veto==='native-late')event.nativeEvent.defaultPrevented=true;assert.equal(requests.length,0);h.flush();assert.equal(requests.length,veto==='none'?1:0);if(veto==='none'){assert.equal(requests[0].control,h.owner);assert.equal(requests[0].event.currentTarget,h.owner);assert.equal(requests[0].payload,payload);assert.equal(requests[0].id,'id');assert.equal(requests[0].index,7);assert.equal(requests[0].collection,'local_worlds');}}
});
test('queued actions cancel on changed row identity, readonly, disabled, hidden or disconnected owners',()=>{
  for(const change of['identity','readOnly','disabled','hidden','disconnected']){const h=harness(),events=[],props={itemId:'first',onAction:e=>events.push(e)};h.render(props).props.onClick(h.event());if(change==='identity')h.render({...props,itemId:'second'});if(change==='readOnly')h.render({...props,readOnly:true});if(change==='disabled')h.render({...props,disabled:true});if(change==='hidden')h.owner.closest=()=>({});if(change==='disconnected')h.owner.isConnected=false;h.flush();assert.deepEqual(events,[]);}
});
test('private ref binder honors React19 cleanup returns and IME never creates a shortcut action',()=>{
  const h=harness(),calls=[],node={};const tree=h.render({},value=>{calls.push(value);return()=>calls.push('cleanup');});tree.props.ref(node);tree.props.ref(null);assert.deepEqual(calls,[node,'cleanup']);
  const event={key:'Enter',keyCode:229,nativeEvent:{isComposing:true},defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};tree.props.onKeyDown(event);assert.equal(event.defaultPrevented,true);
});
test('private CSS profiles preserve source scroll reservation, raw skins, source font token and layered storage',()=>{
  const shared=readFileSync(path.join(root,'src/play-screen-parts.css'),'utf8'),worlds=readFileSync(path.join(root,'src/play-worlds.css'),'utf8');
  assert(shared.includes('calc(9px * var(--mc-play-scale))'));assert(shared.includes('mc-play-source-scroll__offsets'));assert(shared.includes('position:absolute;left:0;top:0'));assert(shared.includes('calc(100% - 4px * var(--mc-play-scale))'));assert(shared.includes('var(--mc-play-font-size,var(--mc-font-size,18px))'));assert(!shared.includes('font-size:calc(8px'));
  assert(shared.includes('box-shadow:none;text-shadow:none;opacity:1'));assert(shared.includes('border-color:rgb(100% 100% 100%)'));assert(shared.includes('rgb(7.5% 7.5% 7.5%)'));assert(shared.includes('--mc-play-button-text:rgb(30% 30% 30%)'));assert(shared.includes('--mc-play-button-text:rgb(70% 70% 70%)'));
  for(const [layer,style]of [['empty','z-index:1'],['legacy','z-index:2'],['local','z-index:3']])assert(worlds.includes(`.mc-play-storage__${layer}{${style}`));assert(worlds.includes('rgb(56.5% 64.3% 49.8%)'));assert(worlds.includes('rgb(37.3% 51.8% 79.2%)'));assert(worlds.includes('rgb(15.7% 15.7% 15.7%)'));
});

test('measured source backgrounds use fractional untransformed CSS dimensions and disconnect safely',()=>{
  let cursor=0;const slots=[],effects=[],jsx=(type,props)=>({type,props}),actual=loader(require),module={exports:{}};
  const React={forwardRef:fn=>fn,useRef:value=>{const index=cursor++;return slots[index]??(slots[index]={current:value});},useState:initial=>{const index=cursor++;if(!(index in slots))slots[index]=initial;return[slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];}};
  const dependencies={react:React,'react/jsx-runtime':{jsx,jsxs:jsx},'./classic-skin':actual('src/classic-skin.tsx'),'./components':{Button:'button'},'./image':{Image:'image'},'./scroll-area':{ScrollArea:'scroll'},'./play-screen-assets':actual('src/play-screen-assets.ts'),'./progress-assets':actual('src/progress-assets.ts'),'./classic-screen-lifecycle':{useClassicLayoutEffect:fn=>effects.push(fn)}};
  const js=ts.transpileModule(readFileSync(path.join(root,'src/play-screen-parts.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+js+'\n})')(id=>dependencies[id]??require(id),module,module.exports);
  const props={asset:module.exports.playAsset('textures/ui/control'),scale:2},render=()=>{cursor=0;return module.exports.PlaySourceBackground(props);};
  let observer,reads=0;const element={ownerDocument:{defaultView:{getComputedStyle:()=>{reads++;return{width:'123.5px',height:'20.25px'};},ResizeObserver:class{constructor(callback){this.callback=callback;observer=this;}observe(node){this.node=node;}disconnect(){this.disconnected=true;}}}},getBoundingClientRect(){throw Error('Transformed measurements are prohibited');},get clientWidth(){throw Error('Rounded measurements are prohibited');}};
  const initial=render();assert.equal(reads,0);initial.props.ref.current=element;const cleanup=effects.shift()();assert.equal(reads,1);assert.equal(observer.node,element);
  let tree=render();assert.equal(tree.props['data-material-paint'],'classic-skin');assert.equal(tree.props.children.props.width,61.75);assert.equal(tree.props.children.props.height,10.125);assert.equal(tree.props.children.props.baseClass,'mc-play-source-skin');
  observer.callback([{target:element,contentRect:{width:95.25,height:10.5}}]);tree=render();assert.equal(tree.props.children.props.width,47.625);assert.equal(tree.props.children.props.height,5.25);
  observer.callback([{target:element,contentRect:{width:0,height:0}}]);assert.equal(render().props['data-material-paint'],'ssr-fallback');
  observer.callback([{target:element,contentRect:{width:84,height:22}}]);props.scale=1;tree=render();assert.equal(tree.props.children.props.width,84);assert.equal(tree.props.children.props.height,22);
  cleanup();assert.equal(observer.disconnected,true);observer.callback([{target:element,contentRect:{width:20,height:10}}]);assert.equal(render().props.children.props.width,84);
});
