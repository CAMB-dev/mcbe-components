import type{ComponentType,Ref,SyntheticEvent}from'react';
import{layoutSettingsFrame}from'./settings-frame-model';import type{SettingsFrameProps,SettingsFrameLayout,SettingsFrameRequest}from'./settings-frame-model';
import type{WorldSettingsNavigationProps,WorldSettingsNavigationSnapshot,WorldSettingsNavigationContext,WorldSettingsNavigationId}from'./world-settings-navigation-model';import{snapshotWorldNavigation,worldNavigationIds}from'./world-settings-navigation-data';
import type{SettingsNavigationDetail}from'./settings-navigation';import type{WorldLaunchActionDetail,WorldSettingsMode,WorldSettingsFont}from'./world-settings-actions';
import type{WorldGameSettingsSnapshot,WorldMultiplayerSettingsSnapshot,WorldCloudSettingsSnapshot,WorldDebugSettingsSnapshot}from'./world-settings-fields';import{planWorldSettingsFields}from'./world-settings-fields-model';
import type{SettingsFieldsProps,SettingsFieldsRequest}from'./settings-fields-model';
import{planResourcePackManager}from'./resource-packs';import type{ResourcePackManagerProps,ResourcePackManagerActionDetail}from'./resource-packs';
import{planWorldServerSettings}from'./world-server-settings';import type{WorldServerSettingsSnapshot,WorldServerSettingsProps,WorldServerSettingsChangeDetail,WorldServerSettingsSubmitDetail}from'./world-server-settings';
import{copyWorldSettingsData,worldSettingsKeys,worldSettingsBoolean,worldSettingsExtent}from'./world-settings-snapshot';

export type WorldSettingsPage='game'|'multiplayer'|'cloud'|'debug'|'server'|'level'|'addon'|'classroom';
export interface WorldSettingsScreenContext extends Omit<WorldSettingsNavigationContext,'worldSectionIncluded'|'packsSectionsIncluded'>{readonly mayIncludeWorldSection:boolean;readonly debugSettings:boolean}
export interface WorldSettingsScreenViews{
 readonly game_button_toggle:boolean;readonly server_settings_button_toggle:boolean;readonly multiplayer_button_toggle:boolean;
 readonly cloud_button_toggle:boolean;readonly world_debug_button_toggle:boolean;readonly level_texture_pack_button_toggle:boolean;readonly addon_button_toggle:boolean;
}
export type WorldSettingsPackSnapshot=Pick<ResourcePackManagerProps,'bindings'|'labels'|'collections'|'defaultItem'|'layout'>;
export interface WorldSettingsClassroomSnapshot{readonly visible:boolean;readonly height:number;readonly data:unknown}
export interface WorldSettingsScreenSnapshot{
 readonly context:WorldSettingsScreenContext;readonly views:WorldSettingsScreenViews;readonly navigation:Omit<WorldSettingsNavigationSnapshot,'context'>;
 /** Every source mount is named. Null is only admitted for an ignored module. */
 readonly pages:{readonly game:WorldGameSettingsSnapshot|null;readonly multiplayer:WorldMultiplayerSettingsSnapshot|null;readonly server:WorldServerSettingsSnapshot|null;readonly cloud:WorldCloudSettingsSnapshot|null;readonly debug:WorldDebugSettingsSnapshot|null;readonly level:WorldSettingsPackSnapshot|null;readonly addon:WorldSettingsPackSnapshot|null;readonly classroom:WorldSettingsClassroomSnapshot|null};
}
export interface WorldSettingsClassroomRequest{readonly target:string;readonly sourceControl:string;readonly control:HTMLElement;readonly event?:SyntheticEvent<HTMLElement>}
/** Explicit seam for the missing external source namespace. This adapter must
 * supply that real module; the library supplies no fabricated Classroom form. */
export interface WorldSettingsClassroomMountProps{readonly snapshot:unknown;readonly width:number;readonly height:number;readonly scale:number;readonly font:WorldSettingsFont;readonly mode:WorldSettingsMode;readonly visible:boolean;readonly disabled:boolean;readonly readOnly:boolean;readonly inert:boolean;readonly popupHost:HTMLDivElement|null;readonly onRequest:(detail:WorldSettingsClassroomRequest)=>void}
export interface WorldSettingsClassroomModule{readonly sourceIdentity:'classroom_settings.classroom_section';readonly Component:ComponentType<WorldSettingsClassroomMountProps>}
export type WorldSettingsScreenRequest=
 |{readonly kind:'frame';readonly detail:SettingsFrameRequest}
 |{readonly kind:'navigation';readonly value:WorldSettingsNavigationId;readonly detail:SettingsNavigationDetail}
 |{readonly kind:'launch';readonly detail:WorldLaunchActionDetail}
 |{readonly kind:'field';readonly section:'game'|'multiplayer'|'cloud'|'debug';readonly detail:SettingsFieldsRequest}
 |{readonly kind:'server-value';readonly detail:WorldServerSettingsChangeDetail}
 |{readonly kind:'server-submit';readonly detail:WorldServerSettingsSubmitDetail}
 |{readonly kind:'pack';readonly section:'level'|'addon';readonly detail:ResourcePackManagerActionDetail}
 |{readonly kind:'classroom';readonly detail:WorldSettingsClassroomRequest};
