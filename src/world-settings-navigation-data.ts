import type{WorldSettingsNavigationSnapshot,WorldSettingsNavigationId}from'./world-settings-navigation-model';
export const worldNavigationIds=Object.freeze(['server_settings_button','game_button','classroom_button','switch_game_button','multiplayer_button','edu_cloud_button','debug_button','level_texture_pack_button','addon_button']as const);
function fail(text:string):never{throw new TypeError(`WorldSettingsNavigation ${text}`);}
function plain<T>(value:T,depth=0):T{
 if(depth>16)fail('snapshot nesting exceeds16.');
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
 if(!value||typeof value!=='object')fail('snapshot must contain plain data.');
 if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)fail('snapshot records must be plain.');
 if(Object.getOwnPropertySymbols(value).length)fail('snapshot symbol fields are unsupported.');
 const out:Record<string,unknown>|unknown[]=Array.isArray(value)?[]:Object.create(null);
 for(const key of Object.keys(value)){const d=Object.getOwnPropertyDescriptor(value,key)!;if(!('value'in d))fail('snapshot accessors are unsupported.');Object.defineProperty(out,key,{value:plain(d.value,depth+1),enumerable:true});}
 if(Array.isArray(value)&&Object.keys(value).length!==value.length)fail('snapshot arrays must be dense.');
 return Object.freeze(out)as T;
}
function keys(object:object,expected:readonly string[],name:string){if(!object||Array.isArray(object)||typeof object!=='object'||Object.keys(object).length!==expected.length||expected.some(key=>!Object.hasOwn(object,key)))fail(`${name} requires the complete named source snapshot.`);}
function text(v:unknown,name:string){if(typeof v!=='string'||v.length>1048576)fail(`${name} must be bounded text.`);}
function bool(v:unknown,name:string){if(typeof v!=='boolean')fail(`${name} must be boolean.`);}
function number(v:unknown,name:string,max=8192){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw new RangeError(`WorldSettingsNavigation ${name} must be finite0..${max}.`);}
function image(v:WorldSettingsNavigationSnapshot['thumbnail']['image'],name:string){if(v===null)return;if(!v||typeof v!=='object')fail(`${name} must be a resolved image or null.`);keys(v,name==='pack border'?['src','sourceSize','resolution']:['src','sourceSize'],name);text(v.src,name);if(!v.src.trim())fail(`${name} src must be nonempty.`);if(!Array.isArray(v.sourceSize)||v.sourceSize.length!==2||v.sourceSize.some(n=>!Number.isSafeInteger(n)||n<1||n>16384))fail(`${name} needs two physical source dimensions.`);}
/** Full immutable preflight includes ignored branches; no native/provider evaluation. */
export function snapshotWorldNavigation(input:WorldSettingsNavigationSnapshot):WorldSettingsNavigationSnapshot{
 const p=plain(input);keys(p,['context','buttons','groups','thumbnail','server','cloud','packs','launch'],'root');
 keys(p.context,['worldSectionIncluded','packsSectionsIncluded','spatialPatternFixEnabled','pregame','educationEdition','nxOs','publish','editorModeEnabled','cloudEnabled','cloudGeneralToggleEnabled','multiplayerClient'],'context');for(const[k,v]of Object.entries(p.context))bool(v,k);
 keys(p.buttons,worldNavigationIds,'buttons');for(const[id,button]of Object.entries(p.buttons)){keys(button,['label','panelTitle','enabled','sourceIndex'],id);text(button.label,id);text(button.panelTitle,id);bool(button.enabled,id);number(button.sourceIndex,id,2147483647);if(!Number.isSafeInteger(button.sourceIndex))fail('forced indices must be integers.');}
 keys(p.groups,['server','world','addons'],'groups');for(const[k,v]of Object.entries(p.groups)){keys(v,['label','height'],k);text(v.label,k);number(v.height,k);}
 keys(p.thumbnail,['textureName','fileSystem','image','alt','webFit'],'thumbnail');for(const k of['textureName','fileSystem','alt']as const)text(p.thumbnail[k],k);image(p.thumbnail.image,'thumbnail');if(!['fill','cover','contain'].includes(p.thumbnail.webFit))fail('thumbnail Web fit must be explicit.');
 keys(p.server,['visible','iconName','outlineName','fileSystem','icon','outline','loadingFrame'],'server');bool(p.server.visible,'server visibility');for(const k of['iconName','outlineName','fileSystem']as const)text(p.server[k],k);image(p.server.icon,'server icon');image(p.server.outline,'server outline');number(p.server.loadingFrame,'loading frame',9);if(!Number.isSafeInteger(p.server.loadingFrame))fail('loading frame must be an integer.');
 keys(p.cloud,['outline','color'],'cloud');image(p.cloud.outline,'cloud outline');image(p.cloud.color,'cloud color');
 keys(p.packs,['level','addon','border'],'packs');for(const k of['level','addon']as const){const pack=p.packs[k];keys(pack,['path','zip','fileSystem','image'],k);for(const key of['path','zip','fileSystem']as const)text(pack[key],k);image(pack.image,k);}image(p.packs.border,'pack border');if(p.packs.border&&!['exact-source','host-resolved'].includes(p.packs.border.resolution))fail('pack border resolution must be explicit.');
 keys(p.launch,['primary','realms','play','host'],'launch');for(const k of['primary','realms','play','host']as const){const state=p.launch[k];keys(state,k==='realms'?['label','enabled','labelMaxHeight','visible']:['label','enabled','labelMaxHeight'],k);text(state.label,k);bool(state.enabled,k);number(state.labelMaxHeight,k);if(state.labelMaxHeight<=0)fail('launch label budget must be positive.');}bool(p.launch.realms.visible,'realms visibility');
 const c=p.context;if(c.packsSectionsIncluded&&!p.packs.border)fail('visible packs require an explicitly resolved exact-case White border.');
 const cloudVisible=c.worldSectionIncluded&&c.educationEdition&&c.cloudEnabled&&c.cloudGeneralToggleEnabled&&!c.multiplayerClient;
 if(cloudVisible&&(!p.cloud.outline||!p.cloud.color))fail('visible Cloud requires both host-resolved original texture literals.');
 if(c.worldSectionIncluded&&p.server.visible&&!c.pregame){if(p.server.iconName&&p.server.iconName!=='loading'&&!p.server.icon)fail('visible server icon requires its resolved provider image.');if(p.server.outlineName&&p.server.outlineName!=='loading'&&!p.server.outline)fail('visible server outline requires its resolved provider image.');}
 if(c.worldSectionIncluded&&c.pregame&&p.thumbnail.textureName&&!p.thumbnail.image)fail('visible thumbnail requires its resolved provider image.');
 for(const k of['level','addon']as const)if(c.packsSectionsIncluded&&p.packs[k].path&&!p.packs[k].image)fail('visible cycling icon requires its resolved provider image.');
 return p;
}
export const worldNavigationViewBindings:Readonly<Record<WorldSettingsNavigationId,string>>=Object.freeze({server_settings_button:'server_settings_button_toggle',game_button:'game_button_toggle',classroom_button:'classroom_button_toggle',switch_game_button:'game_button_toggle',multiplayer_button:'multiplayer_button_toggle',edu_cloud_button:'cloud_button_toggle',debug_button:'world_debug_button_toggle',level_texture_pack_button:'level_texture_pack_button_toggle',addon_button:'addon_button_toggle'});