type FieldOptions=Pick<SettingsFieldsProps,'inputProps'|'buttonProps'|'inputRefs'|'buttonRefs'|'rowRefs'|'popupViewportRefs'>;
type NavigationOptions=Pick<WorldSettingsNavigationProps,'label'|'sourceDefaultIndex'|'toggleOnHover'|'hoverPolicy'|'itemRefs'|'nodeRefs'|'launchButtonProps'|'launchButtonRefs'|'materialRendering'>;
type FrameBase=Omit<SettingsFrameProps,'layout'|'content'|'selectorContent'|'headerContent'|'footerContent'|'onRequest'|'popupHostRef'>;
export interface WorldSettingsScreenProps extends FrameBase{
 readonly mode:WorldSettingsMode;readonly snapshot:WorldSettingsScreenSnapshot;readonly value:WorldSettingsNavigationId|null;
 readonly layout:Omit<SettingsFrameLayout,'contentHeaderHeight'|'contentFooterHeight'>;
 readonly hiddenSlots:'reserve'|'collapse';readonly contentLayout:'max-allocated-groups';readonly typography:SettingsFieldsProps['typography'];readonly textFormatting?:SettingsFieldsProps['textFormatting'];
 readonly navigation:NavigationOptions;readonly readOnly?:boolean;readonly onRequest?:(request:WorldSettingsScreenRequest)=>void|false;
 readonly classroomModule?:WorldSettingsClassroomModule|null;
 readonly sectionRefs?:Readonly<Partial<Record<WorldSettingsPage,Ref<HTMLDivElement>>>>;
 readonly fieldOptions?:Readonly<Partial<Record<'game'|'multiplayer'|'cloud'|'debug',FieldOptions>>>;
 readonly serverOptions?:Pick<WorldServerSettingsProps,'generatedRef'|'submitRef'|'inputProps'|'inputRefs'|'dropdownRefs'|'multiselectRefs'|'optionRefs'|'submitButtonProps'|'onExpandedChange'>;
 readonly packOptions?:Readonly<Partial<Record<'level'|'addon',Pick<ResourcePackManagerProps,'headerImageProfiles'>>>>;
 readonly popupHostRef?:SettingsFrameProps['popupHostRef'];
}
const contextKeys=['spatialPatternFixEnabled','pregame','educationEdition','nxOs','publish','editorModeEnabled','cloudEnabled','cloudGeneralToggleEnabled','multiplayerClient','mayIncludeWorldSection','debugSettings']as const;
const viewKeys=['game_button_toggle','server_settings_button_toggle','multiplayer_button_toggle','cloud_button_toggle','world_debug_button_toggle','level_texture_pack_button_toggle','addon_button_toggle']as const;
export function planWorldSettingsScreen(p:WorldSettingsScreenProps){
 if(p.children!==undefined||p.dangerouslySetInnerHTML!==undefined||['content','selectorContent','headerContent','footerContent'].some(k=>Object.hasOwn(p,k)))throw new TypeError('WorldSettingsScreen owns its fixed source mount graph.');
 if(!['create','template-create','edit'].includes(p.mode)||!['reserve','collapse'].includes(p.hiddenSlots)||p.contentLayout!=='max-allocated-groups')throw new TypeError('World settings requires a source alias and explicit content/hidden layout policies.');
 if(p.value!==null&&!worldNavigationIds.includes(p.value))throw new TypeError('World settings selection must retain a named source navigation identity.');
 if(p.readOnly!==undefined)worldSettingsBoolean(p.readOnly,'readOnly');
 const q=copyWorldSettingsData(p.snapshot);worldSettingsKeys(q,['context','views','navigation','pages'],'screen snapshot');worldSettingsKeys(q.context,contextKeys,'screen context');worldSettingsKeys(q.views,viewKeys,'screen view bindings');worldSettingsKeys(q.pages,['game','multiplayer','server','cloud','debug','level','addon','classroom'],'screen pages');worldSettingsKeys(q.navigation,['buttons','groups','thumbnail','server','cloud','packs','launch'],'screen navigation data');
 for(const[k,v]of Object.entries(q.context))worldSettingsBoolean(v,k);for(const[k,v]of Object.entries(q.views))worldSettingsBoolean(v,k);
 const c=q.context,include=c.mayIncludeWorldSection;
 const geometry=layoutSettingsFrame({...p.layout,contentHeaderHeight:0,contentFooterHeight:0}),width=geometry.content.contentWidth,s=p.layout.scale;
 const navContext:WorldSettingsNavigationContext={worldSectionIncluded:include,packsSectionsIncluded:include,spatialPatternFixEnabled:c.spatialPatternFixEnabled,pregame:c.pregame,educationEdition:c.educationEdition,nxOs:c.nxOs,publish:c.publish,editorModeEnabled:c.editorModeEnabled,cloudEnabled:c.cloudEnabled,cloudGeneralToggleEnabled:c.cloudGeneralToggleEnabled,multiplayerClient:c.multiplayerClient};
 const navigation=snapshotWorldNavigation({...q.navigation,context:navContext});
 const ignored={game:!include,multiplayer:!include,server:!include||c.pregame,cloud:!include||!c.educationEdition||!c.cloudEnabled||!c.cloudGeneralToggleEnabled||c.multiplayerClient,debug:!include||!c.debugSettings,level:!include,addon:!include,classroom:!include||!c.educationEdition};
 for(const[k,v]of Object.entries(ignored))if(!v&&q.pages[k as WorldSettingsPage]===null)throw new TypeError(`World settings ${k} source module requires its complete payload, including when view-hidden.`);
 const visible={game:q.views.game_button_toggle,multiplayer:q.views.multiplayer_button_toggle,server:q.views.server_settings_button_toggle,cloud:q.views.cloud_button_toggle,debug:q.views.world_debug_button_toggle,level:q.views.level_texture_pack_button_toggle,addon:q.views.addon_button_toggle,classroom:q.pages.classroom?.visible??false};
 const active=Object.fromEntries(Object.keys(ignored).map(k=>[k,!ignored[k as WorldSettingsPage]&&visible[k as WorldSettingsPage]]))as Record<WorldSettingsPage,boolean>;
 const fields={width,scale:s,rows:[],inputMode:p.layout.inputMode,typography:p.typography,textFormatting:p.textFormatting,hiddenSlots:p.hiddenSlots};
 for(const family of['game','multiplayer','cloud','debug']as const){const snapshot=q.pages[family];if(snapshot)planWorldSettingsFields(family,{...fields,snapshot}as Parameters<typeof planWorldSettingsFields>[1]);}
 if(q.pages.server)planWorldServerSettings({width,scale:s,font:p.font,snapshot:q.pages.server,hiddenSlots:p.hiddenSlots});
 const provider={educationEdition:c.educationEdition,isWorldCreate:p.mode==='create',isTemplateCreate:p.mode==='template-create',isWorldEdit:p.mode==='edit'};
 for(const profile of['level','addon']as const){const data=q.pages[profile];if(data){worldSettingsKeys(data,['bindings','labels','collections','defaultItem','layout'],'pack snapshot');planResourcePackManager({...data,profile,provider,width,scale:s,...p.packOptions?.[profile]});}}
 if(q.pages.classroom){worldSettingsKeys(q.pages.classroom,['visible','height','data'],'external classroom snapshot');worldSettingsBoolean(q.pages.classroom.visible,'classroom visible');worldSettingsExtent(q.pages.classroom.height,'classroom height',true);}
 if(!ignored.classroom){
  const module=p.classroomModule,identity=module&&Object.getOwnPropertyDescriptor(module,'sourceIdentity'),descriptor=module&&Object.getOwnPropertyDescriptor(module,'Component'),component=descriptor&&'value'in descriptor?descriptor.value:undefined;
  const tag=component&&typeof component==='object'?Object.getOwnPropertyDescriptor(component,'$$typeof'):undefined;
  const valid=typeof component==='function'||!!tag&&'value'in tag&&[Symbol.for('react.memo'),Symbol.for('react.forward_ref'),Symbol.for('react.lazy')].includes(tag.value);
  if(!identity||!('value'in identity)||identity.value!=='classroom_settings.classroom_section'||!valid)throw new TypeError('The fixed samples omit classroom_settings.classroom_section. Education requires its explicit external source module.');
 }
 return Object.freeze({snapshot:q,geometry,navigation,provider,ignored:Object.freeze(ignored),visible:Object.freeze(visible),active:Object.freeze(active),width,scale:s});
}
